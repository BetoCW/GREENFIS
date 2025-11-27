import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { fetchSolicitudes, fetchProducts, fetchSucursales, updateSolicitud, fulfillSolicitudToSucursal, fetchDevoluciones, fetchDetalleDevolucionesByDevolucionIds, buildDetallesMap, updateDevolucion, applyDevolucionToAlmacen } from '../../utils/api';

export default function SolicitudesAlmacen() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [editCant, setEditCant] = useState<Record<number,string>>({});
  const [procesandoId, setProcesandoId] = useState<number|null>(null);

  // Devoluciones
  const [devolPendientes, setDevolPendientes] = useState<any[]>([]);
  const [devolHistorial, setDevolHistorial] = useState<any[]>([]);
  // Form manual de devolución removido
  const [detallesMap, setDetallesMap] = useState<Map<number, any[]>>(new Map());
  const [completingId, setCompletingId] = useState<number|null>(null);

  const load = async () => {
    setCargando(true); setError(null);
    try {
      const [solRes, prods, sucs, devsAll] = await Promise.all([
        fetchSolicitudes({ estado: 'pendiente' }),
        fetchProducts(),
        fetchSucursales(),
        fetchDevoluciones({})
      ]);
      setSolicitudes(solRes.ok ? solRes.data : []);
      setProductos(Array.isArray(prods) ? prods : []);
      setSucursales(sucs.ok ? sucs.data : []);
      const allDevs = devsAll.ok ? (Array.isArray(devsAll.data) ? devsAll.data : []) : [];
      // Consider estados 'pendiente' (nuevo esquema) or 'para_devolucion' (antiguo).
      const pend = allDevs.filter((d:any) => ['pendiente','para_devolucion'].includes(String(d.estado ?? 'pendiente')));
      const hist = allDevs.filter((d:any) => !['pendiente','para_devolucion'].includes(String(d.estado ?? 'pendiente')));
      setDevolPendientes(pend);
      setDevolHistorial(hist);
      // Fetch detalles for all devoluciones to resolve product names and cantidades
      const ids = allDevs.map((d:any) => Number(d.id)).filter((id:number) => !Number.isNaN(id));
      if (ids.length) {
        const detRes = await fetchDetalleDevolucionesByDevolucionIds(ids);
        if (detRes.ok) setDetallesMap(buildDetallesMap(detRes.data));
      }
      if (!solRes.ok) setError('No se pudieron cargar solicitudes');
    } catch(e:any) { setError(e.message||String(e)); }
    finally { setCargando(false); }
  };

  useEffect(()=>{ load(); }, []);

  const productName = useMemo(() => {
    const m = new Map<number,string>();
    for (const p of productos) m.set(Number(p.id), p.nombre);
    return (id:number) => m.get(Number(id)) || String(id);
  }, [productos]);

  const sucsList = useMemo(() => (Array.isArray(sucursales) ? sucursales : []), [sucursales]);

  const sucursalName = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of sucsList) {
      const id = Number((s as any).id_sucursal ?? (s as any).id);
      if (!Number.isNaN(id)) m.set(id, (s as any).nombre);
    }
    return (id: number) => m.get(Number(id)) || String(id);
  }, [sucsList]);

  const rechazar = async (sol: any) => {
    const motivo = prompt('Motivo de rechazo (ej. descontinuado)') || 'rechazado por almacén';
    setProcesandoId(sol.id);
    try {
      const up = await updateSolicitud(sol.id, { estado: 'rechazada', motivo_rechazo: motivo });
      if (!up.ok) throw new Error('No se pudo rechazar');
      setSolicitudes(s => s.filter(x => x.id !== sol.id));
    } catch(e:any){ alert(e.message||'Error'); }
    setProcesandoId(null);
  };

  const abastecer = async (sol:any) => {
    const cant = Number(editCant[sol.id] ?? sol.cantidad_solicitada);
    if (!cant || cant <= 0) { alert('Cantidad inválida'); return; }
    setProcesandoId(sol.id);
    try {
      const res = await fulfillSolicitudToSucursal({ solicitud_id: sol.id, producto_id: Number(sol.producto_id), sucursal_id: Number(sol.sucursal_id), cantidad: cant, almacenista_id: user?.id });
      if (!res.ok) throw new Error('No se pudo abastecer');
      setSolicitudes(s => s.filter(x => x.id !== sol.id));
      alert('Transferencia creada y solicitud completada');
    } catch(e:any){ alert(e.message||'Error'); }
    setProcesandoId(null);
  };


  const completarDevolucion = async (dev: any) => {
    setCompletingId(Number(dev.id));
    try {
      const up = await updateDevolucion(dev.id, { estado: 'completada', fecha_completado: new Date().toISOString() });
      if (!up.ok) throw new Error('No se pudo actualizar devolución');
      // Ajustar inventario del almacén con detalles
      await applyDevolucionToAlmacen(Number(dev.id));
      // Mover a historial en UI
      setDevolPendientes(p => p.filter(x => x.id !== dev.id));
      setDevolHistorial(h => [{ ...dev, estado: 'completada' }, ...h]);
    } catch(e:any) { alert(e.message||'Error'); }
    setCompletingId(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Solicitudes y Devoluciones - Almacén</h1>

      <div className="bg-white rounded-lg shadow-soft p-4 border mb-8">
        <h2 className="text-lg font-semibold mb-3">Solicitudes de Reabastecimiento</h2>
        {cargando && <div className="text-sm text-gray-600 mb-2">Cargando...</div>}
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Sucursal</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Solicitada</th><th className="px-3 py-2">Abastecer</th><th className="px-3 py-2">Acciones</th></tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2 text-sm">{s.id}</td>
                  <td className="px-3 py-2 text-sm">{sucursalName(Number(s.sucursal_id))}</td>
                  <td className="px-3 py-2 text-sm">{productName(Number(s.producto_id))}</td>
                  <td className="px-3 py-2 text-sm">{s.cantidad_solicitada}</td>
                  <td className="px-3 py-2 text-sm">
                    <input className="border px-2 py-1 rounded w-24 text-sm" value={editCant[s.id] ?? s.cantidad_solicitada} onChange={e=>setEditCant(prev=>({ ...prev, [s.id]: e.target.value }))} />
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={()=>abastecer(s)} disabled={procesandoId===s.id}>Abastecer</Button>
                      <Button size="sm" variant="secondary" onClick={()=>rechazar(s)} disabled={procesandoId===s.id}>Rechazar</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {solicitudes.length === 0 && (<tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">No hay solicitudes pendientes</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-soft p-4 border">
        <h2 className="text-lg font-semibold mb-3">Devoluciones</h2>
        <div className="overflow-x-auto">
          <h3 className="text-base font-semibold mb-2">Solicitudes de Devolución pendientes</h3>
          <table className="w-full table-auto mb-6">
            <thead>
              <tr className="text-left text-sm text-gray-600"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Cantidad</th><th className="px-3 py-2">Motivo</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Acciones</th></tr>
            </thead>
            <tbody>
              {devolPendientes.map((d:any)=> (
                <tr key={d.id} className="border-t">
                  <td className="px-3 py-2 text-sm">{d.id}</td>
                  <td className="px-3 py-2 text-sm">{
                    d.producto_id != null
                      ? productName(Number(d.producto_id))
                      : (() => {
                          const dets = detallesMap.get(Number(d.id)) || [];
                          if (dets.length === 1) return productName(Number(dets[0].producto_id));
                          return dets.length > 1 ? 'Varios' : '-';
                        })()
                  }</td>
                  <td className="px-3 py-2 text-sm">{
                    d.cantidad != null
                      ? d.cantidad
                      : (() => {
                          const dets = detallesMap.get(Number(d.id)) || [];
                          if (dets.length) return dets.reduce((sum, it) => sum + Number(it.cantidad||0), 0);
                          return d.total_devolucion != null ? d.total_devolucion : '-';
                        })()
                  }</td>
                  <td className="px-3 py-2 text-sm">{d.motivo || '-'}</td>
                  <td className="px-3 py-2 text-sm">{d.estado || 'pendiente'}</td>
                  <td className="px-3 py-2 text-sm">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={()=>completarDevolucion(d)} disabled={completingId===d.id}>Marcar como completada</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {devolPendientes.length === 0 && (<tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No hay solicitudes de devolución pendientes</td></tr>)}
            </tbody>
          </table>

          <h3 className="text-base font-semibold mb-2">Historial de Devoluciones</h3>
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Cantidad</th><th className="px-3 py-2">Motivo</th><th className="px-3 py-2">Estado</th></tr>
            </thead>
            <tbody>
              {devolHistorial.map((d:any)=> (
                <tr key={d.id} className="border-t">
                  <td className="px-3 py-2 text-sm">{d.id}</td>
                  <td className="px-3 py-2 text-sm">{
                    d.producto_id != null
                      ? productName(Number(d.producto_id))
                      : (() => {
                          const dets = detallesMap.get(Number(d.id)) || [];
                          if (dets.length === 1) return productName(Number(dets[0].producto_id));
                          return dets.length > 1 ? 'Varios' : '-';
                        })()
                  }</td>
                  <td className="px-3 py-2 text-sm">{
                    d.cantidad != null
                      ? d.cantidad
                      : (() => {
                          const dets = detallesMap.get(Number(d.id)) || [];
                          if (dets.length) return dets.reduce((sum, it) => sum + Number(it.cantidad||0), 0);
                          return d.total_devolucion != null ? d.total_devolucion : '-';
                        })()
                  }</td>
                  <td className="px-3 py-2 text-sm">{d.motivo || '-'}</td>
                  <td className="px-3 py-2 text-sm">{d.estado}</td>
                </tr>
              ))}
              {devolHistorial.length === 0 && (<tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No hay historial de devoluciones</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
