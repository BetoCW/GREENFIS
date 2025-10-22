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