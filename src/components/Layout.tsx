import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Users, Package, FileText, BarChart3, Settings, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const HeaderAccount: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <Link to="/login" className="text-green-primary font-semibold">Iniciar sesión</Link>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="text-sm">
        <div className="font-semibold">{user.name}</div>
        <div className="text-xs text-gray-500 capitalize">{user.role}</div>
      </div>
      <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Cerrar sesión</button>
    </div>
  );
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Registrar Usuario', path: '/registro-usuario' },
    { icon: FileText, label: 'Gestionar Solicitudes', path: '/gestionar-solicitudes' },
    { icon: BarChart3, label: 'Reportes de Venta', path: '/reportes-venta' },
    { icon: Package, label: 'Gestionar Inventario', path: '/gestionar-inventario' },
    { icon: Settings, label: 'Registro Producto', path: '/registro-producto' },
    { icon: Gift, label: 'Promociones', path: '/promociones' },
  ];

  const { user } = useAuth();
  const employeeMenu = [
    { icon: BarChart3, label: 'Ventas', path: '/employee/ventas' },
    { icon: FileText, label: 'Generar Venta', path: '/employee/venta/nuevo' },
    { icon: Package, label: 'Corte de Caja', path: '/employee/corte' },
    { icon: BarChart3, label: 'Reportes', path: '/employee/reportes' }
  ];

  const warehouseMenu = [
    { icon: Package, label: 'Inventario', path: '/inventario' },
    { icon: BarChart3, label: 'Reportes de Inventario', path: '/inventario/reportes' },
    { icon: FileText, label: 'Solicitudes de Reabastecimiento', path: '/inventario/solicitudes' }
  ];

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
          <div className="text-sm text-text-dark flex items-center space-x-3">
            <HeaderAccount />
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
                  {(
                    user && user.role === 'almacenista' ? warehouseMenu :
                    user && user.role === 'empleado' ? employeeMenu :
                    menuItems
                  ).map((item) => (
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
          {children}
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
