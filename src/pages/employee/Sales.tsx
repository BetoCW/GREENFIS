import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Table from '../../components/Table';
import Button from '../../components/Button';

type SaleLine = { product: string; qty: number; price: number };
type Sale = {
  id: number;
  date: string;
  seller: string;
  branch: string;
  items: SaleLine[];
  total: number;
};

const STORAGE_KEY = 'gf_sales';

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    setSales(raw ? JSON.parse(raw) : []);
  }, []);

  const remove = (id: number) => {
    const next = sales.filter(s => s.id !== id);
    setSales(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'date', header: 'Fecha' },
    { key: 'seller', header: 'Vendedor' },
    { key: 'branch', header: 'Sucursal' },
    { key: 'total', header: 'Total' },
    { key: 'actions', header: 'Acciones', render: (_: any, row: Sale) => (
      <div className="flex items-center space-x-2">
        <Link to={`/employee/venta/${row.id}`} className="text-sm text-green-primary hover:underline">Ver / Editar</Link>
        <button onClick={() => remove(row.id)} className="text-sm text-red-500 hover:underline">Eliminar</button>
      </div>
    ) }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <Link to="/employee/venta/nuevo"><Button>Crear venta</Button></Link>
      </div>

      <Table columns={columns} data={sales} />
    </div>
  );
};

export default SalesPage;
