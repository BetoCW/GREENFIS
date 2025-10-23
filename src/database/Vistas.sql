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