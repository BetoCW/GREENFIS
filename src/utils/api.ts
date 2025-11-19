import { SupabaseCRUD, type Filter } from './supabaseRest';
import { readStore } from './localStore';

// Table/view names can be adjusted if your schema differs.
const TBL = {
  productos: (import.meta as any).env?.VITE_TBL_PRODUCTOS || 'productos',
  proveedores: (import.meta as any).env?.VITE_TBL_PROVEEDORES || 'proveedores',
  categorias: (import.meta as any).env?.VITE_TBL_CATEGORIAS || 'categorias',
  promociones: (import.meta as any).env?.VITE_TBL_PROMOCIONES || 'promociones',
  sucursales: (import.meta as any).env?.VITE_TBL_SUCURSALES || 'sucursales',
  usuarios: (import.meta as any).env?.VITE_TBL_USUARIOS || 'usuarios',
  inventario_tienda: (import.meta as any).env?.VITE_TBL_INV_TIENDA || 'inventario_tienda',
  inventario_almacen: (import.meta as any).env?.VITE_TBL_INV_ALMACEN || 'inventario_almacen',
  ventas: (import.meta as any).env?.VITE_TBL_VENTAS || 'ventas',
  detalle_ventas: (import.meta as any).env?.VITE_TBL_DETALLE_VENTAS || 'detalle_ventas',
  devoluciones: (import.meta as any).env?.VITE_TBL_DEVOLUCIONES || 'devoluciones',
  detalle_devoluciones: (import.meta as any).env?.VITE_TBL_DETALLE_DEVOLUCIONES || 'detalle_devoluciones',
  solicitudes: (import.meta as any).env?.VITE_TBL_SOLICITUDES || 'solicitudes_reabastecimiento',
  transferencias: (import.meta as any).env?.VITE_TBL_TRANSFERENCIAS || 'transferencias_inventario',
  pedidos: (import.meta as any).env?.VITE_TBL_PEDIDOS || 'pedidos_proveedores',
  cortes_caja: (import.meta as any).env?.VITE_TBL_CORTES_CAJA || 'cortes_caja',
};

function tryClient() {
  try { return new SupabaseCRUD(); } catch { return null; }
}

function pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: Array<K>): Pick<T, K> {
  const out: any = {};
  for (const k of keys) if (k in obj) out[k as string] = obj[k];
  return out;
}

// Productos
export async function fetchProducts() {
  const client = tryClient();
  if (!client) return readStore<any[]>('gf_products', []);
  const res = await client.list(TBL.productos, { select: 'id,codigo_barras,nombre,descripcion,precio,categoria_id,proveedor_id,stock_minimo,activo' });
  if (!res.ok) return readStore<any[]>('gf_products', []);
  // Map to UI shape if needed
  return res.data.map((p: any) => ({
    id: String(p.id),
    nombre: p.nombre,
    descripcion: p.descripcion,
    cantidad: 0,
    precio: Number(p.precio) || 0,
    ubicacion: '',
    categoria: String(p.categoria_id ?? ''),
    stock_minimo: Number(p.stock_minimo ?? 0)
  }));
}

export async function createProduct(payload: any) {
  const client = tryClient(); if (!client) return { ok: false, error: 'No server' } as any;
  return client.insert(TBL.productos, payload);
}

export async function updateProduct(id: string | number, payload: any) {
  const client = tryClient(); if (!client) return { ok: false, error: 'No server' } as any;
  return client.update(TBL.productos, payload, [{ column: 'id', op: 'eq', value: id }]);
}

export async function deleteProduct(id: string | number) {
  const client = tryClient(); if (!client) return { ok: false, error: 'No server' } as any;
  // soft delete if your schema supports it; otherwise hard delete
  try {
    const soft = await client.update(TBL.productos, { activo: 0 }, [{ column: 'id', op: 'eq', value: id }]);
    if (soft.ok) return soft as any;
  } catch {}
  return client.remove(TBL.productos, [{ column: 'id', op: 'eq', value: id }]);
}

// Validaciones/consultas auxiliares de productos
export async function existsProductoByCodigo(codigo_barras: string): Promise<boolean> {
  if (!codigo_barras) return false;
  const client = tryClient(); if (!client) return false;
  const res = await client.list(TBL.productos, { select: 'id', filters: [{ column: 'codigo_barras', op: 'eq', value: codigo_barras }], limit: 1 });
  return !!(res.ok && Array.isArray(res.data) && res.data.length > 0);
}

// Inventario (sin vistas): combinamos productos + inventario_tienda en cliente
export async function fetchInventoryVW() {
  const client = tryClient();
  if (!client) return { ok: false, data: readStore<any[]>('gf_products', []) };
  const [invRes, prodRes] = await Promise.all([
    client.list(TBL.inventario_tienda, { select: 'id,producto_id,sucursal_id,cantidad,ubicacion' }),
    client.list(TBL.productos, { select: 'id,codigo_barras,nombre,descripcion,precio,categoria_id,stock_minimo,fecha_caducidad' })
  ]);
  if (!invRes.ok || !prodRes.ok) return { ok: false, data: readStore<any[]>('gf_products', []) };
  const byProd = new Map<number, any>();
  for (const p of prodRes.data) byProd.set(Number(p.id), p);
  const today = new Date().toISOString().slice(0,10);
  const data = invRes.data.map((r: any) => {
    const p = byProd.get(Number(r.producto_id)) || {};
    const expired = p.fecha_caducidad && String(p.fecha_caducidad) < today;
    const caducada = expired ? Number(r.cantidad||0) : 0;
    return {
      id: String(r.producto_id),
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      cantidad: Number(r.cantidad||0),
      precio: Number(p.precio||0),
      ubicacion: `Sucursal ${String(r.sucursal_id)}`,
      categoria: String(p.categoria_id||''),
      stock_minimo: Number(p.stock_minimo||0),
      cantidad_caducada: caducada,
      sucursal_id: Number(r.sucursal_id)
    };
  });
  return { ok: true, data };
}

export async function fetchInventoryWithStatus(sucursalId: number) {
  const client = tryClient();
  if (!client) return { ok: false, data: readStore<any[]>('gf_products', []) };
  const [invRes, prodRes] = await Promise.all([
    client.list(TBL.inventario_tienda, { select: 'id,producto_id,sucursal_id,cantidad,ubicacion', filters: [{ column: 'sucursal_id', op: 'eq', value: sucursalId }] }),
    client.list(TBL.productos, { select: 'id,codigo_barras,nombre,descripcion,precio,categoria_id,stock_minimo,fecha_caducidad' })
  ]);
  if (!invRes.ok || !prodRes.ok) return { ok: false, data: readStore<any[]>('gf_products', []) };
  const byProd = new Map<number, any>();
  for (const p of prodRes.data) byProd.set(Number(p.id), p);
  const today = new Date().toISOString().slice(0,10);
  const data = invRes.data.map((r: any) => {
    const p = byProd.get(Number(r.producto_id)) || {};
    const expired = p.fecha_caducidad && String(p.fecha_caducidad) < today;
    const caducada = expired ? Number(r.cantidad||0) : 0;
    return {
      id: String(r.producto_id),
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      cantidad: Number(r.cantidad||0),
      precio: Number(p.precio||0),
      ubicacion: `Sucursal ${String(r.sucursal_id)}`,
      categoria: String(p.categoria_id||''),
      stock_minimo: Number(p.stock_minimo||0),
      cantidad_caducada: caducada,
      sucursal_id: Number(r.sucursal_id)
    };
  });
  return { ok: true, data };
}

// Ventas y solicitudes
export async function postVenta(payload: any, _vendedor_id?: number, _sucursal_id?: number) {
  const client = tryClient(); if (!client) throw new Error('No server');
  // 1) Insert cabecera en ventas
  const ventaHeader = {
    folio: payload.folio,
    vendedor_id: payload.vendedor_id,
    sucursal_id: payload.sucursal_id,
    total: Number(payload.total||0),
    subtotal: Number(payload.subtotal||0),
    iva: Number(payload.iva||0),
    metodo_pago: payload.metodo_pago || 'efectivo',
    estado: 'completada'
  };
  const resVenta = await client.insert(TBL.ventas, ventaHeader);
  if (!resVenta.ok) throw resVenta.error;
  const ventaId = Array.isArray(resVenta.data) ? resVenta.data[0]?.id : resVenta.data?.id;

  const items = Array.isArray(payload.items) ? payload.items : [];
  // 2) Insert detalle_ventas y 3) actualizar inventario_tienda
  for (const it of items) {
    const detalle = {
      venta_id: ventaId,
      producto_id: Number(it.producto_id),
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precio_unitario),
      subtotal: Number(it.cantidad) * Number(it.precio_unitario),
      descuento: 0,
      promocion_id: null
    };
    const resDet = await client.insert(TBL.detalle_ventas, detalle);
    if (!resDet.ok) throw resDet.error;
    // Actualizar inventario: leer, calcular, patch
    const filters: Filter[] = [
      { column: 'producto_id', op: 'eq', value: Number(it.producto_id) },
      { column: 'sucursal_id', op: 'eq', value: Number(payload.sucursal_id) }
    ];
    const current = await client.findOne(TBL.inventario_tienda, filters, 'id,cantidad');
    if (current.ok && current.data) {
      const newQty = Math.max(0, Number(current.data.cantidad||0) - Number(it.cantidad||0));
      const up = await client.update(TBL.inventario_tienda, { cantidad: newQty }, [{ column: 'id', op: 'eq', value: current.data.id }]);
      if (!up.ok) throw up.error;
    }
  }
  return { ok: true, id: ventaId } as any;
}

export async function postSolicitud(payload: any): Promise<{ fromServer: boolean; data: any; error?: any }>{
  const client = tryClient();
  if (!client) {
    const local = { id: `REQ-${Date.now()}`, ...payload, estado: 'pendiente', fecha: new Date().toISOString() };
    return { fromServer: false, data: local, error: 'No server' };
  }
  const res = await client.insert(TBL.solicitudes, payload);
  if (res.ok) return { fromServer: true, data: Array.isArray(res.data) ? res.data[0] : res.data };
  const local = { id: `REQ-${Date.now()}`, ...payload, estado: 'pendiente', fecha: new Date().toISOString() };
  return { fromServer: false, data: local, error: res.error };
}

// Inventarios: helpers para ajustes y transferencias
export async function adjustInventarioAlmacen(producto_id: number, delta: number, actualizado_por?: number) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  const current = await client.findOne(TBL.inventario_almacen, [{ column: 'producto_id', op: 'eq', value: producto_id }], 'id,cantidad');
  if (current.ok && current.data) {
    const nueva = Math.max(0, Number(current.data.cantidad||0) + Number(delta||0));
    return client.update(TBL.inventario_almacen, { cantidad: nueva, actualizado_por }, [{ column: 'id', op: 'eq', value: current.data.id }]);
  }
  const cantidad = Math.max(0, Number(delta||0));
  return client.insert(TBL.inventario_almacen, { producto_id, cantidad, actualizado_por });
}

export async function upsertInventarioTienda(producto_id: number, sucursal_id: number, delta: number, actualizado_por?: number) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  const current = await client.findOne(TBL.inventario_tienda, [
    { column: 'producto_id', op: 'eq', value: producto_id },
    { column: 'sucursal_id', op: 'eq', value: sucursal_id }
  ], 'id,cantidad');
  if (current.ok && current.data) {
    const nueva = Math.max(0, Number(current.data.cantidad||0) + Number(delta||0));
    return client.update(TBL.inventario_tienda, { cantidad: nueva, actualizado_por }, [{ column: 'id', op: 'eq', value: current.data.id }]);
  }
  const cantidad = Math.max(0, Number(delta||0));
  return client.insert(TBL.inventario_tienda, { producto_id, sucursal_id, cantidad, actualizado_por });
}

export async function transferProductoASucursal(producto_id: number, sucursal_id: number, cantidad: number, actualizado_por?: number) {
  const delta = Number(cantidad||0);
  if (!producto_id || !sucursal_id || delta <= 0) return { ok: false, error: 'Datos inválidos' } as any;
  const dec = await adjustInventarioAlmacen(producto_id, -delta, actualizado_por);
  if (!dec.ok) return dec;
  const inc = await upsertInventarioTienda(producto_id, sucursal_id, delta, actualizado_por);
  return inc;
}

// Proveedores / Categorias / Sucursales / Promociones
export async function fetchProveedores() {
  const client = tryClient();
  if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' };
  return client.list(TBL.proveedores, { select: 'id,nombre,contacto,telefono,correo,direccion,activo,creado_por' });
}

export async function fetchCategorias() {
  const client = tryClient(); if (!client) return { ok: false, data: [] };
  return client.list(TBL.categorias, { select: 'id,nombre' });
}

export async function fetchSucursales() {
  const client = tryClient(); if (!client) return { ok: false, data: [] };
  // Alias para exponer id como 'id'
  return client.list(TBL.sucursales, { select: 'id:id_sucursal,nombre' });
}

export async function fetchPromociones() {
  const client = tryClient(); if (!client) return { ok: false, data: readStore<any[]>('gf_promotions', []) };
  const res = await client.list(TBL.promociones, { select: 'id,nombre,descripcion,tipo,valor_descuento,nuevo_precio,fecha_inicio,fecha_fin' });
  if (!res.ok) return { ok: false, data: readStore<any[]>('gf_promotions', []) };
  return { ok: true, data: res.data };
}

export async function createPromocion(payload: any) {
  const client = tryClient(); if (!client) return { ok: false, error: 'No server' } as any;
  return client.insert(TBL.promociones, payload);
}

export async function deletePromocion(id: string | number) {
  const client = tryClient(); if (!client) return { ok: false, error: 'No server' } as any;
  return client.remove(TBL.promociones, [{ column: 'id', op: 'eq', value: id }]);
}

// Proveedores CRUD específico para SupplierManagement
export async function createProveedor(payload: any) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  const clean = pick(payload, ['nombre','contacto','telefono','correo','direccion','activo','creado_por']);
  return client.insert(TBL.proveedores, clean);
}

export async function updateProveedor(id: number | string, payload: any) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  const clean = pick(payload, ['nombre','contacto','telefono','correo','direccion','activo']);
  return client.update(TBL.proveedores, clean, [{ column: 'id', op: 'eq', value: id }]);
}

export async function deleteProveedorHard(id: number | string) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  return client.remove(TBL.proveedores, [{ column: 'id', op: 'eq', value: id }]);
}
