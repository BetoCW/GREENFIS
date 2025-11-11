import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import Table from '../../components/Table';
import { fetchPromociones, deletePromocion, createPromocion, fetchProducts } from '../../utils/api';

interface Promotion {
  id: number;
  nombre: string;
  descripcion: string;
  producto_id: number;
  tipo: 'descuento_porcentaje' | 'descuento_fijo' | '2x1' | '3x2';
  valor_descuento?: number;
  nuevo_precio?: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_semana: string;
  aplica_todas_sucursales: boolean;
  activa: boolean;
  creada_por: number;
  fecha_creacion: string;
  fecha_modificacion?: string;
  modificada_por?: number;
}

const Promotions: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string | number; nombre: string; precio: number }>>([]);
  const [newPromotion, setNewPromotion] = useState({
    nombre: '',
    descripcion: '',
    producto_id: '',
    tipo: 'descuento_porcentaje' as 'descuento_porcentaje' | 'descuento_fijo' | '2x1' | '3x2',
    valor_descuento: '',
    nuevo_precio: '',
    fecha_inicio: '',
    fecha_fin: '',
    dias_semana: '',
    aplica_todas_sucursales: true,
    creada_por: 1 // TODO: obtener del contexto de autenticación
  });

  // Load product list for selecting by name (so manager can pick product by name instead of typing ID)
  useEffect(() => {
    const loadProducts = async () => {
      // fetchProducts() ya maneja fallback a localStore en caso de error; aquí evitamos loguear
      // para no ensuciar la consola si el endpoint por algún motivo responde 500 de forma transitoria.
      const list = await fetchProducts().catch(() => []);
      setProducts(Array.isArray(list) ? list : []);
    };
    loadProducts();
  }, []);

  // Compute nuevo_precio automatically when product, tipo or valor_descuento changes
  useEffect(() => {
    const prodId = String(newPromotion.producto_id || '');
    if (!prodId) return;
    const prod = products.find(p => String(p.id) === prodId);
    if (!prod) return;
    const precioOriginal = Number(prod.precio ?? 0);
    const valor = parseFloat(String(newPromotion.valor_descuento || '0'));

    let computed: string = '';
    if (newPromotion.tipo === 'descuento_porcentaje' && !isNaN(valor)) {
      computed = (precioOriginal * (1 - (valor / 100))).toFixed(2);
    } else if (newPromotion.tipo === 'descuento_fijo' && !isNaN(valor)) {
      computed = Math.max(0, precioOriginal - valor).toFixed(2);
    } else {
      // for 2x1/3x2 or if no discount value, clear computed price
      computed = '';
    }

    // Only update if different to avoid unnecessary renders
    if (String(newPromotion.nuevo_precio || '') !== String(computed)) {
      setNewPromotion(prev => ({ ...prev, nuevo_precio: computed }));
    }
  }, [newPromotion.producto_id, newPromotion.tipo, newPromotion.valor_descuento, products]);

  useEffect(() => {
    const loadPromotions = async () => {
      const result = await fetchPromociones();
      if (result.ok) {
        setPromotions(result.data);
      }
    };
    loadPromotions();
  }, []);

  const handleDeletePromotion = async (id: number) => {
    if (confirm('¿Está seguro de eliminar esta promoción?')) {
      const result = await deletePromocion(id);
      if (result.ok) {
        setPromotions(promotions.filter(promo => promo.id !== id));
        alert('Promoción eliminada exitosamente');
      } else {
        alert('Error al eliminar la promoción');
      }
    }
  };

  const handleGeneratePDF = () => {
    alert('Generando reporte PDF de promociones...');
  };

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // Resetear formulario
    setNewPromotion({
      nombre: '',
      descripcion: '',
      producto_id: '',
      tipo: 'descuento_porcentaje',
      valor_descuento: '',
      nuevo_precio: '',
      fecha_inicio: '',
      fecha_fin: '',
      dias_semana: '',
      aplica_todas_sucursales: true,
      creada_por: 1
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const inputValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setNewPromotion(prev => ({
      ...prev,
      [name]: inputValue
    }));
  };

  const handleSubmitPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!newPromotion.nombre || !newPromotion.producto_id || !newPromotion.fecha_inicio || !newPromotion.fecha_fin) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    // Preparar datos para enviar
    const promotionData = {
      ...newPromotion,
      producto_id: parseInt(newPromotion.producto_id),
      valor_descuento: newPromotion.valor_descuento ? parseFloat(newPromotion.valor_descuento) : null,
      nuevo_precio: newPromotion.nuevo_precio ? parseFloat(newPromotion.nuevo_precio) : null,
    };

    try {
      const result = await createPromocion(promotionData);
      if (result.ok) {
        alert('Promoción creada exitosamente');
        handleCloseModal();
        // Recargar las promociones
        const promotionsResult = await fetchPromociones();
        if (promotionsResult.ok) {
          setPromotions(promotionsResult.data);
        }
      } else {
        alert('Error al crear la promoción');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear la promoción');
    }
  };

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'nombre', header: 'Nombre' },
    { 
      key: 'descripcion', 
      header: 'Descripción',
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value || ''}>
          {value || 'Sin descripción'}
        </div>
      )
    },
    { key: 'producto_id', header: 'ID Producto' },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'descuento_porcentaje' 
            ? 'bg-blue-100 text-blue-800' 
            : value === 'descuento_fijo'
            ? 'bg-green-100 text-green-800'
            : value === '2x1'
            ? 'bg-purple-100 text-purple-800'
            : 'bg-orange-100 text-orange-800'
        }`}>
          {value === 'descuento_porcentaje' ? 'Desc. %' : 
           value === 'descuento_fijo' ? 'Desc. Fijo' :
           value === '2x1' ? '2x1' : '3x2'}
        </span>
      )
    },
    { 
      key: 'valor_descuento', 
      header: 'Descuento',
      render: (value: number | null) => (
        value ? (
          <span className="font-semibold text-blue-600">
            {value}%
          </span>
        ) : '-'
      )
    },
    { 
      key: 'nuevo_precio', 
      header: 'Nuevo Precio',
      render: (value: number | null) => (
        value ? (
          <span className="font-semibold text-success">
            ${value.toFixed(2)}
          </span>
        ) : '-'
      )
    },
    {
      key: 'fecha_inicio',
      header: 'Fecha Inicio',
      render: (value: string) => (
        new Date(value).toLocaleDateString('es-MX')
      )
    },
    {
      key: 'fecha_fin',
      header: 'Fecha Fin',
      render: (value: string) => (
        new Date(value).toLocaleDateString('es-MX')
      )
    },
    {
      key: 'dias_semana',
      header: 'Días',
      render: (value: string) => (
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
          {value || 'Todos'}
        </span>
      )
    },
    {
      key: 'activa',
      header: 'Estado',
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Activa' : 'Inactiva'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_: any, row: Promotion) => (
        <div className="flex space-x-2">
          <button
            onClick={() => alert(`Editando promoción ${row.id}`)}
            className="p-1 text-green-primary hover:bg-green-light rounded"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeletePromotion(row.id)}
            className="p-1 text-accent hover:bg-red-100 rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];



  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text-dark">Promociones</h1>
          <Button onClick={handleOpenModal}>
            <Plus size={16} className="mr-2" />
            Nueva Promoción
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-dark mb-2">
              Gestión de Descuentos
            </h2>
            <p className="text-gray-600">
              Administre las promociones por días específicos
            </p>
          </div>

          <Table columns={columns} data={promotions} />

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-medium">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Descuento %</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Descuento Fijo</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>2x1</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>3x2</span>
              </div>
            </div>
            <Button onClick={handleGeneratePDF} variant="secondary">
              <FileText size={16} className="mr-2" />
              Generar PDF
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Modal para Nueva Promoción */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text-dark">Nueva Promoción</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitPromotion} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={newPromotion.nombre}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto *
                  </label>
                  <select
                    name="producto_id"
                    value={newPromotion.producto_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                    required
                  >
                    <option value="">Seleccione un producto</option>
                    {products.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {p.nombre}{p.precio !== undefined ? ` - $${Number(p.precio).toFixed(2)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={newPromotion.descripcion}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Promoción *
                  </label>
                  <select
                    name="tipo"
                    value={newPromotion.tipo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                    required
                  >
                    <option value="descuento_porcentaje">Descuento Porcentaje</option>
                    <option value="descuento_fijo">Descuento Fijo</option>
                    <option value="2x1">2x1</option>
                    <option value="3x2">3x2</option>
                  </select>
                </div>

                {newPromotion.tipo === 'descuento_porcentaje' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor Descuento (%)
                    </label>
                    <input
                      type="number"
                      name="valor_descuento"
                      value={newPromotion.valor_descuento}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                    />
                  </div>
                )}

                {(newPromotion.tipo === 'descuento_fijo' || newPromotion.tipo === 'descuento_porcentaje') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nuevo Precio
                    </label>
                    <input
                      type="number"
                      name="nuevo_precio"
                      value={newPromotion.nuevo_precio}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      readOnly={newPromotion.tipo === 'descuento_porcentaje' || newPromotion.tipo === 'descuento_fijo'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary bg-white"
                      placeholder={newPromotion.nuevo_precio ? undefined : 'Se calculará automáticamente al seleccionar producto y poner descuento'}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={newPromotion.fecha_inicio}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin *
                  </label>
                  <input
                    type="date"
                    name="fecha_fin"
                    value={newPromotion.fecha_fin}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días de la Semana
                </label>
                <input
                  type="text"
                  name="dias_semana"
                  value={newPromotion.dias_semana}
                  onChange={handleInputChange}
                  placeholder="ej: Lunes,Martes,Miércoles"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="aplica_todas_sucursales"
                  checked={newPromotion.aplica_todas_sucursales}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Aplica a todas las sucursales
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Crear Promoción
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promotions;
