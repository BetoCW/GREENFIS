import { useEffect, useState, useRef } from 'react';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

export default function RecepcionPedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [scan, setScan] = useState('');
  const scanRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // pedidos list is available via manager routes
    fetch(`${API}/api/manager/pedidos`).then(async (r) => {
      if (!r.ok) { const txt = await r.text().catch(() => ''); console.error('pedidos fetch failed', r.status, txt); setPedidos([]); return; }
      const data = await r.json(); setPedidos(Array.isArray(data) ? data : []);
    }).catch((e) => { console.error('Error fetching pedidos', e); setPedidos([]); });

    fetch(`${API}/api/almacen/productos`).then(async (r) => {
      if (!r.ok) { const txt = await r.text().catch(() => ''); console.error('productos fetch failed', r.status, txt); setProductos([]); return; }
      const d = await r.json(); setProductos(Array.isArray(d) ? d : []);
    }).catch((e) => { console.error('Error fetching productos', e); setProductos([]); });

    fetch(`${API}/api/manager/proveedores`).then(async (r) => {
      if (!r.ok) { const txt = await r.text().catch(() => ''); console.error('proveedores fetch failed', r.status, txt); setProveedores([]); return; }
      const d = await r.json(); setProveedores(Array.isArray(d) ? d : []);
    }).catch((e) => { console.error('Error fetching proveedores', e); setProveedores([]); });
  }, []);

  const findProducto = (ident: string) => {
    const v = String(ident).trim();
    return productos.find((p: any) => String(p.id) === v || String(p.codigo_barras) === v || String(p.nombre).toLowerCase() === v.toLowerCase());
  };

  const marcarRecepcion = async (id: number) => {
    const confirmado = confirm('Marcar pedido como recibido?');
    if (!confirmado) return;
    try {
      const res = await fetch(`${API}/api/almacen/pedidos/${id}/recepcion`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recibido_por: user?.id ?? null }) });
      if (!res.ok) throw new Error(await res.text());
      alert('Pedido marcado como recibido');
      setPedidos((p) => p.filter((x) => x.id !== id));
    } catch (e) { console.error(e); alert('Error al marcar recepción'); }
  };

  const aprobarPedido = async (id: number) => {
    const confirmado = confirm('Aprobar pedido? (Esto marcará el pedido como "aprobado")');
    if (!confirmado) return;
    try {
      const payload = { estado: 'aprobado', aprobado_por: user?.id ?? null, fecha_aprobacion: new Date().toISOString() };
      const res = await fetch(`${API}/api/manager/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      alert('Pedido aprobado');
      setPedidos((p) => p.map((it) => it.id === id ? { ...it, estado: 'aprobado', aprobado_por: user?.id ?? null } : it));
    } catch (e) { console.error(e); alert('Error al aprobar pedido'); }
  };

  const rechazarPedido = async (id: number) => {
    const confirmado = confirm('Confirmar rechazo y eliminación del pedido? Esta acción eliminará la solicitud.');
    if (!confirmado) return;
    try {
      // call DELETE endpoint we added to manager routes
      const res = await fetch(`${API}/api/manager/pedidos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      alert('Pedido eliminado');
      setPedidos((p) => p.filter((x) => x.id !== id));
    } catch (e) { console.error(e); alert('Error al eliminar pedido'); }
  };

  const onScanSubmit = (ev?: any) => {
    if (ev) ev.preventDefault();
    const code = scan.trim();
    if (!code) return;
    // try to match product -> find a pending pedido for that product
    const prod = findProducto(code);
    if (!prod) { alert('Producto no encontrado por código/ID'); setScan(''); scanRef.current?.focus(); return; }
  const pedido = pedidos.find((pd) => Number(pd.producto_id) === Number(prod.id) && pd.estado !== 'recibido');
    if (!pedido) { alert('No hay pedidos pendientes para ese producto'); setScan(''); scanRef.current?.focus(); return; }
    // auto mark receive
    marcarRecepcion(pedido.id);
    setScan('');
    scanRef.current?.focus();
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
        <h1 className="text-2xl font-semibold">Recepción de Pedidos - Almacén</h1>
        <div className="w-80">
          <form onSubmit={onScanSubmit} className="flex">
            <input ref={scanRef} value={scan} onChange={(e) => setScan(e.target.value)} placeholder="Escanear código o ingresar ID y presionar Enter" className="border px-3 py-2 flex-1" />
            <Button type="submit" className="ml-2">Buscar/Marcar</Button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-soft p-4 border">
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
                    <Button type="button" onClick={() => aprobarPedido(pd.id)} className="px-2 py-1" size="sm">Aprobar</Button>
                    <Button type="button" onClick={() => marcarRecepcion(pd.id)} className="px-2 py-1" size="sm">Marcar recibido</Button>
                    <Button type="button" onClick={() => rechazarPedido(pd.id)} className="px-2 py-1" size="sm">Rechazar</Button>
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
