import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchSucursales, fetchUsuarios } from '../utils/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, requestPasswordReset, updateUser } = useAuth();
  const [needsSucursal, setNeedsSucursal] = useState(false);
  const [sucursales, setSucursales] = useState<Array<{ id: number; nombre: string }>>([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      const user = await login(email, password);

      // Verificar existencia real en backend (usuarios). Si no existe => usuario nuevo
      let newUser = false;
      try {
        const res = await fetchUsuarios();
        if (res.ok && Array.isArray(res.data)) {
          const exists = res.data.some((u: any) => String(u.correo).toLowerCase() === String(email).toLowerCase());
          newUser = !exists;
        }
      } catch {}
      // guardamos en variable local; no necesitamos estado

      // Reglas:
      // - Rol desconocido => error
      // - Nuevo gerente/almacenista NO permitido (solo existe uno) => error
      // - Vendedor: si es nuevo o no tiene sucursal asignada => pedir sucursal
      if (!user || user.role === 'unknown') {
        setError('Credenciales incorrectas o rol no reconocido. Verifique usuario/contraseña.');
        return;
      }
      if (newUser && (user.role === 'gerente' || user.role === 'almacenista')) {
        setError('Solo existe un gerente y un almacenista. Solicite alta al administrador.');
        return;
      }
      if (user.role === 'vendedor' && (!user.sucursal_id || newUser)) {
        setNeedsSucursal(true);
        return; // esperar a que el usuario elija sucursal
      }

      // Redirecciones normales
      if (user.role === 'gerente') navigate('/dashboard');
      else if (user.role === 'vendedor') navigate('/vendedor/dashboard');
      else if (user.role === 'almacenista') navigate('/almacenista/dashboard');
      else navigate('/');
    } catch (err) {
      setError('No se pudo iniciar sesión');
    }
  };

  const handleRecover = () => {
    if (!email) return setError('Provee el correo para recuperar');
    requestPasswordReset(email);
    setError('Solicitud de recuperación enviada a peticiones');
  };

  useEffect(() => {
    async function loadSucursales() {
      if (!needsSucursal) return;
      setLoadingSucursales(true);
      try {
        const res = await fetchSucursales();
        if (res.ok && Array.isArray(res.data)) setSucursales(res.data.map((s: any) => ({ id: Number(s.id), nombre: s.nombre })));
      } finally {
        setLoadingSucursales(false);
      }
    }
    loadSucursales();
  }, [needsSucursal]);

  const confirmSucursal = () => {
    if (!selectedSucursal) {
      setError('Selecciona una sucursal para continuar');
      return;
    }
    updateUser({ sucursal_id: Number(selectedSucursal) });
    navigate('/vendedor/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Iniciar sesión</h2>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">Correo</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-3 py-2 mb-3" />
          <label className="block text-sm font-medium">Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2 mb-3" />
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <button type="submit" className="w-full bg-green-600 text-white py-2 rounded">Entrar</button>
        </form>
        <div className="mt-4 flex justify-between items-center">
          <button onClick={handleRecover} className="text-sm text-blue-600">Recuperar contraseña</button>
        </div>

        {needsSucursal && (
          <div className="mt-6 p-4 border rounded bg-gray-50">
            <div className="text-sm font-semibold mb-2">Selecciona tu sucursal</div>
            <div className="text-xs text-gray-600 mb-3">Detectamos un usuario nuevo de tipo vendedor o sin sucursal asignada.</div>
            <select
              disabled={loadingSucursales}
              value={selectedSucursal}
              onChange={e => setSelectedSucursal(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3"
            >
              <option value="">{loadingSucursales ? 'Cargando sucursales...' : 'Elige una sucursal'}</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <button onClick={confirmSucursal} className="w-full bg-emerald-600 text-white py-2 rounded disabled:opacity-60" disabled={!selectedSucursal}>
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
