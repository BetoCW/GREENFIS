import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import { fetchUsuarios, createUsuario, updateUsuario, deleteUsuario, fetchSucursales } from '../../utils/api';

const UserRegistration: React.FC = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    rol: '',
    sucursal_id: '',
    contrasena: ''
  });

  // editingId: null => creating new user; number => editing that user id
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPk, setEditingPk] = useState<string>('id_usuario');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      if (!formData.nombre || !formData.correo) {
        alert('Nombre y correo son obligatorios');
        return;
      }
      const res = await updateUsuario(editingId, {
        nombre: formData.nombre,
        correo: formData.correo,
        rol: formData.rol || undefined,
        sucursal_id: formData.sucursal_id ? Number(formData.sucursal_id) : null,
        contrasena: formData.contrasena || undefined
      }, editingPk);
      if (!res.ok) {
        console.error('Update usuario error:', res.error);
        const msg = (res.error && (res.error.message || res.error.code)) ? `${res.error.message || res.error.code}` : 'Error desconocido';
        alert('Error al actualizar usuario: ' + msg);
        return;
      }
      // Supabase returns representation array
      const updatedRow = Array.isArray(res.data) ? res.data[0] : res.data;
      setUsers(list => list.map(it => (String(it.id) === String(editingId) ? updatedRow : it)));
      setEditingId(null);
      setEditingPk('id_usuario');
      setFormData({ nombre: '', correo: '', rol: '', sucursal_id: '', contrasena: '' });
      return;
    }
    if (!formData.nombre || !formData.correo || !formData.rol || !formData.contrasena) {
      alert('Complete los campos obligatorios');
      return;
    }
    const res = await createUsuario({
      nombre: formData.nombre,
      correo: formData.correo,
      rol: formData.rol,
      sucursal_id: formData.sucursal_id ? Number(formData.sucursal_id) : null,
      contrasena: formData.contrasena
    });
    if (!res.ok) {
      console.error('Create usuario error:', res.error);
      const msg = (res.error && (res.error.message || res.error.code)) ? `${res.error.message || res.error.code}` : 'Error desconocido';
      alert('Error al crear usuario: ' + msg);
      return;
    }
    const createdRow = Array.isArray(res.data) ? res.data[0] : res.data;
    setUsers(u => [createdRow, ...u]);
    setFormData({ nombre: '', correo: '', rol: '', sucursal_id: '', contrasena: '' });
  };

  const [users, setUsers] = useState<Array<any>>([]);
  const [sucursales, setSucursales] = useState<Array<{ id: number; nombre: string }>>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetchUsuarios();
      if (res.ok) setUsers(res.data || []);
      else setUsers([]);
      const sucRes = await fetchSucursales();
      if (sucRes.ok) setSucursales(sucRes.data || []);
    };
    load();
  }, []);

  const startEdit = (u: any) => {
    setEditingId(Number(u.id));
    setEditingPk(u.pkColumn || 'id');
    setFormData({ nombre: u.nombre || '', correo: u.correo || '', rol: u.rol || '', sucursal_id: u.sucursal_id ? String(u.sucursal_id) : '', contrasena: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const removeUser = async (id: number, pk: string) => {
    if (!confirm('¿Eliminar usuario?')) return;
    const res = await deleteUsuario(id, pk);
    if (!res.ok) {
      console.error('Delete usuario error:', res.error);
      const msg = (res.error && (res.error.message || res.error.code)) ? `${res.error.message || res.error.code}` : 'Error desconocido';
      alert('Error al eliminar usuario: ' + msg);
      return;
    }
    setUsers(list => list.filter(it => !(String(it.id) === String(id) && (it.pkColumn || 'id_usuario') === pk)));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingPk('id_usuario');
    setFormData({ nombre: '', correo: '', rol: '', sucursal_id: '', contrasena: '' });
  };

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
              <div className="flex items-center space-x-2">
                <Button type="submit" className="flex-1" size="lg">
                  {editingId ? 'ACTUALIZAR USUARIO' : 'REGISTRAR USUARIO'}
                </Button>
                {editingId && (
                  <Button type="button" onClick={cancelEdit} className="px-4 py-2 bg-gray-200 text-black rounded" size="lg">
                    CANCELAR
                  </Button>
                )}
              </div>
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
                    <th className="px-3 py-2">Sucursal</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2 text-sm">{u.id}</td>
                      <td className="px-3 py-2 text-sm">{u.nombre}</td>
                      <td className="px-3 py-2 text-sm">{u.correo}</td>
                      <td className="px-3 py-2 text-sm">{u.rol}</td>
                      <td className="px-3 py-2 text-sm">{(() => { const s = sucursales.find(x => String(x.id) === String(u.sucursal_id)); return s ? s.nombre : '-'; })()}</td>
                      <td className="px-3 py-2 text-sm">
                        <div className="flex space-x-2">
                          <Button type="button" onClick={() => startEdit(u)} className="px-3 py-1" size="sm">EDITAR</Button>
                          <Button type="button" onClick={() => removeUser(Number(u.id), u.pkColumn || 'id')} className="px-3 py-1 bg-red-600 hover:bg-red-700" size="sm">ELIMINAR</Button>
                        </div>
                      </td>
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
