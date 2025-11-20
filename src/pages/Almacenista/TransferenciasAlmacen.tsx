import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { fetchInventarioAlmacen, fetchSucursales, createTransferencia, fetchTransferencias } from '../../utils/api';

export default function TransferenciasAlmacen() {
  const { user } = useAuth();
  const [transferencias, setTransferencias] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [form, setForm] = useState({ producto_id: '', cantidad: '', sucursal_destino_id: '' });
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'simple'|'lote'>('simple');
  const [loteDestino, setLoteDestino] = useState('');
  const [loteCantidades, setLoteCantidades] = useState<Record<number,string>>({});
  const [sendingBatch, setSendingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<{ok: number; fail: number} | null>(null);

  useEffect(() => {
    (async () => {
      const inv = await fetchInventarioAlmacen(); if (inv.ok) setInventario(inv.data);
      const sucs = await fetchSucursales(); if (sucs.ok) setSucursales(sucs.data);
      const trs = await fetchTransferencias(); if (trs.ok) setTransferencias(trs.data);
    })();
  }, []);

  const availableForProduct = (producto_id: number | string) => {
    const pid = Number(producto_id);
    const row = inventario.find((it: any) => Number(it.producto_id) === pid);
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
      const payload: any = { producto_id: productoIdNum, cantidad: cantidadNum, sucursal_destino_id: sucursalDest, almacenista_id: user?.id };
      const res = await createTransferencia(payload);
      if (!res.ok) throw new Error('Error creando');
      alert('Transferencia creada');
      const trs = await fetchTransferencias(); if (trs.ok) setTransferencias(trs.data);
      const inv = await fetchInventarioAlmacen(); if (inv.ok) setInventario(inv.data);
      setForm({ producto_id: '', cantidad: '', sucursal_destino_id: '' });
    } catch (e) {
      alert('Error creando transferencia');
    } finally { setLoading(false); }
  };

  function handleLoteCantidad(prodId: number, val: string) {
    setLoteCantidades(prev => ({ ...prev, [prodId]: val }));
  }

  async function enviarLote() {
    if (!loteDestino) { alert('Seleccione sucursal destino para lote'); return; }
    const destinoNum = Number(loteDestino); if (Number.isNaN(destinoNum)) { alert('Destino inválido'); return; }
    const pendientes = Object.entries(loteCantidades)
      .map(([pid, val]) => ({ producto_id: Number(pid), cantidad: Number(val) }))
      .filter(r => r.cantidad > 0);
    if (pendientes.length === 0) { alert('No hay cantidades > 0 en el lote'); return; }
    // Validaciones stock
    const invalid = pendientes.find(p => p.cantidad > availableForProduct(p.producto_id));
    if (invalid) { alert(`Stock insuficiente para producto ${invalid.producto_id}`); return; }
    setSendingBatch(true); setBatchResult(null);
    let ok = 0, fail = 0;
    for (const p of pendientes) {
      try {
        const res = await createTransferencia({ producto_id: p.producto_id, cantidad: p.cantidad, sucursal_destino_id: destinoNum, almacenista_id: user?.id });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    const inv = await fetchInventarioAlmacen(); if (inv.ok) setInventario(inv.data);
    const trs = await fetchTransferencias(); if (trs.ok) setTransferencias(trs.data);
    setBatchResult({ ok, fail });
    setSendingBatch(false);
    // Clear lote
    setLoteCantidades({});
  }

  const inventarioOrdenado = useMemo(() => inventario.sort((a:any,b:any) => a.nombre.localeCompare(b.nombre)), [inventario]);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Transferencias de Inventario</h1>
          <div className="flex gap-2">
            <Button size="sm" variant={mode==='simple'?'primary':'secondary'} onClick={()=>setMode('simple')}>Modo Simple</Button>
            <Button size="sm" variant={mode==='lote'?'primary':'secondary'} onClick={()=>setMode('lote')}>Modo Lote</Button>
          </div>
        </div>

        {mode === 'simple' && (
          <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium mb-8">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                <select className="w-full border px-3 py-2 rounded" value={form.producto_id} onChange={(e)=>setForm(f=>({...f,producto_id:e.target.value}))}>
                  <option value="">Seleccione...</option>
                  {inventarioOrdenado.map(p => <option key={p.producto_id} value={p.producto_id}>{p.nombre} (Disp {p.cantidad})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input className="w-full border px-3 py-2 rounded" value={form.cantidad} onChange={(e)=>setForm(f=>({...f,cantidad:e.target.value}))} />
                <small className="text-xs text-gray-500">Disponible: {form.producto_id ? availableForProduct(form.producto_id) : '-'}</small>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal destino</label>
                <select className="w-full border px-3 py-2 rounded" value={form.sucursal_destino_id} onChange={(e)=>setForm(f=>({...f,sucursal_destino_id:e.target.value}))}>
                  <option value="">Seleccione...</option>
                  {sucursales.map(s => <option key={s.id_sucursal ?? s.id} value={s.id_sucursal ?? s.id}>{s.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="pt-4">
              <Button onClick={submit} disabled={loading}>{loading?'Enviando...':'Crear transferencia'}</Button>
            </div>
          </div>
        )}

        {mode === 'lote' && (
          <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium mb-8">
            <div className="flex items-end gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal destino (para todo el lote)</label>
                <select className="w-full border px-3 py-2 rounded" value={loteDestino} onChange={e=>setLoteDestino(e.target.value)}>
                  <option value="">Seleccione...</option>
                  {sucursales.map(s => <option key={s.id_sucursal ?? s.id} value={s.id_sucursal ?? s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <Button size="sm" variant="primary" onClick={enviarLote} disabled={sendingBatch}>{sendingBatch?'Procesando...':'Enviar lote'}</Button>
              </div>
            </div>
            {batchResult && (
              <div className="mb-3 text-sm p-2 rounded bg-gray-100 border border-gray-300">Resultado lote: {batchResult.ok} ok / {batchResult.fail} errores</div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Disponible</th>
                    <th className="px-3 py-2">Cantidad a transferir</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioOrdenado.map(row => {
                    const val = loteCantidades[row.producto_id] || '';
                    const num = Number(val);
                    const disponible = Number(row.cantidad||0);
                    const invalido = val !== '' && (Number.isNaN(num) || num <= 0 || num > disponible);
                    return (
                      <tr key={row.producto_id} className={`border-t ${invalido?'bg-red-50':''}`}>
                        <td className="px-3 py-2">{row.nombre}</td>
                        <td className="px-3 py-2">{disponible}</td>
                        <td className="px-3 py-2">
                          <input className="border px-2 py-1 w-28 text-sm rounded" value={val} onChange={e=>handleLoteCantidad(row.producto_id, e.target.value)} placeholder="0" />
                        </td>
                        <td className="px-3 py-2 text-xs">{invalido ? 'Inválido' : (val ? 'OK' : '')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <h2 className="text-xl font-semibold text-text-dark mb-3">Historial de Transferencias</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2">Destino</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {transferencias.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="px-3 py-2">{t.id}</td>
                    <td className="px-3 py-2">{t.producto_id}</td>
                    <td className="px-3 py-2">{t.cantidad}</td>
                    <td className="px-3 py-2">{t.sucursal_destino_id}</td>
                    <td className="px-3 py-2">{new Date(t.fecha_transferencia).toLocaleString()}</td>
                    <td className="px-3 py-2">{t.estado}</td>
                  </tr>
                ))}
                {transferencias.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No hay transferencias registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
