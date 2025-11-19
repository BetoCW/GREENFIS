import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { readStore, seedIfEmpty } from '../../utils/localStore';
import Button from '../../components/Button';
import Table from '../../components/Table';
import { updateProduct, deleteProduct, fetchInventoryVW, fetchSucursales, fetchInventoryWithStatus } from '../../utils/api';

interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  ubicacion: string;
}

const InventoryManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sucursales, setSucursales] = useState<Array<{ id: number; nombre: string }>>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<string>('');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        seedIfEmpty();
        const res = selectedSucursal
          ? await fetchInventoryWithStatus(Number(selectedSucursal))
          : await fetchInventoryVW();
        if (!res.ok) throw new Error('Inventario no disponible');
        const mapped: Product[] = res.data.map((r: any) => ({
          id: String(r.id),
          nombre: r.nombre,
          descripcion: r.descripcion,
          cantidad: Number(r.cantidad || 0),
          precio: Number(r.precio || 0),
          ubicacion: r.ubicacion || 'Sin ubicación'
        }));
        setProducts(mapped);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('Fallback inventario gerente:', msg);
        setError(msg);
        const local = readStore<Product[]>('gf_products', []);
        setProducts(local.map(p => ({
          id: String(p.id),
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          cantidad: Number(p.cantidad || 0),
          precio: Number(p.precio || 0),
          ubicacion: p.ubicacion || 'Local'
        })));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [selectedSucursal]);

  useEffect(() => {
    // cargar sucursales para el combo
    async function loadSuc() {
      try {
        const res = await fetchSucursales();
        if (res.ok) setSucursales(res.data || []);
        else setSucursales([]);
      } catch {
        setSucursales([]);
      }
    }
    loadSuc();
  }, []);

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;
    try {
      // call backend to mark producto as inactive
      const res = await deleteProduct(id);
      if (res.ok) {
        setProducts(products.filter(product => product.id !== id));
        alert('Producto eliminado exitosamente');
      } else {
        alert('Error al eliminar producto: ' + (res.error || 'error del servidor'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('handleDeleteProduct error', msg);
      alert('Error al eliminar producto: ' + msg);
    }
  };

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setEditing(true);
  };

  const handleEditChange = (field: keyof Product, value: any) => {
    if (!editingProduct) return;
    setEditingProduct({ ...editingProduct, [field]: value } as Product);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    const idNum = editingProduct.id;
    // Prepare payload to send to manager PUT endpoint
    const payload: any = {
      nombre: editingProduct.nombre,
      descripcion: editingProduct.descripcion,
      precio: Number(editingProduct.precio) || 0,
      stock_minimo: 0,
      activo: 1,
      modificado_por: 1
    };

    const res = await updateProduct(idNum, payload);
    if (res.ok) {
      setProducts(prev => prev.map(p => (p.id === editingProduct.id ? { ...p, nombre: editingProduct.nombre, descripcion: editingProduct.descripcion, precio: Number(editingProduct.precio) } : p)));
      setEditing(false);
      setEditingProduct(null);
      alert('Producto actualizado correctamente');
    } else {
      alert('Error al actualizar producto: ' + (res.error || 'error desconocido'));
    }
  };

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'nombre', header: 'Nombre' },
    { 
      key: 'descripcion', 
      header: 'Descripción',
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      )
    },
    { 
      key: 'cantidad', 
      header: 'Cantidad',
      render: (value: number) => (
        <span className={`font-semibold ${
          value < 10 ? 'text-accent' : value < 30 ? 'text-warning' : 'text-success'
        }`}>
          {value}
        </span>
      )
    },
    { 
      key: 'precio', 
      header: 'Precio',
      render: (value: number) => `$${value.toFixed(2)}`
    },
    { key: 'ubicacion', header: 'Ubicación' },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_value: any, row: Product) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditClick(row)}
            className="p-1 text-green-primary hover:bg-green-light rounded"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteProduct(row.id)}
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
          <h1 className="text-3xl font-bold text-text-dark">Gestión de Inventario</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Sucursal</label>
              <select
                value={selectedSucursal}
                onChange={(e) => setSelectedSucursal(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="">Todas</option>
                {sucursales.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <Link to="/registro-producto">
              <Button>
                <Plus size={16} className="mr-2" />
                Registrar Producto
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-dark mb-2">
              Control de Productos
            </h2>
            <p className="text-gray-600">
              Gestione el inventario de productos disponibles
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
              <strong>Advertencia:</strong> No se pudieron obtener los datos reales: {error}. Mostrando datos de prueba.
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-gray-600">Cargando inventario...</div>
          ) : (
            <Table columns={columns} data={products} />
          )}

          <div className="mt-6 pt-4 border-t border-gray-medium">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-accent rounded-full"></div>
                <span>Stock Bajo (&lt; 10)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-warning rounded-full"></div>
                <span>Stock Medio (10-30)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span>Stock Adecuado (&gt; 30)</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      {/* Edit modal */}
      {editing && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Editar Producto</h3>
              <button onClick={() => { setEditing(false); setEditingProduct(null); }} className="text-gray-500">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input className="w-full px-3 py-2 border rounded" value={editingProduct.nombre} onChange={(e) => handleEditChange('nombre', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <textarea className="w-full px-3 py-2 border rounded" value={editingProduct.descripcion} onChange={(e) => handleEditChange('descripcion', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Precio</label>
                <input type="number" step="0.01" className="w-full px-3 py-2 border rounded" value={String(editingProduct.precio)} onChange={(e) => handleEditChange('precio', Number(e.target.value))} />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="secondary" onClick={() => { setEditing(false); setEditingProduct(null); }}>Cancelar</Button>
                <Button onClick={handleSaveEdit}>Guardar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
