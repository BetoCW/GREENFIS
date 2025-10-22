import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';

const BACKEND = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

type Solicitud = {
  id: number;
  sucursal_id: number;
  solicitante_id: number;
  producto_id: number;
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
      const [sRes, pRes] = await Promise.all([
        fetch(`${BACKEND}/api/manager/solicitudes`),
        fetch(`${BACKEND}/api/manager/productos`)
      ]);

      if (!sRes.ok) throw new Error('Error cargando solicitudes: ' + await sRes.text());
      if (!pRes.ok) throw new Error('Error cargando productos: ' + await pRes.text());

      const sData = await sRes.json();
      const pData = await pRes.json();
      setSolicitudes(sData || []);
      setProductos(pData || []);

      // Try to load inventories per sucursal to calculate stock_actual; best-effort
  const sucursales: number[] = Array.from(new Set((sData || []).map((x:any) => Number(x.sucursal_id))));
      const invMap: Record<string, number> = {};
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
    const key = `${solic.sucursal_id}_${solic.producto_id}`;
    const stock = inventarioMap[key];
    const stockMin = productById[solic.producto_id]?.stock_minimo ?? 0;
    if (stock === undefined) return { label: 'Desconocida', color: 'gray' };
    if (stock <= 0) return { label: 'Alta', color: 'red' };
    if (stock <= stockMin) return { label: 'Alta', color: 'red' };
    if (stock <= Math.ceil(stockMin * 1.5)) return { label: 'Media', color: 'yellow' };
    return { label: 'Baja', color: 'green' };
  }

  async function approve(solic: Solicitud) {
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
    if (tab === 'pendientes' && s.estado !== 'pendiente') return false;
    if (tab === 'historial' && s.estado === 'pendiente') return false;
    if (filters.sucursal && String(s.sucursal_id) !== filters.sucursal) return false;
    if (filters.producto && String(s.producto_id) !== filters.producto) return false;
    if (filters.estado && s.estado !== filters.estado) return false;
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

  const sucursalOptions = Array.from(new Set(solicitudes.map(s => String(s.sucursal_id))));
  const productoOptions = Array.from(new Set(solicitudes.map(s => String(s.producto_id))));

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
                <option value="rechazada">Rechazada</option>
                <option value="completada">Completada</option>
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
                  const prod = productById[s.producto_id];
                  const stock = inventarioMap[`${s.sucursal_id}_${s.producto_id}`];
                  const stockMin = prod?.stock_minimo ?? '-';
                  const urg = urgencyFor(s);
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2 text-sm">{formatId(s.id)}</td>
                      <td className="px-3 py-2 text-sm">{s.sucursal_id}</td>
                      <td className="px-3 py-2 text-sm">{s.solicitante_id}</td>
                      <td className="px-3 py-2 text-sm">{prod?.nombre ?? `#${s.producto_id}`}</td>
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
