import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import FormField from '../../components/FormField';

// Prefer a Vite environment variable for the backend base URL, fallback to localhost:4000
const BACKEND = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';
const API_BASE = `${BACKEND}/api/manager`;

const UserRegistration: React.FC = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    rol: '',
    sucursal_id: '',
    contrasena: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic client-side validation
    if (!formData.nombre || !formData.correo || !formData.rol || !formData.contrasena) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    // Post to server
    fetch(`${API_BASE}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // ensure numeric sucursal_id or null
      body: JSON.stringify({ nombre: formData.nombre, correo: formData.correo, rol: formData.rol, contrasena: formData.contrasena, sucursal_id: formData.sucursal_id ? Number(formData.sucursal_id) : null })
    })
      .then(async (res) => {
        const text = await res.text();
        // If response is not JSON (for example an HTML error page) avoid JSON.parse exception
        if (!res.ok) throw new Error(text || res.statusText);
        try {
          return JSON.parse(text);
        } catch (err) {
          // If parsing fails, return the raw text
          return text;
        }
      })
      .then((created) => {
        // Update local list
        setUsers((u) => [created, ...u]);
        setFormData({ nombre: '', correo: '', rol: '', sucursal_id: '', contrasena: '' });
      })
      .catch((err) => {
        console.error('Error creating user', err);
        alert('Error al crear usuario. Ver consola para detalles.');
      });
  };

  const [users, setUsers] = useState<Array<any>>([]);

  useEffect(() => {
    // fetch existing users
    fetch(`${API_BASE}/usuarios`)
      .then(async (r) => {
        const text = await r.text();
        if (!r.ok) throw new Error(text || r.statusText);
        try {
          return JSON.parse(text);
        } catch (err) {
          // sometimes the backend returns non-json (html), log and throw
          throw new Error('Invalid JSON response: ' + text.slice(0, 200));
        }
      })
      .then((data) => setUsers(data || []))
      .catch((err) => { console.error('Error fetching usuarios', err); setUsers([]); });
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
  <h1 className="text-3xl font-bold text-text-dark mb-8">Registro de Usuario</h1>

        <div className="bg-white rounded-lg shadow-soft p-8 border border-gray-medium">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              label="Nombre Completo"
              value={formData.nombre}
              onChange={(value) => setFormData({...formData, nombre: value})}
              placeholder="Ingrese el nombre completo"
              required
            />

            <FormField
              label="Correo Electrónico"
              type="email"
              value={formData.correo}
              onChange={(value) => setFormData({...formData, correo: value})}
              placeholder="ejemplo@greenfis.com"
              required
            />

            <div className="mb-4">
              <label className="block text-sm font-bold text-text-dark mb-2">
                Rol <span className="text-accent ml-1">*</span>
              </label>
              <select
                value={formData.rol}
                onChange={(e) => setFormData({...formData, rol: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors"
              >
                <option value="">Seleccione un rol</option>
                <option value="gerente">Gerente</option>
                <option value="vendedor">Vendedor</option>
                <option value="almacenista">Almacenista</option>
              </select>
            </div>

            <FormField
              label="Sucursal (ID)"
              type="number"
              value={formData.sucursal_id}
              onChange={(value) => setFormData({...formData, sucursal_id: value})}
              placeholder="1"
            />

            <FormField
              label="Contraseña"
              type="password"
              value={formData.contrasena}
              onChange={(value) => setFormData({...formData, contrasena: value})}
              placeholder="Contraseña segura"
              required
            />

            <div className="pt-4">
              <Button type="submit" className="w-full" size="lg">
                REGISTRAR USUARIO
              </Button>
            </div>
          </form>
        </div>
        {/* Users table */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-text-dark mb-4">Usuarios registrados</h2>
          <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left text-sm text-gray-600">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Correo</th>
                    <th className="px-3 py-2">Rol</th>
                    <th className="px-3 py-2">Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id_usuario || u.id} className="border-t">
                      <td className="px-3 py-2 text-sm">{u.id_usuario ?? u.id}</td>
                      <td className="px-3 py-2 text-sm">{u.nombre}</td>
                      <td className="px-3 py-2 text-sm">{u.correo}</td>
                      <td className="px-3 py-2 text-sm">{u.rol}</td>
                      <td className="px-3 py-2 text-sm">{u.sucursal_id ?? '-'}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No hay usuarios registrados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserRegistration;
