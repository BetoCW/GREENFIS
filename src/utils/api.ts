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

export async function createDevolucionAlmacen(payload: { producto_id: number; sucursal_id?: number; cantidad: number; motivo?: string; tipo?: string; creado_por?: number; venta_id?: number }) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  // Detect if venta_id column exists to include it safely
  let supportsVentaId = false;
  try {
    const probe = await client.list(TBL.devoluciones, { select: '*', limit: 1 });
    if (probe.ok) {
      const sample = probe.data[0] || {};
      supportsVentaId = 'venta_id' in sample;
    }
  } catch {}
  const base: any = { producto_id: payload.producto_id, sucursal_id: payload.sucursal_id ?? null, cantidad: payload.cantidad, motivo: payload.motivo ?? null, tipo: payload.tipo ?? null, estado: 'para_devolucion', no_apto_venta: true, fecha: new Date().toISOString(), creado_por: payload.creado_por ?? null };
  if (supportsVentaId && payload.venta_id) base.venta_id = payload.venta_id;
  return client.insert(TBL.devoluciones, base);
}

export async function updateDevolucion(id: number|string, payload: any) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  return client.update(TBL.devoluciones, payload, [{ column: 'id', op: 'eq', value: id }]);
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

export async function createPedido(payload: { producto_id: number; proveedor_id: number; cantidad: number; creado_por?: number }) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  const base = { producto_id: payload.producto_id, proveedor_id: payload.proveedor_id, cantidad: payload.cantidad, estado: 'pendiente', creado_por: payload.creado_por };
  return client.insert(TBL.pedidos, base);
}

export async function approvePedido(id: number|string, aprobado_por?: number) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  const payload = { estado: 'aprobado', aprobado_por, fecha_aprobacion: new Date().toISOString() };
  return client.update(TBL.pedidos, payload, [{ column: 'id', op: 'eq', value: id }]);
}

export async function receivePedido(id: number|string, datos: { cantidad_recibida: number; recibido_por?: number }) {
  const client = tryClient(); if (!client) return { ok: false, error: 'Supabase client no inicializado' } as any;
  // Obtener pedido para validar cantidad
  const row = await client.findOne(TBL.pedidos, [{ column: 'id', op: 'eq', value: id }], 'id,producto_id,cantidad,estado');
  if (!row.ok || !row.data) return { ok: false, error: 'Pedido no encontrado' } as any;
  if (row.data.estado !== 'aprobado') return { ok: false, error: 'Pedido no está aprobado' } as any;
  const cantRec = Number(datos.cantidad_recibida||0);
  if (cantRec <= 0 || cantRec > Number(row.data.cantidad||0)) return { ok: false, error: 'Cantidad recibida inválida' } as any;
  // Actualizar pedido como recibido
  const payload = { estado: 'recibido', cantidad_recibida: cantRec, fecha_recepcion: new Date().toISOString(), recibido_por: datos.recibido_por, empresa_entrega: (datos as any).empresa_entrega ?? null, entregado_por: (datos as any).entregado_por ?? null };
  const upd = await client.update(TBL.pedidos, payload, [{ column: 'id', op: 'eq', value: id }]);
  if (!upd.ok) return upd;
  // Ajustar inventario de almacén (sumar cantidad recibida)
  await adjustInventarioAlmacen(Number(row.data.producto_id), cantRec, datos.recibido_por);
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
  // Probe columns to build safe insert
  try {
    const probe = await client.list(TBL.cortes_caja, { select: '*', limit: 1 });
    if (probe.ok) {
      const sample = probe.data[0] || {};
      // Filter base to only existing columns (plus fecha_corte, vendedor_id, sucursal_id) to avoid 400
      const allowed: any = {};
      Object.keys(base).forEach(k => { if (k in sample || k === 'fecha_corte' || k === 'vendedor_id' || k === 'sucursal_id') allowed[k] = (base as any)[k]; });
      const ins = await client.insert(TBL.cortes_caja, allowed);
      if (!ins.ok) return ins;
      const row = Array.isArray(ins.data) ? ins.data[0] : ins.data;
      return { ok: true, data: row } as any;
    }
  } catch {}
  // Fallback simple insert attempt
  const attempt = await client.insert(TBL.cortes_caja, base);
  return attempt;
}

export async function fetchCortesCaja(filters?: { vendedor_id?: number|string; sucursal_id?: number|string; fecha_inicio?: string; fecha_fin?: string }) {
  const client = tryClient(); if (!client) return { ok: false, data: [], error: 'Supabase client no inicializado' } as any;
  const f: Filter[] = [];
  if (filters?.vendedor_id != null && String(filters.vendedor_id).trim() !== '') f.push({ column: 'vendedor_id', op: 'eq', value: filters.vendedor_id });
  if (filters?.sucursal_id != null && String(filters.sucursal_id).trim() !== '') f.push({ column: 'sucursal_id', op: 'eq', value: filters.sucursal_id });
  const probe = await client.list(TBL.cortes_caja, { select: '*', limit: 1 });
  if (!probe.ok) return probe;
  const sample = probe.data[0] || {};
  const dateCol = ['fecha_corte','created_at','fecha','fecha_creacion'].find(c => c in sample) || 'id';
  const wanted = ['id','vendedor_id','sucursal_id','fecha_corte','ventas_totales','monto_total','monto_efectivo','monto_tarjeta','monto_transferencia','diferencia','observaciones'];
  const selectStr = wanted.filter(c => c in sample || c === 'id').join(',') || '*';
  const res = await client.list(TBL.cortes_caja, { select: selectStr, filters: f, order: { column: dateCol, ascending: false }, limit: 200 });
  if (!res.ok) {
    const noOrder = await client.list(TBL.cortes_caja, { select: selectStr, filters: f, limit: 200 });
    if (!noOrder.ok) return noOrder;
    return noOrder;
  }
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
