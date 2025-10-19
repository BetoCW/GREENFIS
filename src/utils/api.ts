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

export async function fetchProducts() {
  try {
    const res = await fetch(`${BASE}/api/vendedor/productos`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.map((p: any) => ({ id: String(p.id || p.producto_id), nombre: p.nombre, precio: parseFloat(p.precio || 0), codigo_barras: p.codigo_barras }));
  } catch (e) {
    return readStore('gf_products', []);
  }
}

export async function postVenta(payload: any, vendedor_id: number = DEFAULT_VENDEDOR, sucursal_id: number = DEFAULT_SUCURSAL) {
  try {
    const body = { ...payload, vendedor_id, sucursal_id };
    const res = await fetch(`${BASE}/api/vendedor/ventas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    return json;
  } catch (e) {
    // fallback: write to localStore gf_sales
  const salesRaw = readStore('gf_sales', [] as any[]);
  const sales = Array.isArray(salesRaw) ? salesRaw : [];
  sales.unshift(payload);
  writeStore('gf_sales', sales);
    // also decrement local product stock
    const products = readStore('gf_products', []);
    const updated = products.map((p: any) => {
      const it = payload.items.find((i: any) => i.productId === p.id || i.productId === String(p.id));
      if (!it) return p;
      return { ...p, cantidad: Math.max(0, p.cantidad - it.qty) };
    });
    writeStore('gf_products', updated);
    return { ok: true };
  }
}

export async function postSolicitud(body: any) {
  try {
    const res = await fetch(`${BASE}/api/vendedor/solicitudes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
  const listRaw = readStore('gf_requests', [] as any[]);
  const list = Array.isArray(listRaw) ? listRaw : [];
  const saved = { id: `REQ-${Date.now()}`, ...body, estado: 'pendiente', fecha: new Date().toISOString() };
  list.unshift(saved);
  writeStore('gf_requests', list);
    return saved;
  }
}
