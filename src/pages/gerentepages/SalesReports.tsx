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
  tipo?: string;
  generado_por?: string;
  fecha_generacion?: string;
  archivo_path?: string;
  periodo_inicio?: string | null;
  periodo_fin?: string | null;
  total_ventas?: number;
  monto_efectivo?: number;
  monto_tarjeta?: number;
  monto_transferencia?: number;
  producto_mas_vendido?: string;
  vendedor_destacado?: string;
  promedio_venta?: number;
}

const SalesReports: React.FC = () => {
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // use the view-specific route so frontend requests the vw_reportes_ventas view
  // Use absolute backend URL to ensure fetch reaches the API server that serves the DB view.
  // If your API runs on a different host/port adjust this value.
  const API_BASE = 'http://localhost:4000/api/manager/reportes/vw';

  useEffect(() => {
    // on mount fetch reports from the backend; fallback to mock data if the call fails
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch reports (GET)
  async function fetchReports() {
    setIsLoading(true);
    setError(null);
    try {
      // avoid cached responses
      const res = await fetch(`${API_BASE}?_ts=${Date.now()}`, { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      // If the server returned HTML (commonly index.html) it's a misrouted request; show helpful debug info
      if (contentType.includes('text/html')) {
        const text = await res.text();
        const snippet = text.slice(0, 300).replace(/\s+/g, ' ');
        const msg = `API returned HTML instead of JSON. Response snippet: ${snippet}`;
        setError(msg);
        throw new Error(msg);
      }
      if (!res.ok) {
        const msg = `Server responded ${res.status}`;
        setError(msg);
        throw new Error(msg);
      }
      const data = await res.json();
      const mapped: SalesReport[] = (Array.isArray(data) ? data : []).map((r: any, i: number) => {
        const inicio = r.periodo_inicio ?? r.periodoInicio ?? null;
        const fin = r.periodo_fin ?? r.periodoFin ?? null;
        const periodoDisplay = (inicio && fin) ? `${new Date(inicio).toLocaleDateString('es-MX')} - ${new Date(fin).toLocaleDateString('es-MX')}` : (r.periodo ?? new Date(r.fecha_generacion ?? Date.now()).toLocaleDateString('es-MX'));
        return {
          id: String(r.reporte_id ?? r.id ?? r.id_reporte ?? `RPT-${(i + 1).toString().padStart(3, '0')}`),
          tipo: r.tipo,
          reporte: r.nombre_reporte ?? r.nombre ?? r.reporte ?? `Reporte ${i + 1}`,
          sucursal: r.sucursal ?? (r.sucursal_id ? `Sucursal ${r.sucursal_id}` : faker.helpers.arrayElement(['Centro','Norte','Sur','Oriente','Poniente'])),
          periodo: periodoDisplay,
          periodo_inicio: inicio,
          periodo_fin: fin,
          montoVentas: Number(r.monto_ventas ?? r.montoVentas ?? 0),
          generado_por: r.generado_por ?? r.generadoPor,
          fecha_generacion: r.fecha_generacion,
          archivo_path: r.archivo_path,
          // prefer the view's field names (monto_ventas) but fallback to other variants
          total_ventas: Number(r.total_ventas ?? r.monto_ventas ?? r.montoVentas ?? 0),
          // some views may name these differently; try common variants
          monto_efectivo: Number(r.monto_efectivo ?? r.montoEfectivo ?? 0),
          monto_tarjeta: Number(r.monto_tarjeta ?? r.montoTarjeta ?? 0),
          monto_transferencia: Number(r.monto_transferencia ?? r.montoTransferencia ?? 0),
          producto_mas_vendido: r.producto_mas_vendido,
          vendedor_destacado: r.vendedor_destacado,
          promedio_venta: Number(r.promedio_venta ?? 0),
          selected: false
        } as SalesReport;
      });
  setReports(mapped);
  setError(null);
    } catch (e) {
      // When the backend fails, show a clear message and fall back to local mock data
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
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
    }
    finally {
      setIsLoading(false);
    }
  }

  const handleSelectReport = (id: string) => {
    // only toggle locally; do not call server to avoid modifying routes
    setReports(prev => prev.map(report => report.id === id ? { ...report, selected: !report.selected } : report));
  };

  const handleGeneratePDF = () => {
    const selectedReports = reports.filter(report => report.selected);
    if (selectedReports.length > 0) {
      alert(`Generando PDF para ${selectedReports.length} reporte(s)...`);
    } else {
      alert('Seleccione al menos un reporte para generar PDF');
    }
  };

  // Read-only view: UI only GETs the view; no create/update/delete from UI to avoid server-side changes.

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'reporte', header: 'Reporte' },
    { key: 'sucursal', header: 'Sucursal' },
    { key: 'periodo', header: 'Período' },
    { key: 'total_ventas', header: 'Total Ventas', render: (v: number) => <span className="font-semibold text-success">${(v ?? 0).toFixed(2)}</span> },
    { key: 'monto_efectivo', header: 'Efectivo', render: (v: number) => <span>${(v ?? 0).toFixed(2)}</span> },
    { key: 'monto_tarjeta', header: 'Tarjeta', render: (v: number) => <span>${(v ?? 0).toFixed(2)}</span> },
    { key: 'monto_transferencia', header: 'Transferencia', render: (v: number) => <span>${(v ?? 0).toFixed(2)}</span> },
    { key: 'producto_mas_vendido', header: 'Producto más vendido' },
    { key: 'vendedor_destacado', header: 'Vendedor destacado' },
    { key: 'promedio_venta', header: 'Promedio venta', render: (v: number) => <span>${(v ?? 0).toFixed(2)}</span> },
    { key: 'generado_por', header: 'Generado por' },
    { key: 'fecha_generacion', header: 'Fecha generación', render: (v: string) => <span>{v ? new Date(v).toLocaleString('es-MX') : ''}</span> },
    { key: 'archivo_path', header: 'Archivo', render: (v: string) => v ? <a href={v} target="_blank" rel="noreferrer" className="text-green-primary underline">Ver</a> : <span className="text-gray-400">-</span> },
    // keep montoVentas for backward compatibility
    { key: 'montoVentas', header: 'Monto Ventas', render: (value: number) => (
      <span className="font-semibold text-success">${(value ?? 0).toFixed(2)}</span>
    ) },
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

          {error && (
            <div className="mb-4 p-3 rounded border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
              <strong>Advertencia:</strong> No se pudieron obtener los datos reales: {error}. Mostrando datos de prueba.
            </div>
          )}

          <Table columns={columns} data={reports} />

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-medium">
            <div className="text-sm text-gray-600">
              {totalSelected} reporte(s) seleccionado(s)
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={() => fetchReports()} className="bg-gray-100 text-sm" disabled={isLoading}>
                {isLoading ? 'Refrescando...' : 'Refrescar'}
              </Button>
              <Button onClick={handleGeneratePDF}>
                <FileText size={16} className="mr-2" />
                Generar PDF
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SalesReports;
