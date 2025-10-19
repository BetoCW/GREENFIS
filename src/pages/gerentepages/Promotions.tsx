import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { faker } from '@faker-js/faker';
import Button from '../../components/Button';
import Table from '../../components/Table';

interface Promotion {
  id: string;
  nombre: string;
  descripcion: string;
  idArticulo: string;
  nuevoPrecio: number;
  dia: string;
}

const Promotions: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    const dias = ['Lunes', 'Martes', 'Miércoles'];
    const mockPromotions: Promotion[] = Array.from({ length: 10 }, (_, i) => ({
      id: `PROMO-${(i + 1).toString().padStart(3, '0')}`,
      nombre: `${faker.commerce.productAdjective()} ${faker.commerce.productName()}`,
      descripcion: `Oferta especial de ${faker.commerce.department()}`,
      idArticulo: `ART-${faker.number.int({ min: 100, max: 999 })}`,
      nuevoPrecio: parseFloat(faker.commerce.price({ min: 50, max: 300 })),
      dia: faker.helpers.arrayElement(dias)
    }));
    setPromotions(mockPromotions);
  }, []);

  const handleDeletePromotion = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta promoción?')) {
      setPromotions(promotions.filter(promo => promo.id !== id));
      alert('Promoción eliminada exitosamente');
    }
  };

  const handleGeneratePDF = () => {
    alert('Generando reporte PDF de promociones...');
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
    { key: 'idArticulo', header: 'ID Artículo' },
    { 
      key: 'nuevoPrecio', 
      header: 'Nuevo Precio',
      render: (value: number) => (
        <span className="font-semibold text-success">
          ${value.toFixed(2)}
        </span>
      )
    },
    {
      key: 'dia',
      header: 'Día',
      render: (value: string) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          value === 'Lunes' 
            ? 'bg-green-primary text-white' 
            : value === 'Martes'
            ? 'bg-warning text-white'
            : 'bg-success text-white'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_, row: Promotion) => (
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
          <Button>
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
                <div className="w-3 h-3 bg-green-primary rounded-full"></div>
                <span>Lunes</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-warning rounded-full"></div>
                <span>Martes</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span>Miércoles</span>
              </div>
            </div>
            <Button onClick={handleGeneratePDF} variant="secondary">
              <FileText size={16} className="mr-2" />
              Generar PDF
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Promotions;
