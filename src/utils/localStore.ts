export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function seedIfEmpty() {
  // Seed products
  const productsKey = 'gf_products';
  const promosKey = 'gf_promotions';
  const salesKey = 'gf_sales';
  const providersKey = 'gf_providers';
  if (!localStorage.getItem(productsKey)) {
    const sampleProducts = Array.from({ length: 12 }, (_, i) => ({
      id: `P-${(i+1).toString().padStart(3,'0')}`,
      nombre: `Producto ${(i+1)}`,
      descripcion: `Descripción del producto ${(i+1)}`,
      cantidad: Math.floor(Math.random()*80),
      precio: Math.round((10 + Math.random()*200) * 100) / 100,
      ubicacion: ['Sucursal Centro','Sucursal Norte','Almacén A','Almacén B'][i % 4],
      categoria: ['Bebidas','Snacks','Limpieza','Higiene'][i % 4],
      stock_minimo: [5,10,15][i % 3]
    }));
    writeStore(productsKey, sampleProducts);
  }
  if (!localStorage.getItem(promosKey)) {
    const samplePromos = [
      { id: 'PR-001', nombre: '2x1 en Snacks', descripcion: 'Promoción válida esta semana', tipo: 'descuento', valor_descuento: 10 },
      { id: 'PR-002', nombre: '-15% Bebidas', descripcion: 'Descuento en todas las bebidas', tipo: 'porcentaje', valor_descuento: 15 }
    ];
    writeStore(promosKey, samplePromos);
  }
  if (!localStorage.getItem(salesKey)) {
    writeStore(salesKey, []);
  }
  if (!localStorage.getItem(providersKey)) {
    const sampleProviders = [
      { id: 1, nombre: 'Proveedor Centro', contacto: 'Ana Pérez', telefono: '555-100-2000', correo: 'contacto@prov-centro.com', direccion: 'Av. Centro 123', activo: true, creado_por: 1 },
      { id: 2, nombre: 'Distribuciones Norte', contacto: 'Juan López', telefono: '555-300-4000', correo: 'ventas@norte.mx', direccion: 'Calle Norte 456', activo: true, creado_por: 1 }
    ];
    writeStore(providersKey, sampleProviders);
  }
}
