import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, requestPasswordReset } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('No se pudo iniciar sesión');
    }
  };

  const handleRecover = () => {
    if (!email) return setError('Provee el correo para recuperar');
    requestPasswordReset(email);
    setError('Solicitud de recuperación enviada a peticiones');
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
      </div>
    </div>
  );
};

export default Login;
