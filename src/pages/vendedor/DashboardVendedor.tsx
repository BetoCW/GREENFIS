import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchPromocionesFiltered, fetchInventoryWithStatus, fetchVentas } from '../../utils/api';

const DashboardVendedor: React.FC = () => {
  const [ventas, setVentas] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setCargando(true); setError(null);
      try {
        const sucursalId = user?.sucursal_id;
        const [inv, prms, vts] = await Promise.all([
          sucursalId ? fetchInventoryWithStatus(Number(sucursalId)) : Promise.resolve({ ok: false, data: [] }),
          fetchPromocionesFiltered({ activa: true }),
          fetchVentas({ sucursal_id: sucursalId })
        ]);
        setInventario(inv.ok ? inv.data : []);
        setPromos(prms.ok ? prms.data : []);
        setVentas(vts.ok ? vts.data : []);
        if (!vts.ok) setError('No se pudieron cargar ventas');
      } catch (e:any) { setError(e.message||String(e)); }
      finally { setCargando(false); }
    })();
  }, [user?.sucursal_id]);

  const todayVentas = useMemo(() => {
    const nowStr = new Date().toDateString();
    // Detect date column
    const dateCol = ['fecha','fecha_venta','created_at','fecha_creacion'].find(c => ventas.length && c in ventas[0]);
    if (!dateCol) return ventas; // fallback: all ventas
    return ventas.filter(v => {
      const raw = v[dateCol];
      if (!raw) return false;
      return new Date(raw).toDateString() === nowStr;
    });
  }, [ventas]);

  const totalAmount = todayVentas.reduce((s, it) => s + (Number(it.total)||0), 0);
  const lowStock = useMemo(() => {
    return inventario.filter((r:any) => r.cantidad <= (r.stock_minimo||0)).slice(0,5);
  }, [inventario]);

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
              <div className="text-sm text-gray-600">Ventas: {todayVentas.length}</div>
              {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
              {cargando && <div className="text-xs text-gray-500 mt-2">Cargando...</div>}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium"> 
            <h2 className="text-lg font-semibold">Alertas de stock (Sucursal)</h2>
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

