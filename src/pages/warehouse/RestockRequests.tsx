import React, { useEffect, useState } from 'react';
import Button from '../../components/Button';
import FormField from '../../components/FormField';

const STORAGE_KEY = 'gf_restock_requests';

const RestockRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [prod, setProd] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    setRequests(raw ? JSON.parse(raw) : []);
  }, []);

  const save = () => {
    const next = [{ id: Date.now(), product: prod, qty, date: new Date().toISOString(), status: 'pending' }, ...requests];
    setRequests(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setProd(''); setQty(1);
  };

  const updateStatus = (id: number, status: string) => {
    const next = requests.map(r => r.id === id ? { ...r, status } : r);
    setRequests(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Solicitudes de reabastecimiento</h1>

      <div className="mb-4 bg-white p-4 rounded shadow-soft">
        <FormField label="Producto" value={prod} onChange={setProd} />
        <FormField label="Cantidad" type="number" value={String(qty)} onChange={(v) => setQty(Number(v))} />
        <div className="mt-3"><Button onClick={save}>Enviar solicitud</Button></div>
      </div>

      <div className="space-y-3">
        {requests.map(r => (
          <div key={r.id} className="p-3 bg-white rounded shadow-soft flex items-center justify-between">
            <div>
              <div className="font-semibold">{r.product}</div>
              <div className="text-sm">Cantidad: {r.qty} • Estado: {r.status}</div>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => updateStatus(r.id, 'sent')}>Marcar enviado</Button>
              <Button variant="danger" onClick={() => updateStatus(r.id, 'completed')}>Marcar completado</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestockRequests;
