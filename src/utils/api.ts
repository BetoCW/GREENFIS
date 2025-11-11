import { readStore } from './localStore';

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

export async function fetchSucursales() {
  try {
    const res = await fetch(`${BASE}/api/manager/sucursales`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    // expect { id, nombre, direccion, telefono }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, data: readStore('gf_sucursales', [] as any[]) };
  }
}

export async function createProduct(product: any) {
  try {
    const res = await fetch(`${BASE}/api/manager/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    const text = await res.text();
    if (!res.ok) {
      // include server response text for debugging
      const err = new Error(text || res.statusText || 'API error');
      (err as any).status = res.status;
      throw err;
    }
    const json = text ? JSON.parse(text) : {};
    return { ok: true, data: json };
  } catch (e: any) {
    console.error('createProduct error', e?.message || e);
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function updateProduct(id: string | number, product: any) {
  try {
    const res = await fetch(`${BASE}/api/manager/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || res.statusText || `HTTP ${res.status}`);
    }
    return { ok: true };
  } catch (e: any) {
    console.error('updateProduct error', e?.message || e);
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function deleteProduct(id: string | number) {
  try {
    const res = await fetch(`${BASE}/api/manager/productos/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || res.statusText || `HTTP ${res.status}`);
    }
    return { ok: true };
  } catch (e: any) {
    console.error('deleteProduct error', e?.message || e);
    return { ok: false, error: e?.message || String(e) };
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
    // Do NOT fallback to local store for sales: return explicit error so caller can surface server failure
    console.error('postVenta error - not persisted:', (e as any)?.message || e);
    return { ok: false, error: (e as any)?.message || String(e) };
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
    console.error('postSolicitud error - not persisted:', (e as any)?.message || e);
    return { ok: false, fromServer: false, error: (e as any)?.message || String(e) };
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

// ---------- Proveedores ----------
export async function fetchProveedores() {
  try {
    const res = await fetch(`${BASE}/api/manager/proveedores`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, data: readStore('gf_proveedores', [] as any[]) };
  }
}

export async function createProveedor(proveedor: any) {
  try {
    const res = await fetch(`${BASE}/api/manager/proveedores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proveedor) });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    console.error('createProveedor error - not persisted:', (e as any)?.message || e);
    return { ok: false, error: (e as any)?.message || String(e) };
  }
}

export async function updateProveedor(id: string | number, proveedor: any) {
  try {
    const res = await fetch(`${BASE}/api/manager/proveedores/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proveedor) });
    if (!res.ok) throw new Error('API error');
    return { ok: true };
  } catch (e) {
    console.error('updateProveedor error - not persisted locally:', (e as any)?.message || e);
    return { ok: false, error: (e as any)?.message || String(e) };
  }
}

export async function deleteProveedor(id: string | number) {
  try {
    const res = await fetch(`${BASE}/api/manager/proveedores/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API error');
    return { ok: true };
  } catch (e) {
    console.error('deleteProveedor error - not persisted:', (e as any)?.message || e);
    return { ok: false, error: (e as any)?.message || String(e) };
  }
}

// Hard delete which first unlinks referenced products then removes the proveedor row
export async function deleteProveedorHard(id: string | number) {
  try {
    const res = await fetch(`${BASE}/api/manager/proveedores/${id}/hard`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API error');
    return { ok: true };
  } catch (e) {
    console.error('deleteProveedorHard error - not persisted:', (e as any)?.message || e);
    return { ok: false, error: (e as any)?.message || String(e) };
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
    console.error('createPromocion error - not persisted:', (e as any)?.message || e);
    return { ok: false, error: (e as any)?.message || String(e) };
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
    console.error('updatePromocion error - not persisted:', (e as any)?.message || e);
    return { ok: false, error: (e as any)?.message || String(e) };
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
    console.error('deletePromocion error - not persisted:', (e as any)?.message || e);
    return { ok: false, error: (e as any)?.message || String(e) };
  }
}
