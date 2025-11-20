import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { fetchRecentGerenteEvents } from '../../utils/api';

interface EventoReciente {
  id: any;
  tipo: string;
  fecha: string;
  detalle: string;
}

export default function DashboardAlmacenista() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoReciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function loadEventos() {
    setLoading(true); setError(null);
    try {
      const res = await fetchRecentGerenteEvents(5);
      if (res.ok) setEventos(res.data || []); else setError('No se pudieron cargar movimientos');
    } catch (e) {
      setError('Error inesperado al cargar movimientos');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadEventos(); }, []);

  function onLogout() {
    logout();
    navigate('/login');
  }

  const cards = [
    { title: 'Inventario Almacén', path: '/almacenista/inventario', desc: 'Revisa y ajusta stock', color: 'bg-green-primary' },
    { title: 'Crear Transferencia', path: '/almacenista/transferencias', desc: 'Enviar productos a sucursales', color: 'bg-green-secondary' },
    { title: 'Recepción de Pedidos', path: '/almacenista/recepcion', desc: 'Registrar pedidos recibidos', color: 'bg-success' },
    { title: 'Productos', path: '/almacenista/productos', desc: 'Consulta catálogo base', color: 'bg-warning' },
    { title: 'Solicitudes', path: '/almacenista/solicitudes', desc: 'Atiende solicitudes pendientes', color: 'bg-accent' }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-text-dark">Panel Almacenista</h1>
          <button onClick={onLogout} className="px-3 py-2 bg-red-500 text-white rounded hover:opacity-90">Cerrar sesión</button>
        </div>
        <p className="text-lg text-gray-600 mb-8">Acciones disponibles y últimos movimientos globales.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {cards.map((card, idx) => (
            <motion.div key={card.path} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay: idx * 0.05 }}>
              <Link to={card.path} className="block h-full">
                <div className="bg-white rounded-lg shadow-soft p-6 h-full hover:shadow-lg transition-shadow duration-300 border border-gray-medium">
                  <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}>🔧</div>
                  <h3 className="text-xl font-semibold text-text-dark mb-2">{card.title}</h3>
                  <p className="text-gray-600 text-sm">{card.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-dark">Últimos Movimientos del Gerente</h2>
            <button onClick={loadEventos} className="text-sm px-3 py-2 rounded bg-gray-200 hover:bg-gray-300">Actualizar</button>
          </div>
          {error && <div className="mb-4 p-3 text-sm bg-yellow-50 border border-yellow-300 rounded text-yellow-800">{error}</div>}
          {loading && <div className="py-4 text-sm text-gray-600">Cargando movimientos...</div>}
          {!loading && eventos.length === 0 && !error && <div className="py-4 text-sm text-gray-600">Sin movimientos recientes</div>}
          {!loading && eventos.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Detalle</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map(ev => (
                  <tr key={ev.tipo + ev.id + ev.fecha} className="border-t">
                    <td className="px-3 py-2">{ev.tipo}</td>
                    <td className="px-3 py-2">{ev.detalle || '-'}</td>
                    <td className="px-3 py-2">{new Date(ev.fecha).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
