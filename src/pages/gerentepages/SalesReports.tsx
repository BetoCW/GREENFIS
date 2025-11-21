import React, { useState, useEffect, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { faker } from '@faker-js/faker';
import Button from '../../components/Button';
import Table from '../../components/Table';
import {
  fetchVentasRange,
  fetchVentasAggregate,
  fetchTopProductos,
  fetchMetodosPagoDist
} from '../../utils/api';

// Se eliminaron las dependencias de react-chartjs-2 y chart.js.
// Se usarán componentes simples hechos con divs y TailwindCSS.

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

interface VentaRow { id: string; total: number; fecha?: string; sucursal_id?: number; vendedor_id?: number; metodo_pago?: string }
interface TopProducto { producto_id: number; cantidad: number; monto: number; nombre?: string }

const presets: { key: string; label: string; calc: () => { inicio: string; fin: string } }[] = [
  { key: 'hoy', label: 'Hoy', calc: () => { const d = new Date(); const s = d.toISOString().slice(0,10); return { inicio: s, fin: s }; } },
  { key: '7d', label: 'Últimos 7 días', calc: () => { const fin = new Date(); const inicio = new Date(Date.now()-6*24*3600*1000); return { inicio: inicio.toISOString().slice(0,10), fin: fin.toISOString().slice(0,10) }; } },
  { key: 'mes', label: 'Mes actual', calc: () => { const now = new Date(); const inicio = new Date(now.getFullYear(), now.getMonth(),1); const fin = new Date(now.getFullYear(), now.getMonth()+1,0); return { inicio: inicio.toISOString().slice(0,10), fin: fin.toISOString().slice(0,10) }; } },
  { key: '30d', label: 'Últimos 30 días', calc: () => { const fin = new Date(); const inicio = new Date(Date.now()-29*24*3600*1000); return { inicio: inicio.toISOString().slice(0,10), fin: fin.toISOString().slice(0,10) }; } }
];

const SalesReports: React.FC = () => {
  // Formal report listing state
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = 'http://localhost:4000/api/manager/reportes/vw';

  // Analytics state (merged from SalesDashboard)
  const [inicio, setInicio] = useState<string>(presets[1].calc().inicio);
  const [fin, setFin] = useState<string>(presets[1].calc().fin);
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [agg, setAgg] = useState<any>(null);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [metodos, setMetodos] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string|null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [inicio, fin]);

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

  // --- Analytics logic ---
  function applyPreset(key: string) {
    const p = presets.find(pr=>pr.key===key); if (!p) return;
    const { inicio: i, fin: f } = p.calc();
    setInicio(i); setFin(f);
  }

  async function loadAnalytics() {
    setLoadingAnalytics(true); setAnalyticsError(null);
    try {
      const vRes = await fetchVentasRange(inicio, fin, {});
      if (!vRes.ok) throw new Error(vRes.error||'Error ventas');
      const rows = (vRes.data||[]).map((r:any)=>({ id: String(r.id), total: Number(r.total||r.monto_total||0), fecha: r.fecha_venta||r.fecha||r.created_at }));
      setVentas(rows);
      const aRes = await fetchVentasAggregate(inicio, fin, {}); if (aRes.ok) setAgg(aRes.data); else setAgg(null);
      const tRes = await fetchTopProductos(inicio, fin, 5, {}); if (tRes.ok) setTopProductos(tRes.data); else setTopProductos([]);
      const mRes = await fetchMetodosPagoDist(inicio, fin, {}); if (mRes.ok) setMetodos(mRes.data); else setMetodos([]);
    } catch(e:any) {
      setAnalyticsError(e.message||String(e));
      setVentas([]); setAgg(null); setTopProductos([]); setMetodos([]);
    } finally { setLoadingAnalytics(false); }
  }

  const kpis = useMemo(()=>{
    if (!agg) return [] as { label: string; value: string }[];
    return [
      { label: 'Total Ventas', value: `$${(agg.total||0).toFixed(2)}` },
      { label: 'Tickets', value: String(agg.tickets||0) },
      { label: 'Promedio Ticket', value: `$${(agg.promedioTicket||0).toFixed(2)}` },
    ];
  }, [agg]);

  const chartVentasDia = useMemo(()=>{
    const byDay: Record<string, number> = {};
    for (const v of ventas) {
      const d = (v.fecha ? new Date(v.fecha) : new Date()).toISOString().slice(0,10);
      byDay[d] = (byDay[d]||0) + v.total;
    }
    const labels = Object.keys(byDay).sort();
    const values = labels.map(l=>byDay[l]);
    return { labels, values };
  }, [ventas]);

  const chartTopProductos = useMemo(()=>{
    const labels = topProductos.map(p=>p.nombre||`Producto ${p.producto_id}`);
    const quantities = topProductos.map(p=>p.cantidad);
    return { labels, quantities };
  }, [topProductos]);

  const chartMetodos = useMemo(()=>{
    const labels = metodos.map(m=>m.metodo);
    const data = metodos.map(m=>m.count);
    const colors = ['#6366F1','#10B981','#F59E0B','#EF4444','#84CC16','#EC4899'];
    return { labels, data, colors: colors.slice(0,data.length) };
  }, [metodos]);

  function exportCSV() {
    const header = ['id','fecha','total'];
    const rows = ventas.map(v => [v.id, v.fecha||'', v.total.toFixed(2)].join(','));
    const blob = new Blob([header.join(',')+'\n'+rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ventas_${inicio}_${fin}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const ventasColumns = [
    { key: 'id', header: 'ID' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'total', header: 'Total', render: (v:number) => `$${(v||0).toFixed(2)}` }
  ];

  // Componentes simples para visualización de datos sin librerías externas
  const SimpleBarChart: React.FC<{ labels: string[]; values: number[]; color?: string; height?: number }> = ({ labels, values, color = '#15803d', height = 140 }) => {
    if (!labels.length) return <div className="text-xs text-gray-500">Sin datos</div>;
    const max = Math.max(...values, 1);
    return (
      <div className="flex items-end gap-2 w-full overflow-x-auto" style={{ minHeight: height }}>
        {values.map((v, i) => {
          const h = (v / max) * (height - 30);
          return (
            <div key={labels[i]} className="flex flex-col items-center justify-end" style={{ minWidth: '40px' }}>
              <div
                title={`${labels[i]}: $${v.toFixed(2)}`}
                className="w-full rounded-t relative"
                style={{
                  height: h,
                  background: `linear-gradient(to top, ${color}, ${color}AA)`
                }}
              >
                <span className="absolute -top-5 text-[10px] font-medium text-gray-700">${v.toFixed(0)}</span>
              </div>
              <div className="mt-1 text-[10px] text-center text-gray-600 truncate w-full" title={labels[i]}>{labels[i].slice(5)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const MetodoPagoList: React.FC<{ labels: string[]; data: number[]; colors: string[] }> = ({ labels, data, colors }) => {
    if (!labels.length) return <div className="text-xs text-gray-500">Sin datos</div>;
    const total = data.reduce((a,b)=>a+b,0) || 1;
    return (
      <div className="space-y-2">
        {labels.map((l,i)=>{
          const count = data[i];
          const pct = (count/total)*100;
          return (
            <div key={l} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i] }} />
              <span className="text-xs font-medium text-gray-700 flex-1">{l}</span>
              <span className="text-xs text-gray-500">{count}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden max-w-[120px]">
                <div className="h-full" style={{ width: pct+'%', backgroundColor: colors[i] }} />
              </div>
              <span className="text-[10px] text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-text-dark mb-8">Reportes y Analítica de Ventas</h1>

        {/* Analytics (interactiva, solo lectura) */}
        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium mb-8">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Inicio</label>
              <input type="date" value={inicio} onChange={e=>setInicio(e.target.value)} className="border px-3 py-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fin</label>
              <input type="date" value={fin} onChange={e=>setFin(e.target.value)} className="border px-3 py-2 rounded" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {presets.map(p=> <Button key={p.key} variant="secondary" onClick={()=>applyPreset(p.key)}>{p.label}</Button> )}
            </div>
            <div className="ml-auto flex gap-2">
              <Button onClick={loadAnalytics} disabled={loadingAnalytics}>{loadingAnalytics? 'Actualizando...' : 'Actualizar'}</Button>
              <Button variant="secondary" onClick={exportCSV} disabled={!ventas.length}>Exportar CSV</Button>
            </div>
          </div>
          {analyticsError && (
            <div className="mt-4 p-3 rounded border border-red-300 bg-red-50 text-sm text-red-800">{analyticsError}</div>
          )}
          {!analyticsError && !loadingAnalytics && ventas.length===0 && (
            <div className="mt-6 text-sm text-gray-600">No hay ventas en el rango seleccionado.</div>
          )}
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {kpis.map(k => (
              <div key={k.label} className="p-4 rounded-lg border border-gray-medium bg-gradient-to-br from-white to-gray-50">
                <div className="text-xs uppercase tracking-wide text-gray-500">{k.label}</div>
                <div className="text-xl font-semibold mt-1">{k.value}</div>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium lg:col-span-2">
              <h2 className="text-sm font-semibold mb-2">Ventas por Día</h2>
              <SimpleBarChart labels={chartVentasDia.labels} values={chartVentasDia.values} color="#15803d" height={140} />
            </div>
            <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
              <h2 className="text-sm font-semibold mb-2">Métodos de Pago</h2>
              <MetodoPagoList labels={chartMetodos.labels} data={chartMetodos.data} colors={chartMetodos.colors} />
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-6 mt-8">
            <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
              <h2 className="text-sm font-semibold mb-2">Top Productos (Cantidad)</h2>
              <SimpleBarChart labels={chartTopProductos.labels} values={chartTopProductos.quantities} color="#0d9488" height={140} />
            </div>
            <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
              <h2 className="text-sm font-semibold mb-2">Listado de Ventas</h2>
              <Table columns={ventasColumns} data={ventas} />
            </div>
          </div>
        </div>

        {/* Reportes formales */}
        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-dark mb-4">
              Reportes Generados (Vista / PDF)
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
