import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import FormField from '../components/FormField';

const UserRegistration: React.FC = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    rol: '',
    telefono: '',
    contraseña: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Usuario registrado:', formData);
    // Aquí se enviaría la información al backend
    alert('Usuario registrado exitosamente');
    setFormData({
      nombre: '',
      correo: '',
      rol: '',
      telefono: '',
      contraseña: ''
    });
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
                <option value="cajero">Cajero</option>
              </select>
            </div>

            <FormField
              label="Teléfono"
              type="tel"
              value={formData.telefono}
              onChange={(value) => setFormData({...formData, telefono: value})}
              placeholder="+52 123 456 7890"
              required
            />

            <FormField
              label="Contraseña"
              type="password"
              value={formData.contraseña}
              onChange={(value) => setFormData({...formData, contraseña: value})}
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
      </motion.div>
    </div>
  );
};

export default UserRegistration;
