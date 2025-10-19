import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import { readStore, writeStore, seedIfEmpty } from '../../utils/localStore';

type Sale = { folio: string; fecha: string; total: number; metodo_pago: string };
type Corte = { id: string; fecha_corte: string; ventas_totales: number; monto_total: number; monto_efectivo: number; monto_tarjeta: number; monto_transferencia: number; diferencia: number; observaciones?: string };

const CorteCaja: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [efectivoIngresado, setEfectivoIngresado] = useState<number | ''>('');

  useEffect(() => {
    seedIfEmpty();
    setSales(readStore<Sale[]>('gf_sales', []));
  }, []);

  const today = useMemo(() => {
    const now = new Date();
    return sales.filter(s => new Date(s.fecha).toDateString() === now.toDateString());
  }, [sales]);

  const ventas_totales = today.length;
  const monto_total = today.reduce((s, it) => s + (it.total || 0), 0);
  const monto_efectivo = today.filter(t => t.metodo_pago === 'efectivo').reduce((s, it) => s + (it.total || 0), 0);
  const monto_tarjeta = today.filter(t => t.metodo_pago === 'tarjeta').reduce((s, it) => s + (it.total || 0), 0);
  const monto_transferencia = today.filter(t => t.metodo_pago === 'transferencia').reduce((s, it) => s + (it.total || 0), 0);

  function cerrarCorte() {
    const dif = typeof efectivoIngresado === 'number' ? (efectivoIngresado - monto_efectivo) : 0;
    const corte: Corte = { id: `C-${Date.now()}`, fecha_corte: new Date().toISOString(), ventas_totales, monto_total, monto_efectivo, monto_tarjeta, monto_transferencia, diferencia: dif, observaciones };
    const all = readStore<Corte[]>('gf_cortes', []);
    all.unshift(corte);
    writeStore('gf_cortes', all);
    setObservaciones(''); setEfectivoIngresado('');
    alert('Corte cerrado');
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Corte de Caja</h1>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
          <div className="mb-4">
            <h3 className="font-semibold">Resumen de movimientos del día</h3>
            <div className="mt-2 text-sm">
              <div>Ventas: {ventas_totales}</div>
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
            <Button variant="danger" onClick={cerrarCorte}>Cerrar Corte</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CorteCaja;
