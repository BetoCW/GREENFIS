import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { fetchInventarioAlmacen, adjustInventarioAlmacen, deleteInventarioAlmacenProducto, purgeExpiredInventarioAlmacen, fetchSucursales } from '../../utils/api';

export default function InventarioAlmacen() {
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'agotado'|'bajo'|'normal'|'caducado'>('all');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [expiredBanner, setExpiredBanner] = useState(true);
  const [purging, setPurging] = useState(false);
  const { user } = useAuth();

  // sanitize ubicacion text to collapse duplicated adjacent words
  const sanitizeUbicacion = (v: any) => {
    if (!v && v !== 0) return '';
    const s = String(v).trim();
    if (!s) return '';
    const parts = s.split(/\s+/);
    const filtered = parts.filter((w, i) => i === 0 || w.toLowerCase() !== parts[i - 1].toLowerCase());
    return filtered.join(' ');
  };

  async function load() {
    setLoading(true);
    try {
      const inv = await fetchInventarioAlmacen();
      if (inv.ok) {
        const mapped = inv.data.map((r: any) => ({
          id: r.id,
          producto_id: r.producto_id,
          codigo: String(r.producto_id),
          nombre: r.nombre,
          cantidad: r.cantidad,
            ubicacion: sanitizeUbicacion(r.ubicacion),
          stock_minimo: r.stock_minimo,
          fecha_caducidad: r.fecha_caducidad,
          caducada: r.caducada
        }));
        setItems(mapped);
        setFiltered(mapped);
      } else {
        setItems([]); setFiltered([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    fetchSucursales().then(res => { if (res.ok) setSucursales(res.data || []); });
  }, []);

  useEffect(() => {
    // apply search + filter
    const q = String(search || '').trim().toLowerCase();
    let out = items.slice();
    if (q) out = out.filter((it: any) => (
      String(it.nombre || '').toLowerCase().includes(q)
      || String(it.codigo || '').toLowerCase().includes(q)
      || String(it.id || '').toLowerCase().includes(q)
      || String(it.ubicacion || '').toLowerCase().includes(q)
    ));
    if (filter === 'agotado') out = out.filter((it: any) => it.cantidad === 0 && !it.caducada);
    else if (filter === 'bajo') out = out.filter((it: any) => it.cantidad <= (it.stock_minimo ?? 0));
    else if (filter === 'normal') out = out.filter((it: any) => it.cantidad > (it.stock_minimo ?? 0));
    else if (filter === 'caducado') out = out.filter((it: any) => it.caducada);
    setFiltered(out);
  }, [search, filter, items]);

  const openEdit = (it: any) => setEditing({ id: it.id, cantidad: it.cantidad, ubicacion: it.ubicacion ?? '' });

  const saveEdit = async () => {
    if (!editing) return;
    const { producto_id, cantidad } = editing;
    if (Number.isNaN(Number(cantidad))) { alert('Cantidad inválida'); return; }
    const delta = Number(cantidad) - Number(items.find(i => i.producto_id === producto_id)?.cantidad || 0);
    try {
      const res = await adjustInventarioAlmacen(producto_id, delta, user?.id);
      if (!res.ok) throw new Error('Error');
      setItems(prev => prev.map(p => p.producto_id === producto_id ? { ...p, cantidad: Number(cantidad) } : p));
      setEditing(null);
    } catch (e) { alert('Error al actualizar'); }
  };

  async function removeProducto(prodId: number) {
    if (!confirm('Eliminar producto del almacén?')) return;
    const res = await deleteInventarioAlmacenProducto(prodId);
    if (res.ok) setItems(prev => prev.filter(p => p.producto_id !== prodId)); else alert('Error eliminando');
  }

  async function purgeExpired() {
    setPurging(true);
    const res = await purgeExpiredInventarioAlmacen();
    if (res.ok) {
      await load();
      alert(`Removidos ${res.removed} productos caducados`);
    } else alert('Error purgando caducados');
    setPurging(false);
  }

  const expirados = items.filter(i => i.caducada);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
        <div className="flex justify-between mb-4 items-center">
          <h1 className="text-3xl font-bold text-text-dark">Inventario Almacén</h1>
          <div className="flex gap-2">
            <input className="border rounded px-3 py-1 text-sm" placeholder="Buscar nombre / código" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
              <option value="all">Todos</option>
              <option value="agotado">Agotado</option>
              <option value="bajo">Bajo</option>
              <option value="normal">Normal</option>
              <option value="caducado">Caducado</option>
            </select>
            <Button variant="secondary" size="sm" onClick={load}>Refrescar</Button>
          </div>
        </div>

        {expiredBanner && expirados.length > 0 && (
          <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-sm text-red-700 flex justify-between items-center">
            <div>
              <strong>{expirados.length} producto(s) caducado(s): </strong>
              {expirados.slice(0,5).map(e => e.nombre || e.codigo).join(', ')}{expirados.length>5?'…':''}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="danger" onClick={purgeExpired} disabled={purging}>{purging?'Purga...':'Purgar caducados'}</Button>
              <Button size="sm" variant="secondary" onClick={()=>setExpiredBanner(false)}>Ocultar</Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Ubicación</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && (<tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">Cargando...</td></tr>)}
                {!loading && filtered.map((it: any, idx: number) => {
                  const isLow = it.cantidad <= (it.stock_minimo ?? 0) && !it.caducada;
                  return (
                    <tr key={`${it.producto_id}-${idx}`} className={`border-t ${it.caducada ? 'bg-red-50' : isLow ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 py-2 text-sm">{it.codigo}</td>
                      <td className="px-3 py-2 text-sm">{it.nombre}</td>
                      <td className="px-3 py-2 text-sm">{it.cantidad}</td>
                      <td className="px-3 py-2 text-sm">{it.caducada ? 'Caducado' : isLow ? 'Bajo' : 'OK'}</td>
                      <td className="px-3 py-2 text-sm">{it.ubicacion || '-'}</td>
                      <td className="px-3 py-2 text-sm">
                        <div className="flex gap-2">
                          {!it.caducada && <Button type="button" onClick={() => setEditing({ producto_id: it.producto_id, cantidad: it.cantidad })} size="sm">Ajustar</Button>}
                          <Button type="button" variant="danger" onClick={() => removeProducto(it.producto_id)} size="sm">Eliminar</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">No hay registros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Simple modal for editing */}
      {editing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded p-4 w-96">
            <h3 className="text-lg font-semibold mb-2">Ajustar inventario</h3>
            <div className="mb-2">
              <label className="block text-sm text-gray-600">Cantidad</label>
              <input className="border px-3 py-2 w-full" value={String(editing.cantidad)} onChange={(e) => setEditing((s: any) => ({ ...s, cantidad: e.target.value }))} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" onClick={() => setEditing(null)} className="px-3 py-1" size="sm">Cancelar</Button>
              <Button type="button" onClick={saveEdit} className="px-3 py-1" size="sm">Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
