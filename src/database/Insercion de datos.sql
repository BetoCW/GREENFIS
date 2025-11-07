USE GreenFis;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    -- 1. SUCURSALES
    INSERT INTO sucursales (nombre, direccion, telefono)
    VALUES 
    ('Sucursal Centro', 'Av. Principal 123, Centro', '555-100-2001'),
    ('Sucursal Norte', 'Calle Norte 456, Zona Norte', '555-100-2002'),
    ('Sucursal Sur', 'Blvd. Sur 789, Zona Sur', '555-100-2003');

    -- 2. USUARIOS
    INSERT INTO usuarios (nombre, correo, contrasena, sucursal_id, rol)
    VALUES 
    ('Ana García Gerente', 'gerente@greenfis.com', 'password', 1, 'gerente'),
    ('Carlos López Almacen', 'almacenista@greenfis.com', 'password', 1, 'almacenista'),
    ('María Rodríguez Venta', 'vendedor@greenfis.com', 'password', 1, 'vendedor');

    -- 3. ACTUALIZAR ENCARGADOS
    UPDATE sucursales SET encargado_id = 1 WHERE id_sucursal = 1;

    -- 4. CATEGORÍAS
    INSERT INTO categorias (nombre, descripcion)
    VALUES 
    ('Superfoods', 'Alimentos con alta densidad nutricional'),
    ('Suplementos', 'Vitaminas, minerales y complementos'),
    ('Tés e Infusiones', 'Tés herbales e infusiones naturales'),
    ('Cosmética Natural', 'Productos de cuidado personal'),
    ('Semillas y Frutos Secos', 'Semillas, frutos secos y granos');

    -- 5. PROVEEDORES
    INSERT INTO proveedores (nombre, contacto, telefono, correo, creado_por)
    VALUES 
    ('NaturaLife Distribuciones', 'Lic. Roberto Mendoza', '555-300-4001', 'contacto@naturalife.com', 1),
    ('Organic Source México', 'Ing. Patricia Silva', '555-300-4002', 'ventas@organicsource.mx', 1),
    ('Superfoods Import', 'C. Javier Ruiz', '555-300-4003', 'import@superfoods.com', 1);

    -- 6. PRODUCTOS
    INSERT INTO productos (codigo_barras, nombre, descripcion, precio, categoria_id, proveedor_id, stock_minimo, creado_por)
    VALUES 
    ('7501001001001', 'Chía Orgánica 500g', 'Semillas de chía orgánica', 85.50, 1, 1, 10, 1),
    ('7501001001002', 'Spirulina en Polvo 200g', 'Alga spirulina pura', 120.00, 1, 1, 8, 1),
    ('7501001001003', 'Quinoa Real 1kg', 'Quinoa real importada', 95.00, 1, 2, 12, 1),
    ('7501001001004', 'Vitamina C 1000mg 60 tabs', 'Suplemento de vitamina C', 150.00, 2, 2, 15, 1),
    ('7501001001005', 'Té Verde Matcha 100g', 'Té matcha ceremonial', 180.00, 3, 3, 6, 1),
    ('7501001001006', 'Aceite de Coco Virgen 500ml', 'Aceite de coco extra virgen', 110.00, 1, 1, 10, 1),
    ('7501001001007', 'Jabón de Alepo 100g', 'Jabón natural de laurel', 45.00, 4, 2, 20, 1),
    ('7501001001008', 'Mix de Semillas 400g', 'Mezcla de semillas variadas', 65.00, 5, 3, 15, 1),
    ('7501001001009', 'Colágeno Hidrolizado 300g', 'Colágeno para piel y articulaciones', 220.00, 2, 1, 8, 1),
    ('7501001001010', 'Infusión Relajante 50g', 'Mezcla de hierbas relajantes', 35.00, 3, 2, 25, 1);

    -- 7. INVENTARIO ALMACÉN
    INSERT INTO inventario_almacen (producto_id, cantidad, ubicacion, actualizado_por)
    SELECT id, 30, 'Estante ' + CAST(id AS VARCHAR), 2 FROM productos;

    -- 8. INVENTARIO TIENDAS
    -- Sucursal 1: 5 unidades
    INSERT INTO inventario_tienda (producto_id, sucursal_id, cantidad, ubicacion, actualizado_por)
    SELECT id, 1, 5, 'Estante ' + CAST(id AS VARCHAR), 2 FROM productos;

    -- Sucursal 2: 10 unidades
    INSERT INTO inventario_tienda (producto_id, sucursal_id, cantidad, ubicacion, actualizado_por)
    SELECT id, 2, 10, 'Estante ' + CAST(id AS VARCHAR), 2 FROM productos;

    -- Sucursal 3: 15 unidades
    INSERT INTO inventario_tienda (producto_id, sucursal_id, cantidad, ubicacion, actualizado_por)
    SELECT id, 3, 15, 'Estante ' + CAST(id AS VARCHAR), 2 FROM productos;

    -- 9. VENTAS
    INSERT INTO ventas (folio, vendedor_id, sucursal_id, total, subtotal, iva, metodo_pago)
    VALUES 
    ('GF-001-2024', 3, 1, 275.50, 237.50, 38.00, 'efectivo'),
    ('GF-002-2024', 3, 1, 180.00, 155.17, 24.83, 'tarjeta');

    -- 10. DETALLES VENTAS
    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
    VALUES 
    (1, 1, 2, 85.50, 171.00),
    (1, 10, 3, 35.00, 105.00),
    (2, 5, 1, 180.00, 180.00);

    -- 11. PROMOCIONES
    INSERT INTO promociones (nombre, producto_id, tipo, valor_descuento, fecha_inicio, fecha_fin, aplica_todas_sucursales, creada_por)
    VALUES 
    ('20% Desc. Chía', 1, 'descuento_porcentaje', 20.0, '2024-01-01', '2024-12-31', 1, 1),
    ('2x1 Tés Relajantes', 10, '2x1', NULL, '2024-01-01', '2024-06-30', 1, 1);

    COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;