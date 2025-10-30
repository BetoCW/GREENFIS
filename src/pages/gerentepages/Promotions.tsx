import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { faker } from '@faker-js/faker';
import Button from '../../components/Button';
import Table from '../../components/Table';

interface Promotion {
  id: string;
  nombre: string;
  descripcion: string;
  idArticulo: string;
  nuevoPrecio: number;
  dia: string;
}

const Promotions: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<null | Promotion>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  useEffect(() => {
    fetchPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPromotions() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:4000/api/manager/promociones');
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      const mapped: Promotion[] = (Array.isArray(data) ? data : []).map((r: any) => ({
        id: String(r.id ?? r.id_promocion ?? ''),
        nombre: r.nombre ?? '',
        descripcion: r.descripcion ?? '',
        idArticulo: String(r.producto_id ?? r.idArticulo ?? ''),
        nuevoPrecio: Number(r.nuevo_precio ?? r.nuevoPrecio ?? 0),
        dia: r.dias_semana ? String(r.dias_semana).split(',')[0] : (r.dia ?? '')
      }));
      setPromotions(mapped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('fetchPromotions error', msg);
      setError(msg);
      // fallback to mock data so UI remains usable
      const dias = ['Lunes', 'Martes', 'Miércoles'];
      const mockPromotions: Promotion[] = Array.from({ length: 6 }, (_, i) => ({
        id: `PROMO-${(i + 1).toString().padStart(3, '0')}`,
        nombre: `${faker.commerce.productAdjective()} ${faker.commerce.productName()}`,
        descripcion: `Oferta especial de ${faker.commerce.department()}`,
        idArticulo: `ART-${faker.number.int({ min: 100, max: 999 })}`,
        nuevoPrecio: parseFloat(faker.commerce.price({ min: 50, max: 300 })),
        dia: faker.helpers.arrayElement(dias)
      }));
      setPromotions(mockPromotions);
    } finally {
      setIsLoading(false);
    }
  }

  async function createPromotion(payload: Partial<Promotion>) {
    try {
      const body = {
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        producto_id: payload.idArticulo,
        nuevo_precio: payload.nuevoPrecio,
        dias_semana: payload.dia
      };
      const res = await fetch('http://localhost:4000/api/manager/promociones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      await fetchPromotions();
      setShowForm(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }

  async function updatePromotion(id: string, payload: Partial<Promotion>) {
    try {
      const body = {
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        producto_id: payload.idArticulo,
        nuevo_precio: payload.nuevoPrecio,
        dias_semana: payload.dia
      };
      const res = await fetch(`http://localhost:4000/api/manager/promociones/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      await fetchPromotions();
      setEditing(null);
      setShowForm(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }

  async function removePromotion(id: string) {
    if (!confirm('¿Eliminar esta promoción?')) return;
    try {
      const res = await fetch(`http://localhost:4000/api/manager/promociones/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      await fetchPromotions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }

  const handleDeletePromotion = (id: string) => {
    // use API delete
    removePromotion(id);
  };

  const handleGeneratePDF = () => {
    alert('Generando reporte PDF de promociones...');
  };

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'nombre', header: 'Nombre' },
    { 
      key: 'descripcion', 
      header: 'Descripción',
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      )
    },
    { key: 'idArticulo', header: 'ID Artículo' },
    { 
      key: 'nuevoPrecio', 
      header: 'Nuevo Precio',
      render: (value: number) => (
        <span className="font-semibold text-success">
          ${value.toFixed(2)}
        </span>
      )
    },
    {
      key: 'dia',
      header: 'Día',
      render: (value: string) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          value === 'Lunes' 
            ? 'bg-green-primary text-white' 
            : value === 'Martes'
            ? 'bg-warning text-white'
            : 'bg-success text-white'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_value: any, row: Promotion) => (
        <div className="flex space-x-2">
          <button
            onClick={() => { setEditing(row); setShowForm(true); }}
            className="p-1 text-green-primary hover:bg-green-light rounded"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeletePromotion(row.id)}
            className="p-1 text-accent hover:bg-red-100 rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  // Simple form state
  const [form, setForm] = useState<Partial<Promotion>>({ nombre: '', descripcion: '', idArticulo: '', nuevoPrecio: 0, dia: '' });

  useEffect(() => {
    if (editing) setForm(editing);
    else setForm({ nombre: '', descripcion: '', idArticulo: '', nuevoPrecio: 0, dia: '' });
  }, [editing]);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text-dark">Promociones</h1>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={16} className="mr-2" />
            Nueva Promoción
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-dark mb-2">
              Gestión de Descuentos
            </h2>
            <p className="text-gray-600">
              Administre las promociones por días específicos
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
              <strong>Advertencia:</strong> {error}
            </div>
          )}

          {showForm && (
            <div className="mb-6 bg-gray-50 p-4 rounded border">
              <h3 className="font-semibold mb-2">{editing ? 'Editar Promoción' : 'Nueva Promoción'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <input className="p-2 border rounded" placeholder="Nombre" value={form.nombre ?? ''} onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))} />
                <input className="p-2 border rounded" placeholder="ID Artículo" value={form.idArticulo ?? ''} onChange={e => setForm(prev => ({ ...prev, idArticulo: e.target.value }))} />
                <input className="p-2 border rounded" placeholder="Nuevo Precio" type="number" value={String(form.nuevoPrecio ?? 0)} onChange={e => setForm(prev => ({ ...prev, nuevoPrecio: Number(e.target.value) }))} />
                <input className="p-2 border rounded" placeholder="Día (Lunes)" value={form.dia ?? ''} onChange={e => setForm(prev => ({ ...prev, dia: e.target.value }))} />
                <textarea className="p-2 border rounded col-span-2" placeholder="Descripción" value={form.descripcion ?? ''} onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))} />
              </div>
              <div className="mt-3 flex space-x-2">
                <Button onClick={async () => {
                  if (editing) await updatePromotion(editing.id, form);
                  else await createPromotion(form);
                }}>{isLoading ? 'Guardando...' : 'Guardar'}</Button>
                <Button onClick={() => { setShowForm(false); setEditing(null); }} variant="secondary">Cancelar</Button>
              </div>
            </div>
          )}

          <Table columns={columns} data={promotions} />

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-medium">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-primary rounded-full"></div>
                <span>Lunes</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-warning rounded-full"></div>
                <span>Martes</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span>Miércoles</span>
              </div>
            </div>
            <Button onClick={handleGeneratePDF} variant="secondary">
              <FileText size={16} className="mr-2" />
              Generar PDF
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Promotions;
