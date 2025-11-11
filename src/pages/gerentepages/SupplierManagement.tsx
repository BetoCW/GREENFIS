import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import Table from '../../components/Table';
import FormField from '../../components/FormField';
import { fetchProveedores, createProveedor, updateProveedor, deleteProveedorHard } from '../../utils/api';

interface Supplier {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  descripcion?: string;
  activo?: number;
}


const SupplierManagement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [editing, setEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProveedores();
      const data = res.data ?? [];
      const mapped: Supplier[] = (Array.isArray(data) ? data : []).map((r: any) => ({
        id: String(r.id ?? r.id_proveedor ?? r.ID ?? r.id ?? `PV-${Date.now()}`),
        nombre: r.nombre ?? r.NOMBRE ?? '',
        contacto: r.contacto ?? r.CONTACTO ?? r.contacto ?? '',
        telefono: r.telefono ?? r.TELEFONO ?? r.telefono ?? '',
        correo: r.correo ?? r.CORREO ?? r.correo ?? '',
        direccion: r.direccion ?? r.DIRECCION ?? r.direccion ?? '',
        descripcion: r.descripcion ?? r.DESCRIPCION ?? '',
        activo: typeof r.activo !== 'undefined' ? Number(r.activo) : 1
      }));
      setSuppliers(mapped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError('No fue posible cargar proveedores: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  function validate(item: Partial<Supplier>) {
    if (!item.nombre || !String(item.nombre).trim()) return 'El nombre es requerido';
    if (item.correo && !/^\S+@\S+\.\S+$/.test(item.correo)) return 'El correo no tiene formato válido';
    if (item.telefono && !/^\+?[0-9\s-]{6,20}$/.test(item.telefono)) return 'Teléfono inválido';
    return null;
  }

  async function handleSave() {
    if (!editingItem) return;
    const err = validate(editingItem);
    if (err) return alert(err);

    // If item has id that exists -> update, otherwise create
    const isNew = !editingItem.id || !suppliers.find(s => s.id === editingItem.id);

    try {
      if (isNew) {
        const payload = { ...editingItem };
        const res = await createProveedor(payload);
        const created = res.data ?? null;
        const toAdd: Supplier = { id: String(created?.id ?? created?.ID ?? created?.id_proveedor ?? editingItem.id ?? `PV-${Date.now()}`), nombre: created?.nombre ?? editingItem.nombre ?? '', contacto: created?.contacto ?? editingItem.contacto, telefono: created?.telefono ?? editingItem.telefono, correo: created?.correo ?? editingItem.correo, direccion: created?.direccion ?? editingItem.direccion, descripcion: created?.descripcion ?? editingItem.descripcion, activo: created?.activo ?? 1 };
        const next = [toAdd, ...suppliers];
        setSuppliers(next);
        setEditing(false);
        setEditingItem(null);
        return;
      } else {
        const id = editingItem.id;
        const payload = { nombre: editingItem.nombre, contacto: editingItem.contacto, telefono: editingItem.telefono, correo: editingItem.correo, direccion: editingItem.direccion, descripcion: editingItem.descripcion, activo: editingItem.activo ?? 1 };
  await updateProveedor(id, payload);
        // even if res.ok is false, the helper already applied fallback; update UI optimistically
        const next = suppliers.map(s => (s.id === id ? { ...s, ...payload } : s));
        setSuppliers(next);
        setEditing(false);
        setEditingItem(null);
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('Error al guardar proveedor: ' + msg);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Está seguro de eliminar este proveedor?')) return;
    try {
  await deleteProveedorHard(id);
      // update UI regardless of res.ok (helper handles fallback)
      const next = suppliers.filter(s => s.id !== id);
      setSuppliers(next);
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('Error al eliminar: ' + msg);
    }
  }

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'nombre', header: 'Empresa' },
    { key: 'contacto', header: 'Contacto' },
    { key: 'telefono', header: 'Teléfono', render: (v: any) => (<span className="flex items-center space-x-2"><Phone size={14} /> <span>{v}</span></span>) },
    { key: 'correo', header: 'Correo', render: (v: any) => (<span className="flex items-center space-x-2"><Mail size={14} /> <span>{v}</span></span>) },
    { key: 'direccion', header: 'Dirección' },
    { key: 'descripcion', header: 'Descripción' },
    { key: 'actions', header: 'Acciones', render: (_: any, row: Supplier) => (
      <div className="flex space-x-2">
        <button className="p-1 text-green-primary hover:bg-green-light rounded" onClick={() => { setEditingItem(row); setEditing(true); }}><Edit size={16} /></button>
        <button className="p-1 text-accent hover:bg-red-100 rounded" onClick={() => handleDelete(row.id)}><Trash2 size={16} /></button>
      </div>
    ) }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text-dark">Gestión de Proveedores</h1>
          <div className="flex items-center space-x-3">
            <Button onClick={() => { setEditingItem({ id: '', nombre: '', contacto: '', telefono: '', correo: '', direccion: '', descripcion: '', activo: 1 }); setEditing(true); }}>
              <Plus size={16} className="mr-2" /> Nuevo Proveedor
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-6 border border-gray-medium">
          <div className="mb-4">
            <p className="text-gray-600">Administre los proveedores: agregar, editar y eliminar. Las notificaciones/confirmaciones automáticas no están implementadas (manuales por teléfono/email).</p>
          </div>

          {error && (<div className="mb-4 p-3 rounded border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">{error}</div>)}

          {loading ? (<div className="py-8 text-center text-gray-600">Cargando proveedores...</div>) : (<Table columns={columns} data={suppliers} />)}
        </div>
      </motion.div>

      {/* Modal */}
      {editing && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingItem.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button onClick={() => { setEditing(false); setEditingItem(null); }} className="text-gray-500">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Nombre" value={editingItem.nombre || ''} onChange={(v) => setEditingItem({ ...editingItem, nombre: v } as Supplier)} required />
              <FormField label="Contacto" value={editingItem.contacto || ''} onChange={(v) => setEditingItem({ ...editingItem, contacto: v } as Supplier)} />
              <FormField label="Teléfono" value={editingItem.telefono || ''} onChange={(v) => setEditingItem({ ...editingItem, telefono: v } as Supplier)} />
              <FormField label="Correo" type="email" value={editingItem.correo || ''} onChange={(v) => setEditingItem({ ...editingItem, correo: v } as Supplier)} />
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-text-dark mb-2">Dirección</label>
                <textarea className="w-full px-3 py-2 border border-gray-medium rounded-lg" value={editingItem.direccion || ''} onChange={(e) => setEditingItem({ ...editingItem, direccion: e.target.value } as Supplier)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-text-dark mb-2">Descripción</label>
                <textarea className="w-full px-3 py-2 border border-gray-medium rounded-lg" value={editingItem.descripcion || ''} onChange={(e) => setEditingItem({ ...editingItem, descripcion: e.target.value } as Supplier)} />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="secondary" onClick={() => { setEditing(false); setEditingItem(null); }}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
