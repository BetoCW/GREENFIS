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

// Adjust stock in central warehouse
router.put('/inventario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, actualizado_por, ubicacion } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('id', id)
      .input('cantidad', cantidad)
      .input('actualizado_por', actualizado_por)
      .input('ubicacion', ubicacion)
      .query('UPDATE inventario_almacen SET cantidad=@cantidad, actualizado_por=@actualizado_por, ubicacion=@ubicacion, ultima_actualizacion=GETDATE() WHERE id=@id');
    res.json({ ok: true });
  } catch (err) {
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
    await pool.request().input('id', id).input('recibido_por', recibido_por).query("UPDATE transferencias_inventario SET estado='completada', fecha_completado=GETDATE(), recibido_por=@recibido_por WHERE id=@id");
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  try { const pool = await poolPromise; const result = await pool.request().query('SELECT id, codigo_barras, nombre, descripcion, precio, proveedor_id, stock_minimo, activo FROM productos'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); }
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
