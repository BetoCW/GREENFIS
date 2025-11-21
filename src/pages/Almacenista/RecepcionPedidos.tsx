import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { fetchPedidos, approvePedido, receivePedido, deletePedido, fetchProducts, fetchProveedores, createPedido } from '../../utils/api';

export default function RecepcionPedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [recepcionEditId, setRecepcionEditId] = useState<number | null>(null);
  const [nuevo, setNuevo] = useState<{ producto_id: string; proveedor_id: string; cantidad: string; precio_compra: string }>({ producto_id: '', proveedor_id: '', cantidad: '', precio_compra: '' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [pedRes, prodRes, provRes] = await Promise.all([
        fetchPedidos(),
        fetchProducts(),
        fetchProveedores()
      ]);
      if (pedRes.ok) setPedidos(pedRes.data); else setPedidos([]);
      if (Array.isArray(prodRes)) setProductos(prodRes); else setProductos([]);
      if (provRes.ok) setProveedores(provRes.data); else setProveedores([]);
      if (!pedRes.ok || !provRes.ok) setError('Error cargando algunos datos');
    } catch (e:any) { setError(e.message||String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const aprobarPedido = async (id: number) => {
    if (!confirm('Aprobar pedido?')) return;
    setProcessingId(id);
    try {
      const res = await approvePedido(id, user?.id);
      if (!res.ok) throw new Error('Error aprobando pedido');
      setPedidos(p => p.map(it => it.id === id ? { ...it, estado: 'aprobado', aprobado_por: user?.id, fecha_aprobacion: new Date().toISOString() } : it));
    } catch(e:any){ alert(e.message||'Error'); }
    setProcessingId(null);
  };

  const iniciarRecepcion = (id: number) => {
    setRecepcionEditId(id);
  };

  const cancelarRecepcion = () => {
    setRecepcionEditId(null);
  };

  const crearPedido = async () => {
    const pidStr = nuevo.producto_id.trim();
    const provStr = nuevo.proveedor_id.trim();
    const pid = Number(pidStr);
    const prov = Number(provStr);
    const cant = Number(nuevo.cantidad);
    const precio = Number(nuevo.precio_compra);
    if (!pidStr || !provStr || Number.isNaN(pid) || pid <= 0 || Number.isNaN(prov) || prov <= 0 || Number.isNaN(cant) || cant <= 0 || Number.isNaN(precio) || precio <= 0) {
      alert('Complete producto, proveedor, cantidad (>0) y precio (>0) con valores numéricos válidos');
      return;
    }
    setCreating(true);
    try {
      const res = await createPedido({ producto_id: pid, proveedor_id: prov, cantidad: cant, precio_compra: precio, solicitante_id: user?.id });
      if (!res.ok) throw new Error('Error creando pedido');
      const inserted = Array.isArray(res.data) ? res.data[0] : res.data;
      setPedidos(p => [inserted, ...p]);
      setNuevo({ producto_id: '', proveedor_id: '', cantidad: '', precio_compra: '' });
    } catch(e:any){ alert(e.message||'Error'); }
    setCreating(false);
  };

  const guardarRecepcion = async (id: number) => {
    if (!confirm('Confirmar recepción de pedido?')) return;
    setProcessingId(id);
    try {
      const res = await receivePedido(id, { recibido_por: user?.id });
      if (!res.ok) throw new Error('Error registrando recepción');
      setPedidos(p => p.map(it => it.id === id ? { ...it, estado: 'recibido', fecha_recepcion: new Date().toISOString(), recibido_por: user?.id } : it));
      cancelarRecepcion();
    } catch(e:any){ alert(e.message||'Error'); }
    setProcessingId(null);
  };

  const rechazarPedido = async (id: number) => {
    if (!confirm('Eliminar pedido?')) return;
    setProcessingId(id);
    try {
      const res = await deletePedido(id);
      if (!res.ok) throw new Error('Error eliminando pedido');
      setPedidos(p => p.filter(x => x.id !== id));
    } catch(e:any){ alert(e.message||'Error'); }
    setProcessingId(null);
  };
  const getProductoNombre = (pid: number) => {
    const p = productos.find((x) => Number(x.id) === Number(pid));
    return p ? p.nombre : String(pid);
  };

  const getProveedorNombre = (provId: number) => {
    const p = proveedores.find((x) => Number(x.id) === Number(provId));
    return p ? p.nombre : String(provId);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Recepción de Pedidos - Almacén</h1>
          {/**
           * Esta pantalla muestra los pedidos realizados a proveedores. Usa los endpoints del backend para obtener la lista
           * de pedidos, productos y proveedores. Las acciones disponibles son:
           * - Aprobar pedido: actualiza el estado a 'aprobado' en el servidor.
           * - Marcar recibido: marca el pedido como recibido y actualiza el inventario central (`inventario_almacen`).
           * - Rechazar/eliminar pedido: borra el registro del pedido.
           */}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-soft p-4 border">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Crear nuevo pedido</h2>
          <div className="grid md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Producto</label>
              <select className="border px-2 py-1 rounded w-full text-sm" value={nuevo.producto_id} onChange={e=>setNuevo(n=>({...n,producto_id:e.target.value}))}>
                <option value="">Seleccione</option>
                {productos.map(p=> <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Proveedor</label>
              <select className="border px-2 py-1 rounded w-full text-sm" value={nuevo.proveedor_id} onChange={e=>setNuevo(n=>({...n,proveedor_id:e.target.value}))}>
                <option value="">Seleccione</option>
                {proveedores.map(p=> <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cantidad solicitada</label>
              <input className="border px-2 py-1 rounded w-full text-sm" value={nuevo.cantidad} onChange={e=>setNuevo(n=>({...n,cantidad:e.target.value}))} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Precio venta (unidad)</label>
              <input className="border px-2 py-1 rounded w-full text-sm" value={nuevo.precio_compra} onChange={e=>setNuevo(n=>({...n,precio_compra:e.target.value}))} placeholder="0.00" />
            </div>
            <div className="flex md:block">
              <Button size="sm" onClick={crearPedido} disabled={creating}>{creating?'Creando...':'Agregar pedido'}</Button>
            </div>
          </div>
        </div>
        {loading && (<div className="mb-4 text-sm text-gray-600">Cargando datos...</div>)}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            <div className="font-medium">Error cargando datos</div>
            <div className="text-sm mt-1">{error}</div>
            <div className="mt-2">
              <Button onClick={() => load()} className="px-3 py-1" size="sm">Reintentar</Button>
            </div>
          </div>
        )}
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left text-sm text-gray-600"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Proveedor</th><th className="px-3 py-2">Cant.</th><th className="px-3 py-2">Precio</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Acciones</th></tr>
          </thead>
          <tbody>
            {pedidos.map((pd) => {
              const editing = recepcionEditId === pd.id;
              return (
                <tr key={pd.id} className="border-t align-top">
                  <td className="px-3 py-2 text-sm">{pd.id}</td>
                  <td className="px-3 py-2 text-sm">{getProductoNombre(pd.producto_id)}</td>
                  <td className="px-3 py-2 text-sm">{getProveedorNombre(pd.proveedor_id)}</td>
                  <td className="px-3 py-2 text-sm">{pd.cantidad}</td>
                  <td className="px-3 py-2 text-sm">${Number(pd.precio_compra||0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm">{pd.estado}</td>
                  <td className="px-3 py-2 text-sm">
                    <div className="flex flex-col gap-2">
                      {pd.estado === 'pendiente' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={()=>aprobarPedido(pd.id)} disabled={processingId===pd.id}>Aprobar</Button>
                          <Button size="sm" variant="secondary" onClick={()=>rechazarPedido(pd.id)} disabled={processingId===pd.id}>Eliminar</Button>
                        </div>
                      )}
                      {pd.estado === 'aprobado' && (
                        <div className="flex gap-2">
                          {!editing && <Button size="sm" onClick={()=>iniciarRecepcion(pd.id)} disabled={processingId===pd.id}>Marcar recibido</Button>}
                          {editing && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={()=>guardarRecepcion(pd.id)} disabled={processingId===pd.id}>Confirmar</Button>
                              <Button size="sm" variant="secondary" onClick={cancelarRecepcion}>Cancelar</Button>
                            </div>
                          )}
                          <Button size="sm" variant="secondary" onClick={()=>rechazarPedido(pd.id)} disabled={processingId===pd.id}>Eliminar</Button>
                        </div>
                      )}
                      {pd.estado === 'recibido' && (
                        <div className="text-xs text-green-600">Recibido</div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {pedidos.length === 0 && (<tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">No hay pedidos</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
