import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { readStore, seedIfEmpty } from '../../utils/localStore';

type Promo = { id: string; nombre: string; descripcion?: string; tipo?: string; valor_descuento?: number; nuevo_precio?: number; fecha_inicio?: string; fecha_fin?: string };

const PromotionsVendedor: React.FC = () => {
  const [promos, setPromos] = useState<Promo[]>([]);

  useEffect(() => {
    seedIfEmpty();
    setPromos(readStore<Promo[]>('gf_promotions', []));
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Promociones Activas</h1>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {promos.length === 0 && <div className="text-sm text-gray-600">No hay promociones activas</div>}
            {promos.map(p => (
              <div key={p.id} className="p-3 border rounded">
                <div className="font-semibold">{p.nombre}</div>
                <div className="text-sm text-gray-600">{p.descripcion}</div>
                <div className="text-xs mt-2">{p.tipo} — {p.valor_descuento ? `$${p.valor_descuento}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PromotionsVendedor;
