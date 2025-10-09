import React, { useEffect, useState } from 'react';
import Table from '../../components/Table';
import Button from '../../components/Button';
import FormField from '../../components/FormField';

type Product = {
  id: number;
  name: string;
  sku?: string;
  stock: Record<string, number>; // branch -> qty
};

const STORAGE_KEY = 'gf_inventory';

const InventoryManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [branch, setBranch] = useState('Sucursal 1');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    setProducts(raw ? JSON.parse(raw) : []);
  }, []);

  const saveAll = (next: Product[]) => {
    setProducts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const remove = (id: number) => saveAll(products.filter(p => p.id !== id));

  const startNew = () => setEditing({ id: Date.now(), name: '', sku: '', stock: {} });

  const save = () => {
    if (!editing) return;
    const exists = products.find(p => p.id === editing.id);
    const next = exists ? products.map(p => p.id === editing.id ? editing : p) : [editing, ...products];
    saveAll(next);
    setEditing(null);
  };

  const adjustStock = (id: number, branch: string, qty: number) => {
    const next = products.map(p => {
      if (p.id !== id) return p;
      const nextStock = { ...(p.stock || {}) };
      nextStock[branch] = (nextStock[branch] || 0) + qty;
      return { ...p, stock: nextStock };
    });
    saveAll(next);
  };

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Nombre' },
    { key: 'sku', header: 'SKU' },
    { key: 'stock', header: 'Stock (por sucursal)', render: (_: any, row: Product) => (
      <div>
        {Object.entries(row.stock || {}).map(([b, q]) => (
          <div key={b} className="text-sm">{b}: {q}</div>
        ))}
      </div>
    )},
    { key: 'actions', header: 'Acciones', render: (_: any, row: Product) => (
      <div className="flex items-center space-x-2">
        <button onClick={() => setEditing(row)} className="text-sm text-green-primary hover:underline">Editar</button>
        <button onClick={() => remove(row.id)} className="text-sm text-red-500 hover:underline">Eliminar</button>
      </div>
    )}
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <div className="flex items-center space-x-3">
          <div>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="px-3 py-2 border rounded">
              <option>Sucursal 1</option>
              <option>Sucursal 2</option>
              <option>Sucursal 3</option>
            </select>
          </div>
          <Button onClick={startNew}>Nuevo producto</Button>
        </div>
      </div>

      {editing ? (
        <div className="mb-4 bg-white p-4 rounded shadow-soft">
          <FormField label="Nombre" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
          <FormField label="SKU" value={editing.sku || ''} onChange={(v) => setEditing({ ...editing, sku: v })} />
          <div className="flex items-center space-x-3">
            <FormField label={`Stock ajuste para ${branch}`} type="number" value={String((editing.stock && editing.stock[branch])||0)} onChange={(v) => setEditing({ ...editing, stock: { ...(editing.stock||{}), [branch]: Number(v) } })} />
          </div>
          <div className="flex items-center space-x-3 mt-3">
            <Button onClick={save}>Guardar</Button>
            <Button variant="danger" onClick={() => setEditing(null)}>Cancelar</Button>
          </div>
        </div>
      ) : null}

      <Table columns={columns} data={products} />

      <div className="mt-6 bg-white p-4 rounded shadow-soft">
        <h3 className="font-semibold mb-2">Ajustar stock rápido</h3>
        <div className="flex items-center space-x-2">
          <select id="prodSel" className="px-3 py-2 border rounded">
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select id="branchSel" className="px-3 py-2 border rounded">
            <option>Sucursal 1</option>
            <option>Sucursal 2</option>
            <option>Sucursal 3</option>
          </select>
          <input id="qtyAdj" type="number" defaultValue={1} className="px-3 py-2 border rounded w-24" />
          <Button onClick={() => {
            const pid = Number((document.getElementById('prodSel') as HTMLSelectElement).value);
            const br = (document.getElementById('branchSel') as HTMLSelectElement).value;
            const q = Number((document.getElementById('qtyAdj') as HTMLInputElement).value);
            adjustStock(pid, br, q);
          }}>Aplicar</Button>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
