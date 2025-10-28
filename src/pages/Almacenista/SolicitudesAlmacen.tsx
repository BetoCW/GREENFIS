import { useEffect, useState } from 'react';
import Button from '../../components/Button';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

export default function SolicitudesAlmacen() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);

  useEffect(() => {
    // use manager view that returns consolidated solicitudes
    fetch(`${API}/api/manager/solicitudes`)
      .then((r) => r.json())
      .then((data) => setSolicitudes(data || []))
      .catch((e) => { console.error('Error fetching solicitudes', e); setSolicitudes([]); });
  }, []);

  const process = async (id: number, action: 'aprobar'|'rechazar'|'completar') => {
    const motivo = action === 'rechazar' ? prompt('Motivo de rechazo') : undefined;
    try {
      const res = await fetch(`${API}/api/almacen/solicitudes/${id}/process`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, cantidad_aprobada: null, aprobado_por: null, motivo_rechazo: motivo }) });
      if (!res.ok) throw new Error(await res.text());
      alert('Solicitud procesada');
      setSolicitudes((s) => s.filter((x) => x.id !== id));
    } catch (e) { console.error(e); alert('Error procesando solicitud'); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Solicitudes - Almacén</h1>
      <div className="bg-white rounded-lg shadow-soft p-4 border">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Sucursal</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Cantidad solicitada</th><th className="px-3 py-2">Acciones</th></tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2 text-sm">{s.id}</td>
                  <td className="px-3 py-2 text-sm">{s.sucursal}</td>
                  <td className="px-3 py-2 text-sm">{s.producto}</td>
                  <td className="px-3 py-2 text-sm">{s.cantidad_solicitada}</td>
                  <td className="px-3 py-2 text-sm">
                    <div className="flex space-x-2">
                      <Button type="button" onClick={() => process(s.id, 'aprobar')} className="px-2 py-1" size="sm">Aprobar</Button>
                      <Button type="button" onClick={() => process(s.id, 'rechazar')} className="px-2 py-1" size="sm">Rechazar</Button>
                      <Button type="button" onClick={() => process(s.id, 'completar')} className="px-2 py-1" size="sm">Completar</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {solicitudes.length === 0 && (<tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No hay solicitudes</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
