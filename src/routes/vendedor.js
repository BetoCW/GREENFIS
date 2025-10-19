import express from 'express';
import { poolPromise } from '../database/connection.js';

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
    const q = 'SELECT it.*, p.nombre AS producto FROM inventario_tienda it JOIN productos p ON it.producto_id = p.id WHERE it.sucursal_id = @sucursal_id';
    const result = await pool.request().input('sucursal_id', sucursal_id).query(q);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Crear solicitud de reabastecimiento desde vendedor
router.post('/solicitudes', async (req, res) => {
  try {
    const { sucursal_id, solicitante_id, producto_id, cantidad_solicitada } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('sucursal_id', sucursal_id)
      .input('solicitante_id', solicitante_id)
      .input('producto_id', producto_id)
      .input('cantidad_solicitada', cantidad_solicitada)
      .query('INSERT INTO solicitudes_reabastecimiento (sucursal_id, solicitante_id, producto_id, cantidad_solicitada) OUTPUT INSERTED.* VALUES (@sucursal_id,@solicitante_id,@producto_id,@cantidad_solicitada)');
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Procesar venta completa: inserta en ventas y detalle_ventas, decrementa inventario_tienda
router.post('/ventas', async (req, res) => {
  try {
    const { folio, vendedor_id, sucursal_id, items, subtotal, iva, total, metodo_pago } = req.body;
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();
    const r = tx.request();

    // Insert venta
    const insertVenta = await r.input('folio', folio).input('vendedor_id', vendedor_id).input('sucursal_id', sucursal_id).input('total', total).input('subtotal', subtotal).input('iva', iva).input('metodo_pago', metodo_pago).query('INSERT INTO ventas (folio, vendedor_id, sucursal_id, total, subtotal, iva, metodo_pago) OUTPUT INSERTED.* VALUES (@folio,@vendedor_id,@sucursal_id,@total,@subtotal,@iva,@metodo_pago)');
    const venta = insertVenta.recordset[0];

    // Insert detalle_ventas and update inventario_tienda
    for (const it of items) {
      const { producto_id, cantidad, precio_unitario, descuento, promocion_id } = it;
      await r.input('venta_id', venta.id).input('producto_id', producto_id).input('cantidad', cantidad).input('precio_unitario', precio_unitario).input('subtotal', cantidad * precio_unitario).input('descuento', descuento || 0).input('promocion_id', promocion_id || null).query('INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal, descuento, promocion_id) VALUES (@venta_id,@producto_id,@cantidad,@precio_unitario,@subtotal,@descuento,@promocion_id)');

      // Decrementar inventario_tienda
      await r.input('producto_id', producto_id).input('sucursal_id', sucursal_id).input('cantidad', cantidad).input('vendedor_id', vendedor_id).query(`
        UPDATE inventario_tienda SET cantidad = cantidad - @cantidad, actualizado_por = @vendedor_id, ultima_actualizacion = GETDATE()
        WHERE producto_id = @producto_id AND sucursal_id = @sucursal_id
      `);
    }

    await tx.commit();
    res.status(201).json({ ok: true, venta });
  } catch (err) {
    try { if (tx) await tx.rollback(); } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

export default router;
