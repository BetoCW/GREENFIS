import { useEffect, useState } from 'react';
import Button from '../../components/Button';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

export default function ProductosAlmacen() {
  const [productos, setProductos] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}/api/almacen/productos`)
      .then((r) => r.json())
      .then((data) => setProductos(data || []))
      .catch((e) => { console.error('Error fetching productos almacen', e); setProductos([]); });
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Productos (Almacén)</h1>
      <div className="bg-white rounded-lg shadow-soft p-4 border">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Precio</th><th className="px-3 py-2">Stock mínimo</th></tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className="border-t"><td className="px-3 py-2 text-sm">{p.id}</td><td className="px-3 py-2 text-sm">{p.nombre}</td><td className="px-3 py-2 text-sm">{p.precio}</td><td className="px-3 py-2 text-sm">{p.stock_minimo}</td></tr>
              ))}
              {productos.length === 0 && (<tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">No hay productos</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
