USE GreenFis;
GO
SET NOCOUNT ON;

-- Pruebas mínimas por tabla: 1 INSERT, 1 UPDATE, 1 DELETE (datos semi-reales del dominio herbal)

-- categorias
INSERT INTO categorias (nombre, descripcion) VALUES ('Suplementos', 'Vitaminas y extractos herbales para bienestar.');
UPDATE categorias SET descripcion = 'Suplementos naturales y extractos herbales' WHERE nombre = 'Suplementos';
DELETE FROM categorias WHERE nombre = 'Suplementos';

-- proveedores
INSERT INTO proveedores (nombre, contacto, telefono, correo, direccion) VALUES ('Herbolario Central S.A.', 'Lucia Gomez', '555-0123', 'ventas@herbolariocentral.test', 'Av. Salud 123');
UPDATE proveedores SET telefono = '555-0456' WHERE nombre = 'Herbolario Central S.A.';
DELETE FROM proveedores WHERE nombre = 'Herbolario Central S.A.';

-- sucursales
INSERT INTO sucursales (nombre, direccion, telefono) VALUES ('Tienda Central','C/Principal 1, Centro','600-0001');
UPDATE sucursales SET telefono = '600-0002' WHERE nombre = 'Tienda Central';
DELETE FROM sucursales WHERE nombre = 'Tienda Central';

-- usuarios (se inserta un usuario que puede funcionar como vendedor/gestor en pruebas)
INSERT INTO usuarios (nombre, correo, contrasena, sucursal_id, rol, activo) VALUES ('Carlos Vendedor','carlos@herbal.test','pwd', (SELECT TOP 1 id_sucursal FROM sucursales WHERE nombre = 'Tienda Central' ORDER BY id_sucursal DESC), 'vendedor', 1);
UPDATE usuarios SET activo = 0 WHERE correo = 'carlos@herbal.test';
DELETE FROM usuarios WHERE correo = 'carlos@herbal.test';

-- productos
INSERT INTO productos (nombre, descripcion, precio, categoria_id, proveedor_id) VALUES ('SuplementoEnergia','Extracto herbal para energía y vitalidad', 19.90, (SELECT TOP 1 id FROM categorias WHERE nombre = 'Suplementos' ORDER BY id DESC), (SELECT TOP 1 id FROM proveedores WHERE nombre = 'Herbolario Central S.A.' ORDER BY id DESC));
UPDATE productos SET precio = 17.50 WHERE nombre = 'SuplementoEnergia';
DELETE FROM productos WHERE nombre = 'SuplementoEnergia';

-- inventario_tienda
INSERT INTO inventario_tienda (producto_id, sucursal_id, cantidad) VALUES ((SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC), (SELECT TOP 1 id_sucursal FROM sucursales WHERE nombre = 'Tienda Central' ORDER BY id_sucursal DESC), 25);
UPDATE inventario_tienda SET cantidad = 20 WHERE producto_id = (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC);
DELETE FROM inventario_tienda WHERE producto_id = (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC);

-- inventario_almacen
INSERT INTO inventario_almacen (producto_id, cantidad) VALUES ((SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC), 200);
UPDATE inventario_almacen SET cantidad = 180 WHERE producto_id = (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC);
DELETE FROM inventario_almacen WHERE producto_id = (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC);

-- promociones
INSERT INTO promociones (nombre, producto_id, tipo, fecha_inicio, fecha_fin, creada_por, activa) VALUES ('OFERTA_ENERGIA', (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC), 'descuento_porcentaje', CONVERT(date, GETDATE()), DATEADD(day,7,CONVERT(date, GETDATE())), (SELECT TOP 1 id_usuario FROM usuarios WHERE correo = 'carlos@herbal.test' ORDER BY id_usuario DESC), 1);
UPDATE promociones SET activa = 0 WHERE nombre = 'OFERTA_ENERGIA';
DELETE FROM promociones WHERE nombre = 'OFERTA_ENERGIA';

-- ventas
INSERT INTO ventas (folio, vendedor_id, sucursal_id, total, subtotal, metodo_pago, estado) VALUES ('FV-1001', (SELECT TOP 1 id_usuario FROM usuarios WHERE correo = 'carlos@herbal.test' ORDER BY id_usuario DESC), (SELECT TOP 1 id_sucursal FROM sucursales WHERE nombre = 'Tienda Central' ORDER BY id_sucursal DESC), 0, 0, 'efectivo', 'completada');
UPDATE ventas SET estado = 'anulada' WHERE folio = 'FV-1001';
DELETE FROM ventas WHERE folio = 'FV-1001';

-- detalle_ventas
INSERT INTO ventas (folio, vendedor_id, sucursal_id, total, subtotal, metodo_pago, estado) VALUES ('FV-1002', (SELECT TOP 1 id_usuario FROM usuarios WHERE correo = 'carlos@herbal.test' ORDER BY id_usuario DESC), (SELECT TOP 1 id_sucursal FROM sucursales WHERE nombre = 'Tienda Central' ORDER BY id_sucursal DESC), 0, 0, 'tarjeta', 'completada');
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ((SELECT TOP 1 id FROM ventas WHERE folio = 'FV-1002' ORDER BY id DESC), (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC), 2, 17.50, 35.00);
UPDATE detalle_ventas SET cantidad = 1, subtotal = 17.50 WHERE venta_id = (SELECT TOP 1 id FROM ventas WHERE folio = 'FV-1002' ORDER BY id DESC);
DELETE FROM detalle_ventas WHERE venta_id = (SELECT TOP 1 id FROM ventas WHERE folio = 'FV-1002' ORDER BY id DESC);
DELETE FROM ventas WHERE folio = 'FV-1002';

-- solicitudes_reabastecimiento
INSERT INTO solicitudes_reabastecimiento (sucursal_id, solicitante_id, producto_id, cantidad_solicitada, estado) VALUES ((SELECT TOP 1 id_sucursal FROM sucursales WHERE nombre = 'Tienda Central' ORDER BY id_sucursal DESC), (SELECT TOP 1 id_usuario FROM usuarios WHERE correo = 'carlos@herbal.test' ORDER BY id_usuario DESC), (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC), 50, 'pendiente');
UPDATE solicitudes_reabastecimiento SET estado = 'aprobada' WHERE producto_id = (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC);
DELETE FROM solicitudes_reabastecimiento WHERE producto_id = (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC);

-- transferencias_inventario
INSERT INTO transferencias_inventario (solicitud_id, almacenista_id, producto_id, cantidad, sucursal_destino_id, estado) VALUES (NULL, (SELECT TOP 1 id_usuario FROM usuarios WHERE correo = 'carlos@herbal.test' ORDER BY id_usuario DESC), (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC), 10, (SELECT TOP 1 id_sucursal FROM sucursales WHERE nombre = 'Tienda Central' ORDER BY id_sucursal DESC), 'pendiente');
UPDATE transferencias_inventario SET estado = 'completada' WHERE producto_id = (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC);
DELETE FROM transferencias_inventario WHERE producto_id = (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC);

-- pedidos_proveedores
INSERT INTO pedidos_proveedores (proveedor_id, solicitante_id, producto_id, cantidad, precio_compra, estado) VALUES ((SELECT TOP 1 id FROM proveedores WHERE nombre = 'Herbolario Central S.A.' ORDER BY id DESC), (SELECT TOP 1 id_usuario FROM usuarios WHERE correo = 'carlos@herbal.test' ORDER BY id_usuario DESC), (SELECT TOP 1 id FROM productos WHERE nombre = 'SuplementoEnergia' ORDER BY id DESC), 100, 8.00, 'pendiente');
UPDATE pedidos_proveedores SET estado = 'recibido' WHERE proveedor_id = (SELECT TOP 1 id FROM proveedores WHERE nombre = 'Herbolario Central S.A.' ORDER BY id DESC);
DELETE FROM pedidos_proveedores WHERE proveedor_id = (SELECT TOP 1 id FROM proveedores WHERE nombre = 'Herbolario Central S.A.' ORDER BY id DESC);

-- cortes_caja
INSERT INTO cortes_caja (vendedor_id, sucursal_id, fecha_corte, monto_total) VALUES ((SELECT TOP 1 id_usuario FROM usuarios WHERE correo = 'carlos@herbal.test' ORDER BY id_usuario DESC), (SELECT TOP 1 id_sucursal FROM sucursales WHERE nombre = 'Tienda Central' ORDER BY id_sucursal DESC), CONVERT(date, GETDATE()), 150.00);
UPDATE cortes_caja SET monto_total = 155.00 WHERE sucursal_id = (SELECT TOP 1 id_sucursal FROM sucursales WHERE nombre = 'Tienda Central' ORDER BY id_sucursal DESC);
DELETE FROM cortes_caja WHERE sucursal_id = (SELECT TOP 1 id_sucursal FROM sucursales WHERE nombre = 'Tienda Central' ORDER BY id_sucursal DESC);

-- reportes
INSERT INTO reportes (tipo, nombre, periodo_inicio, periodo_fin, generado_por) VALUES ('ventas', 'ReporteSemanal', CONVERT(date, GETDATE()), DATEADD(day,7,CONVERT(date, GETDATE())), (SELECT TOP 1 id_usuario FROM usuarios WHERE correo = 'carlos@herbal.test' ORDER BY id_usuario DESC));
UPDATE reportes SET nombre = 'ReporteSemanal_Actualizado' WHERE nombre = 'ReporteSemanal';
DELETE FROM reportes WHERE nombre = 'ReporteSemanal_Actualizado';

-- Limpieza final general: borrar datos en orden de tablas hijas a padres
-- Esto borra todas las filas creadas por las pruebas y evita errores por claves foráneas
DELETE FROM detalle_ventas;
DELETE FROM transferencias_inventario;
DELETE FROM solicitudes_reabastecimiento;
DELETE FROM pedidos_proveedores;
DELETE FROM inventario_tienda;
DELETE FROM inventario_almacen;
DELETE FROM promociones;
DELETE FROM cortes_caja;
DELETE FROM reportes;
DELETE FROM ventas;
DELETE FROM pedidos_proveedores; -- ya borrada arriba, se deja por idempotencia
DELETE FROM productos;
DELETE FROM proveedores;
DELETE FROM usuarios;
DELETE FROM sucursales;
DELETE FROM categorias;

GO
