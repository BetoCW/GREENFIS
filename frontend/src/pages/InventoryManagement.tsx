import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { faker } from '@faker-js/faker';
import Button from '../components/Button';
import Table from '../components/Table';

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

  useEffect(() => {
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
      render: (_, row: Product) => (
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

          <Table columns={columns} data={products} />

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
