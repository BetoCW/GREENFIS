--VISTAS PREPARADAS


--PUNTO DE VENTA
CREATE VIEW vw_productos_stock AS
SELECT
    p.id AS id,
    p.nombre AS nombre,
    p.precio AS precio,
    it.sucursal_id AS sucursal_id,
    ISNULL(it.cantidad, 0) AS cantidad,
    ISNULL(p.stock_minimo, 0) AS stock_minimo,
    CASE
        WHEN ISNULL(it.cantidad, 0) = 0 THEN 'AGOTADO'
        WHEN ISNULL(it.cantidad, 0) <= ISNULL(p.stock_minimo, 0) THEN 'BAJO'
        ELSE 'NORMAL'
    END AS estado_stock
FROM productos p
LEFT JOIN inventario_tienda it ON p.id = it.producto_id
WHERE p.activo = 1;
GO


select *from vw_productos_stock

CREATE VIEW vw_inventario_tienda AS
SELECT 
    p.id AS ID,
    p.nombre AS Nombre,
    COALESCE(s.nombre, 'Sin ubicación') AS Ubicación,
    it.cantidad AS Stock,
    p.precio AS Precio
FROM productos p
INNER JOIN inventario_tienda it ON p.id = it.producto_id
LEFT JOIN sucursales s ON it.sucursal_id = s.id_sucursal
WHERE p.activo = 1;

select *from vw_inventario_tienda

-- Vista para Reportes de Ventas
CREATE VIEW vw_reportes_ventas AS
SELECT 
    r.id AS reporte_id,
    r.tipo,
    r.nombre AS nombre_reporte,
    s.nombre AS sucursal,
    r.periodo_inicio,
    r.periodo_fin,
    r.monto_ventas,
    u_generador.nombre AS generado_por,
    r.fecha_generacion,
    r.archivo_path,
    
    -- Estadísticas detalladas de ventas en el período
    (SELECT COUNT(*) 
     FROM ventas v 
     WHERE v.sucursal_id = r.sucursal_id 
     AND v.fecha_venta BETWEEN r.periodo_inicio AND r.periodo_fin
     AND v.estado = 'completada') AS total_ventas,
    
    -- Métodos de pago
    (SELECT ISNULL(SUM(v.total), 0)
     FROM ventas v 
     WHERE v.sucursal_id = r.sucursal_id 
     AND v.fecha_venta BETWEEN r.periodo_inicio AND r.periodo_fin
     AND v.estado = 'completada'
     AND v.metodo_pago = 'efectivo') AS monto_efectivo,
    
    (SELECT ISNULL(SUM(v.total), 0)
     FROM ventas v 
     WHERE v.sucursal_id = r.sucursal_id 
     AND v.fecha_venta BETWEEN r.periodo_inicio AND r.periodo_fin
     AND v.estado = 'completada'
     AND v.metodo_pago = 'tarjeta') AS monto_tarjeta,
    
    (SELECT ISNULL(SUM(v.total), 0)
     FROM ventas v 
     WHERE v.sucursal_id = r.sucursal_id 
     AND v.fecha_venta BETWEEN r.periodo_inicio AND r.periodo_fin
     AND v.estado = 'completada'
     AND v.metodo_pago = 'transferencia') AS monto_transferencia,
    
    -- Productos más vendidos (top 1)
    (SELECT TOP 1 p.nombre 
     FROM ventas v
     INNER JOIN detalle_ventas dv ON v.id = dv.venta_id
     INNER JOIN productos p ON dv.producto_id = p.id
     WHERE v.sucursal_id = r.sucursal_id 
     AND v.fecha_venta BETWEEN r.periodo_inicio AND r.periodo_fin
     AND v.estado = 'completada'
     GROUP BY p.nombre
     ORDER BY SUM(dv.cantidad) DESC) AS producto_mas_vendido,
    
    -- Vendedor destacado
    (SELECT TOP 1 u.nombre 
     FROM ventas v
     INNER JOIN usuarios u ON v.vendedor_id = u.id_usuario
     WHERE v.sucursal_id = r.sucursal_id 
     AND v.fecha_venta BETWEEN r.periodo_inicio AND r.periodo_fin
     AND v.estado = 'completada'
     GROUP BY u.nombre
     ORDER BY COUNT(*) DESC) AS vendedor_destacado,
    
    -- Promedio de venta
    (SELECT ISNULL(AVG(v.total), 0)
     FROM ventas v 
     WHERE v.sucursal_id = r.sucursal_id 
     AND v.fecha_venta BETWEEN r.periodo_inicio AND r.periodo_fin
     AND v.estado = 'completada') AS promedio_venta

FROM reportes r
INNER JOIN usuarios u_generador ON r.generado_por = u_generador.id_usuario
LEFT JOIN sucursales s ON r.sucursal_id = s.id_sucursal
WHERE r.tipo = 'ventas';
GO

select * from vw_reportes_ventas;
-----------------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------------------
USE GreenFis;
GO

-- Vista específica para la interfaz de Gestión de Inventario
CREATE VIEW vw_gestion_inventario_ui AS
SELECT 
    'PRD-' + RIGHT('000' + CAST(p.id AS VARCHAR(3)), 3) AS ID,
    p.nombre AS NOMBRE,
    LEFT(ISNULL(p.descripcion, 'Sin descripción'), 50) + 
        CASE WHEN LEN(ISNULL(p.descripcion, '')) > 50 THEN '...' ELSE '' END AS DESCRIPCION,
    COALESCE(it.cantidad, ia.cantidad, 0) AS CANTIDAD,
    FORMAT(p.precio, 'C', 'en-US') AS PRECIO,
    COALESCE(
        'Sucursal ' + s.nombre,
        'Almacén ' + ia.ubicacion,
        'Sin ubicación'
    ) AS UBICACION,
    -- Campos para las acciones (seleccionar/editar)
    p.id AS producto_id_real,
    it.id AS inventario_tienda_id,
    ia.id AS inventario_almacen_id,
    p.activo AS producto_activo,
    CASE 
        WHEN it.id IS NOT NULL THEN 'tienda'
        WHEN ia.id IS NOT NULL THEN 'almacen'
        ELSE 'sin_inventario'
    END AS tipo_inventario

FROM productos p
LEFT JOIN inventario_tienda it ON p.id = it.producto_id
LEFT JOIN sucursales s ON it.sucursal_id = s.id_sucursal
LEFT JOIN inventario_almacen ia ON p.id = ia.producto_id
WHERE p.activo = 1;
GO

USE GreenFis;
GO

-- Vista única para gestión de inventario
USE GreenFis;
GO

-- Vista única para gestión de inventario (CORREGIDA)
CREATE VIEW vw_gestion_inventario AS
SELECT 
    'PRD-' + RIGHT('000' + CAST(p.id AS VARCHAR(3)), 3) AS ID,
    p.nombre AS NOMBRE,
    LEFT(ISNULL(CAST(p.descripcion AS VARCHAR(1000)), 'Sin descripción'), 50) + 
        CASE WHEN LEN(ISNULL(CAST(p.descripcion AS VARCHAR(1000)), '')) > 50 THEN '...' ELSE '' END AS DESCRIPCION,
    COALESCE(it.cantidad, ia.cantidad, 0) AS CANTIDAD,
    FORMAT(p.precio, 'C', 'en-US') AS PRECIO,
    CASE 
        WHEN it.id IS NOT NULL THEN 'Sucursal ' + s.nombre
        WHEN ia.id IS NOT NULL THEN 'Almacén ' + ISNULL(ia.ubicacion, 'General')
        ELSE 'Sin ubicación'
    END AS UBICACION,
    -- Campos técnicos para operaciones
    p.id AS producto_id,
    it.id AS inventario_tienda_id,
    ia.id AS inventario_almacen_id,
    it.sucursal_id,
    p.activo
FROM productos p
LEFT JOIN inventario_tienda it ON p.id = it.producto_id
LEFT JOIN sucursales s ON it.sucursal_id = s.id_sucursal
LEFT JOIN inventario_almacen ia ON p.id = ia.producto_id
WHERE p.activo = 1;
GO

select *from vw_gestion_inventario;