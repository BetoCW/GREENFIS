import { useEffect, useState } from 'react';
import Button from '../../components/Button';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

export default function RecepcionPedidos() {
  const [pedidos, setPedidos] = useState<any[]>([]);

  useEffect(() => {
    // pedidos list is available via manager routes
    fetch(`${API}/api/manager/pedidos`)
      .then((r) => r.json())
      .then((data) => setPedidos(data || []))
      .catch((e) => { console.error('Error fetching pedidos', e); setPedidos([]); });
  }, []);

  const marcarRecepcion = async (id: number) => {
    const confirmado = confirm('Marcar pedido como recibido?');
    if (!confirmado) return;
    try {
      const res = await fetch(`${API}/api/almacen/pedidos/${id}/recepcion`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recibido_por: null }) });
      if (!res.ok) throw new Error(await res.text());
      alert('Pedido marcado como recibido');
      setPedidos((p) => p.filter((x) => x.id !== id));
    } catch (e) { console.error(e); alert('Error al marcar recepción'); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Recepción de Pedidos - Almacén</h1>
      <div className="bg-white rounded-lg shadow-soft p-4 border">
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left text-sm text-gray-600"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Cantidad</th><th className="px-3 py-2">Acciones</th></tr>
          </thead>
          <tbody>
            {pedidos.map((pd) => (
              <tr key={pd.id} className="border-t">
                <td className="px-3 py-2 text-sm">{pd.id}</td>
                <td className="px-3 py-2 text-sm">{pd.producto_id}</td>
                <td className="px-3 py-2 text-sm">{pd.cantidad}</td>
                <td className="px-3 py-2 text-sm"><Button type="button" onClick={() => marcarRecepcion(pd.id)}>Marcar recibido</Button></td>
              </tr>
            ))}
            {pedidos.length === 0 && (<tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">No hay pedidos</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
