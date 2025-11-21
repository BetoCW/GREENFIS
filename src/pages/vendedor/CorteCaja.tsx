import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import { readStore, writeStore, seedIfEmpty } from '../../utils/localStore';
import { useAuth } from '../../context/AuthContext';
import { fetchVentas, createCorteCaja, fetchCortesCaja } from '../../utils/api';

type Sale = { folio: string; fecha: string; total: number; metodo_pago: string };
type Corte = { id: string; fecha_corte: string; ventas_totales: number; monto_total: number; monto_efectivo: number; monto_tarjeta: number; monto_transferencia: number; diferencia: number; observaciones?: string };

const CorteCaja: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [efectivoIngresado, setEfectivoIngresado] = useState<number | ''>('');
  const [apiAvailable, setApiAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [loadingCortes, setLoadingCortes] = useState<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    seedIfEmpty();
    async function load() {
      setLoading(true);
      // If authenticated, attempt server fetch for today's sales
      if (user && user.id && user.sucursal_id) {
        try {
          const res: any = await fetchVentas({ sucursal_id: user.sucursal_id, vendedor_id: user.id });
          if (res.ok) {
            const data = Array.isArray(res.data) ? res.data : [];
            // Map to Sale shape, detect date column dynamically
            const sample = data[0] || {};
            const dateCol = ['fecha','fecha_venta','created_at','fecha_creacion'].find(c => c in sample) || 'fecha';
            const mapped: Sale[] = data.map((v: any) => ({
              folio: v.folio || `F-${v.id}`,
              fecha: v[dateCol] || new Date().toISOString(),
              total: Number(v.total || 0),
              metodo_pago: v.metodo_pago || 'efectivo'
            }));
            setSales(mapped);
          } else {
            setApiAvailable(false);
            setSales(readStore<Sale[]>('gf_sales', []));
          }
        } catch {
          setApiAvailable(false);
          setSales(readStore<Sale[]>('gf_sales', []));
        }
      } else {
        // No auth -> local fallback
        setApiAvailable(false);
        setSales(readStore<Sale[]>('gf_sales', []));
      }
      setLoading(false);
    }
    load();
  }, [user]);

  useEffect(() => {
    async function loadCortes() {
      if (!user) { setCortes(readStore<Corte[]>('gf_cortes', []).slice(0,5)); return; }
      setLoadingCortes(true);
      try {
        const res: any = await fetchCortesCaja({ vendedor_id: user.id, sucursal_id: user.sucursal_id });
        if (res.ok) {
          const rows = Array.isArray(res.data) ? res.data : [];
          const sample = rows[0] || {};
          const dateCol = ['fecha_corte','fecha','created_at','fecha_creacion'].find(c => c in sample) || 'fecha_corte';
          const mapped: Corte[] = rows.map((r: any) => ({
            id: String(r.id ?? ''),
            fecha_corte: r[dateCol] || new Date().toISOString(),
            ventas_totales: Number(r.ventas_totales ?? 0),
            monto_total: Number(r.monto_total ?? 0),
            monto_efectivo: Number(r.monto_efectivo ?? 0),
            monto_tarjeta: Number(r.monto_tarjeta ?? 0),
            monto_transferencia: Number(r.monto_transferencia ?? 0),
            diferencia: Number(r.diferencia ?? 0),
            observaciones: r.observaciones ?? undefined
          }));
          // Ordenar desc por fecha y tomar 5
          mapped.sort((a,b) => new Date(b.fecha_corte).getTime() - new Date(a.fecha_corte).getTime());
          setCortes(mapped.slice(0,5));
          setApiAvailable(true);
        } else {
          setApiAvailable(false);
          const local = readStore<Corte[]>('gf_cortes', []);
          const sorted = [...local].sort((a,b)=> new Date(b.fecha_corte).getTime() - new Date(a.fecha_corte).getTime());
          setCortes(sorted.slice(0,5));
        }
      } catch {
        setApiAvailable(false);
        const local = readStore<Corte[]>('gf_cortes', []);
        const sorted = [...local].sort((a,b)=> new Date(b.fecha_corte).getTime() - new Date(a.fecha_corte).getTime());
        setCortes(sorted.slice(0,5));
      } finally {
        setLoadingCortes(false);
      }
    }
    loadCortes();
  }, [user]);

  async function refresh() {
    if (!user) return alert('Sin sesión activa');
    try {
      const res: any = await fetchVentas({ sucursal_id: user.sucursal_id, vendedor_id: user.id });
      if (res.ok) {
        const data = Array.isArray(res.data) ? res.data : [];
        const sample = data[0] || {};
        const dateCol = ['fecha','fecha_venta','created_at','fecha_creacion'].find(c => c in sample) || 'fecha';
        setSales(data.map((v: any) => ({
          folio: v.folio || `F-${v.id}`,
          fecha: v[dateCol] || new Date().toISOString(),
          total: Number(v.total || 0),
          metodo_pago: v.metodo_pago || 'efectivo'
        })));
        setApiAvailable(true);
      } else {
        setApiAvailable(false);
        setSales(readStore<Sale[]>('gf_sales', []));
      }
    } catch {
      setApiAvailable(false);
      setSales(readStore<Sale[]>('gf_sales', []));
    }
  }

  const today = useMemo(() => {
    const now = new Date();
    return sales.filter(s => new Date(s.fecha).toDateString() === now.toDateString());
  }, [sales]);

  const ventas_totales = today.length;
  const monto_total = today.reduce((s, it) => s + (it.total || 0), 0);
  const monto_efectivo = today.filter(t => t.metodo_pago === 'efectivo').reduce((s, it) => s + (it.total || 0), 0);
  const monto_tarjeta = today.filter(t => t.metodo_pago === 'tarjeta').reduce((s, it) => s + (it.total || 0), 0);
  const monto_transferencia = today.filter(t => t.metodo_pago === 'transferencia').reduce((s, it) => s + (it.total || 0), 0);

  async function cerrarCorte() {
    if (!user || !user.id || !user.sucursal_id) return alert('Sesión o datos de usuario incompletos');
    const dif = typeof efectivoIngresado === 'number' ? (efectivoIngresado - monto_efectivo) : 0;
    const payload = {
      vendedor_id: Number(user.id),
      sucursal_id: Number(user.sucursal_id),
      ventas_totales,
      monto_total,
      monto_efectivo,
      monto_tarjeta,
      monto_transferencia,
      diferencia: dif,
      observaciones: observaciones || undefined
    };
    try {
      const res: any = await createCorteCaja(payload);
      if (res.ok) {
        // store locally for history if needed
        const corte: Corte = {
          id: String(res.data.id || `C-${Date.now()}`),
          fecha_corte: res.data.fecha_corte || new Date().toISOString(),
          ventas_totales,
          monto_total,
          monto_efectivo,
          monto_tarjeta,
          monto_transferencia,
          diferencia: dif,
          observaciones
        };
        const all = readStore<Corte[]>('gf_cortes', []);
        all.unshift(corte);
        writeStore('gf_cortes', all);
        setObservaciones(''); setEfectivoIngresado('');
        alert('Corte cerrado y registrado en servidor');
        // refrescar lista de cortes
        try {
          const again: any = await fetchCortesCaja({ vendedor_id: user.id, sucursal_id: user.sucursal_id });
          if (again.ok) {
            const rows = Array.isArray(again.data) ? again.data : [];
            const sample = rows[0] || {};
            const dateCol = ['fecha_corte','fecha','created_at','fecha_creacion'].find(c => c in sample) || 'fecha_corte';
            const mapped: Corte[] = rows.map((r: any) => ({
              id: String(r.id ?? ''),
              fecha_corte: r[dateCol] || new Date().toISOString(),
              ventas_totales: Number(r.ventas_totales ?? 0),
              monto_total: Number(r.monto_total ?? 0),
              monto_efectivo: Number(r.monto_efectivo ?? 0),
              monto_tarjeta: Number(r.monto_tarjeta ?? 0),
              monto_transferencia: Number(r.monto_transferencia ?? 0),
              diferencia: Number(r.diferencia ?? 0),
              observaciones: r.observaciones ?? undefined
            }));
            mapped.sort((a,b) => new Date(b.fecha_corte).getTime() - new Date(a.fecha_corte).getTime());
            setCortes(mapped.slice(0,5));
          }
        } catch {}
      } else {
        // Fallback local
        const corte: Corte = { id: `LC-${Date.now()}`, fecha_corte: new Date().toISOString(), ventas_totales, monto_total, monto_efectivo, monto_tarjeta, monto_transferencia, diferencia: dif, observaciones };
        const all = readStore<Corte[]>('gf_cortes', []);
        all.unshift(corte);
        writeStore('gf_cortes', all);
        setObservaciones(''); setEfectivoIngresado('');
        alert('Servidor no disponible: corte guardado localmente');
        // refrescar desde local
        const local = readStore<Corte[]>('gf_cortes', []);
        const sorted = [...local].sort((a,b)=> new Date(b.fecha_corte).getTime() - new Date(a.fecha_corte).getTime());
        setCortes(sorted.slice(0,5));
      }
    } catch (e) {
      console.error('createCorteCaja error', e);
      const corte: Corte = { id: `LC-${Date.now()}`, fecha_corte: new Date().toISOString(), ventas_totales, monto_total, monto_efectivo, monto_tarjeta, monto_transferencia, diferencia: dif, observaciones };
      const all = readStore<Corte[]>('gf_cortes', []);
      all.unshift(corte);
      writeStore('gf_cortes', all);
      setObservaciones(''); setEfectivoIngresado('');
      alert('Error servidor: corte guardado localmente');
      const local = readStore<Corte[]>('gf_cortes', []);
      const sorted = [...local].sort((a,b)=> new Date(b.fecha_corte).getTime() - new Date(a.fecha_corte).getTime());
      setCortes(sorted.slice(0,5));
    }
  }

  const lastFiveGrouped = useMemo(() => {
    const byDate: Record<string, Corte[]> = {};
    for (const c of cortes) {
      const d = new Date(c.fecha_corte);
      const key = isNaN(d.getTime()) ? String(c.fecha_corte).slice(0,10) : d.toISOString().slice(0,10);
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(c);
    }
    // Ordenar fechas desc
    const keys = Object.keys(byDate).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
    return keys.map(k => ({ date: k, items: byDate[k].sort((a,b)=> new Date(b.fecha_corte).getTime() - new Date(a.fecha_corte).getTime()) }));
  }, [cortes]);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Corte de Caja</h1>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
          {!apiAvailable && <div className="mb-2 text-sm text-orange-600">Servidor no disponible — usando ventas locales</div>}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">{user ? `Vendedor: ${user.nombre || user.id} | Sucursal: ${user.sucursal_id}` : 'Sin sesión autenticada'}</div>
            <Button variant="secondary" onClick={refresh}>Refrescar</Button>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold">Resumen de movimientos del día</h3>
            <div className="mt-2 text-sm">
              {loading && <div>Cargando ventas...</div>}
              {!loading && <div>Ventas: {ventas_totales}</div>}
              <div>Total: ${monto_total.toFixed(2)}</div>
              <div>Efectivo: ${monto_efectivo.toFixed(2)}</div>
              <div>Tarjeta: ${monto_tarjeta.toFixed(2)}</div>
              <div>Transferencia: ${monto_transferencia.toFixed(2)}</div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold">Calculadora de efectivo</h3>
            <div className="flex gap-2 items-center mt-2">
              <input type="number" value={efectivoIngresado as any} onChange={e => setEfectivoIngresado(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Efectivo contado" className="border rounded px-3 py-2" />
              <div>Esperado: ${monto_efectivo.toFixed(2)}</div>
              <div>Diferencia: ${typeof efectivoIngresado === 'number' ? (efectivoIngresado - monto_efectivo).toFixed(2) : '0.00'}</div>
            </div>
            <div className="mt-2">
              <label className="block text-sm">Observaciones</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="danger" onClick={cerrarCorte} disabled={!user || loading}>Cerrar Corte</Button>
          </div>
        </div>

        {/* Últimos 5 cortes (agrupados por día) */}
        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Últimos cortes</h3>
            <Button variant="secondary" onClick={() => {
              // simple refresh: trigger re-load cortes
              if (!user) {
                const local = readStore<Corte[]>('gf_cortes', []);
                const sorted = [...local].sort((a,b)=> new Date(b.fecha_corte).getTime() - new Date(a.fecha_corte).getTime());
                setCortes(sorted.slice(0,5));
              } else {
                (async ()=>{
                  setLoadingCortes(true);
                  try {
                    const res: any = await fetchCortesCaja({ vendedor_id: user.id, sucursal_id: user.sucursal_id });
                    if (res.ok) {
                      const rows = Array.isArray(res.data) ? res.data : [];
                      const sample = rows[0] || {};
                      const dateCol = ['fecha_corte','fecha','created_at','fecha_creacion'].find(c => c in sample) || 'fecha_corte';
                      const mapped: Corte[] = rows.map((r: any) => ({
                        id: String(r.id ?? ''),
                        fecha_corte: r[dateCol] || new Date().toISOString(),
                        ventas_totales: Number(r.ventas_totales ?? 0),
                        monto_total: Number(r.monto_total ?? 0),
                        monto_efectivo: Number(r.monto_efectivo ?? 0),
                        monto_tarjeta: Number(r.monto_tarjeta ?? 0),
                        monto_transferencia: Number(r.monto_transferencia ?? 0),
                        diferencia: Number(r.diferencia ?? 0),
                        observaciones: r.observaciones ?? undefined
                      }));
                      mapped.sort((a,b) => new Date(b.fecha_corte).getTime() - new Date(a.fecha_corte).getTime());
                      setCortes(mapped.slice(0,5));
                    }
                  } finally { setLoadingCortes(false); }
                })();
              }
            }}>Refrescar cortes</Button>
          </div>
          {loadingCortes && <div className="text-sm text-gray-600">Cargando cortes...</div>}
          {!loadingCortes && lastFiveGrouped.length === 0 && (
            <div className="text-sm text-gray-600">Sin cortes registrados aún.</div>
          )}
          {!loadingCortes && lastFiveGrouped.map(group => (
            <div key={group.date} className="mb-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{new Date(group.date).toLocaleDateString('es-MX')}</div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map(c => (
                  <div key={c.id} className="border rounded p-3 bg-gray-50">
                    <div className="text-xs text-gray-500">Corte #{c.id}</div>
                    <div className="text-sm font-medium">Total: ${c.monto_total.toFixed(2)}</div>
                    <div className="text-xs text-gray-600">Ventas: {c.ventas_totales} · Efe: ${c.monto_efectivo.toFixed(2)} · Tj: ${c.monto_tarjeta.toFixed(2)} · Tr: ${c.monto_transferencia.toFixed(2)}</div>
                    {c.diferencia ? (<div className={`text-xs mt-1 ${c.diferencia === 0 ? 'text-gray-500' : (c.diferencia > 0 ? 'text-emerald-700' : 'text-red-700')}`}>Diferencia: ${c.diferencia.toFixed(2)}</div>) : null}
                    {c.observaciones && <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={c.observaciones}>Obs: {c.observaciones}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default CorteCaja;
