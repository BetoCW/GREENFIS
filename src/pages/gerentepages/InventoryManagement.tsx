import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { faker } from '@faker-js/faker';
import Button from '../../components/Button';
import Table from '../../components/Table';
import { updateProduct, deleteProduct } from '../../utils/api';

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

  useEffect(() => {
    // Fetch data from the DB view vw_gestion_inventario
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:4000/api/almacen/inventario/vw');
        if (!res.ok) throw new Error(`Server ${res.status}`);
        const data = await res.json();
        // map view columns to Product shape
        const mapped: Product[] = (Array.isArray(data) ? data : []).map((r: any, i: number) => {
          // Prefer real numeric product id fields coming from the view/backend
          const rawId = r.producto_id ?? r.productoId ?? r.id ?? r.ID;
          const numericId = rawId != null && !Number.isNaN(Number(rawId)) ? String(Number(rawId)) : null;
          const defaultId = `PRD-${(i + 1).toString().padStart(3, '0')}`;
          const idStr = numericId ?? String(r.ID ?? r.id ?? defaultId);

          return {
            id: idStr,
            nombre: r.NOMBRE ?? r.nombre ?? r.producto ?? `Producto ${i + 1}`,
            descripcion: r.DESCRIPCION ?? r.descripcion ?? '',
            cantidad: Number(r.CANTIDAD ?? r.cantidad ?? 0),
            precio: Number(String(r.PRECIO ?? r.precio ?? '').replace(/[^0-9.-]+/g, '')) || 0,
            ubicacion: r.UBICACION ?? r.ubicacion ?? 'Sin ubicación'
          } as Product;
        });
        setProducts(mapped);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('Failed to load vw_gestion_inventario:', msg);
        setError(msg);
        // fallback to local mock data to keep UI usable
        const ubicaciones = ['Almacén A', 'Almacén B', 'Sucursal Centro', 'Sucursal Norte'];
        const mockProducts: Product[] = Array.from({ length: 15 }, (_, i) => ({
          id: `PRD-${(i + 1).toString().padStart(3, '0')}`,
          nombre: faker.commerce.productName(),
          descripcion: faker.commerce.productDescription(),
          cantidad: faker.number.int({ min: 0, max: 100 }),
          precio: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
          ubicacion: faker.helpers.arrayElement(ubicaciones)
        }));
        setProducts(mockProducts);
      } finally {
        setIsLoading(false);
      }
    }
    load();
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
          <Link to="/registro-producto">
            <Button>
              <Plus size={16} className="mr-2" />
              Registrar Producto
            </Button>
          </Link>
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
