import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

export default function RecepcionPedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simple load: get pedidos, productos and proveedores from /api/almacen
      // Carga simple secuencial; cada fetch ya retorna [] si el backend falla (fail-soft)
      const pedidosResp = await fetch(`${API}/api/almacen/pedidos`).catch(() => null);
      const productosResp = await fetch(`${API}/api/almacen/productos`).catch(() => null);
      const proveedoresResp = await fetch(`${API}/api/almacen/proveedores`).catch(() => null);

      const pedidosData = pedidosResp && pedidosResp.ok ? await pedidosResp.json().catch(() => []) : [];
      const productosData = productosResp && productosResp.ok ? await productosResp.json().catch(() => []) : [];
      const proveedoresData = proveedoresResp && proveedoresResp.ok ? await proveedoresResp.json().catch(() => []) : [];

      setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
      setProductos(Array.isArray(productosData) ? productosData : []);
      setProveedores(Array.isArray(proveedoresData) ? proveedoresData : []);

      // Si todas vacías y alguna respuesta fue null, mostrar error único
      if (!pedidosResp || !productosResp || !proveedoresResp) {
        setError('Error de red al cargar datos (alguna petición falló)');
      } else if (!pedidosResp.ok && !productosResp.ok && !proveedoresResp.ok) {
        setError('Todas las peticiones devolvieron error en el servidor');
      } else {
        setError(null);
      }

    } catch (e) {
      console.error('Unexpected load error', e);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const marcarRecepcion = async (id: number) => {
    const confirmado = confirm('Marcar pedido como recibido?');
    if (!confirmado) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${API}/api/almacen/pedidos/${id}/recepcion`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recibido_por: user?.id ?? null }) });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }
      // success: remove from list
      alert('Pedido marcado como recibido');
      setPedidos((p) => p.filter((x) => x.id !== id));
  } catch (e) { console.error(e); const msg = (e as any)?.message || String(e); alert('Error al marcar recepción: ' + msg); }
    setProcessingId(null);
  };
  const aprobarPedido = async (id: number) => {
    const confirmado = confirm('Aprobar pedido? (Esto marcará el pedido como "aprobado")');
    if (!confirmado) return;
    setProcessingId(id);
    try {
      const payload = { estado: 'aprobado', aprobado_por: user?.id ?? null, fecha_aprobacion: new Date().toISOString() };
      const res = await fetch(`${API}/api/manager/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }
      alert('Pedido aprobado');
      setPedidos((p) => p.map((it) => it.id === id ? { ...it, estado: 'aprobado', aprobado_por: user?.id ?? null } : it));
  } catch (e) { console.error(e); const msg = (e as any)?.message || String(e); alert('Error al aprobar pedido: ' + msg); }
    setProcessingId(null);
  };

  const rechazarPedido = async (id: number) => {
    const confirmado = confirm('Confirmar rechazo y eliminación del pedido? Esta acción eliminará la solicitud.');
    if (!confirmado) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${API}/api/manager/pedidos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }
      alert('Pedido eliminado');
      setPedidos((p) => p.filter((x) => x.id !== id));
  } catch (e) { console.error(e); const msg = (e as any)?.message || String(e); alert('Error al eliminar pedido: ' + msg); }
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
            <tr className="text-left text-sm text-gray-600"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Proveedor</th><th className="px-3 py-2">Cantidad</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Acciones</th></tr>
          </thead>
          <tbody>
            {pedidos.map((pd) => (
              <tr key={pd.id} className="border-t">
                <td className="px-3 py-2 text-sm">{pd.id}</td>
                <td className="px-3 py-2 text-sm">{getProductoNombre(pd.producto_id)}</td>
                <td className="px-3 py-2 text-sm">{getProveedorNombre(pd.proveedor_id)}</td>
                <td className="px-3 py-2 text-sm">{pd.cantidad}</td>
                <td className="px-3 py-2 text-sm">{pd.estado ?? '-'}</td>
                <td className="px-3 py-2 text-sm">
                  <div className="flex space-x-2">
                    <Button type="button" onClick={() => aprobarPedido(pd.id)} className="px-2 py-1" size="sm" disabled={processingId === pd.id}>Aprobar</Button>
                    <Button type="button" onClick={() => marcarRecepcion(pd.id)} className="px-2 py-1" size="sm" disabled={processingId === pd.id}>Marcar recibido</Button>
                    <Button type="button" onClick={() => rechazarPedido(pd.id)} className="px-2 py-1" size="sm" disabled={processingId === pd.id}>Rechazar</Button>
                  </div>
                </td>
              </tr>
            ))}
            {pedidos.length === 0 && (<tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">No hay pedidos</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
