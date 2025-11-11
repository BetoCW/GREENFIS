import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import { fetchSucursales, createProduct, fetchProveedores, fetchCategorias } from '../../utils/api';

const ProductRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    cantidad: '',
    precio: '',
    ubicacion: '', // sucursal id as string
    categoria_id: '',
    proveedor_id: '',
    codigo_barras: ''
  });
  const [sucursales, setSucursales] = useState<Array<{ id: number; nombre: string }>>([]);
  const [categorias, setCategorias] = useState<Array<{ id: number; nombre: string }>>([]);
  const [proveedores, setProveedores] = useState<Array<{ id: number | string; nombre: string }>>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetchSucursales();
      if (res.ok) setSucursales(res.data || []); else setSucursales([]);

      // Cargar proveedores desde manager (ruta existente)
      try {
        const prov = await fetchProveedores();
        const list = Array.isArray(prov?.data) ? prov.data : [];
        setProveedores(list.map((p: any) => ({ id: Number(p.id ?? p.id_proveedor ?? p.ID), nombre: p.nombre }))); 
      } catch {
        setProveedores([]);
      }

      // Cargar categorías reales desde la API
      try {
        const catRes = await fetchCategorias();
        const list = Array.isArray(catRes?.data) ? catRes.data : [];
        const mapped = list.map((c: any) => ({ id: Number(c.id), nombre: c.nombre }));
        setCategorias(mapped);
      } catch {
        setCategorias([]);
      }
    };
    load();
  }, []);

  // Generar EAN-13 que comience con prefijo local 750 (MX) similar a tus ejemplos
  function generarEAN13(): string {
    // 12 dígitos base (sin dígito verificador). Prefijo 750 + 9 aleatorios
    const base = '750' + Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
    const digits = base.split('').map(d => parseInt(d, 10));
    // Cálculo del dígito verificador EAN-13: sum(odd) + 3*sum(even) mod 10
    // Considerando posiciones 1..12 (desde la izquierda). El dígito 13 es el check.
    const sum = digits.reduce((acc, d, i) => acc + d * ((i % 2 === 0) ? 1 : 3), 0);
    const check = (10 - (sum % 10)) % 10;
    return base + String(check);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prepare payload aligning with manager.post('/productos') expected fields
    const payload = {
      codigo_barras: formData.codigo_barras || generarEAN13(),
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      precio: parseFloat(formData.precio || '0') || 0,
      categoria_id: formData.categoria_id ? parseInt(formData.categoria_id, 10) : null,
      proveedor_id: formData.proveedor_id ? parseInt(formData.proveedor_id, 10) : null,
      stock_minimo: parseInt(formData.cantidad || '0') || 0,
      creado_por: 1
    };

    const res = await createProduct(payload);
    if (res.ok) {
      alert('Producto registrado exitosamente');
      navigate('/gestionar-inventario');
    } else {
      alert('Error al registrar producto: ' + (res.error || 'error desconocido'));
    }
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

            {/* Código de barras */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <FormField
                  label="Código de Barras"
                  value={formData.codigo_barras}
                  onChange={(value) => setFormData({ ...formData, codigo_barras: value })}
                  placeholder="Ej. 75010... (EAN-13)"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={() => setFormData(f => ({ ...f, codigo_barras: generarEAN13() }))}>
                  Generar
                </Button>
              </div>
            </div>

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
            {/* Categoría y Proveedor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-text-dark mb-2">
                  Categoría <span className="text-accent ml-1">*</span>
                </label>
                <select
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary"
                >
                  <option value="">Seleccione una categoría</option>
                  {categorias.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-text-dark mb-2">
                  Proveedor <span className="text-accent ml-1">*</span>
                </label>
                <select
                  value={formData.proveedor_id}
                  onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary"
                >
                  <option value="">Seleccione un proveedor</option>
                  {proveedores.map(p => (
                    <option key={String(p.id)} value={String(p.id)}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

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
                {sucursales.length === 0 ? (
                  <option value="">No hay sucursales registradas</option>
                ) : (
                  sucursales.map(s => (
                    <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                  ))
                )}
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
