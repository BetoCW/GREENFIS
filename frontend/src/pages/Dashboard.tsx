import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Package, FileText, BarChart3, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const cards = [
    {
      title: 'Registrar Usuario',
      description: 'Crear nuevas cuentas de usuario',
      icon: Users,
      path: '/registro-usuario',
      color: 'bg-green-primary'
    },
    {
      title: 'Gestionar Inventario',
      description: 'Control de productos y stock',
      icon: Package,
      path: '/gestionar-inventario',
      color: 'bg-green-secondary'
    },
    {
      title: 'Gestionar Solicitudes',
      description: 'Administración de pedidos',
      icon: FileText,
      path: '/gestionar-solicitudes',
      color: 'bg-success'
    },
    {
      title: 'Registrar Promociones',
      description: 'Gestión de descuentos',
      icon: Gift,
      path: '/promociones',
      color: 'bg-warning'
    },
    {
      title: 'Consultar Reportes De Venta',
      description: 'Métricas y análisis comerciales',
      icon: BarChart3,
      path: '/reportes-venta',
      color: 'bg-accent'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-text-dark mb-2">
          Bienvenido Gerente a GreenFis
        </h1>
        <p className="text-lg text-gray-600 mb-8">¿Qué desea hacer?</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <motion.div
              key={card.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link to={card.path} className="block h-full">
                <div className="bg-white rounded-lg shadow-soft p-6 h-full hover:shadow-lg transition-shadow duration-300 border border-gray-medium">
                  <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}>
                    <card.icon className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-text-dark mb-2">
                    {card.title}
                  </h3>
                  <p className="text-gray-600">
                    {card.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
