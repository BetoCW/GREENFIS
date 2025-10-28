import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function DashboardAlmacenista() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Dashboard - Almacén</h1>
        <button onClick={onLogout} className="px-3 py-2 bg-red-500 text-white rounded hover:opacity-90">Cerrar sesión</button>
      </div>

      <p className="mb-4">Bienvenido al panel del almacenista. Usa las opciones para administrar el almacén.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/almacenista/inventario" className="block p-4 bg-white rounded shadow text-center">Inventario Almacén</Link>
        <Link to="/almacenista/transferencias" className="block p-4 bg-white rounded shadow text-center">Crear Transferencia</Link>
        <Link to="/almacenista/recepcion" className="block p-4 bg-white rounded shadow text-center">Recepción de Pedidos</Link>
        <Link to="/almacenista/productos" className="block p-4 bg-white rounded shadow text-center">Productos</Link>
        <Link to="/almacenista/solicitudes" className="block p-4 bg-white rounded shadow text-center">Solicitudes</Link>
      </div>
    </div>
  );
}
