import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import FormField from '../../components/FormField';

type SaleLine = { product: string; qty: number; price: number };
type Sale = { id: number; date: string; seller: string; branch: string; items: SaleLine[]; total: number };

const STORAGE_KEY = 'gf_sales';

const NewSale: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editingId = id && id !== 'nuevo' ? Number(id) : null;

  // simple form state
  const [items, setItems] = useState<SaleLine[]>([{ product: '', qty: 1, price: 0 }]);
  const [seller, setSeller] = useState('Vendedor');
  const [branch, setBranch] = useState('Sucursal 1');

  const total = items.reduce((s, it) => s + it.qty * it.price, 0);

  const updateLine = (index: number, patch: Partial<SaleLine>) => {
    setItems(curr => curr.map((it, i) => i === index ? { ...it, ...patch } : it));
  };

  const addLine = () => setItems(curr => [...curr, { product: '', qty: 1, price: 0 }]);
  const removeLine = (index: number) => setItems(curr => curr.filter((_, i) => i !== index));

  const save = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: Sale[] = raw ? JSON.parse(raw) : [];
    if (editingId) {
      const next = arr.map(s => s.id === editingId ? { ...s, items, total } : s);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      const entry: Sale = { id: Date.now(), date: new Date().toISOString(), seller, branch, items, total };
      arr.unshift(entry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }
    navigate('/employee/ventas');
  };

  const printTicket = () => {
    const content = `Ticket - ${new Date().toLocaleString()}\nVendedor: ${seller}\nSucursal: ${branch}\n\n` + items.map(i => `${i.qty} x ${i.product} @ ${i.price} = ${i.qty*i.price}`).join('\n') + `\n\nTotal: ${total}`;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (w) {
      w.document.write(`<pre>${content}</pre>`);
      w.document.close();
      w.print();
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{editingId ? 'Editar venta' : 'Nueva venta'}</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Vendedor" value={seller} onChange={setSeller} />
        <FormField label="Sucursal" value={branch} onChange={setBranch} />
      </div>

      <div className="mb-4">
        <h3 className="font-semibold mb-2">Items</h3>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="p-3 border rounded-lg bg-white flex items-end space-x-3">
              <div className="flex-1">
                <FormField label="Producto" value={it.product} onChange={(v) => updateLine(idx, { product: v })} />
              </div>
              <div className="w-32">
                <FormField label="Cantidad" type="number" value={String(it.qty)} onChange={(v) => updateLine(idx, { qty: Number(v) })} />
              </div>
              <div className="w-40">
                <FormField label="Precio" type="number" value={String(it.price)} onChange={(v) => updateLine(idx, { price: Number(v) })} />
              </div>
              <div className="w-16">
                <Button variant="danger" onClick={() => removeLine(idx)}>Quitar</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <Button onClick={addLine}>Agregar producto</Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-lg font-semibold">Total: {total}</div>
      </div>

      <div className="flex items-center space-x-3">
        <Button variant="primary" onClick={save}>Guardar</Button>
        <Button variant="secondary" onClick={printTicket}>Imprimir ticket</Button>
      </div>
    </div>
  );
};

export default NewSale;
