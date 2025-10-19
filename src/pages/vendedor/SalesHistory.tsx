import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { readStore, seedIfEmpty } from '../../utils/localStore';

type Sale = { folio: string; fecha: string; items: any[]; subtotal: number; iva: number; total: number; metodo_pago: string };

const SalesHistory: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filter, setFilter] = useState<'hoy'|'semana'|'mes'>('hoy');
  const [selected, setSelected] = useState<Sale | null>(null);

  useEffect(() => {
    seedIfEmpty();
    setSales(readStore<Sale[]>('gf_sales', []));
  }, []);

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
      return true;
    });
  }, [sales, filter]);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Historial de Ventas</h1>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
          <div className="mb-4 flex gap-3 items-center">
            <label className="text-sm">Filtro:</label>
            <select value={filter} onChange={e => setFilter(e.target.value as any)} className="border rounded px-2 py-1">
              <option value="hoy">Hoy</option>
              <option value="semana">Última semana</option>
              <option value="mes">Último mes</option>
            </select>
          </div>

          <div className="space-y-2">
            {filtered.map(s => (
              <div key={s.folio} className="p-2 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{s.folio} — {new Date(s.fecha).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total: ${s.total.toFixed(2)} — {s.metodo_pago}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(s)} className="text-blue-600">Ver</button>
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
