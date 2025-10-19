import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import { readStore, writeStore, seedIfEmpty } from '../../utils/localStore';
import { postVenta, fetchProducts } from '../../utils/api';

type Product = { id: string; nombre: string; descripcion?: string; cantidad: number; precio: number; ubicacion?: string; categoria?: string; stock_minimo?: number };
type CartItem = { productId: string; nombre: string; precio: number; qty: number };

const TAX_RATE = 0.16;

const PuntoDeVenta: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<'efectivo'|'tarjeta'|'transferencia'>('efectivo');

  useEffect(() => {
    seedIfEmpty();
    // try load from API first
    fetchProducts().then(res => {
      // detect if response is from fallback by checking localStorage presence
      const usingLocal = !window.navigator.onLine || (Array.isArray(res) && res.length === 0 && !!localStorage.getItem('gf_products'));
      setProducts(res as Product[]);
      if (usingLocal) setApiAvailable(false);
    }).catch(() => {
      setProducts(readStore<Product[]>('gf_products', []));
      setApiAvailable(false);
    });
  }, []);

  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    writeStore('gf_products', products);
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => p.nombre.toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q));
  }, [products, query]);

  function addToCart(p: Product) {
    if (p.cantidad <= 0) return alert('Sin stock');
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

  const subtotal = cart.reduce((s, it) => s + it.precio * it.qty, 0);
  const iva = subtotal * TAX_RATE;
  const total = subtotal + iva;

  function finalizeSale() {
    if (cart.length === 0) return alert('Carrito vacío');
    // Create folio
    const folio = `V-${Date.now()}`;
    const sale = { folio, fecha: new Date().toISOString(), items: cart, subtotal, iva, total, metodo_pago: method };
    // try server, fallback handled in helper
    postVenta({ folio, items: cart, subtotal, iva, total, metodo_pago: method })
      .then(() => {
        // ensure local copy updated
        const all = readStore<any[]>('gf_sales', []);
        all.unshift(sale);
        writeStore('gf_sales', all);
        const newProducts = products.map(p => {
          const it = cart.find(c => c.productId === p.id);
          if (!it) return p;
          return { ...p, cantidad: Math.max(0, p.cantidad - it.qty) };
        });
        setProducts(newProducts);
        setCart([]);
        alert(`Venta registrada. Folio: ${folio}`);
      })
      .catch(() => {
        alert('Error registrando venta en el servidor, guardada localmente');
      });
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
                {cart.map(it => (
                  <div key={it.productId} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{it.nombre}</div>
                      <div className="text-sm text-gray-600">${it.precio.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" value={it.qty} min={1} onChange={e => updateQty(it.productId, Number(e.target.value))} className="w-16 border rounded px-2 py-1 text-center" />
                      <Button variant="secondary" onClick={() => removeFromCart(it.productId)}>Eliminar</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm">
                <div>Subtotal: ${subtotal.toFixed(2)}</div>
                <div>IVA ({(TAX_RATE*100).toFixed(0)}%): ${iva.toFixed(2)}</div>
                <div className="font-semibold">Total: ${total.toFixed(2)}</div>
              </div>

              <div className="mt-3">
                <label className="block text-sm">Método de pago</label>
                <select value={method} onChange={e => setMethod(e.target.value as any)} className="w-full border rounded px-2 py-1">
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button onClick={finalizeSale}>Finalizar Venta</Button>
                <Button variant="secondary" onClick={() => setCart([])}>Vaciar</Button>
              </div>
            </aside>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PuntoDeVenta;
