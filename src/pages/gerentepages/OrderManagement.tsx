import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';

const BACKEND = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

type Solicitud = {
  id: number;
  sucursal?: string | number;
  solicitante?: string | number;
  producto?: string | number;
  stock_actual?: number;
  stock_minimo?: number;
  cantidad_solicitada: number;
  cantidad_aprobada?: number;
  estado: string;
  motivo_rechazo?: string;
  fecha_solicitud: string;
};

const OrderManagement: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [inventarioMap, setInventarioMap] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<'pendientes' | 'historial'>('pendientes');
  const [filters, setFilters] = useState({ sucursal: '', producto: '', estado: '', fechaDesde: '', fechaHasta: '' });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      // fetch solicitudes first but don't fail entire flow if it errors; we still want productos + inventario
      let sData: any[] = [];
      try {
        const sRes = await fetch(`${BACKEND}/api/manager/solicitudes`);
          if (!sRes.ok) throw new Error('Error cargando solicitudes: ' + await sRes.text());
          sData = await sRes.json();
      } catch (e) {
        console.warn('Error fetching solicitudes, continuing with empty list', e);
      }

      const pRes = await fetch(`${BACKEND}/api/manager/productos`);
      if (!pRes.ok) throw new Error('Error cargando productos: ' + await pRes.text());
      const pData = await pRes.json();

      setSolicitudes(sData || []);
      setProductos(pData || []);

      // If the view already provides stock_actual, no need to call the vendedor inventario endpoint.
      const needsInventoryFetch = !(sData && sData.length > 0 && ((sData[0] as any).stock_actual !== undefined || (sData[0] as any).Stock_Actual !== undefined));
      const invMap: Record<string, number> = {};
      if (needsInventoryFetch) {
        const sucursales: number[] = Array.from(new Set((sData || []).map((x:any) => Number(x.sucursal_id)).filter(n => !Number.isNaN(n))));
        await Promise.all(sucursales.map(async (sId: number) => {
          try {
            const r = await fetch(`${BACKEND}/api/vendedor/inventario?sucursal_id=${sId}`);
            if (!r.ok) return;
            const inv = await r.json();
            (inv || []).forEach((row: any) => {
              invMap[`${sId}_${row.producto_id}`] = row.cantidad ?? row.cantidad_sucursal ?? 0;
            });
          } catch (e) { /* ignore */ }
        }));
      }
      setInventarioMap(invMap);
    } catch (err) {
      console.error('Error fetching data for solicitudes', err);
    }
  }

  const productById = useMemo(() => {
    const m: Record<number, any> = {};
    productos.forEach(p => { m[p.id] = p; });
    return m;
  }, [productos]);

  function formatId(id: number) {
    return `SOL-${String(id).padStart(3,'0')}`;
  }

  function urgencyFor(solic: Solicitud) {
    const urg = (solic as any).urgencia ?? (solic as any).Urgencia ?? (solic as any).urgency;
    if (!urg) return { label: 'Desconocida', color: 'gray' };
    if (String(urg).toUpperCase() === 'ALTA') return { label: 'Alta', color: 'red' };
    if (String(urg).toUpperCase() === 'MEDIA') return { label: 'Media', color: 'yellow' };
    return { label: 'Baja', color: 'green' };
  }
  // note: no visual changes here; button actions below will validate the estado before proceeding

  async function approve(solic: Solicitud) {
    // only allow approving when estado is 'pendiente' (case-insensitive)
    const estado = ((solic as any).estado ?? '').toString().trim().toLowerCase();
    if (estado !== 'pendiente') { alert('Solo se pueden aprobar solicitudes en estado pendiente'); return; }
    const defaultQty = solic.cantidad_solicitada;
    const value = window.prompt(`Aprobar solicitud ${formatId(solic.id)} - cantidad a enviar:`, String(defaultQty));
    if (value == null) return;
    const qty = Number(value);
    if (Number.isNaN(qty) || qty < 0) { alert('Cantidad inválida'); return; }
    try {
      const res = await fetch(`${BACKEND}/api/manager/solicitudes/${solic.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'aprobada', cantidad_aprobada: qty, aprobado_por: null })
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAll();
    } catch (err) { console.error('Error aprobando', err); alert('Error aprobando: ver consola'); }
  }

  async function rejectSolic(solic: Solicitud) {
    // only allow rejecting when estado is 'pendiente'
    const estado = ((solic as any).estado ?? '').toString().trim().toLowerCase();
    if (estado !== 'pendiente') { alert('Solo se pueden rechazar solicitudes en estado pendiente'); return; }
    const motivo = window.prompt(`Rechazar ${formatId(solic.id)} - motivo:`);
    if (motivo == null) return;
    try {
      const res = await fetch(`${BACKEND}/api/manager/solicitudes/${solic.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'rechazada', cantidad_aprobada: 0, aprobado_por: null, motivo_rechazo: motivo })
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAll();
    } catch (err) { console.error('Error rechazando', err); alert('Error rechazando: ver consola'); }
  }

  const filtered = solicitudes.filter(s => {
    const st = ((s as any).estado ?? '').toString();
    const stLower = st.toLowerCase();
    // If Estado filter is set, use it (take precedence over the tab)
    if (filters.estado) {
      if (stLower !== (filters.estado ?? '').toString().toLowerCase()) return false;
    } else {
      // no explicit estado filter -> apply tab filtering
      if (tab === 'pendientes' && stLower !== 'pendiente') return false;
      if (tab === 'historial' && stLower === 'pendiente') return false;
    }
    if (filters.sucursal && String((s as any).sucursal_id ?? (s as any).sucursal ?? '') !== filters.sucursal) return false;
    if (filters.producto && String((s as any).producto_id ?? (s as any).producto ?? '') !== filters.producto) return false;
    if (filters.fechaDesde) {
      const desde = new Date(filters.fechaDesde);
      if (new Date(s.fecha_solicitud) < desde) return false;
    }
    if (filters.fechaHasta) {
      const hasta = new Date(filters.fechaHasta);
      if (new Date(s.fecha_solicitud) > hasta) return false;
    }
    return true;
  });

  const sucursalOptions = Array.from(new Set(solicitudes.map(s => String((s as any).sucursal ?? (s as any).sucursal_id ?? ''))));
  const productoOptions = Array.from(new Set(solicitudes.map(s => String((s as any).producto ?? (s as any).producto_id ?? ''))));

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold text-text-dark mb-4">Gestión de Solicitudes</h1>

        <div className="flex gap-4 mb-4">
          <Button variant={tab==='pendientes' ? 'primary' : 'secondary'} onClick={() => setTab('pendientes')}>Pendientes</Button>
          <Button variant={tab==='historial' ? 'primary' : 'secondary'} onClick={() => setTab('historial')}>Historial</Button>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap mb-4 items-end">
            <div>
              <label className="block text-sm text-gray-600">Sucursal</label>
              <select value={filters.sucursal} onChange={(e) => setFilters(f => ({...f, sucursal: e.target.value}))} className="border px-2 py-1 rounded">
                <option value="">Todas</option>
                {sucursalOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Producto</label>
              <select value={filters.producto} onChange={(e) => setFilters(f => ({...f, producto: e.target.value}))} className="border px-2 py-1 rounded">
                <option value="">Todos</option>
                {productoOptions.map(p => <option key={p} value={p}>{productById[Number(p)]?.nombre ?? `#${p}`}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Estado</label>
              <select value={filters.estado} onChange={(e) => setFilters(f => ({...f, estado: e.target.value}))} className="border px-2 py-1 rounded">
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Desde</label>
              <input type="date" value={filters.fechaDesde} onChange={(e) => setFilters(f => ({...f, fechaDesde: e.target.value}))} className="border px-2 py-1 rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Hasta</label>
              <input type="date" value={filters.fechaHasta} onChange={(e) => setFilters(f => ({...f, fechaHasta: e.target.value}))} className="border px-2 py-1 rounded" />
            </div>
            <div className="ml-auto">
              <Button onClick={fetchAll} variant="secondary">Actualizar</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Sucursal</th>
                  <th className="px-3 py-2">Solicitante</th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Stock Actual</th>
                  <th className="px-3 py-2">Stock Mínimo</th>
                  <th className="px-3 py-2">Cant. Solicitada</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Urgencia</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  // prefer view-provided names and stock if available; fall back to productById/inventarioMap when numeric ids exist
                  const prodId = (s as any).producto_id ?? null;
                  const sucId = (s as any).sucursal_id ?? null;
                  const prod = prodId != null ? productById[Number(prodId)] : undefined;
                  const invKey = (sucId != null && prodId != null) ? `${sucId}_${prodId}` : null;
                  const stock = (s as any).stock_actual ?? (invKey ? inventarioMap[invKey] : undefined);
                  const stockMin = (s as any).stock_minimo ?? prod?.stock_minimo ?? '-';
                  const urg = urgencyFor(s);
                  const productoNombre = (s as any).producto ?? prod?.nombre ?? `#${prodId ?? '?'}`;
                  const solicitanteNombre = (s as any).solicitante ?? String((s as any).solicitante_id ?? '');
                  const sucursalNombre = (s as any).sucursal ?? String((s as any).sucursal_id ?? '');
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2 text-sm">{formatId(s.id)}</td>
                      <td className="px-3 py-2 text-sm">{sucursalNombre}</td>
                      <td className="px-3 py-2 text-sm">{solicitanteNombre}</td>
                      <td className="px-3 py-2 text-sm">{productoNombre}</td>
                      <td className={`px-3 py-2 text-sm ${urg.color === 'red' ? 'text-red-600' : ''}`}>{stock ?? '-'}</td>
                      <td className="px-3 py-2 text-sm">{stockMin}</td>
                      <td className="px-3 py-2 text-sm">{s.cantidad_solicitada}</td>
                      <td className="px-3 py-2 text-sm">{new Date(s.fecha_solicitud).toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm">{s.estado}</td>
                      <td className="px-3 py-2 text-sm">{urg.label}</td>
                      <td className="px-3 py-2 text-sm">
                        {s.estado === 'pendiente' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => approve(s)}>Aprobar</Button>
                            <Button size="sm" variant="danger" onClick={() => rejectSolic(s)}>Rechazar</Button>
                          </div>
                        )}
                        {s.estado !== 'pendiente' && (
                          <div className="text-sm text-gray-600">{s.estado}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-sm text-gray-500">No hay solicitudes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default OrderManagement;
