import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { readStore, seedIfEmpty } from '../../utils/localStore';
import { useAuth } from '../../context/AuthContext';
import { fetchVentas } from '../../utils/api';

type Sale = { id: number; folio: string; fecha: string; items: any[]; subtotal: number; iva: number; total: number; metodo_pago: string; estado?: string };

const SalesHistory: React.FC = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filter, setFilter] = useState<'hoy'|'semana'|'mes'|'anio'>('hoy');
  const [selected, setSelected] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      seedIfEmpty(); // asegura datos locales mínimos en dev offline
      // Intentar cargar de Supabase si hay usuario
      if (user?.id) {
        const res = await fetchVentas({ vendedor_id: user.id });
        if (res.ok) {
          const data = Array.isArray(res.data) ? res.data : [];
          // Detectar columna de fecha presente
          const first = data[0] || {};
          const dateCol = ['fecha_venta','fecha','created_at','fecha_creacion'].find(c => c in first) || 'fecha_venta';
          const mapped: Sale[] = data.map((r: any) => ({
            id: Number(r.id),
            folio: r.folio || 'SIN-FOLIO-' + r.id,
            fecha: r[dateCol] || new Date().toISOString(),
            items: [], // se cargan perezosamente
            subtotal: Number(r.subtotal||0),
            iva: Number(r.iva||0),
            total: Number(r.total||r.monto_total||0),
            metodo_pago: r.metodo_pago || 'desconocido',
            estado: r.estado || ''
          }));
          setSales(mapped);
        } else {
          // fallback a local storage
          setSales(readStore<Sale[]>('gf_sales', []));
          setError('No se pudo cargar ventas del servidor, usando datos locales');
        }
      } else {
        setSales(readStore<Sale[]>('gf_sales', []));
      }
    } catch(e:any) {
      setError(e.message||'Error cargando ventas');
      setSales(readStore<Sale[]>('gf_sales', []));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  const filtered = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.fecha);
      if (filter === 'hoy') return d.toDateString() === now.toDateString();
      if (filter === 'semana') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (filter === 'mes') {
        const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
        return d >= monthAgo;
      }
      if (filter === 'anio') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [sales, filter]);

  async function loadDetalle(sale: Sale) {
    // Lazy: sólo si aún no hay items
    if (sale.items && sale.items.length) return;
    try {
      // Usamos fetchVentas sólo para cabecera; detalle se obtiene vía cliente directo si disponible
      // Reutilizamos SupabaseCRUD internamente: import dinámico para no romper si offline
      const { SupabaseCRUD } = await import('../../utils/supabaseRest');
      let client: any;
      try { client = new SupabaseCRUD(); } catch { return; }
      const detRes = await client.list('detalle_ventas', { select: 'id,venta_id,producto_id,cantidad,precio_unitario,subtotal', filters: [{ column: 'venta_id', op: 'eq', value: sale.id }] });
      if (detRes.ok) {
        // mapear nombres de productos
        const prodIds = detRes.data.map((d: any) => Number(d.producto_id));
        let nameMap = new Map<number,string>();
        if (prodIds.length) {
          const prodRes = await client.list('productos', { select: 'id,nombre', filters: [{ column: 'id', op: 'in', value: prodIds }] });
          if (prodRes.ok) for (const p of prodRes.data) nameMap.set(Number(p.id), p.nombre||('Producto '+p.id));
        }
        const items = detRes.data.map((d: any) => ({
          producto_id: Number(d.producto_id),
          nombre: nameMap.get(Number(d.producto_id)) || 'Producto '+d.producto_id,
          qty: Number(d.cantidad||0),
          precio: Number(d.precio_unitario||0),
          subtotal: Number(d.subtotal||0)
        }));
        setSales(prev => prev.map(x => x.id === sale.id ? { ...x, items } : x));
      }
    } catch {}
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Historial de Ventas</h1>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="px-3 py-1 rounded border text-sm bg-white">{loading?'Actualizando...':'Refrescar'}</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
          <div className="mb-4 flex gap-3 items-center">
            <label className="text-sm">Filtro:</label>
            <select value={filter} onChange={e => setFilter(e.target.value as any)} className="border rounded px-2 py-1">
              <option value="hoy">Hoy</option>
              <option value="semana">Última semana</option>
              <option value="mes">Último mes</option>
              <option value="anio">Este año</option>
            </select>
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>

          <div className="space-y-2">
            {filtered.map(s => (
              <div key={s.id} className="p-2 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{s.folio} — {new Date(s.fecha).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total: ${s.total.toFixed(2)} — {s.metodo_pago} {s.estado && <span className="ml-2">[{s.estado}]</span>}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelected(s); loadDetalle(s); }} className="text-blue-600">Ver</button>
                  <button onClick={() => alert('Reimprimiendo ticket...')} className="text-gray-600">Reimprimir</button>
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="mt-4 p-4 border rounded bg-gray-50">
              <h3 className="font-semibold mb-2">Detalle: {selected.folio}</h3>
              <div className="text-sm">Fecha: {new Date(selected.fecha).toLocaleString()}</div>
              <div className="mt-2">
                {selected.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between border-b py-1">
                    <div>{it.nombre}</div>
                    <div>{it.qty} x ${it.precio.toFixed(2)}</div>
                  </div>
                ))}
                {(!selected.items || !selected.items.length) && <div className="text-xs text-gray-500">No hay items (o no se pudieron cargar).</div>}
              </div>
              <div className="mt-2">Subtotal: ${selected.subtotal.toFixed(2)}</div>
              <div>IVA: ${selected.iva.toFixed(2)}</div>
              <div className="font-semibold">Total: ${selected.total.toFixed(2)}</div>
              <div className="mt-2"><button onClick={() => setSelected(null)} className="text-blue-600">Cerrar</button></div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SalesHistory;
