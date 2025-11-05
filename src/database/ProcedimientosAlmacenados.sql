/* Procedimientos almacenados y tipos relacionados
   Basados en la estructura de CreacionBD.sql
   Implementa:
   - Tipo de tabla: SaleItemType
   - sp_ValidateStockAndReserve: valida y resuelve decrementos set-based
   - sp_ProcessSale: procedimiento principal para procesar una venta atómica
   - sp_CreateSale_DryRun: valida sin modificar datos
*/

USE GreenFis;
GO

-- ==================================================
-- Procedimientos SIMPLIFICADOS para pruebas rápidas
-- ==================================================

-- sp_ValidateStockSimple: chequeo simple de stock por sucursal
IF OBJECT_ID(N'sp_ValidateStockSimple', N'P') IS NOT NULL
    DROP PROCEDURE sp_ValidateStockSimple;
GO
CREATE PROCEDURE sp_ValidateStockSimple
    @sucursal_id INT,
    @items SaleItemType READONLY
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH requested AS (
        SELECT producto_id, SUM(cantidad) AS qty_requested
        FROM @items
        GROUP BY producto_id
    )
    SELECT r.producto_id, r.qty_requested, ISNULL(it.cantidad,0) AS qty_available,
           CASE WHEN it.cantidad IS NULL THEN 'sin_registro_en_inventario' WHEN it.cantidad < r.qty_requested THEN 'stock_insuficiente' ELSE 'ok' END AS estado
    FROM requested r
    LEFT JOIN inventario_tienda it ON it.producto_id = r.producto_id AND it.sucursal_id = @sucursal_id;

    -- Si hay filas con estado distinto de 'ok', el llamador puede interpretarlo
    RETURN 0;
END
GO

-- sp_ProcessSale_Simple: proceso de venta sencillo (para pruebas)
-- Notas: hace validaciones mínimas, verifica stock (simple), decrementa inventario y crea venta y detalles.
IF OBJECT_ID(N'sp_ProcessSale_Simple', N'P') IS NOT NULL
    DROP PROCEDURE sp_ProcessSale_Simple;
GO
CREATE PROCEDURE sp_ProcessSale_Simple
    @folio VARCHAR(50),
    @vendedor_id INT,
    @sucursal_id INT,
    @metodo_pago VARCHAR(20),
    @items SaleItemType READONLY,
    @out_venta_id INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- validaciones básicas
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = @vendedor_id AND activo = 1)
    BEGIN
        RAISERROR('Vendedor no encontrado o inactivo', 16, 1);
        RETURN 1;
    END

    IF NOT EXISTS (SELECT 1 FROM sucursales WHERE id_sucursal = @sucursal_id AND activo = 1)
    BEGIN
        RAISERROR('Sucursal no encontrada o inactiva', 16, 1);
        RETURN 2;
    END

    IF NOT EXISTS (SELECT 1 FROM @items)
    BEGIN
        RAISERROR('No hay items en la venta', 16, 1);
        RETURN 3;
    END

    -- Agrupar para chequear stock y para el update
    ;WITH requested AS (
        SELECT producto_id, SUM(cantidad) AS qty_requested
        FROM @items
        GROUP BY producto_id
    )

    -- Comprobar insuficiencias
    IF EXISTS (
        SELECT 1
        FROM requested r
        LEFT JOIN inventario_tienda it ON it.producto_id = r.producto_id AND it.sucursal_id = @sucursal_id
        WHERE it.cantidad IS NULL OR it.cantidad < r.qty_requested
    )
    BEGIN
        -- Devolver los problemas para que el cliente los muestre
        SELECT r.producto_id, r.qty_requested, ISNULL(it.cantidad,0) AS qty_available,
               CASE WHEN it.cantidad IS NULL THEN 'sin_registro_en_inventario' WHEN it.cantidad < r.qty_requested THEN 'stock_insuficiente' ELSE 'ok' END AS estado
        FROM requested r
        LEFT JOIN inventario_tienda it ON it.producto_id = r.producto_id AND it.sucursal_id = @sucursal_id
        WHERE it.cantidad IS NULL OR it.cantidad < r.qty_requested;
        RETURN 4; -- insuficiente stock
    END

    BEGIN TRAN;
    BEGIN TRY
        -- calcular totales simples
        DECLARE @subtotal DECIMAL(18,2) = 0;
        SELECT @subtotal = SUM((precio_unitario * cantidad) - ISNULL(descuento,0)) FROM @items;

        INSERT INTO ventas (folio, vendedor_id, sucursal_id, total, subtotal, iva, metodo_pago, estado)
        VALUES (@folio, @vendedor_id, @sucursal_id, @subtotal, @subtotal, 0, @metodo_pago, 'completada');

        SET @out_venta_id = CAST(SCOPE_IDENTITY() AS INT);

        -- Insertar detalle
        INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal, descuento, promocion_id)
        SELECT @out_venta_id, producto_id, cantidad, precio_unitario, (precio_unitario * cantidad) - ISNULL(descuento,0), ISNULL(descuento,0), promocion_id
        FROM @items;

        -- Decrementar inventario (set-based usando las cantidades agrupadas)
        UPDATE it
        SET it.cantidad = it.cantidad - r.qty_requested,
            it.ultima_actualizacion = SYSUTCDATETIME()
        FROM inventario_tienda it
        INNER JOIN (
            SELECT producto_id, SUM(cantidad) AS qty_requested FROM @items GROUP BY producto_id
        ) r ON r.producto_id = it.producto_id AND it.sucursal_id = @sucursal_id;

        COMMIT TRAN;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRAN;
        DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR('Error en sp_ProcessSale_Simple: %s', 16, 1, @msg);
        RETURN 99;
    END CATCH
END
GO

-- sp_CreateSale_DryRun_Simple: validación rápida sin modificar datos
IF OBJECT_ID(N'sp_CreateSale_DryRun_Simple', N'P') IS NOT NULL
    DROP PROCEDURE sp_CreateSale_DryRun_Simple;
GO
CREATE PROCEDURE sp_CreateSale_DryRun_Simple
    @sucursal_id INT,
    @items SaleItemType READONLY
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH requested AS (
        SELECT producto_id, SUM(cantidad) AS qty_requested
        FROM @items
        GROUP BY producto_id
    )
    SELECT r.producto_id, r.qty_requested, ISNULL(it.cantidad,0) AS qty_available,
           CASE WHEN it.cantidad IS NULL THEN 'sin_registro_en_inventario' WHEN it.cantidad < r.qty_requested THEN 'stock_insuficiente' ELSE 'ok' END AS estado
    FROM requested r
    LEFT JOIN inventario_tienda it ON it.producto_id = r.producto_id AND it.sucursal_id = @sucursal_id;

    RETURN 0;
END
GO

-- Tipo de tabla para pasar items de venta como TVP
IF TYPE_ID(N'SaleItemType') IS NULL
BEGIN
    -- CREATE TYPE must be the only statement in its batch; use dynamic SQL to create it conditionally
    EXEC(N'CREATE TYPE SaleItemType AS TABLE (
        producto_id INT NOT NULL,
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(10,2) NOT NULL,
        descuento DECIMAL(10,2) NULL,
        promocion_id INT NULL
    )');
END
GO

-- sp_ValidateStockAndReserve
-- Intenta decrementar inventario_tienda por sucursal de forma set-based.
-- Parámetros:
-- @sucursal_id INT: sucursal donde se realiza la venta
-- @items SaleItemType READONLY: lista de items (puede tener duplicados)
-- Retorna: tabla con producto_id y motivo si no hay stock suficiente
IF OBJECT_ID(N'sp_ValidateStockAndReserve', N'P') IS NOT NULL
    DROP PROCEDURE sp_ValidateStockAndReserve;
GO
CREATE PROCEDURE sp_ValidateStockAndReserve
    @sucursal_id INT,
    @items SaleItemType READONLY
AS
BEGIN
    SET NOCOUNT ON;

    -- Agrupar items por producto y sumar cantidades solicitadas
    ;WITH requested AS (
        SELECT producto_id, SUM(cantidad) AS qty_requested
        FROM @items
        GROUP BY producto_id
    )

    -- Chequear stock disponible para la sucursal
    SELECT r.producto_id, r.qty_requested, it.cantidad AS qty_available
    INTO #requested_stock
    FROM requested r
    LEFT JOIN inventario_tienda it
        ON it.producto_id = r.producto_id AND it.sucursal_id = @sucursal_id;

    -- Productos inexistentes en inventario_tienda aparecerán con qty_available = NULL
    CREATE TABLE #insufficient (
        producto_id INT,
        qty_requested INT,
        qty_available INT,
        motivo VARCHAR(200)
    );

    INSERT INTO #insufficient (producto_id, qty_requested, qty_available, motivo)
    SELECT producto_id, qty_requested, ISNULL(qty_available,0),
        CASE WHEN qty_available IS NULL THEN 'sin_registro_en_inventario' WHEN qty_available < qty_requested THEN 'stock_insuficiente' ELSE '' END
    FROM #requested_stock
    WHERE qty_available IS NULL OR qty_available < qty_requested;

    -- Devolver los faltantes (si hay)
    IF EXISTS (SELECT 1 FROM #insufficient)
    BEGIN
        SELECT producto_id, qty_requested, qty_available, motivo FROM #insufficient;
        RETURN 1; -- indica que hay insuficiencias
    END

    -- Si llegamos aquí, hay stock suficiente en principio. Proceder a decrementar
    -- No iniciamos/commitamos transacción aquí: el llamador (ej. sp_ProcessSale) debe controlar la transacción.
    -- Aplicamos hints de bloqueo para evitar condiciones de carrera mientras actualizamos filas.
    BEGIN TRY
        UPDATE it
        SET cantidad = it.cantidad - r.qty_requested,
            ultima_actualizacion = SYSUTCDATETIME()
        FROM inventario_tienda it WITH (UPDLOCK, ROWLOCK)
        INNER JOIN (
            SELECT producto_id, SUM(cantidad) AS qty_requested
            FROM @items
            GROUP BY producto_id
        ) r ON r.producto_id = it.producto_id
        WHERE it.sucursal_id = @sucursal_id
        AND it.cantidad >= r.qty_requested;

        -- Verificar que todas las filas fueron actualizadas
        IF @@ROWCOUNT < (SELECT COUNT(*) FROM (SELECT producto_id FROM @items GROUP BY producto_id) x)
        BEGIN
            -- Reconstruir lista de insuficientes (otra comprobación segura)
            SELECT r.producto_id, r.qty_requested, it.cantidad AS qty_available,
                CASE WHEN it.cantidad IS NULL THEN 'sin_registro_en_inventario' WHEN it.cantidad < r.qty_requested THEN 'stock_insuficiente' ELSE '' END AS motivo
            FROM (
                SELECT producto_id, SUM(cantidad) AS qty_requested FROM @items GROUP BY producto_id
            ) r
            LEFT JOIN inventario_tienda it ON it.producto_id = r.producto_id AND it.sucursal_id = @sucursal_id
            WHERE it.cantidad IS NULL OR it.cantidad < r.qty_requested;
            RETURN 2; -- indica fallo al aplicar decrementos
        END

        RETURN 0; -- éxito
    END TRY
    BEGIN CATCH
        DECLARE @errMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR('Error en sp_ValidateStockAndReserve: %s', 16, 1, @errMsg);
        RETURN 99;
    END CATCH
END
GO

-- sp_ProcessSale: procedimiento principal para procesar una venta completa
IF OBJECT_ID(N'sp_ProcessSale', N'P') IS NOT NULL
    DROP PROCEDURE sp_ProcessSale;
GO
CREATE PROCEDURE sp_ProcessSale
    @folio VARCHAR(50),
    @vendedor_id INT,
    @sucursal_id INT,
    @metodo_pago VARCHAR(20),
    @items SaleItemType READONLY,
    @out_venta_id INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validaciones de existencia básicas
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = @vendedor_id AND activo = 1)
    BEGIN
        RAISERROR('Vendedor no encontrado o inactivo', 16, 1);
        RETURN 1;
    END

    IF NOT EXISTS (SELECT 1 FROM sucursales WHERE id_sucursal = @sucursal_id AND activo = 1)
    BEGIN
        RAISERROR('Sucursal no encontrada o inactiva', 16, 1);
        RETURN 2;
    END

    IF NOT EXISTS (SELECT 1 FROM @items)
    BEGIN
        RAISERROR('No hay items en la venta', 16, 1);
        RETURN 3;
    END

    -- Agrupar items por producto para evitar duplicados.
    -- Para poder pasar el conjunto a sp_ValidateStockAndReserve (TVP) usamos una variable del tipo SaleItemType.
    DECLARE @items_grouped SaleItemType;

    INSERT INTO @items_grouped (producto_id, cantidad, precio_unitario, descuento, promocion_id)
    SELECT producto_id, SUM(cantidad) AS cantidad, MAX(precio_unitario) AS precio_unitario, MAX(ISNULL(descuento,0)) AS descuento, MAX(promocion_id)
    FROM @items
    GROUP BY producto_id;

    -- Validar que todos los productos existen
    IF EXISTS (
        SELECT 1 FROM @items_grouped ig
        LEFT JOIN productos p ON p.id = ig.producto_id
        WHERE p.id IS NULL OR p.activo = 0
    )
    BEGIN
        RAISERROR('Alguno(s) de los productos no existen o están inactivos', 16, 1);
        RETURN 4;
    END

    -- Comenzar transacción principal
    BEGIN TRAN;
    BEGIN TRY
        -- Reservar / decrementar stock usando el procedimiento auxiliar
    DECLARE @reserveResult INT;
    EXEC @reserveResult = sp_ValidateStockAndReserve @sucursal_id = @sucursal_id, @items = @items_grouped;
        IF @reserveResult <> 0
        BEGIN
            ROLLBACK TRAN;
            RAISERROR('No se pudo reservar stock (código %d)', 16, 1, @reserveResult);
            RETURN 5;
        END

        -- Insertar cabecera de venta con totales provisionales (serán recalculados)
        INSERT INTO ventas (folio, vendedor_id, sucursal_id, total, subtotal, iva, metodo_pago, estado)
        VALUES (@folio, @vendedor_id, @sucursal_id, 0, 0, 0, @metodo_pago, 'completada');

        SET @out_venta_id = SCOPE_IDENTITY();

        -- Insertar filas en detalle_ventas
        INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal, descuento, promocion_id)
        SELECT @out_venta_id, producto_id, cantidad, precio_unitario,
               (precio_unitario * cantidad) - ISNULL(descuento,0) AS subtotal,
               ISNULL(descuento,0) AS descuento,
               promocion_id
        FROM @items_grouped;

        -- Recalcular totales en cabecera (sum desde detalle)
        UPDATE ventas
        SET subtotal = (SELECT SUM(subtotal) FROM detalle_ventas WHERE venta_id = @out_venta_id),
            iva = 0, -- si aplican impuestos, calcular aquí
            total = (SELECT ISNULL(SUM(subtotal),0) FROM detalle_ventas WHERE venta_id = @out_venta_id)
        WHERE id = @out_venta_id;

        COMMIT TRAN;
        RETURN 0; -- éxito
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRAN;
        DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR('Error en sp_ProcessSale: %s', 16, 1, @msg);
        RETURN 99;
    END CATCH
END
GO

-- sp_CreateSale_DryRun: ejecuta validaciones sin afectar datos
IF OBJECT_ID(N'sp_CreateSale_DryRun', N'P') IS NOT NULL
    DROP PROCEDURE sp_CreateSale_DryRun;
GO
CREATE PROCEDURE sp_CreateSale_DryRun
    @sucursal_id INT,
    @items SaleItemType READONLY
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar existencia de sucursal
    IF NOT EXISTS (SELECT 1 FROM sucursales WHERE id_sucursal = @sucursal_id AND activo = 1)
    BEGIN
        RAISERROR('Sucursal no encontrada o inactiva', 16, 1);
        RETURN 1;
    END

    -- Agrupar items
    ;WITH requested AS (
        SELECT producto_id, SUM(cantidad) AS qty_requested
        FROM @items
        GROUP BY producto_id
    )

    SELECT r.producto_id, r.qty_requested, it.cantidad AS qty_available,
           CASE WHEN it.cantidad IS NULL THEN 'sin_registro_en_inventario' WHEN it.cantidad < r.qty_requested THEN 'stock_insuficiente' ELSE 'ok' END AS estado
    FROM requested r
    LEFT JOIN inventario_tienda it ON it.producto_id = r.producto_id AND it.sucursal_id = @sucursal_id;

    RETURN 0;
END
GO




CREATE PROCEDURE dbo.sp_hard_delete_proveedor
  @id INT,
  @force BIT = 0
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRANSACTION;

    -- Count dependent records
    DECLARE @cnt_pedidos INT = 0;
    SELECT @cnt_pedidos = COUNT(*) FROM pedidos_proveedores WHERE proveedor_id = @id;

    IF @cnt_pedidos > 0 AND @force = 0
    BEGIN
      RAISERROR('Proveedor tiene %d pedidos. Use @force=1 para eliminar y limpiar dependencias.', 16, 1, @cnt_pedidos);
      ROLLBACK TRANSACTION;
      RETURN;
    END

    -- If forced, remove pedidos (WARNING: data loss). You may change this to reassign instead.
    IF @cnt_pedidos > 0 AND @force = 1
    BEGIN
      DELETE FROM pedidos_proveedores WHERE proveedor_id = @id;
    END

    -- Unlink products (allow producto.proveedor_id to be NULL in schema)
    UPDATE productos SET proveedor_id = NULL WHERE proveedor_id = @id;

    -- Finally delete proveedor
    DELETE FROM proveedores WHERE id = @id;

    COMMIT TRANSACTION;

    -- Optionally return counts
    SELECT @cnt_pedidos AS pedidos_deleted, @@ROWCOUNT AS proveedores_deleted;
  END TRY
  BEGIN CATCH
    IF XACT_STATE() <> 0
      ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR('sp_hard_delete_proveedor failed: %s', 16, 1, @msg);
    RETURN;
  END CATCH
END
GO