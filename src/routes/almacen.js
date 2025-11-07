import express from 'express';
import { poolPromise } from '../database/connection.js';

const router = express.Router();

// Inventory in central warehouse (inventario_almacen)
router.get('/inventario', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT ia.*, p.nombre AS producto FROM inventario_almacen ia LEFT JOIN productos p ON ia.producto_id = p.id');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expose the view vw_gestion_inventario for frontend inventory management UI
router.get('/inventario/vw', async (req, res) => {
  try {
    const pool = await poolPromise;
    try {
      const result = await pool.request().query('SELECT * FROM vw_gestion_inventario');
      return res.json(result.recordset);
    } catch (viewErr) {
      console.warn('vw_gestion_inventario query failed, attempting fallback JOIN query', viewErr && viewErr.message);
      // fallback: join base tables to build similar result if the view is missing or has permission issues
      const fallbackQ = `
        SELECT ia.id, ia.producto_id, p.nombre AS producto, ia.cantidad, ia.ubicacion, ia.ultima_actualizacion, ia.actualizado_por
        FROM inventario_almacen ia
        LEFT JOIN productos p ON p.id = ia.producto_id
      `;
      try {
        const fallbackRes = await pool.request().query(fallbackQ);
        return res.json(fallbackRes.recordset);
      } catch (fbErr) {
        console.error('Fallback JOIN query also failed for /almacen/inventario/vw', fbErr);
        return res.status(500).json({ error: fbErr.message });
      }
    }
  } catch (err) {
    console.error('GET /almacen/inventario/vw error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Adjust stock in central warehouse - return the updated row so clients can confirm persistence
router.put('/inventario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, actualizado_por, ubicacion } = req.body;
    const pool = await poolPromise;
    // Use OUTPUT INSERTED.* to return the updated row
    const result = await pool.request()
      .input('id', id)
      .input('cantidad', cantidad)
      .input('actualizado_por', actualizado_por)
      .input('ubicacion', ubicacion)
      .query('UPDATE inventario_almacen SET cantidad=@cantidad, actualizado_por=@actualizado_por, ubicacion=@ubicacion, ultima_actualizacion=GETDATE() OUTPUT INSERTED.* WHERE id=@id');
    if (result && result.recordset && result.recordset.length) return res.json(result.recordset[0]);
    return res.status(404).json({ error: 'Inventario item no encontrado' });
  } catch (err) {
    console.error('PUT /almacen/inventario/:id error', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a transfer from warehouse to store
router.post('/transferencias', async (req, res) => {
  try {
    const { solicitud_id, almacenista_id, producto_id, cantidad, sucursal_destino_id } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('solicitud_id', solicitud_id)
      .input('almacenista_id', almacenista_id)
      .input('producto_id', producto_id)
      .input('cantidad', cantidad)
      .input('sucursal_destino_id', sucursal_destino_id)
      .query('INSERT INTO transferencias_inventario (solicitud_id, almacenista_id, producto_id, cantidad, sucursal_destino_id) OUTPUT INSERTED.* VALUES (@solicitud_id,@almacenista_id,@producto_id,@cantidad,@sucursal_destino_id)');
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark transfer as completed
router.put('/transferencias/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { recibido_por } = req.body;
    const pool = await poolPromise;
    const result = await pool.request().input('id', id).input('recibido_por', recibido_por).query("UPDATE transferencias_inventario SET estado='completada', fecha_completado=GETDATE(), recibido_por=@recibido_por OUTPUT INSERTED.* WHERE id=@id");
    if (result && result.recordset && result.recordset.length) return res.json(result.recordset[0]);
    return res.status(404).json({ error: 'Transferencia no encontrada' });
  } catch (err) { console.error('PUT /almacen/transferencias/:id/complete error', err); res.status(500).json({ error: err.message }); }
});

// Recepción de pedidos de proveedores (mark as recibido and update inventario_almacen)
router.put('/pedidos/:id/recepcion', async (req, res) => {
  try {
    const { id } = req.params; // pedido id
    const { recibido_por, fecha_recepcion } = req.body;
    const pool = await poolPromise;
    await pool.request().input('id', id).input('recibido_por', recibido_por).input('fecha_recepcion', fecha_recepcion || new Date()).query("UPDATE pedidos_proveedores SET estado='recibido', recibido_por=@recibido_por, fecha_recepcion=@fecha_recepcion WHERE id=@id");

    const pedidoRes = await pool.request().input('id', id).query('SELECT producto_id, cantidad FROM pedidos_proveedores WHERE id = @id');
    if (pedidoRes.recordset.length) {
      const { producto_id, cantidad } = pedidoRes.recordset[0];
      await pool.request().input('producto_id', producto_id).input('cantidad', cantidad).input('recibido_por', recibido_por).query(`
        IF EXISTS (SELECT 1 FROM inventario_almacen WHERE producto_id = @producto_id)
          UPDATE inventario_almacen SET cantidad = cantidad + @cantidad, actualizado_por = @recibido_por, ultima_actualizacion = GETDATE() WHERE producto_id = @producto_id
        ELSE
          INSERT INTO inventario_almacen (producto_id, cantidad, actualizado_por) VALUES (@producto_id, @cantidad, @recibido_por)
      `);
    }

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Products read-only for almacenista
router.get('/productos', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT id, codigo_barras, nombre, descripcion, precio, proveedor_id, stock_minimo, activo FROM productos');
    res.json(result.recordset);
  } catch (err) {
    console.error('GET /almacen/productos error', err?.message || err);
    // Fail-soft: devuelve lista vacía para no romper la UI del almacenista
    res.json([]);
  }
});

// Expose pedidos_proveedores under /api/almacen for almacenista UI compatibility
router.get('/pedidos', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM pedidos_proveedores');
    res.json(result.recordset);
  } catch (err) {
    console.error('GET /almacen/pedidos error', err?.message || err);
    // Fail-soft: devuelve lista vacía para no romper la UI del almacenista
    res.json([]);
  }
});

// Expose proveedores under /api/almacen to avoid cross-router dependency from the UI
router.get('/proveedores', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM proveedores');
    res.json(result.recordset);
  } catch (err) {
    console.error('GET /almacen/proveedores error', err?.message || err);
    // Fail-soft: devuelve lista vacía para no romper la UI del almacenista
    res.json([]);
  }
});

// Debug: sample productos rows - quick check for schema/permission issues
router.get('/debug/productos-sample', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP (5) id, nombre, codigo_barras FROM productos');
    return res.json({ ok: true, sample: result.recordset });
  } catch (err) {
    console.error('GET /almacen/debug/productos-sample error', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// Debug: sample proveedores rows - for almacenista UI fallback and diagnostics
router.get('/debug/proveedores-sample', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP (5) id, nombre, telefono FROM proveedores');
    return res.json({ ok: true, sample: result.recordset });
  } catch (err) {
    console.error('GET /almacen/debug/proveedores-sample error', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// Health check at router level so frontend on /api/almacen can validate DB connectivity
router.get('/health/db', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT 1 AS ok');
    if (result && result.recordset && result.recordset.length) return res.json({ ok: true });
    return res.status(500).json({ ok: false, error: 'DB returned unexpected result' });
  } catch (err) {
    console.error('/almacen/health/db error', err && err.message);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// Solicitudes: allow processing (complete or reject) but not creation from almacenista
router.put('/solicitudes/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, cantidad_aprobada, aprobado_por, motivo_rechazo } = req.body; // action: 'completar'|'rechazar'|'aprobar'
    const pool = await poolPromise;
    if (action === 'aprobar') {
      await pool.request().input('id', id).input('cantidad_aprobada', cantidad_aprobada).input('aprobado_por', aprobado_por).query("UPDATE solicitudes_reabastecimiento SET estado='aprobada', cantidad_aprobada=@cantidad_aprobada, aprobado_por=@aprobado_por, fecha_aprobacion=GETDATE() WHERE id=@id");
    } else if (action === 'rechazar') {
      await pool.request().input('id', id).input('motivo_rechazo', motivo_rechazo).query("UPDATE solicitudes_reabastecimiento SET estado='rechazada', motivo_rechazo=@motivo_rechazo WHERE id=@id");
    } else if (action === 'completar') {
      await pool.request().input('id', id).input('aprobado_por', aprobado_por).query("UPDATE solicitudes_reabastecimiento SET estado='completada', completado_por=@aprobado_por, fecha_completado=GETDATE() WHERE id=@id");
    } else {
      return res.status(400).json({ error: 'action must be one of aprovar|rechazar|completar' });
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
