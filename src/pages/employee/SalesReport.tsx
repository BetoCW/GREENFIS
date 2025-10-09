import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'gf_sales';

const SalesReport: React.FC = () => {
  const [range, setRange] = useState<'day'|'week'|'month'>('day');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    setSales(raw ? JSON.parse(raw) : []);
  }, []);

  const filtered = useMemo(() => {
    const D = new Date(date);
    return sales.filter(s => {
      const d = new Date(s.date);
      if (range === 'day') {
        return d.toDateString() === D.toDateString();
      }
      if (range === 'week') {
        const start = new Date(D);
        start.setDate(D.getDate() - D.getDay());
        start.setHours(0,0,0,0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23,59,59,999);
        return d >= start && d <= end;
      }
      // month
      return d.getMonth() === D.getMonth() && d.getFullYear() === D.getFullYear();
    });
  }, [sales, range, date]);

  const total = filtered.reduce((s, x) => s + (x.total || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Reporte de ventas</h1>

      <div className="mb-4 flex items-center space-x-3">
        <select value={range} onChange={(e) => setRange(e.target.value as any)} className="px-3 py-2 border rounded">
          <option value="day">Diario</option>
          <option value="week">Semanal</option>
          <option value="month">Mensual</option>
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 border rounded" />
      </div>

      <div className="mb-4">Ventas encontradas: {filtered.length}</div>
      <div className="text-lg font-semibold">Total: {total}</div>
    </div>
  );
};

export default SalesReport;
