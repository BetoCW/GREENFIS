import { SupabaseCRUD, type ListOptions } from '../../utils/supabaseRest';

// Servicio genérico para productos e inventario vía Supabase REST
export class ProductosService {
	private client: SupabaseCRUD;
	private productos = (import.meta as any).env?.VITE_TBL_PRODUCTOS || 'productos';
	private invTienda = (import.meta as any).env?.VITE_TBL_INV_TIENDA || 'inventario_tienda';

	constructor() {
		this.client = new SupabaseCRUD();
	}

	// CRUD Productos (Gerente)
	listProductos(opts?: ListOptions) {
		return this.client.list(this.productos, { select: 'id,codigo_barras,nombre,descripcion,precio,categoria_id,proveedor_id,stock_minimo,activo', ...(opts||{}) });
	}
	createProducto(payload: any) {
		return this.client.insert(this.productos, payload);
	}
	updateProducto(id: string|number, payload: any) {
		return this.client.update(this.productos, payload, [{ column: 'id', op: 'eq', value: id }]);
	}
	deleteProducto(id: string|number) {
		// intentamos baja lógica y si no, borrado físico
		return this.client.update(this.productos, { activo: 0 }, [{ column: 'id', op: 'eq', value: id }]);
	}

	// Inventario por sucursal (Gerente/Almacén/Vendedor) sin vistas: combinamos en cliente
	async listInventarioAll() {
		const [inv, prods] = await Promise.all([
			this.client.list(this.invTienda, { select: 'id,producto_id,sucursal_id,cantidad,ubicacion' }),
			this.client.list(this.productos, { select: 'id,nombre,descripcion,precio,categoria_id,stock_minimo,fecha_caducidad' })
		]);
		if (!inv.ok || !prods.ok) return { ok: false, data: [] as any[] };
		const byProd = new Map<number, any>();
		for (const p of prods.data) byProd.set(Number(p.id), p);
		const today = new Date().toISOString().slice(0,10);
		const data = inv.data.map((r: any) => {
			const p = byProd.get(Number(r.producto_id)) || {};
			const expired = p.fecha_caducidad && String(p.fecha_caducidad) < today;
			return {
				id: String(r.producto_id),
				nombre: p.nombre || '',
				descripcion: p.descripcion || '',
				cantidad: Number(r.cantidad||0),
				precio: Number(p.precio||0),
				ubicacion: `Sucursal ${String(r.sucursal_id)}`,
				categoria: String(p.categoria_id||''),
				stock_minimo: Number(p.stock_minimo||0),
				cantidad_caducada: expired ? Number(r.cantidad||0) : 0,
				sucursal_id: Number(r.sucursal_id)
			};
		});
		return { ok: true, data };
	}
	async listInventarioBySucursal(sucursalId: number) {
		const [inv, prods] = await Promise.all([
			this.client.list(this.invTienda, { select: 'id,producto_id,sucursal_id,cantidad,ubicacion', filters: [{ column: 'sucursal_id', op: 'eq', value: sucursalId }] }),
			this.client.list(this.productos, { select: 'id,nombre,descripcion,precio,categoria_id,stock_minimo,fecha_caducidad' })
		]);
		if (!inv.ok || !prods.ok) return { ok: false, data: [] as any[] };
		const byProd = new Map<number, any>();
		for (const p of prods.data) byProd.set(Number(p.id), p);
		const today = new Date().toISOString().slice(0,10);
		const data = inv.data.map((r: any) => {
			const p = byProd.get(Number(r.producto_id)) || {};
			const expired = p.fecha_caducidad && String(p.fecha_caducidad) < today;
			return {
				id: String(r.producto_id),
				nombre: p.nombre || '',
				descripcion: p.descripcion || '',
				cantidad: Number(r.cantidad||0),
				precio: Number(p.precio||0),
				ubicacion: `Sucursal ${String(r.sucursal_id)}`,
				categoria: String(p.categoria_id||''),
				stock_minimo: Number(p.stock_minimo||0),
				cantidad_caducada: expired ? Number(r.cantidad||0) : 0,
				sucursal_id: Number(r.sucursal_id)
			};
		});
		return { ok: true, data };
	}
}

// Referencia REST
// GET:    {{ supabase_url }}/rest/v1/productos?select=*
// POST:   {{ supabase_url }}/rest/v1/productos
// PATCH:  {{ supabase_url }}/rest/v1/productos?id=eq.1
// DELETE: {{ supabase_url }}/rest/v1/productos?id=eq.1

