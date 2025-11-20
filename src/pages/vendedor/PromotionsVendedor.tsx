import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchPromocionesFiltered, fetchProducts } from '../../utils/api';

type Promo = { id: string; nombre: string; descripcion?: string; tipo?: string; valor_descuento?: number; nuevo_precio?: number; fecha_inicio?: string; fecha_fin?: string; producto_id?: string|number };

const PromotionsVendedor: React.FC = () => {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string,string>>({});
  const [apiAvailable, setApiAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // fetch active promos
      const res = await fetchPromocionesFiltered({ activa: true });
      if (res.ok) {
        const raw = Array.isArray(res.data) ? res.data : [];
        setPromos(raw.map((p: any) => ({
          id: String(p.id),
          nombre: p.nombre,
          descripcion: p.descripcion,
          tipo: p.tipo,
          valor_descuento: p.valor_descuento != null ? Number(p.valor_descuento) : undefined,
          nuevo_precio: p.nuevo_precio != null ? Number(p.nuevo_precio) : undefined,
          fecha_inicio: p.fecha_inicio,
          fecha_fin: p.fecha_fin,
          producto_id: p.producto_id != null ? String(p.producto_id) : undefined
        })));
      } else {
        setApiAvailable(false);
      }
    } catch {
      setApiAvailable(false);
    }
    try {
      const prods = await fetchProducts();
      const map: Record<string,string> = {};
      (prods||[]).forEach((pd: any) => { map[String(pd.id)] = pd.nombre; });
      setProductsMap(map);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Promociones Activas</h1>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
          {!apiAvailable && <div className="mb-2 text-sm text-orange-600">Servidor no disponible — datos pueden estar incompletos</div>}
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Promociones activas</h2>
            <button onClick={load} className="text-sm px-3 py-1 border rounded hover:bg-gray-50">Refrescar</button>
          </div>
          {loading && <div className="text-sm text-gray-600">Cargando...</div>}
          {!loading && promos.length === 0 && <div className="text-sm text-gray-600">No hay promociones activas</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {promos.map(p => {
              const showProducto = (p.valor_descuento != null || p.nuevo_precio != null) && p.producto_id;
              const productoNombre = showProducto ? productsMap[String(p.producto_id)] || `Producto ${p.producto_id}` : null;
              return (
                <div key={p.id} className="p-3 border rounded flex flex-col gap-1">
                  <div className="font-semibold">{p.nombre}</div>
                  <div className="text-sm text-gray-600 line-clamp-3">{p.descripcion}</div>
                  {showProducto && <div className="text-xs text-gray-700">Producto: {productoNombre}</div>}
                  {p.valor_descuento != null && <div className="text-xs text-green-700">Descuento: ${p.valor_descuento}</div>}
                  {p.nuevo_precio != null && <div className="text-xs text-blue-700">Nuevo precio: ${p.nuevo_precio}</div>}
                  <div className="text-[11px] text-gray-500 mt-1">{p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString() : ''} - {p.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString() : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PromotionsVendedor;
