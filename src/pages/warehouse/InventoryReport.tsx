import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'gf_inventory';

const InventoryReport: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    setProducts(raw ? JSON.parse(raw) : []);
  }, []);

  const filtered = useMemo(() => products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || (p.sku||'').toLowerCase().includes(query.toLowerCase())), [products, query]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Reporte de inventario</h1>
      <div className="mb-4 w-96">
        <input placeholder="Buscar por nombre o SKU" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full px-3 py-2 border rounded" />
      </div>

      <div className="space-y-3">
        {filtered.map(p => (
          <div key={p.id} className="p-3 bg-white rounded shadow-soft">
            <div className="font-semibold">{p.name} {p.sku && <span className="text-xs text-gray-500">({p.sku})</span>}</div>
            <div className="text-sm mt-1">
              {Object.entries(p.stock||{}).map(([b,q]) => <div key={b}>{b}: {String(q)}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryReport;
