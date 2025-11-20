import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Edit, Trash2, X, CheckCircle, CircleOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import Table from '../../components/Table';
import { fetchPromocionesFiltered, deletePromocion, createPromocion, updatePromocion, togglePromocionActiva, fetchProducts } from '../../utils/api';

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
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
    activa: true,
    creada_por: 1
  });
  const [filters, setFilters] = useState({ producto: '', activa: '', tipo: '', nombre: '' });
  const [loading, setLoading] = useState(false);

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

  // Map productos para mostrar nombre en tabla
  const productMap = useMemo(() => {
    const m: Record<number, { id: string|number; nombre: string; precio: number }> = {};
    products.forEach(p => { m[Number(p.id)] = p; });
    return m;
  }, [products]);

  // Compute nuevo_precio automáticamente
  useEffect(() => {
    if (!form.producto_id) return;
    if (form.tipo === 'descuento_porcentaje' || form.tipo === 'descuento_fijo') {
      const nuevo = computeNuevoPrecio(form.tipo, form.valor_descuento, form.producto_id, products);
      if (nuevo !== form.nuevo_precio) setForm(f => ({ ...f, nuevo_precio: nuevo }));
    } else if (form.nuevo_precio) {
      setForm(f => ({ ...f, nuevo_precio: '' }));
    }
  }, [form.producto_id, form.tipo, form.valor_descuento, products]);

  async function loadPromotions() {
    setLoading(true);
    try {
      const result = await fetchPromocionesFiltered({
        producto_id: filters.producto || undefined,
        activa: filters.activa === '' ? undefined : filters.activa === '1'
      });
      if (result.ok) setPromotions(result.data || []); else setPromotions([]);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadPromotions(); }, [filters.producto, filters.activa]);

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

  function openNew() {
    setEditingId(null);
    setForm({ nombre:'', descripcion:'', producto_id:'', tipo:'descuento_porcentaje', valor_descuento:'', nuevo_precio:'', fecha_inicio:'', fecha_fin:'', dias_semana:'', aplica_todas_sucursales:true, activa:true, creada_por:1 });
    setShowModal(true);
  }

  function openEdit(p: Promotion) {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      producto_id: String(p.producto_id),
      tipo: p.tipo as any,
      valor_descuento: p.valor_descuento != null ? String(p.valor_descuento) : '',
      nuevo_precio: p.nuevo_precio != null ? String(p.nuevo_precio) : '',
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      dias_semana: p.dias_semana || '',
      aplica_todas_sucursales: p.aplica_todas_sucursales,
      activa: p.activa,
      creada_por: p.creada_por
    });
    setShowModal(true);
  }

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const inputValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm(prev => ({
      ...prev,
      [name]: inputValue
    }));
  };

  const handleSubmitPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!form.nombre || !form.producto_id || !form.fecha_inicio || !form.fecha_fin) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (new Date(form.fecha_fin) < new Date(form.fecha_inicio)) {
      alert('La fecha fin debe ser >= fecha inicio');
      return;
    }

    // Preparar datos para enviar
    const promotionData = {
      ...form,
      producto_id: parseInt(form.producto_id),
      valor_descuento: form.valor_descuento ? parseFloat(form.valor_descuento) : null,
      nuevo_precio: form.nuevo_precio ? parseFloat(form.nuevo_precio) : null,
    };

    try {
      let result;
      if (editingId == null) {
        result = await createPromocion(promotionData);
        if (!result.ok) return alert('Error al crear la promoción');
        alert('Promoción creada');
      } else {
        result = await updatePromocion(editingId, promotionData);
        if (!result.ok) return alert('Error al actualizar');
        alert('Promoción actualizada');
      }
      handleCloseModal();
      await loadPromotions();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear la promoción');
    }
  };

  function toggleActiva(row: Promotion) {
    togglePromocionActiva(row.id, !row.activa).then(r => {
      if (r.ok) setPromotions(prev => prev.map(p => p.id === row.id ? { ...p, activa: !row.activa } : p));
    });
  }

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
    { key: 'producto_id', header: 'Producto', render: (_: any, row: Promotion) => {
      const prod = productMap[row.producto_id];
      return prod ? prod.nombre : row.producto_id;
    } },
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
            onClick={() => openEdit(row)}
            className="p-1 text-green-primary hover:bg-green-light rounded"
            title="Editar"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => toggleActiva(row)}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title={row.activa ? 'Desactivar' : 'Activar'}
          >
            {row.activa ? <CircleOff size={16} /> : <CheckCircle size={16} />}
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
          <Button onClick={openNew}>
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

          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600">Producto</label>
              <select value={filters.producto} onChange={e=>setFilters(f=>({...f,producto:e.target.value}))} className="border px-2 py-1 rounded text-sm">
                <option value="">Todos</option>
                {products.map(p => <option key={String(p.id)} value={String(p.id)}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Activa</label>
              <select value={filters.activa} onChange={e=>setFilters(f=>({...f,activa:e.target.value}))} className="border px-2 py-1 rounded text-sm">
                <option value="">Todas</option>
                <option value="1">Activas</option>
                <option value="0">Inactivas</option>
              </select>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" size="sm" onClick={()=>setFilters({ producto:'', activa:'', tipo:'', nombre:'' })}>Limpiar</Button>
              <Button variant="secondary" size="sm" onClick={loadPromotions}>Refrescar</Button>
            </div>
          </div>
          {loading ? <div className="py-6 text-sm text-gray-600">Cargando promociones...</div> : <Table columns={columns} data={promotions} />}

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
              <h2 className="text-xl font-bold text-text-dark">{editingId == null ? 'Nueva Promoción' : `Editar Promoción #${editingId}`}</h2>
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
                    value={form.nombre}
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
                    value={form.producto_id}
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
                  value={form.descripcion}
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
                    value={form.tipo}
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

                {form.tipo === 'descuento_porcentaje' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor Descuento (%)
                    </label>
                    <input
                      type="number"
                      name="valor_descuento"
                      value={form.valor_descuento}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                    />
                  </div>
                )}

                {(form.tipo === 'descuento_fijo' || form.tipo === 'descuento_porcentaje') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nuevo Precio
                    </label>
                    <input
                      type="number"
                      name="nuevo_precio"
                      value={form.nuevo_precio}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      readOnly={form.tipo === 'descuento_porcentaje' || form.tipo === 'descuento_fijo'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary bg-white"
                      placeholder={form.nuevo_precio ? undefined : 'Se calculará automáticamente'}
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
                    value={form.fecha_inicio}
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
                    value={form.fecha_fin}
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
                  value={form.dias_semana}
                  onChange={handleInputChange}
                  placeholder="ej: Lunes,Martes,Miércoles"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="aplica_todas_sucursales"
                    checked={form.aplica_todas_sucursales}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Aplica a todas las sucursales
                </label>
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="activa"
                    checked={form.activa}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Activa
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
                  {editingId == null ? 'Crear' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Helpers fuera del componente principal ----
function computeNuevoPrecio(tipo: string, valor_descuento: string, productoId: string|number, products: Array<{ id: string|number; precio: number }>): string {
  const prod = products.find(p => String(p.id) === String(productoId));
  if (!prod) return '';
  const precioOriginal = Number(prod.precio || 0);
  const valor = parseFloat(valor_descuento || '0');
  if (tipo === 'descuento_porcentaje' && !isNaN(valor)) return (precioOriginal * (1 - valor/100)).toFixed(2);
  if (tipo === 'descuento_fijo' && !isNaN(valor)) return Math.max(0, precioOriginal - valor).toFixed(2);
  return '';
}

// (toggleActiva ahora está dentro del componente para acceso a estado.)

export default Promotions;
