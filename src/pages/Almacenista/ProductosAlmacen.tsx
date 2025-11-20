import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button';
import { fetchProducts, fetchCategorias } from '../../utils/api';

export default function ProductosAlmacen() {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [prods, cats] = await Promise.all([
          fetchProducts(),
          fetchCategorias()
        ]);
        setProductos(Array.isArray(prods) ? prods : []);
        setCategorias(cats.ok ? cats.data : []);
      } catch (e) {
        console.error('Error fetching productos (supabase)', e);
        setProductos([]);
      }
    })();
  }, []);

  const categoriaNombre = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categorias || []) map.set(String(c.id), c.nombre);
    return (catId: string) => map.get(String(catId)) || (catId ? String(catId) : '-');
  }, [categorias]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Productos (Almacén)</h1>
      <div className="bg-white rounded-lg shadow-soft p-4 border">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600">
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2">Precio</th>
                <th className="px-3 py-2">Stock mínimo</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 text-sm">{p.nombre}</td>
                  <td className="px-3 py-2 text-sm">{p.descripcion || '-'}</td>
                  <td className="px-3 py-2 text-sm">{categoriaNombre(p.categoria)}</td>
                  <td className="px-3 py-2 text-sm">{p.precio}</td>
                  <td className="px-3 py-2 text-sm">{p.stock_minimo}</td>
                </tr>
              ))}
              {productos.length === 0 && (<tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No hay productos</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
