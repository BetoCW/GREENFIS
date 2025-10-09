import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import FormField from '../components/FormField';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, loading } = useAuth();
  const { requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    }
  };

  // Recovery
  const [showRecovery, setShowRecovery] = useState(false);
  const [empEmail, setEmpEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [recMessage, setRecMessage] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  const handleRecovery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRecMessage(null);
    setRecLoading(true);
    try {
      await requestPasswordReset(empEmail, newPass);
      setRecMessage(`Solicitud enviada: la contraseña para ${empEmail} fue asignada.`);
      setEmpEmail('');
      setNewPass('');
      setShowRecovery(false);
    } catch (err: any) {
      setRecMessage(err?.message || 'Error en la solicitud');
    } finally {
      setRecLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white p-8 rounded-lg shadow-soft border border-gray-medium">
        <h2 className="text-2xl font-bold text-text-dark mb-2">Iniciar sesión</h2>
        <p className="text-sm text-gray-600 mb-4">Ingresa tu correo y contraseña. El rol se detectará automáticamente según el correo.</p>

        <form onSubmit={submit}>
          <FormField label="Correo electrónico" type="email" value={email} onChange={setEmail} placeholder="admin@greenfis.com" required />
          <FormField label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="********" required />

          {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

          <div className="flex items-center justify-between">
            <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Cargando...' : 'Entrar'}</Button>
            <Link to="/registro-usuario" className="text-sm text-green-primary hover:underline">Registrar cuenta</Link>
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-500">
          Credenciales de prueba: cualquier correo con contraseña <code>password</code>. El sistema detectará el rol desde el correo (p. ej. correos con "admin" o "gerente" se tratan como gerente, con "almacen" o "warehouse" como almacenista, el resto como empleado).
        </div>

        <div className="mt-6 border-t pt-4">
          <button onClick={() => { setShowRecovery(!showRecovery); setRecMessage(null); }} className="text-sm text-green-secondary hover:underline">
            Recuperación de cuenta
          </button>

          {showRecovery && (
            <form onSubmit={handleRecovery} className="mt-4">
              <FormField label="Correo del empleado" type="email" value={empEmail} onChange={setEmpEmail} placeholder="empleado@ejemplo.com" required />
              <FormField label="Nueva contraseña asignada" type="text" value={newPass} onChange={setNewPass} placeholder="Nueva contraseña" required />
              <div className="flex items-center justify-start space-x-3">
                <Button type="submit" variant="secondary" disabled={recLoading}>{recLoading ? 'Enviando...' : 'Asignar contraseña'}</Button>
                <Button type="button" variant="danger" onClick={() => setShowRecovery(false)}>Cancelar</Button>
              </div>
            </form>
          )}

          {recMessage && <div className="mt-3 text-sm text-green-primary">{recMessage}</div>}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
