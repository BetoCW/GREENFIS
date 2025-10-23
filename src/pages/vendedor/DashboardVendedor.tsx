import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { readStore, seedIfEmpty } from '../../utils/localStore';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DashboardVendedor: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    seedIfEmpty();
    setSales(readStore('gf_sales', []));
    setProducts(readStore('gf_products', []));
    setPromos(readStore('gf_promotions', []));
  }, []);

  const todaySales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => new Date(s.fecha).toDateString() === now.toDateString());
  }, [sales]);

  const totalAmount = todaySales.reduce((s, it) => s + (it.total || 0), 0);
  const lowStock = products.filter((p:any) => p.cantidad <= (p.stock_minimo||0)).slice(0,5);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Dashboard</h1>
          <button onClick={() => { logout(); navigate('/login'); }} className="px-3 py-2 bg-red-500 text-white rounded hover:opacity-90">Cerrar sesión</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium"> 
            <h2 className="text-lg font-semibold">Resumen ventas</h2>
            <div className="mt-3">
              <div className="text-sm">Monto total hoy</div>
              <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Ventas: {todaySales.length}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium"> 
            <h2 className="text-lg font-semibold">Alertas de stock</h2>
            <div className="mt-3">
              {lowStock.length === 0 && <div className="text-sm text-gray-600">Sin alertas</div>}
              {lowStock.map((p:any) => (
                <div key={p.id} className="flex justify-between py-1 border-b">
                  <div>{p.nombre}</div>
                  <div className="text-sm text-red-600">{p.cantidad}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium"> 
            <h2 className="text-lg font-semibold">Promociones activas</h2>
            <div className="mt-3">
              {promos.length === 0 && <div className="text-sm text-gray-600">No hay promociones</div>}
              {promos.slice(0,3).map((p:any) => (
                <div key={p.id} className="py-1 border-b">
                  <div className="font-medium">{p.nombre}</div>
                  <div className="text-sm text-gray-600">{p.descripcion}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-soft p-4 border border-gray-medium"> 
          <h3 className="text-md font-semibold mb-2">Accesos rápidos</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/vendedor/pdv" className="px-4 py-2 bg-green-600 text-white rounded">Ir a PDV</Link>
            <Link to="/vendedor/inventario" className="px-4 py-2 bg-gray-200 rounded">Inventario</Link>
            <Link to="/vendedor/reabastecimiento" className="px-4 py-2 bg-yellow-100 rounded">Solicitudes</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardVendedor;

