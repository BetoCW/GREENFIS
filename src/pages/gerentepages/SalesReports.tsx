import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { faker } from '@faker-js/faker';
import Button from '../../components/Button';
import Table from '../../components/Table';

interface SalesReport {
  id: string;
  reporte: string;
  sucursal: string;
  periodo: string;
  montoVentas: number;
  selected: boolean;
}

const SalesReports: React.FC = () => {
  const [reports, setReports] = useState<SalesReport[]>([]);

  useEffect(() => {
    const sucursales = ['Centro', 'Norte', 'Sur', 'Oriente', 'Poniente'];
    const mockReports: SalesReport[] = Array.from({ length: 10 }, (_, i) => ({
      id: `RPT-${(i + 1).toString().padStart(3, '0')}`,
      reporte: `Reporte Mensual ${faker.date.month()}`,
      sucursal: faker.helpers.arrayElement(sucursales),
      periodo: `${faker.date.recent().toLocaleDateString('es-MX')} - ${faker.date.future().toLocaleDateString('es-MX')}`,
      montoVentas: parseFloat(faker.commerce.price({ min: 10000, max: 100000 })),
      selected: false
    }));
    setReports(mockReports);
  }, []);

  const handleSelectReport = (id: string) => {
    setReports(reports.map(report => 
      report.id === id ? { ...report, selected: !report.selected } : report
    ));
  };

  const handleGeneratePDF = () => {
    const selectedReports = reports.filter(report => report.selected);
    if (selectedReports.length > 0) {
      alert(`Generando PDF para ${selectedReports.length} reporte(s)...`);
    } else {
      alert('Seleccione al menos un reporte para generar PDF');
    }
  };

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'reporte', header: 'Reporte' },
    { key: 'sucursal', header: 'Sucursal' },
    { key: 'periodo', header: 'Período' },
    { 
      key: 'montoVentas', 
      header: 'Monto Ventas',
      render: (value: number) => (
        <span className="font-semibold text-success">
          ${value.toFixed(2)}
        </span>
      )
    },
    {
      key: 'selected',
      header: 'Seleccionar',
      render: (value: boolean, row: SalesReport) => (
        <input
          type="checkbox"
          checked={value}
          onChange={() => handleSelectReport(row.id)}
          className="w-4 h-4 text-green-primary bg-gray-100 border-gray-300 rounded focus:ring-green-primary focus:ring-2"
        />
      )
    }
  ];

  const totalSelected = reports.filter(report => report.selected).length;

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-text-dark mb-8">Reportes de Venta</h1>

        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-dark mb-4">
              Métricas y Análisis Comerciales
            </h2>
            <p className="text-gray-600">
              Seleccione los reportes que desea exportar a PDF
            </p>
          </div>

          <Table columns={columns} data={reports} />

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-medium">
            <div className="text-sm text-gray-600">
              {totalSelected} reporte(s) seleccionado(s)
            </div>
            <Button onClick={handleGeneratePDF}>
              <FileText size={16} className="mr-2" />
              Generar PDF
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SalesReports;
