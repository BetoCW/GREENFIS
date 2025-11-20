import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import { readStore, writeStore, seedIfEmpty } from '../../utils/localStore';
import { useAuth } from '../../context/AuthContext';
import { fetchVentas, createCorteCaja } from '../../utils/api';

type Sale = { folio: string; fecha: string; total: number; metodo_pago: string };
type Corte = { id: string; fecha_corte: string; ventas_totales: number; monto_total: number; monto_efectivo: number; monto_tarjeta: number; monto_transferencia: number; diferencia: number; observaciones?: string };

const CorteCaja: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [efectivoIngresado, setEfectivoIngresado] = useState<number | ''>('');
  const [apiAvailable, setApiAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
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
      } else {
        // Fallback local
        const corte: Corte = { id: `LC-${Date.now()}`, fecha_corte: new Date().toISOString(), ventas_totales, monto_total, monto_efectivo, monto_tarjeta, monto_transferencia, diferencia: dif, observaciones };
        const all = readStore<Corte[]>('gf_cortes', []);
        all.unshift(corte);
        writeStore('gf_cortes', all);
        setObservaciones(''); setEfectivoIngresado('');
        alert('Servidor no disponible: corte guardado localmente');
      }
    } catch (e) {
      console.error('createCorteCaja error', e);
      const corte: Corte = { id: `LC-${Date.now()}`, fecha_corte: new Date().toISOString(), ventas_totales, monto_total, monto_efectivo, monto_tarjeta, monto_transferencia, diferencia: dif, observaciones };
      const all = readStore<Corte[]>('gf_cortes', []);
      all.unshift(corte);
      writeStore('gf_cortes', all);
      setObservaciones(''); setEfectivoIngresado('');
      alert('Error servidor: corte guardado localmente');
    }
  }

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
      </motion.div>
    </div>
  );
};

export default CorteCaja;
