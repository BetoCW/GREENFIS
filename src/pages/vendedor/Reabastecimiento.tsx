import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import { readStore, writeStore, seedIfEmpty } from '../../utils/localStore';
import { useAuth } from '../../context/AuthContext';
import { postSolicitud, fetchInventoryWithStatus, fetchProducts, fetchSolicitudes } from '../../utils/api';

type Product = { id: string; nombre: string; cantidad: number; stock_minimo?: number };
type Request = { id: string; producto_id: string; producto_nombre: string; cantidad: number; urgencia?: string; estado: 'pendiente'|'aprobada'|'rechazada'|'completada'; fecha: string };

const Reabastecimiento: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const [urgencia, setUrgencia] = useState<string>('');
  const [apiAvailable, setApiAvailable] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>('');

  const { user } = useAuth();

  // Load products and solicitudes
  useEffect(() => {
    seedIfEmpty();
    async function loadProducts() {
      try {
        if (user && user.sucursal_id) {
          const res = await fetchInventoryWithStatus(Number(user.sucursal_id));
          setProducts((res.data || []) as Product[]);
          if (!res.ok) setApiAvailable(false);
        } else {
          try {
            const prods = await fetchProducts();
            setProducts((prods || []) as Product[]);
          } catch {
            setProducts(readStore<Product[]>('gf_products', []));
            setApiAvailable(false);
          }
        }
      } catch {
        setProducts(readStore<Product[]>('gf_products', []));
        setApiAvailable(false);
      }
    }
    async function loadRequests() {
      try {
        if (user) {
          const res: any = await fetchSolicitudes({});
          const raw = Array.isArray(res) ? res : (res?.data || []);
          const meSucursal = Number(user.sucursal_id || 0);
          const meId = Number(user.id || 0);
          const mapped: Request[] = (raw as any[])
            .filter(r => (Number(r.sucursal_id || 0) === meSucursal) || (Number(r.solicitante_id || 0) === meId))
            .map((srv: any) => {
              const pid = String(srv.producto_id || srv.producto || '');
              const prod = products.find(p => String(p.id) === pid);
              return {
                id: String(srv.id || srv.ID || `REQ-${Date.now()}`),
                producto_id: pid,
                producto_nombre: srv.producto_nombre || prod?.nombre || '',
                cantidad: Number(srv.cantidad_solicitada ?? srv.cantidad ?? 0),
                urgencia: (srv.urgencia as any) || 'normal',
                estado: (srv.estado as any) || 'pendiente',
                fecha: srv.fecha_solicitud || srv.fecha || new Date().toISOString(),
              } as Request;
            })
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
          setRequests(mapped);
        } else {
          setRequests(readStore<Request[]>('gf_requests', []));
        }
      } catch {
        setRequests(readStore<Request[]>('gf_requests', []));
        setApiAvailable(false);
      }
    }
    loadProducts().then(loadRequests);
  }, [user]);

  // Persist local requests (offline support)
  useEffect(() => {
    writeStore('gf_requests', requests);
  }, [requests]);

  const lowStock = useMemo(() => products.filter(p => p.cantidad <= (p.stock_minimo || 0)), [products]);
  const filteredRequests = useMemo(() => {
    if (!filterEstado) return requests;
    return requests.filter(r => r.estado === filterEstado);
  }, [requests, filterEstado]);

  function resetForm() {
    setSelectedProduct('');
    setQty(1);
    setUrgencia('');
  }

  async function refreshAll() {
    // simple re-run of effect logic without duplicating code excessively
    try {
      if (user && user.sucursal_id) {
        const res = await fetchInventoryWithStatus(Number(user.sucursal_id));
        setProducts((res.data || []) as Product[]);
        if (!res.ok) setApiAvailable(false); else setApiAvailable(true);
      } else {
        try {
          const prods = await fetchProducts();
          setProducts((prods || []) as Product[]);
        } catch {
          setProducts(readStore<Product[]>('gf_products', []));
          setApiAvailable(false);
        }
      }
    } catch {
      setProducts(readStore<Product[]>('gf_products', []));
      setApiAvailable(false);
    }
    try {
      if (user) {
        const res: any = await fetchSolicitudes({ sucursal_id: user.sucursal_id, solicitante_id: user.id });
        const raw = Array.isArray(res) ? res : (res?.data || []);
        const mapped: Request[] = (raw as any[]).map((srv: any) => ({
          id: String(srv.id || `REQ-${Date.now()}`),
          producto_id: String(srv.producto_id || ''),
          producto_nombre: products.find(p => String(p.id) === String(srv.producto_id))?.nombre || srv.producto_nombre || '',
          cantidad: Number(srv.cantidad_solicitada ?? srv.cantidad ?? 0),
          urgencia: (srv.urgencia as any) || 'normal',
          estado: (srv.estado as any) || 'pendiente',
          fecha: srv.fecha_solicitud || srv.fecha || new Date().toISOString(),
        })).sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setRequests(mapped);
      } else {
        setRequests(readStore<Request[]>('gf_requests', []));
      }
    } catch {
      setRequests(readStore<Request[]>('gf_requests', []));
      setApiAvailable(false);
    }
  }

  function createRequest() {
    if (!selectedProduct) return alert('Seleccione un producto');
    if (qty <= 0) return alert('Cantidad inválida');
    const prod = products.find(p => p.id === selectedProduct);
    if (!prod) return alert('Producto no encontrado');

    const newReq: Request = {
      id: `REQ-${Date.now()}`,
      producto_id: prod.id,
      producto_nombre: prod.nombre,
      cantidad: qty,
      urgencia: urgencia || 'normal',
      estado: 'pendiente',
      fecha: new Date().toISOString(),
    };

    const productoIdNum = Number(prod.id);
    if (Number.isNaN(productoIdNum)) {
      console.warn('Producto no sincronizado con el servidor (id no numérico), guardando solicitud localmente:', prod.id);
      setRequests(prev => [newReq, ...prev]);
      resetForm();
      return alert('Producto no sincronizado con servidor — solicitud guardada localmente');
    }

    if (!user) {
      console.warn('Usuario no autenticado: guardando solicitud local.');
      setRequests(prev => [newReq, ...prev]);
      resetForm();
      return alert('No hay sesión activa: solicitud guardada localmente');
    }

    const payload = {
      sucursal_id: Number(user.sucursal_id),
      solicitante_id: Number(user.id),
      producto_id: productoIdNum,
      cantidad_solicitada: Number(qty),
    };

    const invalid = Object.values(payload).some(v => v === null || v === undefined || Number.isNaN(Number(v)));
    if (invalid) {
      console.warn('Payload inválido, guardando localmente:', payload);
      setRequests(prev => [newReq, ...prev]);
      resetForm();
      return alert('Datos incompletos: solicitud guardada localmente.');
    }

    postSolicitud(payload)
      .then(res => {
        if (res.fromServer) {
          const srv = res.data as any;
            const mapped: Request = {
              id: String(srv.id || srv.ID || `REQ-${Date.now()}`),
              producto_id: String(srv.producto_id || srv.producto || payload.producto_id),
              producto_nombre: srv.producto_nombre || prod.nombre,
              cantidad: srv.cantidad_solicitada || srv.cantidad || payload.cantidad_solicitada,
              urgencia: (srv.urgencia as any) || 'normal',
              estado: srv.estado || 'pendiente',
              fecha: srv.fecha_solicitud || srv.fecha || new Date().toISOString(),
            };
          setRequests(prev => [mapped, ...prev]);
          resetForm();
          alert('Solicitud enviada con éxito');
        } else {
          console.warn('Fallo servidor, guardando local:', res.error);
          let msg = 'Servidor no disponible: solicitud guardada localmente';
          try {
            if (res.error && res.error.message) {
              try {
                const parsed = JSON.parse(res.error.message);
                msg = parsed.error || JSON.stringify(parsed) || msg;
              } catch (_) {
                msg = res.error.message;
              }
            }
          } catch {}
          setRequests(prev => [newReq, ...prev]);
          resetForm();
          alert(msg);
        }
      })
      .catch(err => {
        console.error('Error creando solicitud:', err);
        setRequests(prev => [newReq, ...prev]);
        resetForm();
        alert('Error inesperado. Solicitud guardada localmente.');
      });
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Solicitudes de Reabastecimiento</h1>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
          {!apiAvailable && (
            <div className="mb-3 text-sm text-orange-600">Servidor no disponible — usando datos locales</div>
          )}

          <div className="mb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Productos con stock bajo</h3>
              <div className="flex gap-2 items-center">
                <select value={filterEstado} onChange={e=>setFilterEstado(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="completada">Completada</option>
                </select>
                <Button variant="secondary" onClick={refreshAll}>Refrescar</Button>
              </div>
            </div>
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
            <div className="flex gap-2 items-end flex-wrap">
              <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="border rounded px-3 py-2 w-60">
                <option value="">Seleccione un producto</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.id})</option>)}
              </select>
              <input type="number" value={qty} min={1} onChange={e => setQty(Number(e.target.value))} className="border rounded px-3 py-2 w-24" />
              <select value={urgencia} onChange={e => setUrgencia(e.target.value)} className="border rounded px-3 py-2 w-32">
                <option value="">Normal</option>
                <option value="urgente">Urgente</option>
              </select>
              <Button onClick={createRequest}>Crear Solicitud</Button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Historial de solicitudes</h3>
            <div className="space-y-2">
              {filteredRequests.length === 0 && <div className="text-sm text-gray-600">Sin solicitudes para el filtro seleccionado</div>}
              {filteredRequests.map(r => (
                <div key={r.id} className="p-2 border rounded flex justify-between items-center">
                  <div>
                    <div className="font-medium">{r.producto_nombre} <span className="text-xs text-gray-500">{r.producto_id}</span></div>
                    <div className="text-sm text-gray-600">{r.cantidad} — {r.urgencia}</div>
                    <div className="text-xs text-gray-500">{new Date(r.fecha).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs ${r.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : r.estado === 'aprobada' ? 'bg-green-100 text-green-800' : r.estado === 'completada' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{r.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Reabastecimiento;
