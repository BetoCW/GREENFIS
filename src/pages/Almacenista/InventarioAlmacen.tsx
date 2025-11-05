import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

export default function InventarioAlmacen() {
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'agotado'|'bajo'|'normal'>('all');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null); // { id, cantidad, ubicacion }
  const { user } = useAuth();

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/almacen/inventario/vw`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // normalize to lowercase keys used below
      const mapped = data.map((r: any) => ({
        // coerce product id to number when possible to avoid identifier conflicts
        id: Number(r.producto_id ?? r.producto_id_real ?? r.id),
        codigo: String(r.ID ?? r.id ?? (r.producto_id ?? r.producto_id_real ?? '')),
        nombre: r.NOMBRE ?? r.nombre ?? r.producto ?? '',
        descripcion: r.DESCRIPCION ?? r.descripcion ?? '',
        cantidad: Number(r.CANTIDAD ?? r.cantidad ?? 0),
        ubicacion: r.UBICACION ?? r.ubicacion ?? '',
        stock_minimo: Number(r.stock_minimo ?? r.STOCK_MINIMO ?? 0)
      }));
      setItems(mapped);
      setFiltered(mapped);
    } catch (e) {
      console.error('Error fetching inventario vw', e);
      setItems([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    // apply search + filter
    const q = String(search || '').trim().toLowerCase();
    let out = items.slice();
    if (q) out = out.filter((it: any) => (String(it.nombre || '').toLowerCase().includes(q) || String(it.codigo || '').toLowerCase().includes(q) || String(it.id || '').toLowerCase().includes(q)));
    if (filter === 'agotado') out = out.filter((it: any) => it.cantidad === 0);
    else if (filter === 'bajo') out = out.filter((it: any) => it.cantidad <= (it.stock_minimo ?? 0));
    else if (filter === 'normal') out = out.filter((it: any) => it.cantidad > (it.stock_minimo ?? 0));
    setFiltered(out);
  }, [search, filter, items]);

  const openEdit = (it: any) => setEditing({ id: it.id, cantidad: it.cantidad, ubicacion: it.ubicacion ?? '' });

  const saveEdit = async () => {
    if (!editing) return;
    const { id, cantidad, ubicacion } = editing;
    if (Number.isNaN(Number(cantidad))) { alert('Cantidad inválida'); return; }
    try {
      const body = { cantidad: Number(cantidad), actualizado_por: user?.id ?? null, ubicacion };
      const res = await fetch(`${API}/api/almacen/inventario/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      // optimistic update in UI
      setItems((prev) => prev.map((p) => (String(p.id) === String(id) ? { ...p, cantidad: Number(cantidad), ubicacion } : p)));
      setEditing(null);
      alert('Cantidad actualizada');
    } catch (e) {
      console.error('Error saving inventory edit', e);
      alert('Error al actualizar cantidad');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Inventario - Almacén</h1>
        <div className="space-x-2">
          <input className="border rounded px-3 py-1" placeholder="Buscar por nombre, código o id" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="border rounded px-2 py-1">
            <option value="all">Todos</option>
            <option value="agotado">Agotado</option>
            <option value="bajo">Bajo o crítico</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-soft p-4 border">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Cantidad</th>
                <th className="px-3 py-2">Ubicación</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">Cargando...</td></tr>)}
              {!loading && filtered.map((it: any, idx: number) => {
                const isLow = it.cantidad <= (it.stock_minimo ?? 0);
                return (
                  <tr key={`${it.id}-${String(it.ubicacion ?? '')}-${idx}`} className={`border-t ${isLow ? 'bg-yellow-50' : ''}`}>
                    <td className="px-3 py-2 text-sm">{it.codigo}</td>
                    <td className="px-3 py-2 text-sm">{it.nombre}</td>
                    <td className="px-3 py-2 text-sm">{it.cantidad} {isLow && <span className="text-xs text-yellow-700 ml-2">(bajo)</span>}</td>
                    <td className="px-3 py-2 text-sm">{it.ubicacion ?? '-'}</td>
                    <td className="px-3 py-2 text-sm">
                      <Button type="button" onClick={() => openEdit(it)} className="px-3 py-1" size="sm">Ajustar</Button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No hay registros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple modal for editing */}
      {editing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded p-4 w-96">
            <h3 className="text-lg font-semibold mb-2">Ajustar inventario</h3>
            <div className="mb-2">
              <label className="block text-sm text-gray-600">Cantidad</label>
              <input className="border px-3 py-2 w-full" value={String(editing.cantidad)} onChange={(e) => setEditing((s: any) => ({ ...s, cantidad: e.target.value }))} />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600">Ubicación</label>
              <input className="border px-3 py-2 w-full" value={editing.ubicacion} onChange={(e) => setEditing((s: any) => ({ ...s, ubicacion: e.target.value }))} />
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
