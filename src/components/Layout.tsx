import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Users, Package, FileText, BarChart3, Settings, Gift, ShoppingCart, DollarSign, Truck, Repeat, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Menu for gerente / default
  const gerenteMenu = [
    { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Registrar Usuario', path: '/registro-usuario' },
    { icon: FileText, label: 'Gestionar Solicitudes', path: '/gestionar-solicitudes' },
    { icon: BarChart3, label: 'Reportes de Venta', path: '/reportes-venta' },
    { icon: Package, label: 'Gestionar Inventario', path: '/gestionar-inventario' },
    { icon: Settings, label: 'Registro Producto', path: '/registro-producto' },
    { icon: Gift, label: 'Promociones', path: '/promociones' },
  ];

  // Menu for vendedor
  const vendedorMenu = [
    { icon: BarChart3, label: 'Dashboard', path: '/vendedor/dashboard' },
    { icon: ShoppingCart, label: 'Punto de Venta', path: '/vendedor/pdv' },
    { icon: Package, label: 'Inventario Tienda', path: '/vendedor/inventario' },
    { icon: FileText, label: 'Solicitudes Reabastecimiento', path: '/vendedor/reabastecimiento' },
    { icon: BarChart3, label: 'Historial de Ventas', path: '/vendedor/historial-ventas' },
    { icon: DollarSign, label: 'Corte de Caja', path: '/vendedor/corte-caja' },
    { icon: Gift, label: 'Promociones', path: '/vendedor/promociones' },
  ];

  // Menu for almacenista
  const almacenistaMenu = [
    { icon: BarChart3, label: 'Dashboard', path: '/almacenista/dashboard' },
    { icon: Package, label: 'Inventario Almacén', path: '/almacenista/inventario' },
    { icon: Repeat, label: 'Crear Transferencia', path: '/almacenista/transferencias' },
    { icon: Truck, label: 'Recepción de Pedidos', path: '/almacenista/recepcion' },
    { icon: Box, label: 'Productos', path: '/almacenista/productos' },
    { icon: FileText, label: 'Solicitudes', path: '/almacenista/solicitudes' },
  ];

  let menuItems = gerenteMenu;
  if (user && user.role === 'vendedor') menuItems = vendedorMenu;
  if (user && user.role === 'almacenista') menuItems = almacenistaMenu;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-soft border-b border-gray-medium">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-green-light transition-colors md:hidden"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="text-xl font-bold text-green-primary">GreenFis</span>
            </div>
          </div>
          <div className="text-sm text-text-dark">
            Bienvenido, <span className="font-semibold">{user ? user.name : 'Invitado'}</span>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {(isSidebarOpen || window.innerWidth >= 768) && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed md:relative z-30 w-64 h-screen md:h-auto bg-white shadow-soft border-r border-gray-medium"
            >
              <nav className="p-4">
                <ul className="space-y-2">
                  {menuItems.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          location.pathname === item.path
                            ? 'bg-green-primary text-white'
                            : 'text-text-dark hover:bg-green-light'
                        }`}
                      >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
