import { useEffect, useState } from 'react';
import Button from '../../components/Button';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

export default function TransferenciasAlmacen() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ producto_id: '', cantidad: '', sucursal_destino_id: '' });

  useEffect(() => {
    // no listing endpoint for transferencias; leave empty or fetch solicitudes to base if needed
  }, []);

  const submit = async () => {
    if (!form.producto_id || !form.cantidad || !form.sucursal_destino_id) { alert('Complete los campos'); return; }
    try {
      const res = await fetch(`${API}/api/almacen/transferencias`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ producto_id: Number(form.producto_id), cantidad: Number(form.cantidad), sucursal_destino_id: Number(form.sucursal_destino_id) }) });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      alert('Transferencia creada');
      setList((l) => [created, ...l]);
      setForm({ producto_id: '', cantidad: '', sucursal_destino_id: '' });
    } catch (e) { console.error(e); alert('Error creando transferencia'); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Crear transferencia - Almacén</h1>
      <div className="bg-white rounded-lg shadow-soft p-4 border mb-4">
        <div className="grid grid-cols-1 gap-2">
          <input className="border px-3 py-2" placeholder="Producto ID" value={form.producto_id} onChange={(e) => setForm({...form, producto_id: e.target.value})} />
          <input className="border px-3 py-2" placeholder="Cantidad" value={form.cantidad} onChange={(e) => setForm({...form, cantidad: e.target.value})} />
          <input className="border px-3 py-2" placeholder="Sucursal destino ID" value={form.sucursal_destino_id} onChange={(e) => setForm({...form, sucursal_destino_id: e.target.value})} />
          <div>
            <Button type="button" onClick={submit}>Crear transferencia</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-soft p-4 border">
        <h2 className="font-medium mb-2">Transferencias creadas (local)</h2>
        <ul>
          {list.map((t) => <li key={t.id} className="py-1">ID {t.id} - Producto {t.producto_id} - Cant {t.cantidad} - Suc dest {t.sucursal_destino_id}</li>)}
          {list.length === 0 && <li className="text-sm text-gray-500">No hay transferencias creadas aquí</li>}
        </ul>
      </div>
    </div>
  );
}
