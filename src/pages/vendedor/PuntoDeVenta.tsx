import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import { readStore, writeStore, seedIfEmpty } from '../../utils/localStore';
import { postVenta, fetchProducts, fetchInventoryWithStatus, createDevolucionAlmacen, fetchPromocionesFiltered } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

type Product = { id: string; nombre: string; descripcion?: string; cantidad: number; precio: number; ubicacion?: string; categoria?: string; stock_minimo?: number };
type CartItem = { productId: string; nombre: string; precio: number; qty: number };
type Promotion = { id: number; nombre: string; descripcion?: string; producto_id: number; tipo: 'descuento_porcentaje'|'descuento_fijo'|'2x1'|'3x2'; valor_descuento?: number|null; nuevo_precio?: number|null; fecha_inicio?: string; fecha_fin?: string; dias_semana?: string; aplica_todas_sucursales?: boolean; activa?: boolean };

const TAX_RATE = 0.16;

const PuntoDeVenta: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<'efectivo'|'tarjeta'|'transferencia'>('efectivo');
  const [lastSale, setLastSale] = useState<{ id?: number; folio: string; items: CartItem[] } | null>(null);
  const [returnForm, setReturnForm] = useState<{ productId: string; qty: string; motivo: string; ventaId?: string }>({ productId: '', qty: '', motivo: '', ventaId: '' });

  const [apiAvailable, setApiAvailable] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    seedIfEmpty();
    // INVENTARIO / PRODUCTOS
    if (user && user.sucursal_id) {
      fetchInventoryWithStatus(Number(user.sucursal_id)).then(res => {
        setProducts(res.data as Product[]);
        if (!res.ok) setApiAvailable(false);
      }).catch(() => {
        setProducts(readStore<Product[]>('gf_products', []));
        setApiAvailable(false);
      });
    } else {
      fetchProducts().then(res => { setProducts(res as Product[]); }).catch(() => setProducts(readStore<Product[]>('gf_products', [])));
    }
    // PROMOCIONES ACTIVAS (se filtran luego por fecha / día)
    fetchPromocionesFiltered({ activa: true }).then(r => {
      if (r.ok && Array.isArray(r.data)) setPromotions(r.data as Promotion[]);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    writeStore('gf_products', products);
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => p.nombre.toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q));
  }, [products, query]);

  function addToCart(p: Product) {
    const stock = Number(p.cantidad ?? 0);
    if (Number.isNaN(stock) || stock <= 0) return alert('Sin stock');
    setCart(prev => {
      const exists = prev.find(it => it.productId === p.id);
      if (exists) return prev.map(it => it.productId === p.id ? { ...it, qty: it.qty + 1 } : it);
      return [...prev, { productId: p.id, nombre: p.nombre, precio: p.precio, qty: 1 }];
    });
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) return removeFromCart(productId);
    setCart(prev => prev.map(it => it.productId === productId ? { ...it, qty } : it));
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(it => it.productId !== productId));
  }

  // ---- Promociones: filtrado de vigencia y cálculo de mejores descuentos ----
  const today = new Date();
  const dayName = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][today.getDay()];

  function promoVigente(p: Promotion): boolean {
    if (!p.activa) return false;
    const inicio = p.fecha_inicio ? new Date(p.fecha_inicio) : undefined;
    const fin = p.fecha_fin ? new Date(p.fecha_fin) : undefined;
    if (inicio && today < inicio) return false;
    if (fin && today > fin) return false;
    if (p.dias_semana && p.dias_semana.trim()) {
      const dias = p.dias_semana.split(',').map(d=>d.trim()).filter(Boolean);
      if (dias.length && !dias.includes(dayName)) return false;
    }
    // Sucursal: si no aplica_todas y existe usuario con sucursal, asumimos promociones globales por ahora (podría agregarse campo sucursal en futuro)
    return true;
  }

  const vigentesPorProducto = useMemo(() => {
    const map: Record<string, Promotion[]> = {};
    promotions.forEach(p => {
      if (!promoVigente(p)) return;
      const key = String(p.producto_id);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [promotions]);

  function computeBestPromotion(prod: Product, qty: number): { applied?: Promotion; effectiveUnit: number; total: number; savings: number } {
    const baseTotal = prod.precio * qty;
    const promos = vigentesPorProducto[prod.id] || [];
    let best = { applied: undefined as Promotion|undefined, effectiveUnit: prod.precio, total: baseTotal, savings: 0 };
    promos.forEach(p => {
      let total = baseTotal;
      let effectiveUnit = prod.precio;
      if (p.tipo === 'descuento_porcentaje') {
        const valor = Number(p.valor_descuento || 0);
        effectiveUnit = prod.precio * (1 - valor/100);
        total = effectiveUnit * qty;
      } else if (p.tipo === 'descuento_fijo') {
        const valor = Number(p.valor_descuento || 0);
        effectiveUnit = Math.max(0, prod.precio - valor);
        total = effectiveUnit * qty;
      } else if (p.tipo === '2x1') {
        const free = Math.floor(qty/2);
        total = prod.precio * (qty - free);
        effectiveUnit = total / qty;
      } else if (p.tipo === '3x2') {
        const free = Math.floor(qty/3);
        total = prod.precio * (qty - free);
        effectiveUnit = total / qty;
      }
      const savings = baseTotal - total;
      if (savings > best.savings + 0.0001) {
        best = { applied: p, effectiveUnit, total, savings };
      }
    });
    return best;
  }

  const cartWithPromos = useMemo(() => {
    return cart.map(it => {
      const prod = products.find(p => p.id === it.productId);
      if (!prod) return { ...it, effectiveUnit: it.precio, total: it.precio * it.qty, savings: 0, promotion: undefined as Promotion|undefined };
      const best = computeBestPromotion(prod, it.qty);
      return { ...it, effectiveUnit: best.effectiveUnit, total: best.total, savings: best.savings, promotion: best.applied };
    });
  }, [cart, products, vigentesPorProducto]);

  const subtotal = cartWithPromos.reduce((s, it) => s + it.total, 0);
  const iva = subtotal * TAX_RATE;
  const total = subtotal + iva;
  const totalSavings = cartWithPromos.reduce((s,it)=>s+it.savings,0);

  async function finalizeSale() {
    if (cart.length === 0) return alert('Carrito vacío');

    // Minimal payload
    const folio = `V-${Date.now()}`;
    const items = cartWithPromos.map(it => ({ producto_id: Number(it.productId), cantidad: Number(it.qty), precio_unitario: Number(it.effectiveUnit) }));
    const payload = { folio, vendedor_id: Number(user?.id ?? 0), sucursal_id: Number(user?.sucursal_id ?? 0), items, subtotal, iva, total, metodo_pago: method };

    // basic client-side checks
    if (!payload.vendedor_id || !payload.sucursal_id) {
      // fallback local
      const sale = { folio, fecha: new Date().toISOString(), items: cartWithPromos, subtotal, iva, total, metodo_pago: method, savings: totalSavings };
      const all = readStore<any[]>('gf_sales', []);
      all.unshift(sale);
      writeStore('gf_sales', all);
      setProducts(products.map(p => {  
        const it = cart.find(c => c.productId === p.id);
        if (!it) return p;
        return { ...p, cantidad: Math.max(0, p.cantidad - it.qty) };
      }));
      setCart([]);
      return alert('Usuario no autenticado: venta registrada localmente');
    }

    try {
      const res = await postVenta(payload, payload.vendedor_id, payload.sucursal_id);
      const sale = { folio, fecha: new Date().toISOString(), items: cartWithPromos, subtotal, iva, total, metodo_pago: method, savings: totalSavings };
      const all = readStore<any[]>('gf_sales', []);
      all.unshift(sale);
      writeStore('gf_sales', all);
      setProducts(products.map(p => {
        const it = cart.find(c => c.productId === p.id);
        if (!it) return p;
        return { ...p, cantidad: Math.max(0, p.cantidad - it.qty) };
      }));
      setLastSale({ id: res?.id, folio, items: cart });
      setCart([]);
      alert('Venta registrada.');
    } catch (err) {
      console.error('postVenta error', err);
      alert('Error registrando venta en el servidor, guardada localmente');
    }
  }

  async function enviarDevolucion() {
    const pid = Number(returnForm.productId);
    const qty = Number(returnForm.qty);
    if (!pid || !qty || qty <= 0) return alert('Seleccione producto y cantidad > 0');
    if (!returnForm.motivo.trim()) return alert('Indique el motivo de la devolución');
    try {
      const sucursal_id = Number(user?.sucursal_id || 0) || undefined;
      const manualVentaId = returnForm.ventaId ? Number(returnForm.ventaId) : undefined;
      const venta_id = manualVentaId && manualVentaId > 0 ? manualVentaId : (lastSale?.id);
      await createDevolucionAlmacen({ producto_id: pid, sucursal_id, cantidad: qty, motivo: returnForm.motivo.trim(), tipo: 'cliente', creado_por: user?.id, venta_id });
      alert('Devolución enviada al almacén');
      setReturnForm({ productId: '', qty: '', motivo: '', ventaId: '' });
    } catch (e) {
      console.error('createDevolucionAlmacen error', e);
      alert('No se pudo registrar la devolución');
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-dark">Punto de Venta</h1>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 border border-gray-medium">
          {/* Buscador rápido */}
          <div className="mb-4 flex gap-3">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre o código" className="flex-1 border rounded px-3 py-2" />
            <Button variant="secondary" onClick={() => setQuery('')}>Limpiar</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-2">Productos</h3>
              {!apiAvailable && <div className="mb-2 text-sm text-orange-600">Servidor no disponible — mostrando datos locales</div>}
              <div className="overflow-auto max-h-96">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className="py-2">ID</th>
                      <th>Producto</th>
                      <th>Stock</th>
                      <th>Precio</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} className="border-t">
                        <td className="py-2">{p.id}</td>
                        <td>
                          <div className="font-medium">{p.nombre}</div>
                          <div className="text-sm text-gray-600">{p.descripcion}</div>
                        </td>
                        <td><span className={`px-2 py-1 rounded-full text-xs font-medium ${p.cantidad === 0 ? 'bg-red-100 text-red-800' : p.cantidad <= (p.stock_minimo||0) ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{p.cantidad}</span></td>
                        <td>${p.precio.toFixed(2)}</td>
                        <td><Button onClick={() => addToCart(p)}>Agregar</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="bg-gray-50 p-3 rounded border">
              <h3 className="font-semibold mb-2">Carrito</h3>
              <div className="space-y-2 max-h-64 overflow-auto">
                {cartWithPromos.map(it => (
                  <div key={it.productId} className="flex items-start justify-between gap-2 border-b pb-2">
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {it.nombre}
                        {it.promotion && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                            {it.promotion.tipo === 'descuento_porcentaje' && `-${it.promotion.valor_descuento}%`}
                            {it.promotion.tipo === 'descuento_fijo' && `- $${it.promotion.valor_descuento}`}
                            {it.promotion.tipo === '2x1' && '2x1'}
                            {it.promotion.tipo === '3x2' && '3x2'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">Precio base: ${it.precio.toFixed(2)}</div>
                      {it.savings > 0 && (
                        <div className="text-xs text-green-700">Ahorro: ${it.savings.toFixed(2)} | Unit: ${it.effectiveUnit.toFixed(2)}</div>
                      )}
                      {!it.promotion && <div className="text-xs text-gray-500">Sin promoción</div>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <input type="number" value={it.qty} min={1} onChange={e => updateQty(it.productId, Number(e.target.value))} className="w-16 border rounded px-2 py-1 text-center" />
                      <Button variant="secondary" onClick={() => removeFromCart(it.productId)}>Eliminar</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm">
                <div>Subtotal (promos): ${subtotal.toFixed(2)}</div>
                <div>IVA ({(TAX_RATE*100).toFixed(0)}%): ${iva.toFixed(2)}</div>
                <div className="font-semibold">Total: ${total.toFixed(2)}</div>
                {totalSavings > 0 && <div className="text-xs text-green-700 mt-1">Ahorro total: ${totalSavings.toFixed(2)}</div>}
              </div>

              <div className="mt-3">
                <label className="block text-sm">Método de pago</label>
                <select value={method} onChange={e => setMethod(e.target.value as any)} className="w-full border rounded px-2 py-1">
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button onClick={finalizeSale}>Finalizar Venta</Button>
                <Button variant="secondary" onClick={() => setCart([])}>Vaciar</Button>
              </div>

              <div className="mt-6 border-t pt-4">
                <h4 className="font-semibold mb-2">Registrar devolución</h4>
                {lastSale && (
                  <div className="text-xs text-gray-600 mb-2">Última venta: Folio {lastSale.folio} {lastSale.id ? `(ID ${lastSale.id})` : ''}</div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-sm">Producto</label>
                  <select className="border rounded px-2 py-1" value={returnForm.productId} onChange={e=>setReturnForm(f=>({ ...f, productId: e.target.value }))}>
                    <option value="">Seleccione</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  <label className="text-sm">Cantidad a devolver</label>
                  <input className="border rounded px-2 py-1" value={returnForm.qty} onChange={e=>setReturnForm(f=>({ ...f, qty: e.target.value }))} placeholder="0" />
                  <label className="text-sm">Motivo</label>
                  <input className="border rounded px-2 py-1" value={returnForm.motivo} onChange={e=>setReturnForm(f=>({ ...f, motivo: e.target.value }))} placeholder="Defecto, caducidad, otro" />
                  <label className="text-sm">ID de venta (opcional)</label>
                  <input className="border rounded px-2 py-1" value={returnForm.ventaId} onChange={e=>setReturnForm(f=>({ ...f, ventaId: e.target.value }))} placeholder="Ej: 12345" />
                  <Button onClick={enviarDevolucion}>Enviar devolución</Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PuntoDeVenta;
