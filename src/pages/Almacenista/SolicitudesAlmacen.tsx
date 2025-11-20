import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { fetchSolicitudes, fetchProducts, fetchSucursales, updateSolicitud, fulfillSolicitudToSucursal, fetchDevoluciones, createDevolucionAlmacen } from '../../utils/api';

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
  const [devoluciones, setDevoluciones] = useState<any[]>([]);
  const [nuevoDev, setNuevoDev] = useState<{producto_id: string; sucursal_id: string; cantidad: string; motivo: string; tipo: string}>({ producto_id: '', sucursal_id: '', cantidad: '', motivo: '', tipo: ''});
  const [creatingDev, setCreatingDev] = useState(false);

  const load = async () => {
    setCargando(true); setError(null);
    try {
      const [solRes, prods, sucs, devs] = await Promise.all([
        fetchSolicitudes({ estado: 'pendiente' }),
        fetchProducts(),
        fetchSucursales(),
        fetchDevoluciones({ estado: 'para_devolucion' })
      ]);
      setSolicitudes(solRes.ok ? solRes.data : []);
      setProductos(Array.isArray(prods) ? prods : []);
      setSucursales(sucs.ok ? sucs.data : []);
      setDevoluciones(devs.ok ? devs.data : []);
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

  const crearDevolucion = async () => {
    const pid = Number(nuevoDev.producto_id); const sid = nuevoDev.sucursal_id? Number(nuevoDev.sucursal_id): undefined; const cant = Number(nuevoDev.cantidad);
    if (!pid || !cant || cant <= 0) { alert('Complete producto y cantidad > 0'); return; }
    setCreatingDev(true);
    try {
      const res = await createDevolucionAlmacen({ producto_id: pid, sucursal_id: sid, cantidad: cant, motivo: nuevoDev.motivo || null as any, tipo: nuevoDev.tipo || null as any, creado_por: user?.id });
      if (!res.ok) throw new Error('No se pudo registrar devolución');
      const inserted = Array.isArray(res.data)? res.data[0] : res.data;
      setDevoluciones(d => [inserted, ...d]);
      setNuevoDev({ producto_id: '', sucursal_id: '', cantidad: '', motivo: '', tipo: ''});
    } catch(e:any){ alert(e.message||'Error'); }
    setCreatingDev(false);
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
        <h2 className="text-lg font-semibold mb-3">Registrar Devolución a Almacén (para devolución a proveedor)</h2>
        <div className="grid md:grid-cols-5 gap-3 items-end mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Producto</label>
            <select className="border px-2 py-1 rounded w-full text-sm" value={nuevoDev.producto_id} onChange={e=>setNuevoDev(n=>({ ...n, producto_id: e.target.value }))}>
              <option value="">Seleccione</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Sucursal origen (opcional)</label>
            <select className="border px-2 py-1 rounded w-full text-sm" value={nuevoDev.sucursal_id} onChange={e=>setNuevoDev(n=>({ ...n, sucursal_id: e.target.value }))}>
              <option value="">-</option>
              {sucsList.map((s:any)=> <option key={s.id_sucursal ?? s.id} value={s.id_sucursal ?? s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Cantidad</label>
            <input className="border px-2 py-1 rounded w-full text-sm" value={nuevoDev.cantidad} onChange={e=>setNuevoDev(n=>({ ...n, cantidad: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Motivo</label>
            <input className="border px-2 py-1 rounded w-full text-sm" value={nuevoDev.motivo} onChange={e=>setNuevoDev(n=>({ ...n, motivo: e.target.value }))} placeholder="caducidad / dañado / otro" />
          </div>
          <div className="flex md:block">
            <Button size="sm" onClick={crearDevolucion} disabled={creatingDev}>{creatingDev?'Guardando...':'Registrar devolución'}</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Cantidad</th><th className="px-3 py-2">Motivo</th><th className="px-3 py-2">Estado</th></tr>
            </thead>
            <tbody>
              {devoluciones.map((d:any)=> (
                <tr key={d.id} className="border-t">
                  <td className="px-3 py-2 text-sm">{d.id}</td>
                  <td className="px-3 py-2 text-sm">{productName(Number(d.producto_id))}</td>
                  <td className="px-3 py-2 text-sm">{d.cantidad}</td>
                  <td className="px-3 py-2 text-sm">{d.motivo || '-'}</td>
                  <td className="px-3 py-2 text-sm">{d.estado || 'para_devolucion'}</td>
                </tr>
              ))}
              {devoluciones.length === 0 && (<tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No hay devoluciones registradas</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
