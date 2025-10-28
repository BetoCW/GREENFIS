import React, { useEffect, useState } from 'react';
import Button from '../../components/Button';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

export default function InventarioAlmacen() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}/api/almacen/inventario`)
      .then((r) => r.json())
      .then((data) => setItems(data || []))
      .catch((e) => { console.error('Error fetching inventario almacen', e); setItems([]); });
  }, []);

  const adjust = async (id: number) => {
    const qtyRaw = prompt('Ingrese la nueva cantidad:');
    if (qtyRaw == null) return;
    const cantidad = Number(qtyRaw);
    if (Number.isNaN(cantidad)) { alert('Cantidad inválida'); return; }

    try {
      const res = await fetch(`${API}/api/almacen/inventario/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cantidad }) });
      if (!res.ok) throw new Error(await res.text());
      alert('Cantidad actualizada');
      // refresh
      const r2 = await fetch(`${API}/api/almacen/inventario`);
      const data = await r2.json();
      setItems(data || []);
    } catch (e) {
      console.error(e);
      alert('Error al actualizar cantidad');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Inventario - Almacén</h1>
      <div className="bg-white rounded-lg shadow-soft p-4 border">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Cantidad</th>
                <th className="px-3 py-2">Ubicación</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2 text-sm">{it.id}</td>
                  <td className="px-3 py-2 text-sm">{it.producto || it.producto_id}</td>
                  <td className="px-3 py-2 text-sm">{it.cantidad}</td>
                  <td className="px-3 py-2 text-sm">{it.ubicacion ?? '-'}</td>
                  <td className="px-3 py-2 text-sm">
                    <Button type="button" onClick={() => adjust(it.id)} className="px-3 py-1" size="sm">Ajustar</Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No hay registros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
