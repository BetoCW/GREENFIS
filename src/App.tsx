import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/gerentepages/Dashboard';
import UserRegistration from './pages/gerentepages/UserRegistration';
import OrderManagement from './pages/gerentepages/OrderManagement';
import SalesReports from './pages/gerentepages/SalesReports';
import InventoryManagement from './pages/gerentepages/InventoryManagement';
import ProductRegistration from './pages/gerentepages/ProductRegistration';
import Promotions from './pages/gerentepages/Promotions';
// Vendedor pages
import DashboardVendedor from './pages/vendedor/DashboardVendedor';
import PuntoDeVenta from './pages/vendedor/PuntoDeVenta';
import InventoryStore from './pages/vendedor/InventoryStore';
import Reabastecimiento from './pages/vendedor/Reabastecimiento';
import SalesHistory from './pages/vendedor/SalesHistory';
import CorteCaja from './pages/vendedor/CorteCaja';
import PromotionsVendedor from './pages/vendedor/PromotionsVendedor';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected area: Layout + nested pages - user must login once */}
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                {/* Index redirect: send logged users to role-appropriate landing */}
                <Route index element={<HomeRedirect />} />

                {/* Gerente routes */}
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="registro-usuario" element={<UserRegistration />} />
                <Route path="gestionar-solicitudes" element={<OrderManagement />} />
                <Route path="reportes-venta" element={<SalesReports />} />
                <Route path="gestionar-inventario" element={<InventoryManagement />} />
                <Route path="registro-producto" element={<ProductRegistration />} />
                <Route path="promociones" element={<Promotions />} />

                {/* Vendedor-specific routes (role-protected) */}
                <Route path="vendedor/dashboard" element={<ProtectedRoute roles={["vendedor"]}><DashboardVendedor /></ProtectedRoute>} />
                <Route path="vendedor/pdv" element={<ProtectedRoute roles={["vendedor"]}><PuntoDeVenta /></ProtectedRoute>} />
                <Route path="vendedor/inventario" element={<ProtectedRoute roles={["vendedor"]}><InventoryStore /></ProtectedRoute>} />
                <Route path="vendedor/reabastecimiento" element={<ProtectedRoute roles={["vendedor"]}><Reabastecimiento /></ProtectedRoute>} />
                <Route path="vendedor/historial-ventas" element={<ProtectedRoute roles={["vendedor"]}><SalesHistory /></ProtectedRoute>} />
                <Route path="vendedor/corte-caja" element={<ProtectedRoute roles={["vendedor"]}><CorteCaja /></ProtectedRoute>} />
                <Route path="vendedor/promociones" element={<ProtectedRoute roles={["vendedor"]}><PromotionsVendedor /></ProtectedRoute>} />
              </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
      </Router>
    </AuthProvider>
  );
}

function HomeRedirect(): React.ReactElement {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Send user to their role-specific landing
  if (user.role === 'gerente') return <Navigate to="/dashboard" replace />;
  if (user.role === 'almacenista') return <Navigate to="/gestionar-inventario" replace />;
  if (user.role === 'vendedor') return <Navigate to="/vendedor/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}
/*
function HomeRedirect(): React.ReactElement {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Send user to their role-specific landing
  if (user.role === 'gerente') return <Navigate to="/dashboard" replace />;
  if (user.role === 'almacenista') return <Navigate to="/gestionar-inventario" replace />;
  if (user.role === 'vendedor') return <Navigate to="/gestionar-solicitudes" replace />;
  return <Navigate to="/dashboard" replace />;
}
*/
export default App;
