import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UserRegistration from './pages/UserRegistration';
import OrderManagement from './pages/OrderManagement';
import SalesReports from './pages/SalesReports';
import InventoryManagement from './pages/InventoryManagement';
import ProductRegistration from './pages/ProductRegistration';
import Promotions from './pages/Promotions';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import EmployeeSales from './pages/employee/Sales';
import NewSale from './pages/employee/NewSale';
import CashCut from './pages/employee/CashCut';
import SalesReport from './pages/employee/SalesReport';
import WarehouseInventoryManagement from './pages/warehouse/InventoryManagement';
import InventoryReport from './pages/warehouse/InventoryReport';
import RestockRequests from './pages/warehouse/RestockRequests';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={(
              <Layout>
                <Routes>
                  <Route path="/" element={<ProtectedRoute roles={['gerente']}><Dashboard /></ProtectedRoute>} />
                  <Route path="/registro-usuario" element={<ProtectedRoute roles={['gerente']}><UserRegistration /></ProtectedRoute>} />
                  <Route path="/gestionar-solicitudes" element={<ProtectedRoute roles={['gerente']}><OrderManagement /></ProtectedRoute>} />
                  <Route path="/reportes-venta" element={<ProtectedRoute roles={['gerente']}><SalesReports /></ProtectedRoute>} />
                  <Route path="/gestionar-inventario" element={<ProtectedRoute roles={['gerente']}><InventoryManagement /></ProtectedRoute>} />
                  <Route path="/registro-producto" element={<ProtectedRoute roles={['gerente']}><ProductRegistration /></ProtectedRoute>} />
                  <Route path="/promociones" element={<ProtectedRoute roles={['gerente']}><Promotions /></ProtectedRoute>} />
                  {/* Warehouse routes */}
                  <Route path="/inventario" element={<ProtectedRoute roles={['gerente','almacenista']}><WarehouseInventoryManagement /></ProtectedRoute>} />
                  <Route path="/inventario/reportes" element={<ProtectedRoute roles={['gerente','almacenista']}><InventoryReport /></ProtectedRoute>} />
                  <Route path="/inventario/solicitudes" element={<ProtectedRoute roles={['gerente','almacenista']}><RestockRequests /></ProtectedRoute>} />
                  {/* Employee routes */}
                  <Route path="/employee/ventas" element={<ProtectedRoute roles={['gerente','empleado','almacenista']}><EmployeeSales /></ProtectedRoute>} />
                  <Route path="/employee/venta/nuevo" element={<ProtectedRoute roles={['gerente','empleado','almacenista']}><NewSale /></ProtectedRoute>} />
                  <Route path="/employee/venta/:id" element={<ProtectedRoute roles={['gerente','empleado','almacenista']}><NewSale /></ProtectedRoute>} />
                  <Route path="/employee/corte" element={<ProtectedRoute roles={['gerente','empleado','almacenista']}><CashCut /></ProtectedRoute>} />
                  <Route path="/employee/reportes" element={<ProtectedRoute roles={['gerente','empleado','almacenista']}><SalesReport /></ProtectedRoute>} />
                </Routes>
              </Layout>
            )}
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
