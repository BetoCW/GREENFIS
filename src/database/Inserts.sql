
ALTER TABLE usuarios 
ALTER COLUMN rol VARCHAR(15) NOT NULL;

-- También necesitamos actualizar el CHECK constraint
ALTER TABLE usuarios 
DROP CONSTRAINT [CK__usuarios__rol__46E78A0C];

-- Luego crear uno nuevo con el tamaño actualizado
ALTER TABLE usuarios 
ADD CONSTRAINT CK_usuarios_rol 
CHECK (rol IN ('gerente', 'almacenista', 'vendedor'));


USE GreenFis;
GO

-- =============================================
-- INSERCIONES PARA TABLAS MAESTRAS
-- =============================================

-- 1. Insertar categorías
INSERT INTO categorias (nombre, descripcion) VALUES
('Pescados Frescos', 'Productos del mar frescos y de calidad'),
('Mariscos', 'Camarones, langostas, pulpos y otros mariscos'),
('Productos Congelados', 'Pescados y mariscos congelados para mayor duración');

-- 2. Insertar sucursales (sin encargado todavía)
INSERT INTO sucursales (nombre, direccion, telefono) VALUES
('Sucursal Centro', 'Av. Principal #123, Centro', '555-100-2000'),
('Sucursal Norte', 'Calle Norte #456, Zona Norte', '555-100-2001'),
('Sucursal Sur', 'Blvd. Sur #789, Zona Sur', '555-100-2002');

-- 3. Insertar usuarios
INSERT INTO usuarios (nombre, correo, contrasena, sucursal_id, rol) VALUES
('Juan Pérez', 'juan.perez@greenfis.com', 'hashed_password_1', 1, 'gerente'),
('María García', 'maria.garcia@greenfis.com', 'hashed_password_2', 1, 'almacenista'),
('Carlos López', 'carlos.lopez@greenfis.com', 'hashed_password_3', 1, 'vendedor');

-- 4. Actualizar sucursales con encargados
UPDATE sucursales SET encargado_id = 1 WHERE id_sucursal = 1;
UPDATE sucursales SET encargado_id = 1 WHERE id_sucursal = 2;
UPDATE sucursales SET encargado_id = 1 WHERE id_sucursal = 3;

-- 5. Insertar proveedores
INSERT INTO proveedores (nombre, contacto, telefono, correo, direccion, creado_por) VALUES
('Mariscos del Pacífico SA', 'Roberto Mendoza', '555-300-1000', 'ventas@mariscospacifico.com', 'Puerto de Mazatlán #234', 1),
('Pescadería La Costa', 'Ana Ruiz', '555-300-1001', 'pedidos@lacosta.com', 'Calle Costera #567', 1),
('Congelados Marinos', 'Pedro Navarro', '555-300-1002', 'info@congeladosmarinos.com', 'Zona Industrial #890', 1);

-- =============================================
-- INSERCIONES PARA PRODUCTOS E INVENTARIOS
-- =============================================

-- 6. Insertar productos
INSERT INTO productos (codigo_barras, nombre, descripcion, precio, categoria_id, proveedor_id, stock_minimo, creado_por) VALUES
('7501001234567', 'Salmón Fresco', 'Salmón del Atlántico fresco, fileteado', 289.50, 1, 1, 10, 1),
('7501001234568', 'Camarón Jumbo', 'Camarón grande crudo, con cabeza', 189.00, 2, 2, 15, 1),
('7501001234569', 'Filete de Tilapia Congelado', 'Filete de tilapia individual congelado', 79.90, 3, 3, 20, 1);

-- 7. Insertar inventario en almacén
INSERT INTO inventario_almacen (producto_id, cantidad, ubicacion, actualizado_por) VALUES
(1, 50, 'Estante A1 - Zona Frescos', 2),
(2, 30, 'Estante B2 - Zona Mariscos', 2),
(3, 100, 'Congelador C1 - Nivel 2', 2);

-- 8. Insertar inventario en tiendas
INSERT INTO inventario_tienda (producto_id, sucursal_id, cantidad, ubicacion, actualizado_por) VALUES
(1, 1, 15, 'Vitrina Frescos - Nivel 1', 2),
(2, 1, 20, 'Vitrina Mariscos - Nivel 1', 2),
(3, 1, 25, 'Congelador Tienda - Sección 3', 2);

INSERT INTO inventario_tienda (producto_id, sucursal_id, cantidad, ubicacion, actualizado_por) VALUES
(1, 2, 12, 'Vitrina Principal', 2),
(2, 2, 18, 'Área Mariscos', 2),
(3, 2, 22, 'Congelador Norte', 2);

-- =============================================
-- INSERCIONES PARA VENTAS Y PROMOCIONES
-- =============================================

-- 9. Insertar promociones
INSERT INTO promociones (nombre, descripcion, producto_id, tipo, valor_descuento, fecha_inicio, fecha_fin, creada_por) VALUES
('Oferta Salmón', 'Descuento especial en salmón fresco', 1, 'descuento_porcentaje', 15.00, '2024-01-01', '2024-12-31', 1),
('2x1 Camarón', 'Lleva 2 kilos por el precio de 1 en camarón jumbo', 2, '2x1', NULL, '2024-01-01', '2024-01-31', 1),
('Precio Especial Tilapia', 'Precio reducido en filetes de tilapia', 3, 'descuento_fijo', 20.00, '2024-01-01', '2024-02-28', 1);

-- 10. Insertar ventas
INSERT INTO ventas (folio, vendedor_id, sucursal_id, total, subtotal, iva, metodo_pago) VALUES
('VTA-001-2024', 3, 1, 578.00, 500.00, 78.00, 'efectivo'),
('VTA-002-2024', 3, 1, 756.90, 655.00, 101.90, 'tarjeta'),
('VTA-003-2024', 3, 1, 319.60, 276.00, 43.60, 'transferencia');

-- 11. Insertar detalle de ventas
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal, promocion_id) VALUES
(1, 1, 2, 289.50, 579.00, 1),
(2, 2, 2, 189.00, 378.00, 2),
(3, 3, 4, 79.90, 319.60, 3);

-- Actualizar subtotales y totales en ventas después de aplicar descuentos
UPDATE ventas SET 
    subtotal = 500.00,
    total = 578.00 
WHERE id = 1;

UPDATE ventas SET 
    subtotal = 655.00,
    total = 756.90 
WHERE id = 2;

UPDATE ventas SET 
    subtotal = 276.00,
    total = 319.60 
WHERE id = 3;

-- =============================================
-- INSERCIONES PARA REABASTECIMIENTO
-- =============================================

-- 12. Insertar solicitudes de reabastecimiento
INSERT INTO solicitudes_reabastecimiento (sucursal_id, solicitante_id, producto_id, cantidad_solicitada, estado, fecha_aprobacion, aprobado_por) VALUES
(2, 3, 1, 10, 'aprobada', GETDATE(), 1),
(2, 3, 2, 15, 'aprobada', GETDATE(), 1),
(3, 3, 3, 20, 'pendiente', NULL, NULL);

-- 13. Insertar transferencias de inventario
INSERT INTO transferencias_inventario (solicitud_id, almacenista_id, producto_id, cantidad, sucursal_destino_id, estado, fecha_completado, recibido_por) VALUES
(1, 2, 1, 10, 2, 'completada', GETDATE(), 3),
(2, 2, 2, 15, 2, 'completada', GETDATE(), 3),
(NULL, 2, 3, 25, 1, 'en_transito', NULL, NULL);

-- 14. Insertar pedidos a proveedores
INSERT INTO pedidos_proveedores (proveedor_id, solicitante_id, producto_id, cantidad, precio_compra, estado, fecha_aprobacion, aprobado_por) VALUES
(1, 2, 1, 50, 200.00, 'aprobado', GETDATE(), 1),
(2, 2, 2, 40, 120.00, 'recibido', GETDATE(), 1),
(3, 2, 3, 100, 45.00, 'pendiente', NULL, NULL);

-- =============================================
-- INSERCIONES PARA REPORTES Y CORTES
-- =============================================

-- 15. Insertar cortes de caja
INSERT INTO cortes_caja (vendedor_id, sucursal_id, fecha_corte, ventas_totales, monto_total, monto_efectivo, monto_tarjeta, monto_transferencia, cerrado_por) VALUES
(3, 1, '2024-01-15', 8, 2450.50, 1200.00, 850.50, 400.00, 1),
(3, 1, '2024-01-16', 12, 3890.75, 2000.00, 1390.75, 500.00, 1),
(3, 1, '2024-01-17', 6, 1567.25, 800.00, 567.25, 200.00, 1);

-- 16. Insertar reportes
INSERT INTO reportes (tipo, nombre, sucursal_id, periodo_inicio, periodo_fin, monto_ventas, generado_por, archivo_path) VALUES
('ventas', 'Reporte Ventas Enero 2024', 1, '2024-01-01', '2024-01-31', 125000.50, 1, '/reportes/ventas_ene_2024.pdf'),
('inventario', 'Inventario General Diciembre 2023', NULL, '2023-12-01', '2023-12-31', NULL, 1, '/reportes/inventario_dic_2023.pdf'),
('cortes_caja', 'Cortes de Caja Semana 1', 1, '2024-01-01', '2024-01-07', 45000.75, 1, '/reportes/cortes_sem1_2024.pdf');
