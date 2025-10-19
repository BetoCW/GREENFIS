import express from 'express';
import { poolPromise } from '../database/connection.js';

const router = express.Router();

// ---------- Usuarios ----------
router.get('/usuarios', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM usuarios');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request().input('id', id).query('SELECT * FROM usuarios WHERE id_usuario = @id');
    res.json(result.recordset[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sucursales', async (req, res) => {
  try {
    const { nombre, direccion, telefono, encargado_id } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nombre', nombre)
      .input('direccion', direccion)
      .input('telefono', telefono)
      .input('encargado_id', encargado_id)
      .query('INSERT INTO sucursales (nombre, direccion, telefono, encargado_id) OUTPUT INSERTED.* VALUES (@nombre, @direccion, @telefono, @encargado_id)');
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/sucursales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono, activo, encargado_id } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('id', id)
      .input('nombre', nombre)
      .input('direccion', direccion)
      .input('telefono', telefono)
      .input('activo', activo)
      .input('encargado_id', encargado_id)
      .query('UPDATE sucursales SET nombre=@nombre, direccion=@direccion, telefono=@telefono, activo=@activo, encargado_id=@encargado_id WHERE id_sucursal=@id');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/sucursales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request().input('id', id).query('UPDATE sucursales SET activo = 0 WHERE id_sucursal = @id');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---------- Proveedores ----------
router.get('/proveedores', async (req, res) => {
  try { const pool = await poolPromise; const result = await pool.request().query('SELECT * FROM proveedores'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/proveedores', async (req, res) => {
  try {
    const { nombre, contacto, telefono, correo, direccion, creado_por } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nombre', nombre)
      .input('contacto', contacto)
      .input('telefono', telefono)
      .input('correo', correo)
      .input('direccion', direccion)
      .input('creado_por', creado_por)
      .query('INSERT INTO proveedores (nombre, contacto, telefono, correo, direccion, creado_por) OUTPUT INSERTED.* VALUES (@nombre,@contacto,@telefono,@correo,@direccion,@creado_por)');
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/proveedores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, contacto, telefono, correo, direccion, activo } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('id', id)
      .input('nombre', nombre)
      .input('contacto', contacto)
      .input('telefono', telefono)
      .input('correo', correo)
      .input('direccion', direccion)
      .input('activo', activo)
      .query('UPDATE proveedores SET nombre=@nombre, contacto=@contacto, telefono=@telefono, correo=@correo, direccion=@direccion, activo=@activo WHERE id=@id');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/proveedores/:id', async (req, res) => {
  try { const { id } = req.params; const pool = await poolPromise; await pool.request().input('id', id).query('UPDATE proveedores SET activo = 0 WHERE id = @id'); res.json({ ok: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---------- Productos ----------
router.get('/productos', async (req, res) => {
  try { const pool = await poolPromise; const result = await pool.request().query('SELECT * FROM productos'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/productos', async (req, res) => {
  try {
    const { codigo_barras, nombre, descripcion, precio, categoria_id, proveedor_id, stock_minimo, creado_por } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('codigo_barras', codigo_barras)
      .input('nombre', nombre)
      .input('descripcion', descripcion)
      .input('precio', precio)
      .input('categoria_id', categoria_id)
      .input('proveedor_id', proveedor_id)
      .input('stock_minimo', stock_minimo)
      .input('creado_por', creado_por)
      .query('INSERT INTO productos (codigo_barras,nombre,descripcion,precio,categoria_id,proveedor_id,stock_minimo,creado_por) OUTPUT INSERTED.* VALUES (@codigo_barras,@nombre,@descripcion,@precio,@categoria_id,@proveedor_id,@stock_minimo,@creado_por)');
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/productos/:id', async (req, res) => {
  try { const { id } = req.params; const { nombre, descripcion, precio, categoria_id, proveedor_id, stock_minimo, activo, modificado_por } = req.body; const pool = await poolPromise; await pool.request().input('id', id).input('nombre', nombre).input('descripcion', descripcion).input('precio', precio).input('categoria_id', categoria_id).input('proveedor_id', proveedor_id).input('stock_minimo', stock_minimo).input('activo', activo).input('modificado_por', modificado_por).query('UPDATE productos SET nombre=@nombre, descripcion=@descripcion, precio=@precio, categoria_id=@categoria_id, proveedor_id=@proveedor_id, stock_minimo=@stock_minimo, activo=@activo, modificado_por=@modificado_por WHERE id=@id'); res.json({ ok: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/productos/:id', async (req, res) => { try { const { id } = req.params; const pool = await poolPromise; await pool.request().input('id', id).query('UPDATE productos SET activo = 0 WHERE id = @id'); res.json({ ok: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---------- Promociones ----------
router.get('/promociones', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT * FROM promociones'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });

router.post('/promociones', async (req, res) => {
  try {
    const { nombre, descripcion, producto_id, tipo, valor_descuento, nuevo_precio, fecha_inicio, fecha_fin, dias_semana, aplica_todas_sucursales, creada_por } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nombre', nombre)
      .input('descripcion', descripcion)
      .input('producto_id', producto_id)
      .input('tipo', tipo)
      .input('valor_descuento', valor_descuento)
      .input('nuevo_precio', nuevo_precio)
      .input('fecha_inicio', fecha_inicio)
      .input('fecha_fin', fecha_fin)
      .input('dias_semana', dias_semana)
      .input('aplica_todas_sucursales', aplica_todas_sucursales)
      .input('creada_por', creada_por)
      .query('INSERT INTO promociones (nombre,descripcion,producto_id,tipo,valor_descuento,nuevo_precio,fecha_inicio,fecha_fin,dias_semana,aplica_todas_sucursales,creada_por) OUTPUT INSERTED.* VALUES (@nombre,@descripcion,@producto_id,@tipo,@valor_descuento,@nuevo_precio,@fecha_inicio,@fecha_fin,@dias_semana,@aplica_todas_sucursales,@creada_por)');
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/promociones/:id', async (req, res) => { try { const { id } = req.params; const { nombre, descripcion, tipo, valor_descuento, nuevo_precio, fecha_inicio, fecha_fin, dias_semana, activa, modificada_por } = req.body; const pool = await poolPromise; await pool.request().input('id', id).input('nombre', nombre).input('descripcion', descripcion).input('tipo', tipo).input('valor_descuento', valor_descuento).input('nuevo_precio', nuevo_precio).input('fecha_inicio', fecha_inicio).input('fecha_fin', fecha_fin).input('dias_semana', dias_semana).input('activa', activa).input('modificada_por', modificada_por).query('UPDATE promociones SET nombre=@nombre, descripcion=@descripcion, tipo=@tipo, valor_descuento=@valor_descuento, nuevo_precio=@nuevo_precio, fecha_inicio=@fecha_inicio, fecha_fin=@fecha_fin, dias_semana=@dias_semana, activa=@activa, modificada_por=@modificada_por WHERE id=@id'); res.json({ ok: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

router.delete('/promociones/:id', async (req, res) => { try { const { id } = req.params; const pool = await poolPromise; await pool.request().input('id', id).query('DELETE FROM promociones WHERE id = @id'); res.json({ ok: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---------- Solicitudes de reabastecimiento y Pedidos proveedores (Aprobaciones) ----------
router.get('/solicitudes', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT * FROM solicitudes_reabastecimiento'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });

router.post('/solicitudes', async (req, res) => { try { const { sucursal_id, solicitante_id, producto_id, cantidad_solicitada } = req.body; const pool = await poolPromise; const result = await pool.request().input('sucursal_id', sucursal_id).input('solicitante_id', solicitante_id).input('producto_id', producto_id).input('cantidad_solicitada', cantidad_solicitada).query('INSERT INTO solicitudes_reabastecimiento (sucursal_id, solicitante_id, producto_id, cantidad_solicitada) OUTPUT INSERTED.* VALUES (@sucursal_id,@solicitante_id,@producto_id,@cantidad_solicitada)'); res.status(201).json(result.recordset[0]); } catch (err) { res.status(500).json({ error: err.message }); } });

router.put('/solicitudes/:id', async (req, res) => {
  try {
    const { id } = req.params; const { estado, cantidad_aprobada, aprobado_por, motivo_rechazo } = req.body; const pool = await poolPromise;
    await pool.request()
      .input('id', id)
      .input('estado', estado)
      .input('cantidad_aprobada', cantidad_aprobada)
      .input('aprobado_por', aprobado_por)
      .input('motivo_rechazo', motivo_rechazo)
      .query("UPDATE solicitudes_reabastecimiento SET estado=@estado, cantidad_aprobada=@cantidad_aprobada, aprobado_por=@aprobado_por, motivo_rechazo=@motivo_rechazo, fecha_aprobacion = CASE WHEN @estado = 'aprobada' THEN GETDATE() ELSE fecha_aprobacion END WHERE id=@id");
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/pedidos', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT * FROM pedidos_proveedores'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });

router.post('/pedidos', async (req, res) => { try { const { proveedor_id, solicitante_id, producto_id, cantidad, precio_compra } = req.body; const pool = await poolPromise; const result = await pool.request().input('proveedor_id', proveedor_id).input('solicitante_id', solicitante_id).input('producto_id', producto_id).input('cantidad', cantidad).input('precio_compra', precio_compra).query('INSERT INTO pedidos_proveedores (proveedor_id, solicitante_id, producto_id, cantidad, precio_compra) OUTPUT INSERTED.* VALUES (@proveedor_id,@solicitante_id,@producto_id,@cantidad,@precio_compra)'); res.status(201).json(result.recordset[0]); } catch (err) { res.status(500).json({ error: err.message }); } });

router.put('/pedidos/:id', async (req, res) => { try { const { id } = req.params; const { estado, aprobado_por, fecha_aprobacion } = req.body; const pool = await poolPromise; await pool.request().input('id', id).input('estado', estado).input('aprobado_por', aprobado_por).input('fecha_aprobacion', fecha_aprobacion).query('UPDATE pedidos_proveedores SET estado=@estado, aprobado_por=@aprobado_por, fecha_aprobacion=@fecha_aprobacion WHERE id=@id'); res.json({ ok: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---------- Reportes ----------
router.post('/reportes', async (req, res) => { try { const { tipo, nombre, sucursal_id, periodo_inicio, periodo_fin, generado_por, parametros } = req.body; const pool = await poolPromise; const result = await pool.request().input('tipo', tipo).input('nombre', nombre).input('sucursal_id', sucursal_id).input('periodo_inicio', periodo_inicio).input('periodo_fin', periodo_fin).input('generado_por', generado_por).input('parametros', parametros).query('INSERT INTO reportes (tipo,nombre,sucursal_id,periodo_inicio,periodo_fin,generado_por,parametros) OUTPUT INSERTED.* VALUES (@tipo,@nombre,@sucursal_id,@periodo_inicio,@periodo_fin,@generado_por,@parametros)'); res.status(201).json(result.recordset[0]); } catch (err) { res.status(500).json({ error: err.message }); } });

router.get('/reportes', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT * FROM reportes'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });

// ---------- Cortes de caja ----------
router.get('/cortes', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT * FROM cortes_caja'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });

router.post('/cortes', async (req, res) => { try { const { vendedor_id, sucursal_id, fecha_corte, ventas_totales, monto_total, monto_efectivo, monto_tarjeta, monto_transferencia, diferencia, observaciones, cerrado_por } = req.body; const pool = await poolPromise; const result = await pool.request().input('vendedor_id', vendedor_id).input('sucursal_id', sucursal_id).input('fecha_corte', fecha_corte).input('ventas_totales', ventas_totales).input('monto_total', monto_total).input('monto_efectivo', monto_efectivo).input('monto_tarjeta', monto_tarjeta).input('monto_transferencia', monto_transferencia).input('diferencia', diferencia).input('observaciones', observaciones).input('cerrado_por', cerrado_por).query('INSERT INTO cortes_caja (vendedor_id,sucursal_id,fecha_corte,ventas_totales,monto_total,monto_efectivo,monto_tarjeta,monto_transferencia,diferencia,observaciones,cerrado_por) OUTPUT INSERTED.* VALUES (@vendedor_id,@sucursal_id,@fecha_corte,@ventas_totales,@monto_total,@monto_efectivo,@monto_tarjeta,@monto_transferencia,@diferencia,@observaciones,@cerrado_por)'); res.status(201).json(result.recordset[0]); } catch (err) { res.status(500).json({ error: err.message }); } });





// ================= Almacén (Almacenista) =================
// Inventory in central warehouse (inventario_almacen)
router.get('/almacen/inventario', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT ia.*, p.nombre AS producto FROM inventario_almacen ia LEFT JOIN productos p ON ia.producto_id = p.id');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Adjust stock in central warehouse (only central warehouse allowed)
router.put('/almacen/inventario/:id', async (req, res) => {
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

// Create a transfer from warehouse to store (transferencias_inventario)
router.post('/almacen/transferencias', async (req, res) => {
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

// Mark transfer as completed (and optionally decrement central inventory)
router.put('/almacen/transferencias/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { recibido_por } = req.body;
    const pool = await poolPromise;
    // set fecha_completado, estado and recibido_por
    await pool.request().input('id', id).input('recibido_por', recibido_por).query("UPDATE transferencias_inventario SET estado='completada', fecha_completado=GETDATE(), recibido_por=@recibido_por WHERE id=@id");
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Recepción de pedidos de proveedores (mark as recibido and update inventario_almacen)
router.put('/almacen/pedidos/:id/recepcion', async (req, res) => {
  try {
    const { id } = req.params; // pedido id
    const { recibido_por, fecha_recepcion } = req.body;
    const pool = await poolPromise;
    // mark pedido as recibido
    await pool.request().input('id', id).input('recibido_por', recibido_por).input('fecha_recepcion', fecha_recepcion || new Date()).query("UPDATE pedidos_proveedores SET estado='recibido', recibido_por=@recibido_por, fecha_recepcion=@fecha_recepcion WHERE id=@id");

    // Optionally: increase inventario_almacen cantidades for each producto in the pedido
    // Note: pedidos_proveedores in this schema is per-line; if there are multiple items per pedido you'd adapt accordingly.
    const pedidoRes = await pool.request().input('id', id).query('SELECT producto_id, cantidad FROM pedidos_proveedores WHERE id = @id');
    if (pedidoRes.recordset.length) {
      const { producto_id, cantidad } = pedidoRes.recordset[0];
      // Upsert into inventario_almacen
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
router.get('/almacen/productos', async (req, res) => {
  try { const pool = await poolPromise; const result = await pool.request().query('SELECT id, codigo_barras, nombre, descripcion, precio, proveedor_id, stock_minimo, activo FROM productos'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); }
});

// Solicitudes: allow processing (complete or reject) but not creation from almacenista
router.put('/almacen/solicitudes/:id/process', async (req, res) => {
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
