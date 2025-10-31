import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { faker } from '@faker-js/faker';
import Button from '../../components/Button';
import Table from '../../components/Table';

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
        const mapped: Product[] = (Array.isArray(data) ? data : []).map((r: any, i: number) => ({
          id: String(r.ID ?? r.id ?? `PRD-${(i + 1).toString().padStart(3, '0')}`),
          nombre: r.NOMBRE ?? r.nombre ?? r.producto ?? `Producto ${i + 1}`,
          descripcion: r.DESCRIPCION ?? r.descripcion ?? '',
          cantidad: Number(r.CANTIDAD ?? r.cantidad ?? 0),
          precio: Number(String(r.PRECIO ?? r.precio ?? '').replace(/[^0-9.-]+/g, '')) || 0,
          ubicacion: r.UBICACION ?? r.ubicacion ?? 'Sin ubicación'
        }));
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

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Está seguro de eliminar este producto?')) {
      setProducts(products.filter(product => product.id !== id));
      alert('Producto eliminado exitosamente');
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
            onClick={() => alert(`Editando producto ${row.id}`)}
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
    </div>
  );
};

export default InventoryManagement;
