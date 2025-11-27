import { SupabaseCRUD, type Filter } from './supabaseRest';
import { readStore, writeStore } from './localStore';

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

// Normaliza registros de usuarios para que el front use un shape consistente
function mapUsuario(raw: any) {
  const pkColumn = 'id_usuario' in raw ? 'id_usuario' : ('usuario_id' in raw ? 'usuario_id' : 'id');
  const idVal = raw[pkColumn];
  return {
    id: idVal != null ? Number(idVal) : null,
    pkColumn,
    nombre: raw.nombre ?? '',
    correo: raw.correo ?? '',
    rol: raw.rol ?? '',
    sucursal_id: raw.sucursal_id ?? null,
    activo: raw.activo ?? true
  };
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
  const client = tryClient();
  if (!client) {
    // Fallback local: guardar en localStorage para desarrollo offline
    const localKey = 'gf_products';
    const list = readStore<any[]>(localKey, []);
    const newId = `LP-${Date.now()}`;
    const nuevo = {
      id: newId,
      nombre: payload.nombre || 'Producto sin nombre',
      descripcion: payload.descripcion || '',
      cantidad: 0,
      precio: Number(payload.precio||0),
      ubicacion: 'Sin sucursal',
      categoria: String(payload.categoria_id||''),
      stock_minimo: Number(payload.stock_minimo||0)
    };
    list.unshift(nuevo);
    writeStore(localKey, list);
    return { ok: true, data: nuevo, local: true, warning: 'Supabase no configurado: persistido solo en localStorage' } as any;
  }
  const res = await client.insert(TBL.productos, payload);
  if (res.ok) {
    try {
      const row = Array.isArray(res.data) ? res.data[0] : res.data;
      const productId = Number(row?.id);
      if (!Number.isNaN(productId)) {
        await adjustInventarioAlmacen(productId, 0, payload.creado_por);
      }
    } catch {}
  }
  return res;
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
  // Append products missing in any sucursal inventory (cantidad 0, ubicacion 'Sin sucursal')
  const presentIds = new Set(data.map(d => Number(d.id)));
  for (const p of prodRes.data) {
    const pid = Number(p.id);
    if (!presentIds.has(pid)) {
      data.push({
        id: String(pid),
        nombre: p.nombre || '',
        descripcion: p.descripcion || '',
        cantidad: 0,
        precio: Number(p.precio||0),
        ubicacion: 'Sin sucursal',
        categoria: String(p.categoria_id||''),
        stock_minimo: Number(p.stock_minimo||0),
        cantidad_caducada: 0,
        sucursal_id: -1
      });
    }
  }
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
  // Add missing products with cantidad 0 for this sucursal
  const presentIds = new Set(data.map(d => Number(d.id)));
  for (const p of prodRes.data) {
    const pid = Number(p.id);
    if (!presentIds.has(pid)) {
      data.push({
        id: String(pid),
        nombre: p.nombre || '',
        descripcion: p.descripcion || '',
        cantidad: 0,
        precio: Number(p.precio||0),
        ubicacion: `Sucursal ${String(sucursalId)}`,
        categoria: String(p.categoria_id||''),
        stock_minimo: Number(p.stock_minimo||0),
        cantidad_caducada: 0,
        sucursal_id: sucursalId
      });
    }
  }
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

// Ventas: lectura con filtros básicos (sucursal, vendedor, rango fecha)
export async function fetchVentas(filters?: { sucursal_id?: number|string; vendedor_id?: number|string; fecha_inicio?: string; fecha_fin?: string }) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' };
  const f: Filter[] = [];
  if (filters?.sucursal_id != null && String(filters.sucursal_id).trim() !== '') f.push({ column: 'sucursal_id', op: 'eq', value: filters.sucursal_id });
  if (filters?.vendedor_id != null && String(filters.vendedor_id).trim() !== '') f.push({ column: 'vendedor_id', op: 'eq', value: filters.vendedor_id });
  // Detect columns to build dynamic select and date filtering
  const probe = await client.list(TBL.ventas, { select: '*', limit: 1 });
  if (!probe.ok) return { ok: false, data: [], error: probe.error } as any;
  const sample = probe.data[0] || {};
  const dateColsPref = ['fecha','fecha_venta','created_at','fecha_creacion'];
  const dateCol = dateColsPref.find(c => c in sample);
  const wanted = ['id','folio','vendedor_id','sucursal_id','total','subtotal','iva','metodo_pago','estado'];
  if (dateCol) wanted.push(dateCol);
  const selectStr = wanted.filter(c => c === 'id' || c in sample).join(',') || '*';
  // If date range provided and dateCol exists, fetch without filtering then filter client side (to avoid complex PostgREST range if ambiguous type)
  const res = await client.list(TBL.ventas, { select: selectStr, filters: f, order: { column: dateCol || 'id', ascending: false }, limit: 500 });
  if (!res.ok) return res;
  let data = res.data;
  if (dateCol && (filters?.fecha_inicio || filters?.fecha_fin)) {
    const ini = filters?.fecha_inicio ? new Date(filters.fecha_inicio + 'T00:00:00') : null;
    const fin = filters?.fecha_fin ? new Date(filters.fecha_fin + 'T23:59:59') : null;
    data = data.filter((v: any) => {
      const dRaw = v[dateCol];
      if (!dRaw) return false;
      const dv = new Date(dRaw);
      if (ini && dv < ini) return false;
      if (fin && dv > fin) return false;
      return true;
    });
  }
  return { ok: true, data } as any;
}

// =============================
// Ventas agregadas (dashboard)
// =============================
export async function fetchVentasRange(fecha_inicio: string, fecha_fin: string, opts?: { sucursal_id?: number|string; vendedor_id?: number|string }) {
  return fetchVentas({ fecha_inicio, fecha_fin, sucursal_id: opts?.sucursal_id, vendedor_id: opts?.vendedor_id });
}

export async function fetchVentasAggregate(fecha_inicio: string, fecha_fin: string, opts?: { sucursal_id?: number|string; vendedor_id?: number|string }) {
  const ventasRes = await fetchVentasRange(fecha_inicio, fecha_fin, opts);
  if (!ventasRes.ok) return ventasRes as any;
  const ventas = ventasRes.data;
  let total = 0, tickets = 0, subtotal = 0, iva = 0;
  const metodoCount: Record<string, number> = {};
  for (const v of ventas) {
    total += Number(v.total||v.monto_total||0);
    tickets += 1;
    subtotal += Number(v.subtotal||0);
    iva += Number(v.iva||0);
    const metodo = String(v.metodo_pago||'desconocido');
    metodoCount[metodo] = (metodoCount[metodo]||0)+1;
  }
  const promedioTicket = tickets ? total / tickets : 0;
  return { ok: true, data: { total, tickets, subtotal, iva, promedioTicket, metodoCount } } as any;
}

export async function fetchTopProductos(fecha_inicio: string, fecha_fin: string, limit = 5, opts?: { sucursal_id?: number|string; vendedor_id?: number|string }) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' } as any;
  // Primero traer ventas en rango para filtrar detalle_ventas
  const ventasRes = await fetchVentasRange(fecha_inicio, fecha_fin, opts);
  if (!ventasRes.ok) return ventasRes as any;
  const ventas = ventasRes.data;
  const ids = ventas.map((v: any) => v.id).filter((id: any) => id != null);
  if (!ids.length) return { ok: true, data: [] };
  // Obtener detalles por lote (si muchos ids, dividir)
  const chunkSize = 100;
  const detalles: any[] = [];
  for (let i=0; i<ids.length; i+=chunkSize) {
    const slice = ids.slice(i, i+chunkSize);
    const detRes = await client.list(TBL.detalle_ventas, { select: 'id,venta_id,producto_id,cantidad,precio_unitario', filters: [{ column: 'venta_id', op: 'in', value: '('+slice.join(',')+')' }] });
    if (detRes.ok) detalles.push(...detRes.data);
  }
  // Agrupar por producto
  const agg: Record<string, { producto_id: number; cantidad: number; monto: number }> = {};
  for (const d of detalles) {
    const pid = Number(d.producto_id);
    const qty = Number(d.cantidad||0);
    const monto = qty * Number(d.precio_unitario||0);
    const k = String(pid);
    if (!agg[k]) agg[k] = { producto_id: pid, cantidad: 0, monto: 0 };
    agg[k].cantidad += qty;
    agg[k].monto += monto;
  }
  const list = Object.values(agg).sort((a,b) => b.cantidad - a.cantidad).slice(0, limit);
  // Map nombres de productos
  if (list.length) {
    const prodIds = list.map(p => p.producto_id);
    const prodsRes = await client.list(TBL.productos, { select: 'id,nombre', filters: [{ column: 'id', op: 'in', value: '('+prodIds.join(',')+')' }] });
    if (prodsRes.ok) {
      const nameMap = new Map<number,string>();
      for (const p of prodsRes.data) nameMap.set(Number(p.id), p.nombre);
      for (const row of list) (row as any).nombre = nameMap.get(row.producto_id) || `Producto ${row.producto_id}`;
    }
  }
  return { ok: true, data: list } as any;
}

export async function fetchMetodosPagoDist(fecha_inicio: string, fecha_fin: string, opts?: { sucursal_id?: number|string; vendedor_id?: number|string }) {
  const aggRes = await fetchVentasAggregate(fecha_inicio, fecha_fin, opts);
  if (!aggRes.ok) return aggRes as any;
  const metodoCount = aggRes.data.metodoCount || {};
  const totalMetodos = Object.values(metodoCount).reduce((a: number, b: any) => a + Number(b||0), 0) || 1;
  const dist = Object.entries(metodoCount).map(([metodo, count]) => {
    const cNum = Number(count||0);
    return { metodo, count: cNum, porcentaje: (cNum/totalMetodos)*100 };
  });
  return { ok: true, data: dist } as any;
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

// ----- Solicitudes CRUD (Gestión de Solicitudes) -----
// Lectura con filtros básicos (opcionalmente pasar sucursal_id, estado, producto_id, urgencia)
export async function fetchSolicitudes(filters?: { sucursal_id?: number|string; estado?: string; producto_id?: number|string; urgencia?: string; solicitante_id?: number|string }) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' };
  const f: Filter[] = [];
  if (filters?.sucursal_id != null && String(filters.sucursal_id).trim() !== '') f.push({ column: 'sucursal_id', op: 'eq', value: filters.sucursal_id });
  if (filters?.estado) f.push({ column: 'estado', op: 'eq', value: filters.estado });
  if (filters?.producto_id != null && String(filters.producto_id).trim() !== '') f.push({ column: 'producto_id', op: 'eq', value: filters.producto_id });
  if (filters?.urgencia) f.push({ column: 'urgencia', op: 'eq', value: filters.urgencia });
  if (filters?.solicitante_id != null && String(filters.solicitante_id).trim() !== '') f.push({ column: 'solicitante_id', op: 'eq', value: filters.solicitante_id });
  // Dynamic column detection to avoid 400 on missing columns
  const probe = await client.list(TBL.solicitudes, { select: '*', limit: 1 });
  if (!probe.ok) return probe;
  const sample = probe.data[0] || {};
  const wanted = ['id','sucursal_id','solicitante_id','producto_id','cantidad_solicitada','cantidad_aprobada','estado','motivo_rechazo','fecha_solicitud','urgencia','fecha_atencion'];
  const selectCols = wanted.filter(c => c === 'id' || c in sample);
  const selectStr = selectCols.length ? selectCols.join(',') : 'id';
  const res = await client.list(TBL.solicitudes, { select: selectStr, filters: f, order: sample.fecha_solicitud ? { column: 'fecha_solicitud', ascending: false } : undefined, limit: 200 });
  if (res.ok) return res;
  // Fallback: retry without order if order caused 400
  const fallback = await client.list(TBL.solicitudes, { select: selectStr, filters: f, limit: 200 });
  return fallback;
}

export async function createSolicitud(payload: any) {
  // Reutilizamos postSolicitud para mantener compatibilidad
  return postSolicitud(payload);
}

export async function updateSolicitud(id: number|string, payload: any) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  return client.update(TBL.solicitudes, payload, [{ column: 'id', op: 'eq', value: id }]);
}

export async function deleteSolicitud(id: number|string) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  return client.remove(TBL.solicitudes, [{ column: 'id', op: 'eq', value: id }]);
}

// Cumplir solicitud: crea transferencia a sucursal y marca solicitud como completada
export async function fulfillSolicitudToSucursal(params: { solicitud_id: number; producto_id: number; sucursal_id: number; cantidad: number; almacenista_id?: number }) {
  const { solicitud_id, producto_id, sucursal_id, cantidad, almacenista_id } = params;
  if (!solicitud_id || !producto_id || !sucursal_id || !cantidad || cantidad <= 0) return { ok: false, error: 'Datos inválidos' } as any;
  const tr = await createTransferencia({ producto_id, cantidad, sucursal_destino_id: sucursal_id, almacenista_id, solicitud_id });
  if (!tr.ok) return tr;
  const up = await updateSolicitud(solicitud_id, { estado: 'completada', cantidad_aprobada: cantidad, fecha_atencion: new Date().toISOString() });
  if (!up.ok) return up;
  return { ok: true, transferencia: tr.data } as any;
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

// ---- Extensiones CRUD promociones ----
export async function updatePromocion(id: number|string, payload: any) {
  const client = tryClient(); if (!client) return { ok: false, error: 'No server' } as any;
  return client.update(TBL.promociones, payload, [{ column: 'id', op: 'eq', value: id }]);
}

export async function togglePromocionActiva(id: number|string, activa: boolean) {
  return updatePromocion(id, { activa });
}

export async function fetchPromocionesFiltered(filters?: { producto_id?: number|string; activa?: boolean }) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'No server' };
  const f: Filter[] = [];
  if (filters?.producto_id != null && String(filters.producto_id).trim() !== '') f.push({ column: 'producto_id', op: 'eq', value: filters.producto_id });
  if (filters?.activa != null) f.push({ column: 'activa', op: 'eq', value: filters.activa });
  return client.list(TBL.promociones, { select: 'id,nombre,descripcion,producto_id,tipo,valor_descuento,nuevo_precio,fecha_inicio,fecha_fin,dias_semana,aplica_todas_sucursales,activa,creada_por,fecha_creacion,fecha_modificacion,modificada_por', filters: f });
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

// Usuarios (CRUD básico)
export async function fetchUsuarios() {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' };
  const res = await client.list(TBL.usuarios, { select: 'id_usuario,nombre,correo,rol,sucursal_id,activo' });
  if (!res.ok) return res;
  const mapped = res.data.map(mapUsuario);
  return { ok: true, data: mapped };
}

// Obtener un usuario por correo, prefiriendo filtro en servidor
export async function fetchUsuarioByCorreo(correo: string) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  // Intentar buscar con filtro eq en PostgREST
  try {
    const res = await client.list(TBL.usuarios, { select: '*', filters: [{ column: 'correo', op: 'eq', value: String(correo).trim().toLowerCase() }], limit: 1 });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) return { ok: true, data: res.data[0] } as any;
  } catch {}
  // Fallback: traer todo y filtrar cliente (menos eficiente)
  try {
    const all = await client.list(TBL.usuarios, { select: '*', limit: 500 });
    if (all.ok) {
      const found = (all.data||[]).find((u: any) => String(u.correo).trim().toLowerCase() === String(correo).trim().toLowerCase());
      if (found) return { ok: true, data: found } as any;
      return { ok: false, error: 'not-found' } as any;
    }
    return all as any;
  } catch (e) {
    return { ok: false, error: e } as any;
  }
}

export async function createUsuario(payload: any) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  const base: any = pick(payload, ['nombre','correo','rol','sucursal_id','contrasena']);
  const res = await client.insert(TBL.usuarios, base);
  if (!res.ok) return res;
  const data = Array.isArray(res.data) ? res.data.map(mapUsuario) : mapUsuario(res.data);
  return { ok: true, data }; 
}

export async function updateUsuario(id: number | string, payload: any, pkColumn: string = 'id_usuario') {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  const base: any = pick(payload, ['nombre','correo','rol','sucursal_id']);
  if (payload.contrasena) base.contrasena = payload.contrasena;
  let attempt = await client.update(TBL.usuarios, base, [{ column: pkColumn, op: 'eq', value: id }]);
  if (!attempt.ok && attempt.error) {
    const msg = JSON.stringify(attempt.error);
    if (/column.*contrasena/i.test(msg)) {
      const clone = { ...base }; delete clone.contrasena;
      attempt = await client.update(TBL.usuarios, clone, [{ column: pkColumn, op: 'eq', value: id }]);
    }
  }
  // If update returned empty representation, verify PK exists; if still exists, means filter failed (wrong PK column)
  if (attempt.ok && Array.isArray(attempt.data) && attempt.data.length === 0) {
    const verify = await client.findOne(TBL.usuarios, [{ column: pkColumn, op: 'eq', value: id }], pkColumn);
    if (verify.ok && verify.data) {
      return { ok: false, error: { message: 'PK mismatch: no rows updated', pkTried: pkColumn, id } } as any;
    }
  }
  if (!attempt.ok) return attempt;
  const data = Array.isArray(attempt.data) ? attempt.data.map(mapUsuario) : mapUsuario(attempt.data);
  return { ok: true, data } as any;
}

export async function deleteUsuario(id: number | string, pkColumn: string = 'id_usuario') {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  const hard = await client.remove(TBL.usuarios, [{ column: pkColumn, op: 'eq', value: id }]);
  if (!hard.ok) return hard;
  const verify = await client.findOne(TBL.usuarios, [{ column: pkColumn, op: 'eq', value: id }], pkColumn);
  if (verify.ok && verify.data) return { ok: false, error: { message: 'PK mismatch: row still exists after delete', pkTried: pkColumn, id } } as any;
  return { ok: true } as any;
}

// =============================
// Eventos recientes (para dashboard almacenista)
// =============================
// Combina últimas acciones visibles del gerente: productos creados/modificados, promociones creadas/modificadas,
// solicitudes aprobadas/rechazadas, transferencias creadas y pedidos aprobados. Devuelve top N por fecha.
export async function fetchRecentGerenteEvents(limit: number = 5) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' };
  // Helper para solicitar tabla con orden descendente por fecha
  async function grab(table: string, select: string, dateCol: string, tipo: string) {
    try {
      const res = await client!.list(table, { select, order: { column: dateCol, ascending: false }, limit });
      if (!res.ok) return [];
      return (res.data || []).map((r: any) => ({
        id: r.id ?? r.id_solicitud ?? r.id_transferencia ?? r.id_pedido,
        tipo,
        fecha: r[dateCol] || r.fecha || r.fecha_creacion || r.fecha_modificacion || null,
        detalle: r.nombre || r.descripcion || r.estado || ''
      }));
    } catch { return []; }
  }

  const [promos, prods, solicitudes, transferencias, pedidos] = await Promise.all([
    grab(TBL.promociones, 'id,nombre,fecha_creacion,fecha_modificacion,activa', 'fecha_modificacion', 'Promoción'),
    grab(TBL.productos, 'id,nombre,fecha_creacion,fecha_modificacion', 'fecha_modificacion', 'Producto'),
    grab(TBL.solicitudes, 'id,estado,fecha_solicitud,cantidad_solicitada,cantidad_aprobada', 'fecha_solicitud', 'Solicitud'),
    grab(TBL.transferencias, 'id,estado,fecha_transferencia,cantidad', 'fecha_transferencia', 'Transferencia'),
    grab(TBL.pedidos, 'id,estado,fecha_solicitud,cantidad', 'fecha_solicitud', 'Pedido')
  ]);

  const all = [...promos, ...prods, ...solicitudes, ...transferencias, ...pedidos]
    .filter(e => e.fecha)
    .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, limit);

  return { ok: true, data: all };
}

// =============================
// Inventario Almacén detallado
// =============================
export async function fetchInventarioAlmacen() {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' };
  const [invRes, prodRes] = await Promise.all([
    client.list(TBL.inventario_almacen, { select: 'id,producto_id,cantidad,ubicacion,ultima_actualizacion' }),
    client.list(TBL.productos, { select: 'id,nombre,stock_minimo,fecha_caducidad' })
  ]);
  if (!invRes.ok || !prodRes.ok) return { ok: false, data: [], error: invRes.error || prodRes.error };
  const byProd = new Map<number, any>();
  for (const p of prodRes.data) byProd.set(Number(p.id), p);
  const today = new Date().toISOString().slice(0,10);
  const data = invRes.data.map((r: any) => {
    const p = byProd.get(Number(r.producto_id)) || {};
    const fechaCad = p.fecha_caducidad ? String(p.fecha_caducidad) : null;
    const caducada = fechaCad ? (fechaCad < today) : false;
    return {
      id: r.id,
      producto_id: Number(r.producto_id),
      nombre: p.nombre || '',
      cantidad: Number(r.cantidad||0),
      ubicacion: r.ubicacion || '',
      stock_minimo: Number(p.stock_minimo||0),
      fecha_caducidad: fechaCad,
      caducada,
      ultima_actualizacion: r.ultima_actualizacion
    };
  });
  return { ok: true, data };
}

export async function deleteInventarioAlmacenProducto(producto_id: number) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  // remove row by producto_id
  return client.remove(TBL.inventario_almacen, [{ column: 'producto_id', op: 'eq', value: producto_id }]);
}

export async function purgeExpiredInventarioAlmacen() {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  const inv = await fetchInventarioAlmacen();
  if (!inv.ok) return inv as any;
  const expired = inv.data.filter((r: any) => r.caducada);
  for (const ex of expired) {
    await client.remove(TBL.inventario_almacen, [{ column: 'producto_id', op: 'eq', value: ex.producto_id }]);
  }
  return { ok: true, removed: expired.length } as any;
}

// =============================
// Transferencias inventario
// =============================
export async function fetchTransferencias(filters?: { estado?: string; producto_id?: number|string; sucursal_destino_id?: number|string }) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' };
  const f: Filter[] = [];
  if (filters?.estado) f.push({ column: 'estado', op: 'eq', value: filters.estado });
  if (filters?.producto_id != null && String(filters.producto_id).trim() !== '') f.push({ column: 'producto_id', op: 'eq', value: filters.producto_id });
  if (filters?.sucursal_destino_id != null && String(filters.sucursal_destino_id).trim() !== '') f.push({ column: 'sucursal_destino_id', op: 'eq', value: filters.sucursal_destino_id });
  return client.list(TBL.transferencias, { select: 'id,solicitud_id,almacenista_id,producto_id,cantidad,sucursal_destino_id,fecha_transferencia,estado,fecha_completado,recibido_por', filters: f, order: { column: 'fecha_transferencia', ascending: false }, limit: 50 });
}

export async function createTransferencia(payload: { producto_id: number; cantidad: number; sucursal_destino_id: number; almacenista_id?: number; solicitud_id?: number }) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  // Insert record
  const ins = await client.insert(TBL.transferencias, payload);
  if (!ins.ok) return ins;
  // Ajustar inventario almacén (disminuir)
  await adjustInventarioAlmacen(payload.producto_id, -Math.abs(payload.cantidad), payload.almacenista_id);
  return ins;
}

// Actualiza el estado de una transferencia y aplica efectos colaterales.
export async function updateTransferenciaEstado(id: number|string, nuevoEstado: 'en_transito'|'completada'|'pendiente') {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  // Obtener transferencia para conocer producto, cantidad y destino
  const row = await client.findOne(TBL.transferencias, [{ column: 'id', op: 'eq', value: id }], 'id,producto_id,cantidad,sucursal_destino_id,estado');
  if (!row.ok || !row.data) return { ok: false, error: 'Transferencia no encontrada' } as any;
  const prev = row.data;
  const upd = await client.update(TBL.transferencias, { estado: nuevoEstado, fecha_completado: nuevoEstado === 'completada' ? new Date().toISOString() : null }, [{ column: 'id', op: 'eq', value: id }]);
  if (!upd.ok) return upd;
  // Si se marca como completada, reflejar en inventario de tienda (sumar cantidad)
  if (nuevoEstado === 'completada') {
    try {
      const producto_id = Number(prev.producto_id);
      const sucursal_id = Number(prev.sucursal_destino_id);
      const cantidad = Number(prev.cantidad||0);
      if (!Number.isNaN(producto_id) && !Number.isNaN(sucursal_id) && cantidad > 0) {
        await upsertInventarioTienda(producto_id, sucursal_id, cantidad);
      }
    } catch {}
  }
  return upd;
}

// =============================
// Devoluciones (control en almacén)
// =============================
export async function fetchDevoluciones(filters?: { estado?: string; producto_id?: number|string; sucursal_id?: number|string }) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' };
  const f: Filter[] = [];
  if (filters?.estado) f.push({ column: 'estado', op: 'eq', value: filters.estado });
  if (filters?.producto_id != null && String(filters.producto_id).trim() !== '') f.push({ column: 'producto_id', op: 'eq', value: filters.producto_id });
  if (filters?.sucursal_id != null && String(filters.sucursal_id).trim() !== '') f.push({ column: 'sucursal_id', op: 'eq', value: filters.sucursal_id });
  // Detect columns to avoid 400
  const probe = await client.list(TBL.devoluciones, { select: '*', limit: 1 });
  if (!probe.ok) return { ok: false, data: [], error: probe.error } as any;
  const sample = probe.data[0] || {};
  const wanted = ['id','producto_id','sucursal_id','cantidad','motivo','tipo','estado','fecha','no_apto_venta'];
  const sel = wanted.filter(c => c in sample || c==='id').join(',') || '*';
  const orderCol = ['fecha','created_at','id'].find(c => c in sample) || 'id';
  const res = await client.list(TBL.devoluciones, { select: sel, filters: f, order: { column: orderCol, ascending: false }, limit: 100 });
  if (res.ok) return res;
  const noOrder = await client.list(TBL.devoluciones, { select: sel, filters: f, limit: 100 });
  return noOrder;
}

export async function createDevolucionAlmacen(payload: { producto_id: number; sucursal_id?: number; cantidad: number; motivo?: string; tipo?: string; creado_por?: number; venta_id?: number; vendedor_id?: number }) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  // Detect available columns on devoluciones to avoid 400s
  const probe = await client.list(TBL.devoluciones, { select: '*', limit: 1 });
  if (!probe.ok) return probe as any;
  const sample = probe.data[0] || {};
  const cols = new Set(Object.keys(sample));
  // Determine accepted estados (avoid custom no-valid state)
  const estado = cols.has('estado') ? 'pendiente' : undefined; // estados permitidos: pendiente/aprobada/rechazada/completada
  const base: any = {};
  if (cols.has('producto_id')) base.producto_id = payload.producto_id;
  if (cols.has('cantidad')) base.cantidad = payload.cantidad;
  if (cols.has('sucursal_id')) base.sucursal_id = payload.sucursal_id ?? null;
  if (cols.has('motivo')) base.motivo = payload.motivo ?? null;
  if (cols.has('tipo')) base.tipo = payload.tipo ?? null;
  if (estado) base.estado = estado;
  if (cols.has('no_apto_venta')) base.no_apto_venta = true;
  if (cols.has('fecha')) base.fecha = new Date().toISOString();
  if (cols.has('creado_por')) base.creado_por = payload.creado_por ?? null;
  if (cols.has('venta_id') && payload.venta_id) base.venta_id = payload.venta_id;
  if (cols.has('vendedor_id') && payload.vendedor_id) base.vendedor_id = payload.vendedor_id;
  // Fallback minimal payload: if table is cabecera-only (venta_id, vendedor_id, sucursal_id, motivo)
  const expectingCabeceraVenta = cols.has('venta_id') && cols.has('vendedor_id') && !cols.has('producto_id') && !cols.has('cantidad');
  if (expectingCabeceraVenta) {
    // Must have required NOT NULL columns: venta_id, vendedor_id, sucursal_id, motivo
    if (!payload.venta_id || !payload.vendedor_id || !payload.sucursal_id || !payload.motivo) {
      return { ok: false, error: 'Devolución requiere venta_id, vendedor_id, sucursal_id y motivo (según schema actual). Proporcione esos campos.' } as any;
    }
    base.venta_id = payload.venta_id;
    base.vendedor_id = payload.vendedor_id;
    base.sucursal_id = payload.sucursal_id;
    base.motivo = payload.motivo;
    if (estado) base.estado = estado;
  } else if (Object.keys(base).length === 0) {
    // If we still have nothing, return explanatory error
    return { ok: false, error: 'No se pudieron mapear columnas para la devolución: revise estructura de tabla.' } as any;
  }
  return client.insert(TBL.devoluciones, base);
}

export async function updateDevolucion(id: number|string, payload: any) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  return client.update(TBL.devoluciones, payload, [{ column: 'id', op: 'eq', value: id }]);
}

// =============================
// Detalle Devoluciones helpers
// =============================
export async function fetchDetalleDevolucionesByDevolucionIds(ids: Array<number|string>) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' } as any;
  if (!ids || !ids.length) return { ok: true, data: [] } as any;
  const chunkSize = 100;
  const all: any[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize);
    const res = await client.list(TBL.detalle_devoluciones, { select: 'id,devolucion_id,producto_id,cantidad,precio_unitario,subtotal,motivo', filters: [{ column: 'devolucion_id', op: 'in', value: slice }] });
    if (res.ok) all.push(...res.data);
  }
  return { ok: true, data: all } as any;
}

export function buildDetallesMap(detalles: any[]) {
  const map = new Map<number, any[]>();
  for (const d of detalles) {
    const key = Number(d.devolucion_id);
    const arr = map.get(key) || [];
    arr.push({ producto_id: Number(d.producto_id), cantidad: Number(d.cantidad||0), motivo: d.motivo, subtotal: Number(d.subtotal||0) });
    map.set(key, arr);
  }
  return map;
}

// Ajustar inventario de almacén al completar una devolución:
// Suma cantidades de detalle_devoluciones por producto y añade al inventario_almacen.
export async function applyDevolucionToAlmacen(devolucion_id: number) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  // Get detalles for this devolución
  const detRes = await client.list(TBL.detalle_devoluciones, { select: 'producto_id,cantidad', filters: [{ column: 'devolucion_id', op: 'eq', value: devolucion_id }] });
  if (!detRes.ok) return detRes as any;
  const agg: Record<number, number> = {};
  for (const d of detRes.data) {
    const pid = Number(d.producto_id);
    const qty = Number(d.cantidad||0);
    agg[pid] = (agg[pid]||0) + qty;
  }
  for (const [pidStr, qty] of Object.entries(agg)) {
    const pid = Number(pidStr);
    if (!Number.isNaN(pid) && qty > 0) {
      await adjustInventarioAlmacen(pid, qty);
    }
  }
  return { ok: true } as any;
}

// =============================
// Pedidos a proveedores (flujo paso a paso)
// =============================
// Estados esperados: 'pendiente' -> 'aprobado' -> 'recibido'
// Campos adicionales gestionados: cantidad_recibida, fecha_recepcion, recibido_por, aprobado_por, fecha_aprobacion
export async function fetchPedidos(filters?: { estado?: string; proveedor_id?: number|string; producto_id?: number|string }) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' };
  const f: Filter[] = [];
  if (filters?.estado) f.push({ column: 'estado', op: 'eq', value: filters.estado });
  if (filters?.proveedor_id != null && String(filters.proveedor_id).trim() !== '') f.push({ column: 'proveedor_id', op: 'eq', value: filters.proveedor_id });
  if (filters?.producto_id != null && String(filters.producto_id).trim() !== '') f.push({ column: 'producto_id', op: 'eq', value: filters.producto_id });
  // Estrategia simplificada: detectar columnas primero sin ORDER para evitar 400.
  const probe = await client.list(TBL.pedidos, { select: '*', limit: 1 });
  if (!probe.ok) return { ok: false, data: [], error: probe.error } as any;
  const sample = probe.data[0] || {};
  const dateColumnsPreference = ['fecha_solicitud','fecha_aprobacion','fecha_recepcion','created_at','updated_at','fecha_creacion'];
  const orderCol = dateColumnsPreference.find(c => c in sample) || 'id';
  const selectCols: string[] = [];
  const wanted = ['id','producto_id','proveedor_id','cantidad','cantidad_recibida','estado','fecha_solicitud','fecha_aprobacion','fecha_recepcion','aprobado_por','recibido_por','empresa_entrega','entregado_por'];
  for (const w of wanted) { if (w in sample || w === 'id') selectCols.push(w); }
  const selectStr = selectCols.length ? selectCols.join(',') : '*';
  // Hacer query final con ORDER solo si la columna existe en muestra (si 'id', siempre existe)
  const finalRes = await client.list(TBL.pedidos, { select: selectStr, filters: f, order: { column: orderCol, ascending: false }, limit: 100 });
  if (finalRes.ok) return finalRes;
  // Si falla (p.e. por ORDER en col inexistente), reintenta sin order
  const noOrder = await client.list(TBL.pedidos, { select: selectStr, filters: f, limit: 100 });
  return noOrder.ok ? noOrder : { ok: false, data: [], error: noOrder.error } as any;
}

export async function createPedido(payload: { producto_id: number; proveedor_id: number; cantidad: number; precio_compra: number; solicitante_id?: number }) {
  const client = tryClient();
  const base = { producto_id: payload.producto_id, proveedor_id: payload.proveedor_id, solicitante_id: payload.solicitante_id, cantidad: payload.cantidad, precio_compra: payload.precio_compra, estado: 'pendiente' };
  if (!client) {
    const key = 'gf_pedidos';
    const list = readStore<any[]>(key, []);
    const nuevo = { id: `PED-${Date.now()}`, ...base, fecha_solicitud: new Date().toISOString() };
    list.unshift(nuevo);
    writeStore(key, list);
    return { ok: true, data: nuevo, local: true, warning: 'Pedido guardado localmente (sin servidor)' } as any;
  }
  return client.insert(TBL.pedidos, base);
}

export async function approvePedido(id: number|string, aprobado_por?: number) {
  const client = tryClient();
  const payload = { estado: 'aprobado', aprobado_por, fecha_aprobacion: new Date().toISOString() };
  if (!client) {
    const key = 'gf_pedidos';
    const list = readStore<any[]>(key, []);
    const idx = list.findIndex(p => String(p.id) === String(id));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload };
      writeStore(key, list);
      return { ok: true, data: list[idx], local: true } as any;
    }
    return { ok: false, error: 'Pedido no encontrado localmente' } as any;
  }
  return client.update(TBL.pedidos, payload, [{ column: 'id', op: 'eq', value: id }]);
}

export async function receivePedido(id: number|string, datos: { recibido_por?: number }) {
  const client = tryClient();
  if (!client) {
    const key = 'gf_pedidos';
    const list = readStore<any[]>(key, []);
    const idx = list.findIndex(p => String(p.id) === String(id));
    if (idx < 0) return { ok: false, error: 'Pedido no encontrado local' } as any;
    const pedido = list[idx];
    if (pedido.estado !== 'aprobado') return { ok: false, error: 'Pedido no está aprobado (local)' } as any;
    const payload = { estado: 'recibido', fecha_recepcion: new Date().toISOString(), recibido_por: datos.recibido_por };
    list[idx] = { ...pedido, ...payload };
    // Fallback local: actualizar inventario local almacen
    try {
      const invKey = 'gf_inv_almacen';
      const inv = readStore<any[]>(invKey, []);
      const prodRow = inv.find(r => String(r.producto_id) === String(pedido.producto_id));
      if (prodRow) {
        prodRow.cantidad = Number(prodRow.cantidad||0) + Number(pedido.cantidad||0);
      } else {
        inv.push({ producto_id: pedido.producto_id, cantidad: Number(pedido.cantidad||0), ultima_actualizacion: new Date().toISOString() });
      }
      writeStore(invKey, inv);
    } catch {}
    writeStore(key, list);
    return { ok: true, data: list[idx], local: true } as any;
  }
  // Incluir precio_compra para posible actualización del precio de venta del producto (se usa como precio final según UI)
  const row = await client.findOne(TBL.pedidos, [{ column: 'id', op: 'eq', value: id }], 'id,producto_id,cantidad,estado,precio_compra');
  if (!row.ok || !row.data) return { ok: false, error: 'Pedido no encontrado' } as any;
  if (row.data.estado !== 'aprobado') return { ok: false, error: 'Pedido no está aprobado' } as any;
  const payload = { estado: 'recibido', fecha_recepcion: new Date().toISOString(), recibido_por: datos.recibido_por };
  const upd = await client.update(TBL.pedidos, payload, [{ column: 'id', op: 'eq', value: id }]);
  if (!upd.ok) return upd;
  // Ajustar inventario de almacén sumando la cantidad del pedido
  try { await adjustInventarioAlmacen(Number(row.data.producto_id), Number(row.data.cantidad||0), datos.recibido_por); } catch {}
  // Actualizar precio del producto si se proporcionó precio_compra (tomado como precio de venta según requerimiento)
  try {
    const precio = Number(row.data.precio_compra);
    if (!Number.isNaN(precio) && precio > 0) {
      await updateProduct(Number(row.data.producto_id), { precio });
    }
  } catch {}
  return upd;
}

export async function deletePedido(id: number|string) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  return client.remove(TBL.pedidos, [{ column: 'id', op: 'eq', value: id }]);
}

// =============================
// Corte de Caja (por vendedor)
// =============================
export async function createCorteCaja(payload: { vendedor_id: number; sucursal_id: number; fecha_corte?: string; ventas_totales: number; monto_total: number; monto_efectivo: number; monto_tarjeta: number; monto_transferencia: number; diferencia: number; observaciones?: string }) {
  const client = tryClient();
  const fecha_corte = payload.fecha_corte || new Date().toISOString();
  const base = { ...payload, fecha_corte };
  if (!client) {
    // Fallback local shape
    const local = { id: `LC-${Date.now()}`, ...base };
    return { ok: false, data: local, error: 'Supabase client no inicializado', local: true } as any;
  }
  // First try: insert only known schema keys to minimize 400s on unknown columns
  const knownKeys = [
    'fecha_corte', 'ventas_totales', 'monto_total', 'monto_efectivo',
    'monto_tarjeta', 'monto_transferencia', 'diferencia', 'observaciones',
    'cerrado_por'
  ];
  const normalized: any = {};
  for (const k of knownKeys) {
    if ((base as any)[k] !== undefined) normalized[k] = (base as any)[k];
  }
  let ins = await client.insert(TBL.cortes_caja, normalized);
  if (ins.ok) {
    const row = Array.isArray(ins.data) ? ins.data[0] : ins.data;
    return { ok: true, data: row } as any;
  }

  // Fallback: probe columns and filter strictly by existing columns
  try {
    const probe = await client.list(TBL.cortes_caja, { select: '*', limit: 1 });
    if (probe.ok) {
      const sample = probe.data[0] || {};
      const allowed: any = {};
      Object.keys(base).forEach(k => { if (k in sample || k === 'fecha_corte') allowed[k] = (base as any)[k]; });
      ins = await client.insert(TBL.cortes_caja, allowed);
      if (!ins.ok) return ins;
      const row = Array.isArray(ins.data) ? ins.data[0] : ins.data;
      return { ok: true, data: row } as any;
    }
  } catch {}

  // Last resort: try full base as-is
  return client.insert(TBL.cortes_caja, base);
}

export async function fetchCortesCaja(filters?: { vendedor_id?: number|string; sucursal_id?: number|string; fecha_inicio?: string; fecha_fin?: string }) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' } as any;
  // Probe columns first to avoid filtering on non-existent columns
  let sample: any = {};
  try {
    const probe = await client.list(TBL.cortes_caja, { select: '*', limit: 1 });
    if (probe.ok) sample = probe.data[0] || {};
  } catch {}

  const f: Filter[] = [];
  const hasVend = 'vendedor_id' in sample;
  const hasSuc = 'sucursal_id' in sample;
  if (filters?.vendedor_id != null && String(filters.vendedor_id).trim() !== '' && hasVend) f.push({ column: 'vendedor_id', op: 'eq', value: filters.vendedor_id });
  if (filters?.sucursal_id != null && String(filters.sucursal_id).trim() !== '' && hasSuc) f.push({ column: 'sucursal_id', op: 'eq', value: filters.sucursal_id });

  // Always select all to avoid missing columns when table is empty or schema varies
  const res = await client.list(TBL.cortes_caja, { select: '*', filters: f, limit: 500 });
  if (!res.ok) return res as any;

  let data: any[] = Array.isArray(res.data) ? res.data : [];
  const dateCandidates = ['fecha_corte','fecha','created_at','fecha_creacion'];
  if (filters?.fecha_inicio || filters?.fecha_fin) {
    const ini = filters?.fecha_inicio ? new Date(filters.fecha_inicio + 'T00:00:00') : null;
    const fin = filters?.fecha_fin ? new Date(filters.fecha_fin + 'T23:59:59') : null;
    data = data.filter((row: any) => {
      const raw = dateCandidates.map(k => row?.[k]).find(Boolean);
      if (!raw) return false;
      const dv = new Date(raw);
      if (isNaN(dv.getTime())) return false;
      if (ini && dv < ini) return false;
      if (fin && dv > fin) return false;
      return true;
    });
  }
  // Sort desc by first available date candidate, fallback to id desc
  data.sort((a: any, b: any) => {
    const ra = dateCandidates.map(k => a?.[k]).find(Boolean) || a?.id;
    const rb = dateCandidates.map(k => b?.[k]).find(Boolean) || b?.id;
    const da = new Date(ra).getTime();
    const db = new Date(rb).getTime();
    return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
  });
  return { ok: true, data } as any;
}
