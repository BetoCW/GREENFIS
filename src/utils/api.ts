import { readStore, writeStore } from './localStore';

const BASE = 'http://localhost:4000';
const DEFAULT_SUCURSAL = 1;
const DEFAULT_VENDEDOR = 2;

export async function fetchInventory(sucursal_id: number = DEFAULT_SUCURSAL) {
  try {
    const res = await fetch(`${BASE}/api/vendedor/inventario?sucursal_id=${sucursal_id}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    // map to local product shape
    return data.map((r: any) => ({ id: String(r.producto_id || r.id), nombre: r.producto || r.nombre, descripcion: r.descripcion || '', cantidad: r.cantidad, precio: parseFloat(r.precio || 0), ubicacion: r.ubicacion || '', categoria: r.categoria || '', stock_minimo: r.stock_minimo || 0 }));
  } catch (e) {
    // fallback to localStore
    return readStore('gf_products', []);
  }
}

export async function fetchInventoryWithStatus(sucursal_id: number = DEFAULT_SUCURSAL) {
  try {
    const res = await fetch(`${BASE}/api/vendedor/inventario?sucursal_id=${sucursal_id}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const mapped = data.map((r: any) => ({ id: String(r.producto_id || r.id), nombre: r.producto || r.nombre, descripcion: r.descripcion || '', cantidad: r.cantidad, precio: parseFloat(r.precio || 0), ubicacion: r.ubicacion || '', categoria: r.categoria || '', stock_minimo: r.stock_minimo || 0 }));
    return { ok: true, data: mapped };
  } catch (e) {
    return { ok: false, data: readStore('gf_products', []) };
  }
}

// New helper: fetch inventory from the vw_inventario_tienda endpoint (returns inventory across all sucursales)
export async function fetchInventoryVW() {
  try {
    const res = await fetch(`${BASE}/api/vendedor/inventario/vw`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const mapped = data.map((r: any) => ({
      id: String(r.id),
      nombre: r.nombre,
      descripcion: r.descripcion || '',
      cantidad: Number(r.cantidad ?? 0),
      precio: parseFloat(r.precio || 0),
      ubicacion: r.ubicacion || '',
      categoria: r.categoria || '',
      stock_minimo: r.stock_minimo || 0
    }));
    return { ok: true, data: mapped };
  } catch (e) {
    return { ok: false, data: readStore('gf_products', []) };
  }
}

export async function fetchProducts() {
  try {
    const res = await fetch(`${BASE}/api/vendedor/productos`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.map((p: any) => ({ id: String(p.id || p.producto_id), nombre: p.nombre, precio: parseFloat(p.precio || 0), codigo_barras: p.codigo_barras, cantidad: Number(p.cantidad ?? p.cantidad_tienda ?? 0), descripcion: p.descripcion || '' }));
  } catch (e) {
    return readStore('gf_products', []);
  }
}

export async function postVenta(payload: any, vendedor_id: number = DEFAULT_VENDEDOR, sucursal_id: number = DEFAULT_SUCURSAL) {
  try {
    const body = { ...payload, vendedor_id, sucursal_id };
    const res = await fetch(`${BASE}/api/vendedor/ventas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      // try to capture server response text to help debugging
      let txt = '';
      try { txt = await res.text(); } catch (e) { txt = String(e); }
      console.error('postVenta server error', res.status, txt);
      throw new Error(`Server error ${res.status}: ${txt || res.statusText}`);
    }
    const json = await res.json();
    return json;
  } catch (e) {
    // fallback: write to localStore gf_sales
  const salesRaw = readStore('gf_sales', [] as any[]);
  const sales = Array.isArray(salesRaw) ? salesRaw : [];
  // include vendedor_id and sucursal_id if provided
  const savedSale = { ...payload, vendedor_id: (payload.vendedor_id ?? payload.vendedorId ?? null), sucursal_id: (payload.sucursal_id ?? payload.sucursalId ?? null) };
  sales.unshift(savedSale);
  writeStore('gf_sales', sales);
    // also decrement local product stock
    const products = readStore('gf_products', []);
    const updated = products.map((p: any) => {
      // support both shapes: { productId, qty } and { producto_id, cantidad }
      const it = payload.items.find((i: any) => (i.productId && (i.productId === p.id || i.productId === String(p.id))) || (i.producto_id && (String(i.producto_id) === String(p.id))));
      if (!it) return p;
      const qty = (it.qty ?? it.cantidad ?? 0);
      return { ...p, cantidad: Math.max(0, p.cantidad - qty) };
    });
    writeStore('gf_products', updated);
    return { ok: true };
  }
}

export async function postSolicitud(body: any) {
  try {
    const res = await fetch(`${BASE}/api/vendedor/solicitudes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await res.text();
    if (!res.ok) {
      // include server response text for debugging
      const errMsg = text || res.statusText || 'API error';
      const err = new Error(errMsg);
      // attach status for callers
      (err as any).status = res.status;
      throw err;
    }
    const json = text ? JSON.parse(text) : {};
    return { ok: true, fromServer: true, data: json };
  } catch (e: any) {
    // fallback to local store but return structured result so caller knows it wasn't sent
    const listRaw = readStore('gf_requests', [] as any[]);
    const list = Array.isArray(listRaw) ? listRaw : [];
    const saved = { id: `REQ-${Date.now()}`, ...body, estado: 'pendiente', fecha: new Date().toISOString() };
    list.unshift(saved);
    writeStore('gf_requests', list);
    const errorDetail = { message: e?.message || String(e), status: e?.status || null };
    return { ok: false, fromServer: false, data: saved, error: errorDetail };
  }
}

// Promociones API functions
export async function fetchPromociones() {
  try {
    const res = await fetch(`${BASE}/api/manager/promociones`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    // fallback to localStore
    return { ok: false, data: readStore('gf_promociones', [] as any[]) };
  }
}

export async function createPromocion(promocion: any) {
  try {
    const res = await fetch(`${BASE}/api/manager/promociones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promocion)
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    // fallback to localStore
    const promociones = readStore('gf_promociones', [] as any[]);
    const newPromocion = { id: Date.now(), ...promocion };
    promociones.unshift(newPromocion);
    writeStore('gf_promociones', promociones);
    return { ok: false, data: newPromocion };
  }
}

export async function updatePromocion(id: number, promocion: any) {
  try {
    const res = await fetch(`${BASE}/api/manager/promociones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promocion)
    });
    if (!res.ok) throw new Error('API error');
    return { ok: true };
  } catch (e) {
    // fallback to localStore
    const promociones = readStore('gf_promociones', [] as any[]);
    const index = promociones.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      promociones[index] = { ...promociones[index], ...promocion };
      writeStore('gf_promociones', promociones);
    }
    return { ok: false };
  }
}

export async function deletePromocion(id: number) {
  try {
    const res = await fetch(`${BASE}/api/manager/promociones/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('API error');
    return { ok: true };
  } catch (e) {
    // fallback to localStore
    const promociones = readStore('gf_promociones', [] as any[]);
    const filtered = promociones.filter((p: any) => p.id !== id);
    writeStore('gf_promociones', filtered);
    return { ok: false };
  }
}
