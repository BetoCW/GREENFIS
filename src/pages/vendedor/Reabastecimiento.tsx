import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import { readStore, writeStore, seedIfEmpty } from '../../utils/localStore';
import { useAuth } from '../../context/AuthContext';
import { postSolicitud } from '../../utils/api';

type Product = { id: string; nombre: string; cantidad: number; stock_minimo?: number };
type Request = { id: string; producto_id: string; producto_nombre: string; cantidad: number; urgencia?: string; estado: 'pendiente'|'aprobada'|'rechazada'|'completada'; fecha: string };

const Reabastecimiento: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [urgencia, setUrgencia] = useState('');

  useEffect(() => {
    seedIfEmpty();
    setProducts(readStore<Product[]>('gf_products', []));
    setRequests(readStore<Request[]>('gf_requests', []));
  }, []);

  useEffect(() => writeStore('gf_requests', requests), [requests]);

  const lowStock = useMemo(() => products.filter(p => p.cantidad <= (p.stock_minimo||0)), [products]);

  const { user } = useAuth();
  function createRequest() {
    if (!selectedProduct) return alert('Seleccione un producto');
    if (qty <= 0) return alert('Cantidad inválida');
    const prod = products.find(p => p.id === selectedProduct)!;
    const newReq: Request = { id: `REQ-${Date.now()}`, producto_id: prod.id, producto_nombre: prod.nombre, cantidad: qty, urgencia: urgencia || 'normal', estado: 'pendiente', fecha: new Date().toISOString() };
    // If product id is not numeric (local seeded products use string IDs like 'P-001'),
    // avoid calling server (which expects numeric product_id FK) and save locally.
  const productoIdNum = Number(prod.id);
    if (Number.isNaN(productoIdNum)) {
      // save locally and inform user
      console.warn('Producto no sincronizado con el servidor (id no numérico), guardando solicitud localmente:', prod.id);
      setRequests(prev => [newReq, ...prev]);
      setSelectedProduct(''); setQty(1); setUrgencia('');
      return alert('Producto no sincronizado con servidor — solicitud guardada localmente');
    }

    // try server, helper returns structured result
  // ensure we have a logged-in user (avoid hard-coded fallback ids)
  if (!user) {
    console.warn('Usuario no autenticado: no se puede enviar solicitud al servidor. Guardando localmente.');
    setRequests(prev => [newReq, ...prev]);
    setSelectedProduct(''); setQty(1); setUrgencia('');
    return alert('No hay sesión activa: solicitud guardada localmente');
  }

  const sucursalToUse = user.sucursal_id;
  const solicitanteToUse = user.id;

  const payload = { sucursal_id: Number(sucursalToUse), solicitante_id: Number(solicitanteToUse), producto_id: productoIdNum, cantidad_solicitada: Number(qty) };

  // client-side validation to avoid sending malformed requests
  const invalid = Object.values(payload).some(v => v === null || v === undefined || Number.isNaN(Number(v)));
  if (invalid) {
    console.warn('Payload inválido, no se enviará al servidor:', payload);
    setRequests(prev => [newReq, ...prev]);
    setSelectedProduct(''); setQty(1); setUrgencia('');
    return alert('Datos incompletos en la sesión o formulario. Solicitud guardada localmente.');
  }

  console.debug('Enviando solicitud al servidor, payload:', payload);

  postSolicitud(payload)
      .then((res) => {
        if (res.fromServer) {
          // server returned inserted row — adapt to local Request shape if needed
          const srv = res.data as any;
          const mapped: Request = { id: String(srv.id || srv.ID || `REQ-${Date.now()}`), producto_id: String(srv.producto_id || srv.producto || payload.producto_id), producto_nombre: srv.producto_nombre || srv.producto || '', cantidad: srv.cantidad_solicitada || srv.cantidad || payload.cantidad_solicitada, urgencia: (srv.urgencia as any) || 'normal', estado: srv.estado || 'pendiente', fecha: srv.fecha_solicitud || srv.fecha || new Date().toISOString() };
          setRequests(prev => [mapped, ...prev]);
          setSelectedProduct(''); setQty(1); setUrgencia('');
          alert('Solicitud enviada con éxito');
        } else {
          // saved locally
          console.warn('Solicitud guardada localmente:', res.error);
          // show a clearer message if server returned structured error
          let msg = 'Servidor no disponible: solicitud guardada localmente';
          try {
            if (res.error && res.error.message) {
              // message could be a JSON string from server
              try {
                const parsed = JSON.parse(res.error.message);
                msg = parsed.error || JSON.stringify(parsed) || msg;
              } catch (_) {
                msg = res.error.message;
              }
            }
          } catch (e) {}
          setRequests(prev => [res.data as Request, ...prev]);
          setSelectedProduct(''); setQty(1); setUrgencia('');
          alert(msg);
        }
      })
      .catch((err) => {
        console.error('Error inesperado al crear solicitud', err);
        setRequests(prev => [newReq, ...prev]);
        setSelectedProduct(''); setQty(1); setUrgencia('');
        alert('Error al crear solicitud. Ver consola.');
      });
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Solicitudes de Reabastecimiento</h1>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
          <div className="mb-4">
            <h3 className="font-semibold">Productos con stock bajo</h3>
            <div className="space-y-2 mt-2">
              {lowStock.length === 0 && <div className="text-sm text-gray-600">No hay productos con stock bajo</div>}
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                  <div>{p.nombre} <span className="text-xs text-gray-500">({p.id})</span></div>
                  <div className="text-sm text-red-600">{p.cantidad}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold">Crear solicitud</h3>
            <div className="flex gap-2 items-end">
              <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="border rounded px-3 py-2 w-1/2">
                <option value="">Seleccione un producto</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.id})</option>)}
              </select>
              <input type="number" value={qty} min={1} onChange={e => setQty(Number(e.target.value))} className="border rounded px-3 py-2 w-1/6" />
              <select value={urgencia} onChange={e => setUrgencia(e.target.value)} className="border rounded px-3 py-2 w-1/6">
                <option value="">Normal</option>
                <option value="urgente">Urgente</option>
              </select>
              <Button onClick={createRequest}>Crear Solicitud</Button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Historial de solicitudes</h3>
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="p-2 border rounded flex justify-between items-center">
                  <div>
                    <div className="font-medium">{r.producto_nombre} <span className="text-xs text-gray-500">{r.producto_id}</span></div>
                    <div className="text-sm text-gray-600">{r.cantidad} — {r.urgencia}</div>
                    <div className="text-xs text-gray-500">{new Date(r.fecha).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs ${r.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : r.estado === 'aprobada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
    export default Reabastecimiento;
