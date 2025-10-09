import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'gf_sales';

const CashCut: React.FC = () => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    setSales(raw ? JSON.parse(raw) : []);
  }, []);

  const totalForDate = useMemo(() => {
    const dayStart = new Date(date);
    dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23,59,59,999);
    return sales.filter(s => {
      const d = new Date(s.date);
      return d >= dayStart && d <= dayEnd;
    }).reduce((sum, s) => sum + (s.total || 0), 0);
  }, [date, sales]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Corte de caja</h1>
      <div className="mb-4 w-64">
        <label className="block text-sm font-bold mb-2">Fecha</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded" />
      </div>

      <div className="text-lg font-semibold">Total del día: {totalForDate}</div>
    </div>
  );
};

export default CashCut;
