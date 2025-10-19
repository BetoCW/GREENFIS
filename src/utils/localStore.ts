export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('writeStore error', e);
  }
}

export function seedIfEmpty() {
  const existing = readStore('gf_products', null as any);
  if (!existing) {
    const sample = [
      { id: 'P-001', nombre: 'Café Molido 250g', descripcion: 'Café arábica', cantidad: 25, precio: 69.5, ubicacion: 'Estante A1', categoria: 'Alimentos', stock_minimo: 5 },
      { id: 'P-002', nombre: 'Jugo Naranja 1L', descripcion: 'Jugo natural', cantidad: 8, precio: 39.9, ubicacion: 'Estante B2', categoria: 'Alimentos', stock_minimo: 10 },
      { id: 'P-003', nombre: 'Cepillo de Dientes', descripcion: 'Cepillo dental', cantidad: 0, precio: 19.0, ubicacion: 'Estante C1', categoria: 'Hogar', stock_minimo: 3 }
    ];
    writeStore('gf_products', sample);
  }
  const promos = readStore('gf_promotions', null as any);
  if (!promos) {
    writeStore('gf_promotions', []);
  }
  const sales = readStore('gf_sales', null as any);
  if (!sales) writeStore('gf_sales', []);
  const reqs = readStore('gf_requests', null as any);
  if (!reqs) writeStore('gf_requests', []);
}
