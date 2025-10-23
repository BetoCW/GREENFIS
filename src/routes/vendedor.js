import express from 'express';
import { poolPromise, sql } from '../database/connection.js';

const router = express.Router();

// Products read-only for vendedor (for selecting during sale)
router.get('/productos', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT id, codigo_barras, nombre, precio, activo FROM productos WHERE activo = 1');
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Inventario de tienda (consulta por sucursal)
router.get('/inventario', async (req, res) => {
  try {
    const { sucursal_id } = req.query;
    const pool = await poolPromise;
    // Usar la vista vw_productos_stock para simplificar la consulta
    const sId = Number(sucursal_id);
    if (Number.isNaN(sId)) return res.status(400).json({ error: 'sucursal_id inválido' });
    const q = 'SELECT id AS producto_id, nombre, precio, sucursal_id, cantidad, stock_minimo, estado_stock FROM vw_productos_stock WHERE sucursal_id = @sucursal_id';
    const result = await pool.request().input('sucursal_id', sql.Int, sId).query(q);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Inventario (vista) — devuelve inventario de todas las sucursales usando vw_inventario_tienda
// Este endpoint es específico para la página InventoryStore y no filtra por sucursal
router.get('/inventario/vw', async (req, res) => {
  try {
    const pool = await poolPromise;
    // Mapear columnas de la vista a campos en minúsculas que espera el frontend
    const q = `
      SELECT 
        ID AS id,
        Nombre AS nombre,
        COALESCE([Ubicación], 'Sin ubicación') AS ubicacion,
        Stock AS cantidad,
        Precio AS precio
      FROM vw_inventario_tienda
    `;
    const result = await pool.request().query(q);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear solicitud de reabastecimiento desde vendedor
router.post('/solicitudes', async (req, res) => {
  try {
    console.log('POST /api/vendedor/solicitudes body:', JSON.stringify(req.body));
    const { sucursal_id, solicitante_id, producto_id, cantidad_solicitada } = req.body;
    // Basic validation
    if (sucursal_id == null || solicitante_id == null || producto_id == null || cantidad_solicitada == null) {
      return res.status(400).json({ error: 'sucursal_id, solicitante_id, producto_id y cantidad_solicitada son requeridos' });
    }

    // Coerce to numbers (SQL expects INT FKs)
    const sId = Number(sucursal_id);
    const solicitanteId = Number(solicitante_id);
    const productoId = Number(producto_id);
    const cantidad = Number(cantidad_solicitada);

    if ([sId, solicitanteId, productoId, cantidad].some(v => Number.isNaN(v))) {
      return res.status(400).json({ error: 'Los campos sucursal_id, solicitante_id, producto_id y cantidad_solicitada deben ser números válidos' });
    }

    const pool = await poolPromise;

    // Validate foreign keys exist to give a clearer error than SQL FK violation
    const check = pool.request();
    // check sucursal
    const suc = await check.input('sId', sql.Int, sId).query('SELECT 1 FROM sucursales WHERE id_sucursal = @sId');
    if (!suc.recordset.length) return res.status(400).json({ error: `Sucursal ${sId} no encontrada` });
    // check solicitante (usuarios.id_usuario)
    const sol = await pool.request().input('solicitanteId', sql.Int, solicitanteId).query('SELECT 1 FROM usuarios WHERE id_usuario = @solicitanteId');
    if (!sol.recordset.length) return res.status(400).json({ error: `Solicitante ${solicitanteId} no encontrado` });
    // check producto
    const prod = await pool.request().input('productoId', sql.Int, productoId).query('SELECT 1 FROM productos WHERE id = @productoId');
    if (!prod.recordset.length) return res.status(400).json({ error: `Producto ${productoId} no encontrado` });

    const request = pool.request();
    const result = await request
      .input('sucursal_id', sql.Int, sId)
      .input('solicitante_id', sql.Int, solicitanteId)
      .input('producto_id', sql.Int, productoId)
      .input('cantidad_solicitada', sql.Int, cantidad)
      .query('INSERT INTO solicitudes_reabastecimiento (sucursal_id, solicitante_id, producto_id, cantidad_solicitada) OUTPUT INSERTED.* VALUES (@sucursal_id,@solicitante_id,@producto_id,@cantidad_solicitada)');
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Procesar venta completa: inserta en ventas y detalle_ventas, decrementa inventario_tienda
router.post('/ventas', async (req, res) => {
  let tx;
  try {
    console.log('POST /api/vendedor/ventas body:', JSON.stringify(req.body));
    const { folio, vendedor_id, sucursal_id, items, subtotal, iva, total, metodo_pago } = req.body;
    // Basic validation
    if (!folio || vendedor_id == null || sucursal_id == null || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'folio, vendedor_id, sucursal_id e items (no vacío) son requeridos' });
    }

    // coerce numerical values and validate
    const vendedorId = Number(vendedor_id);
    const sucId = Number(sucursal_id);
    if (Number.isNaN(vendedorId) || Number.isNaN(sucId)) return res.status(400).json({ error: 'vendedor_id y sucursal_id deben ser números válidos' });

    const pool = await poolPromise;

    // Validate FK existence before starting transaction to fail fast
    const vcheck = await pool.request().input('vendedorId', sql.Int, vendedorId).query('SELECT 1 FROM usuarios WHERE id_usuario = @vendedorId AND activo = 1');
    if (!vcheck.recordset.length) return res.status(400).json({ error: `Vendedor ${vendedorId} no encontrado o inactivo` });
    const scheck = await pool.request().input('sucId', sql.Int, sucId).query('SELECT 1 FROM sucursales WHERE id_sucursal = @sucId AND activo = 1');
    if (!scheck.recordset.length) return res.status(400).json({ error: `Sucursal ${sucId} no encontrada o inactiva` });

    // Begin transaction
    tx = pool.transaction();
    await tx.begin();
    const r = tx.request();

    // Insert venta with typed parameters
    const insertVenta = await r
      .input('folio', sql.VarChar(50), String(folio))
      .input('vendedor_id', sql.Int, vendedorId)
      .input('sucursal_id', sql.Int, sucId)
      .input('total', sql.Decimal(10,2), Number(total ?? 0))
      .input('subtotal', sql.Decimal(10,2), Number(subtotal ?? 0))
      .input('iva', sql.Decimal(10,2), Number(iva ?? 0))
      .input('metodo_pago', sql.VarChar(20), String(metodo_pago ?? 'efectivo'))
      .query('INSERT INTO ventas (folio, vendedor_id, sucursal_id, total, subtotal, iva, metodo_pago) OUTPUT INSERTED.* VALUES (@folio,@vendedor_id,@sucursal_id,@total,@subtotal,@iva,@metodo_pago)');

    const venta = insertVenta.recordset[0];

    // Insert detalle_ventas and update inventario_tienda
    for (const it of items) {
      const productoId = Number(it.producto_id ?? it.productId);
      const cantidad = Number(it.cantidad ?? it.qty ?? 0);
      const precio_unitario = Number(it.precio_unitario ?? it.precio ?? 0);
      if (Number.isNaN(productoId) || Number.isNaN(cantidad) || Number.isNaN(precio_unitario)) throw new Error('Item inválido en items: producto_id/cantidad/precio invalidos');

  // Verificar inventario disponible antes de insertar y decrementar (within tx)
  const invCheck = await tx.request().input('productoIdChk', sql.Int, productoId).input('sucIdChk', sql.Int, sucId).query('SELECT cantidad FROM inventario_tienda WHERE producto_id = @productoIdChk AND sucursal_id = @sucIdChk');
      if (!invCheck.recordset.length) throw new Error(`Inventario no encontrado para producto ${productoId} en sucursal ${sucId}`);
      const available = Number(invCheck.recordset[0].cantidad);
      if (available < cantidad) throw new Error(`Stock insuficiente para producto ${productoId} (disponible ${available}, solicitado ${cantidad})`);

      await tx.request()
        .input('venta_id', sql.Int, venta.id)
        .input('producto_id', sql.Int, productoId)
        .input('cantidad', sql.Int, cantidad)
        .input('precio_unitario', sql.Decimal(10,2), precio_unitario)
        .input('subtotal', sql.Decimal(10,2), Number((cantidad * precio_unitario).toFixed(2)))
        .input('descuento', sql.Decimal(10,2), Number(it.descuento ?? 0))
        .input('promocion_id', sql.Int, it.promocion_id ?? null)
        .query('INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal, descuento, promocion_id) VALUES (@venta_id,@producto_id,@cantidad,@precio_unitario,@subtotal,@descuento,@promocion_id)');

      // Decrementar inventario_tienda
      await tx.request()
        .input('producto_id', sql.Int, productoId)
        .input('sucursal_id', sql.Int, sucId)
        .input('cantidad_decremento', sql.Int, cantidad)
        .input('vendedor_id', sql.Int, vendedorId)
        .query(`
          UPDATE inventario_tienda SET cantidad = cantidad - @cantidad_decremento, actualizado_por = @vendedor_id, ultima_actualizacion = GETDATE()
          WHERE producto_id = @producto_id AND sucursal_id = @sucursal_id
        `);
    }

    await tx.commit();

    // Fetch detalle rows for response
    const detalles = await pool.request().input('ventaId', sql.Int, venta.id).query('SELECT * FROM detalle_ventas WHERE venta_id = @ventaId');

    res.status(201).json({ ok: true, venta, detalles: detalles.recordset });
  } catch (err) {
    try { if (tx) await tx.rollback(); } catch (e) { console.error('rollback error', e); }
    // map some validation errors to 400
    const msg = err?.message || String(err);
    if (msg.startsWith('Stock insuficiente') || msg.startsWith('Inventario no encontrado') || msg.startsWith('Item inválido')) {
      return res.status(400).json({ error: msg });
    }
    console.error('POST /ventas error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: msg });
  }
});

export default router;
