import React, { useState, useEffect } from 'react';
import { FileText, Edit, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { faker } from '@faker-js/faker';
import Button from '../components/Button';
import Table from '../components/Table';

interface Order {
  id: string;
  articulos: string;
  fecha: string;
  total: number;
  realizada: string;
  estado: 'Completada' | 'Pendiente';
  selected: boolean;
}

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Generar datos de ejemplo
    const mockOrders: Order[] = Array.from({ length: 12 }, (_, i) => ({
      id: `ORD-${(i + 1).toString().padStart(3, '0')}`,
      articulos: faker.commerce.productName(),
      fecha: faker.date.recent().toLocaleDateString('es-MX'),
      total: parseFloat(faker.commerce.price({ min: 100, max: 5000 })),
      realizada: faker.person.fullName(),
      estado: faker.helpers.arrayElement(['Completada', 'Pendiente']) as 'Completada' | 'Pendiente',
      selected: false
    }));
    setOrders(mockOrders);
  }, []);

  const handleSelectOrder = (id: string) => {
    setOrders(orders.map(order => 
      order.id === id ? { ...order, selected: !order.selected } : order
    ));
  };

  const handleDeleteSelected = () => {
    const selectedIds = orders.filter(order => order.selected).map(order => order.id);
    if (selectedIds.length > 0) {
      setOrders(orders.filter(order => !order.selected));
      alert(`${selectedIds.length} solicitud(es) eliminada(s)`);
    }
  };

  const handleGeneratePDF = () => {
    alert('Generando reporte PDF...');
  };

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'articulos', header: 'Artículos' },
    { key: 'fecha', header: 'Fecha' },
    { 
      key: 'total', 
      header: 'Total',
      render: (value: number) => `$${value.toFixed(2)}`
    },
    { key: 'realizada', header: 'Realizada Por' },
    {
      key: 'estado',
      header: 'Estado',
      render: (value: string) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          value === 'Completada' 
            ? 'bg-success text-white' 
            : 'bg-warning text-white'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'selected',
      header: 'Seleccionar',
      render: (value: boolean, row: Order) => (
        <input
          type="checkbox"
          checked={value}
          onChange={() => handleSelectOrder(row.id)}
          className="w-4 h-4 text-green-primary bg-gray-100 border-gray-300 rounded focus:ring-green-primary focus:ring-2"
        />
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
        <h1 className="text-3xl font-bold text-text-dark mb-8">Gestión de Solicitudes</h1>

        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <Table columns={columns} data={orders} />

          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-medium">
            <Button onClick={handleGeneratePDF} variant="secondary">
              <FileText size={16} className="mr-2" />
              Generar PDF
            </Button>
            <Button variant="secondary">
              <Edit size={16} className="mr-2" />
              Editar
            </Button>
            <Button onClick={handleDeleteSelected} variant="danger">
              <Trash2 size={16} className="mr-2" />
              Eliminar Seleccionadas
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderManagement;
