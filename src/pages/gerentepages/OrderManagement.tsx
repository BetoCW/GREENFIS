import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import { fetchProducts, fetchSolicitudes, createSolicitud, updateSolicitud, deleteSolicitud } from '../../utils/api';

type Solicitud = {
  id: number;
  sucursal_id?: number;
  solicitante_id?: number;
  producto_id?: number;
  cantidad_solicitada: number;
  cantidad_aprobada?: number;
  estado: string;
  motivo_rechazo?: string;
  fecha_solicitud: string;
  urgencia?: string;
};

interface EditState {
  id?: number;
  sucursal_id: number | '';
  solicitante_id: number | '';
  producto_id: number | '';
  cantidad_solicitada: number | '';
  urgencia: string;
}

const OrderManagement: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [tab, setTab] = useState<'pendientes' | 'historial'>('pendientes');
  const [filters, setFilters] = useState({ sucursal: '', producto: '', estado: '', urgencia: '', solicitante: '', fechaDesde: '', fechaHasta: '', idSearch: '' });
  const [loading, setLoading] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [editItem, setEditItem] = useState<EditState | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [prodList, solRes] = await Promise.all([fetchProducts(), fetchSolicitudes()]);
      setProductos(Array.isArray(prodList) ? prodList : []);
      if (solRes.ok) setSolicitudes(solRes.data || []); else setSolicitudes([]);
    } catch (e) {
      console.error('Error cargando datos de solicitudes', e);
    } finally { setLoading(false); }
  }

  const productById = useMemo(() => {
    const m: Record<number, any> = {};
    productos.forEach((p: any) => { m[Number(p.id)] = p; });
    return m;
  }, [productos]);

  function formatId(id: number) { return `SOL-${String(id).padStart(4,'0')}`; }

  function urgencyFor(solic: Solicitud) {
    const urg = (solic.urgencia || '').toString().toUpperCase();
    if (urg === 'ALTA') return { label: 'Alta', color: 'red' };
    if (urg === 'MEDIA') return { label: 'Media', color: 'yellow' };
    if (urg === 'BAJA') return { label: 'Baja', color: 'green' };
    return { label: urg || 'N/D', color: 'gray' };
  }

  // Aprobar / Rechazar usando updateSolicitud
  async function approve(s: Solicitud) {
    if (s.estado.toLowerCase() !== 'pendiente') return alert('Solo se aprueban pendientes');
    const value = window.prompt(`Cantidad aprobada para ${formatId(s.id)}`, String(s.cantidad_solicitada));
    if (value == null) return;
    const qty = Number(value); if (Number.isNaN(qty) || qty < 0) return alert('Cantidad inválida');
    const res = await updateSolicitud(s.id, { estado: 'aprobada', cantidad_aprobada: qty });
    if (!res.ok) return alert('Error aprobando');
    await loadData();
  }

  async function rejectSolic(s: Solicitud) {
    if (s.estado.toLowerCase() !== 'pendiente') return alert('Solo se rechazan pendientes');
    const motivo = window.prompt(`Motivo rechazo ${formatId(s.id)}`);
    if (motivo == null) return;
    const res = await updateSolicitud(s.id, { estado: 'rechazada', cantidad_aprobada: 0, motivo_rechazo: motivo });
    if (!res.ok) return alert('Error rechazando');
    await loadData();
  }

  function openNew() {
    setEditItem({ id: undefined, sucursal_id: '' as any, solicitante_id: '' as any, producto_id: '' as any, cantidad_solicitada: '' as any, urgencia: 'MEDIA' });
    setEditingOpen(true);
  }

  function openEdit(row: Solicitud) {
    if (row.estado.toLowerCase() !== 'pendiente') return alert('Solo se edita si está pendiente');
    setEditItem({ id: row.id, sucursal_id: row.sucursal_id || '' as any, solicitante_id: row.solicitante_id || '' as any, producto_id: row.producto_id || '' as any, cantidad_solicitada: row.cantidad_solicitada, urgencia: row.urgencia || 'MEDIA' });
    setEditingOpen(true);
  }

  async function handleSave() {
    if (!editItem) return;
    const { id, sucursal_id, solicitante_id, producto_id, cantidad_solicitada, urgencia } = editItem;
    if (!producto_id || !sucursal_id || !solicitante_id || !cantidad_solicitada) return alert('Completa todos los campos requeridos');
    if (!id) {
      const res = await createSolicitud({ producto_id, sucursal_id, solicitante_id, cantidad_solicitada, urgencia, estado: 'pendiente' });
      if (!res.data && !res.fromServer) alert('Error creando');
    } else {
      const res = await updateSolicitud(id, { producto_id, sucursal_id, solicitante_id, cantidad_solicitada, urgencia });
      if (!res.ok) return alert('Error actualizando');
    }
    setEditingOpen(false); setEditItem(null); await loadData();
  }

  async function handleDelete(row: Solicitud) {
    if (row.estado.toLowerCase() !== 'pendiente') return alert('Solo se elimina si está pendiente');
    if (!confirm(`Eliminar ${formatId(row.id)}?`)) return;
    const res = await deleteSolicitud(row.id);
    if (!res.ok) return alert('Error eliminando');
    await loadData();
  }

  const filtered = solicitudes.filter(s => {
    const stLower = s.estado.toLowerCase();
    if (filters.estado && stLower !== filters.estado.toLowerCase()) return false;
    else {
      if (!filters.estado) {
        if (tab === 'pendientes' && stLower !== 'pendiente') return false;
        if (tab === 'historial' && stLower === 'pendiente') return false;
      }
    }
    if (filters.sucursal && String(s.sucursal_id || '') !== filters.sucursal) return false;
    if (filters.producto && String(s.producto_id || '') !== filters.producto) return false;
    if (filters.urgencia && String(s.urgencia || '').toLowerCase() !== filters.urgencia.toLowerCase()) return false;
    if (filters.solicitante && String(s.solicitante_id || '') !== filters.solicitante) return false;
    if (filters.idSearch && !formatId(s.id).toLowerCase().includes(filters.idSearch.toLowerCase())) return false;
    if (filters.fechaDesde) {
      const desde = new Date(filters.fechaDesde); if (new Date(s.fecha_solicitud) < desde) return false;
    }
    if (filters.fechaHasta) {
      const hasta = new Date(filters.fechaHasta); if (new Date(s.fecha_solicitud) > hasta) return false;
    }
    return true;
  });

  const sucursalOptions = Array.from(new Set(solicitudes.map(s => String(s.sucursal_id || '')))).filter(x => x);
  const productoOptions = Array.from(new Set(solicitudes.map(s => String(s.producto_id || '')))).filter(x => x);
  const solicitanteOptions = Array.from(new Set(solicitudes.map(s => String(s.solicitante_id || '')))).filter(x => x);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between mb-4 items-center">
          <h1 className="text-3xl font-bold text-text-dark">Gestión de Solicitudes</h1>
          <Button onClick={openNew}>Nueva Solicitud</Button>
        </div>
        <div className="flex gap-4 mb-4">
          <Button variant={tab==='pendientes' ? 'primary' : 'secondary'} onClick={() => setTab('pendientes')}>Pendientes</Button>
          <Button variant={tab==='historial' ? 'primary' : 'secondary'} onClick={() => setTab('historial')}>Historial</Button>
        </div>
        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <div className="flex gap-3 flex-wrap mb-4 items-end">
            <div>
              <label className="block text-sm text-gray-600">Sucursal</label>
              <select value={filters.sucursal} onChange={e=>setFilters(f=>({...f,sucursal:e.target.value}))} className="border px-2 py-1 rounded">
                <option value="">Todas</option>
                {sucursalOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Producto</label>
              <select value={filters.producto} onChange={e=>setFilters(f=>({...f,producto:e.target.value}))} className="border px-2 py-1 rounded">
                <option value="">Todos</option>
                {productoOptions.map(p => <option key={p} value={p}>{productById[Number(p)]?.nombre ?? `#${p}`}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Solicitante</label>
              <select value={filters.solicitante} onChange={e=>setFilters(f=>({...f,solicitante:e.target.value}))} className="border px-2 py-1 rounded">
                <option value="">Todos</option>
                {solicitanteOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Urgencia</label>
              <select value={filters.urgencia} onChange={e=>setFilters(f=>({...f,urgencia:e.target.value}))} className="border px-2 py-1 rounded">
                <option value="">Todas</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Estado</label>
              <select value={filters.estado} onChange={e=>setFilters(f=>({...f,estado:e.target.value}))} className="border px-2 py-1 rounded">
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">ID</label>
              <input value={filters.idSearch} onChange={e=>setFilters(f=>({...f,idSearch:e.target.value}))} placeholder="SOL-0001" className="border px-2 py-1 rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Desde</label>
              <input type="date" value={filters.fechaDesde} onChange={e=>setFilters(f=>({...f,fechaDesde:e.target.value}))} className="border px-2 py-1 rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Hasta</label>
              <input type="date" value={filters.fechaHasta} onChange={e=>setFilters(f=>({...f,fechaHasta:e.target.value}))} className="border px-2 py-1 rounded" />
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={() => setFilters({ sucursal:'', producto:'', estado:'', urgencia:'', solicitante:'', fechaDesde:'', fechaHasta:'', idSearch:'' })}>Limpiar</Button>
              <Button variant="secondary" onClick={loadData}>Actualizar</Button>
            </div>
          </div>
          {loading && <div className="py-4 text-sm text-gray-600">Cargando...</div>}
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Sucursal</th>
                  <th className="px-3 py-2">Solicitante</th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Cant. Solicitada</th>
                  <th className="px-3 py-2">Cant. Aprobada</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Urgencia</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const prod = s.producto_id != null ? productById[Number(s.producto_id)] : undefined;
                  const urg = urgencyFor(s);
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2 text-sm">{formatId(s.id)}</td>
                      <td className="px-3 py-2 text-sm">{s.sucursal_id ?? '-'}</td>
                      <td className="px-3 py-2 text-sm">{s.solicitante_id ?? '-'}</td>
                      <td className="px-3 py-2 text-sm">{prod?.nombre ?? s.producto_id ?? '-'}</td>
                      <td className="px-3 py-2 text-sm">{s.cantidad_solicitada}</td>
                      <td className="px-3 py-2 text-sm">{s.cantidad_aprobada ?? '-'}</td>
                      <td className="px-3 py-2 text-sm">{new Date(s.fecha_solicitud).toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm">{s.estado}</td>
                      <td className={`px-3 py-2 text-sm ${urg.color==='red'?'text-red-600':urg.color==='yellow'?'text-yellow-600':urg.color==='green'?'text-green-600':''}`}>{urg.label}</td>
                      <td className="px-3 py-2 text-sm">
                        <div className="flex gap-2 flex-wrap">
                          {s.estado === 'pendiente' && <Button size="sm" onClick={() => approve(s)}>Aprobar</Button>}
                          {s.estado === 'pendiente' && <Button size="sm" variant="danger" onClick={() => rejectSolic(s)}>Rechazar</Button>}
                          {s.estado === 'pendiente' && <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>Editar</Button>}
                          {s.estado === 'pendiente' && <Button size="sm" variant="danger" onClick={() => handleDelete(s)}>Eliminar</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-sm text-gray-500">No hay solicitudes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {editingOpen && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">{editItem.id ? 'Editar Solicitud' : 'Nueva Solicitud'}</h3>
              <button onClick={()=>{setEditingOpen(false); setEditItem(null);}} className="text-gray-500">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Sucursal ID" value={String(editItem.sucursal_id||'')} onChange={v=>setEditItem(e=>e?{...e,sucursal_id: v?Number(v):''}:e)} required />
              <FormField label="Solicitante ID" value={String(editItem.solicitante_id||'')} onChange={v=>setEditItem(e=>e?{...e,solicitante_id: v?Number(v):''}:e)} required />
              <FormField label="Producto ID" value={String(editItem.producto_id||'')} onChange={v=>setEditItem(e=>e?{...e,producto_id: v?Number(v):''}:e)} required />
              <FormField label="Cantidad" type="number" value={String(editItem.cantidad_solicitada||'')} onChange={v=>setEditItem(e=>e?{...e,cantidad_solicitada: v?Number(v):''}:e)} required />
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-text-dark mb-2">Urgencia</label>
                <select className="w-full border border-gray-medium rounded px-3 py-2" value={editItem.urgencia} onChange={e=>setEditItem(it=>it?{...it,urgencia:e.target.value}:it)}>
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option>
                  <option value="BAJA">Baja</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={()=>{setEditingOpen(false); setEditItem(null);}}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
