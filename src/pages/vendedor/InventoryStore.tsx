import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { seedIfEmpty } from '../../utils/localStore';
import { fetchInventoryWithStatus } from '../../utils/api';

type Product = { id: string; nombre: string; descripcion?: string; cantidad: number; precio: number; ubicacion?: string; categoria?: string; stock_minimo?: number };

const InventoryStore: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    seedIfEmpty();
    fetchInventoryWithStatus().then(res => {
      setProducts(res.data);
      if (!res.ok) setApiAvailable(false);
    }).catch(() => setApiAvailable(false));
  }, []);

  const [apiAvailable, setApiAvailable] = useState(true);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.categoria || '').filter(Boolean))), [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      if (category && p.categoria !== category) return false;
      if (!q) return true;
      return p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.descripcion||'').toLowerCase().includes(q);
    });
  }, [products, query, category]);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Inventario Tienda</h1>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
          <div className="mb-4 flex gap-3">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre o código" className="flex-1 border rounded px-3 py-2" />
            <select value={category} onChange={e => setCategory(e.target.value)} className="border rounded px-3 py-2">
              <option value="">Todas las categorías</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="overflow-auto">
            {!apiAvailable && <div className="mb-2 text-sm text-orange-600">Servidor no disponible — mostrando datos locales</div>}
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="py-2">ID</th>
                  <th>Nombre</th>
                  <th>Ubicación</th>
                  <th>Stock</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">{p.id}</td>
                    <td>{p.nombre}</td>
                    <td>{p.ubicacion}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.cantidad === 0 ? 'bg-red-100 text-red-800' : p.cantidad <= (p.stock_minimo||0) ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {p.cantidad}
                      </span>
                    </td>
                    <td>${p.precio.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InventoryStore;
