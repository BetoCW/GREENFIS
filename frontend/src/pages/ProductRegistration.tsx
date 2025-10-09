import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import FormField from '../components/FormField';

const ProductRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    cantidad: '',
    precio: '',
    ubicacion: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Producto registrado:', formData);
    alert('Producto registrado exitosamente');
    navigate('/gestionar-inventario');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center mb-8">
          <Link to="/gestionar-inventario" className="mr-4">
            <Button variant="secondary" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-text-dark">Registro de Producto</h1>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-8 border border-gray-medium">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mb-4">
              <label className="block text-sm font-bold text-text-dark mb-2">
                ID del Producto
              </label>
              <input
                type="text"
                value="AUTO-GENERADO"
                disabled
                className="w-full px-3 py-2 border border-gray-medium rounded-lg bg-gray-light text-gray-500"
              />
            </div>

            <FormField
              label="Nombre del Producto"
              value={formData.nombre}
              onChange={(value) => setFormData({...formData, nombre: value})}
              placeholder="Ingrese el nombre del producto"
              required
            />

            <div className="mb-4">
              <label className="block text-sm font-bold text-text-dark mb-2">
                Descripción <span className="text-accent ml-1">*</span>
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                placeholder="Descripción detallada del producto"
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors"
              />
            </div>

            <FormField
              label="Cantidad"
              type="number"
              value={formData.cantidad}
              onChange={(value) => setFormData({...formData, cantidad: value})}
              placeholder="0"
              required
            />

            <FormField
              label="Precio"
              type="number"
              value={formData.precio}
              onChange={(value) => setFormData({...formData, precio: value})}
              placeholder="0.00"
              required
            />

            <div className="mb-4">
              <label className="block text-sm font-bold text-text-dark mb-2">
                Ubicación <span className="text-accent ml-1">*</span>
              </label>
              <select
                value={formData.ubicacion}
                onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors"
              >
                <option value="">Seleccione una ubicación</option>
                <option value="Almacén A">Almacén A</option>
                <option value="Almacén B">Almacén B</option>
                <option value="Sucursal Centro">Sucursal Centro</option>
                <option value="Sucursal Norte">Sucursal Norte</option>
                <option value="Sucursal Sur">Sucursal Sur</option>
              </select>
            </div>

            <div className="flex space-x-4 pt-4">
              <Link to="/gestionar-inventario" className="flex-1">
                <Button variant="secondary" className="w-full">
                  Volver
                </Button>
              </Link>
              <Button type="submit" className="flex-1">
                Guardar Producto
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductRegistration;
