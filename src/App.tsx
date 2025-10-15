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

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/registro-usuario" element={<UserRegistration />} />
          <Route path="/gestionar-solicitudes" element={<OrderManagement />} />
          <Route path="/reportes-venta" element={<SalesReports />} />
          <Route path="/gestionar-inventario" element={<InventoryManagement />} />
          <Route path="/registro-producto" element={<ProductRegistration />} />
          <Route path="/promociones" element={<Promotions />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
