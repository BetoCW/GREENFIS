import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

const API = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';

export default function TransferenciasAlmacen() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]); // inventario_almacen rows
  const [form, setForm] = useState({ producto_id: '', cantidad: '', sucursal_destino_id: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // helper: try multiple endpoints in order and return first successful array result
    const tryEndpoints = async (urls: string[]) => {
      for (const u of urls) {
        try {
          const r = await fetch(u);
          if (!r.ok) {
            const txt = await r.text().catch(() => '');
            console.warn('endpoint', u, 'failed', r.status, txt);
            continue;
          }
          const d = await r.json();
          if (Array.isArray(d)) return d;
        } catch (err) {
          console.warn('fetch error', u, err && (err as any).message ? (err as any).message : err);
          continue;
        }
      }
      return [];
    };

    (async () => {
      const prodUrls = [`${API}/api/almacen/productos`, `${API}/api/manager/productos`, `${API}/api/manager/almacen/productos`];
      const sucUrls = [`${API}/api/manager/sucursales`, `${API}/api/almacen/sucursales`];
      const invUrls = [`${API}/api/almacen/inventario`, `${API}/api/almacen/inventario/vw`, `${API}/api/manager/almacen/inventario`];

      const prods = await tryEndpoints(prodUrls);
      setProductos(prods);

      const sucs = await tryEndpoints(sucUrls);
      setSucursales(sucs);

      const inv = await tryEndpoints(invUrls);
      setInventario(inv);
    })();
  }, []);

  const availableForProduct = (producto_id: number | string) => {
    const pid = Number(producto_id);
    const row = inventario.find((it: any) => Number(it.producto_id ?? it.id) === pid);
    return row ? Number(row.cantidad ?? 0) : 0;
  };

  const submit = async () => {
    if (!form.producto_id || !form.cantidad || !form.sucursal_destino_id) { alert('Complete los campos'); return; }
    const productoIdNum = Number(form.producto_id);
    const cantidadNum = Number(form.cantidad);
    const sucursalDest = Number(form.sucursal_destino_id);
    if (Number.isNaN(productoIdNum) || Number.isNaN(cantidadNum) || Number.isNaN(sucursalDest)) { alert('Campos inválidos'); return; }

    const available = availableForProduct(productoIdNum);
    if (cantidadNum <= 0) { alert('La cantidad debe ser mayor que 0'); return; }
    if (cantidadNum > available) {
      // Do not ask for confirmation when stock is insufficient.
      // Inform the user and abort the transfer creation so they must adjust quantity or restock first.
      alert(`No hay existencias suficientes en almacén para abastecer la sucursal (disponible: ${available}). Ajusta la cantidad o reabastece antes.`);
      return;
    }

    setLoading(true);
    try {
      const payload: any = { producto_id: productoIdNum, cantidad: cantidadNum, sucursal_destino_id: sucursalDest };
      // include almacenista_id from auth if available
      if (user?.id) payload.almacenista_id = user.id;
      const res = await fetch(`${API}/api/almacen/transferencias`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      alert('Transferencia creada');
      setList((l) => [created, ...l]);
      setForm({ producto_id: '', cantidad: '', sucursal_destino_id: '' });
      // refresh inventario locally
      try { const inv = await fetch(`${API}/api/almacen/inventario`).then((r) => r.json()); setInventario(inv || []); } catch (_) { }
    } catch (e) { console.error(e); alert('Error creando transferencia: ' + (e instanceof Error ? e.message : String(e))); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Crear transferencia - Almacén</h1>
      <div className="bg-white rounded-lg shadow-soft p-4 border mb-4">
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm">Producto</label>
          <select className="border px-3 py-2" value={form.producto_id} onChange={(e) => setForm({ ...form, producto_id: e.target.value })}>
            <option value="">-- Seleccione producto --</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre} (ID {p.id})</option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <label className="text-sm">Cantidad</label>
              <input className="border px-3 py-2 w-full" placeholder="Cantidad" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
            </div>
            <div className="w-48">
              <label className="text-sm">Sucursal destino</label>
              <select className="border px-3 py-2 w-full" value={form.sucursal_destino_id} onChange={(e) => setForm({ ...form, sucursal_destino_id: e.target.value })}>
                <option value="">-- Seleccione sucursal --</option>
                {sucursales.map((s: any) => (<option key={s.id_sucursal ?? s.id} value={s.id_sucursal ?? s.id}>{s.nombre}</option>))}
              </select>
            </div>
          </div>

          <div>
            <small className="text-sm text-gray-600">Stock disponible en almacén: <strong>{form.producto_id ? String(availableForProduct(form.producto_id)) : '-'}</strong></small>
          </div>

          <div>
            <Button type="button" onClick={submit} disabled={loading}>{loading ? 'Enviando...' : 'Crear transferencia'}</Button>
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
