USE GreenFis;
GO

BEGIN TRY
    BEGIN TRANSACTION;
    
    -- Deshabilitar constraints
    EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

    -- Limpiar en orden inverso a las dependencias
    DELETE FROM detalle_ventas;
    PRINT 'detalle_ventas limpiada';
    
    DELETE FROM transferencias_inventario;
    PRINT 'transferencias_inventario limpiada';
    
    DELETE FROM solicitudes_reabastecimiento;
    PRINT 'solicitudes_reabastecimiento limpiada';
    
    DELETE FROM pedidos_proveedores;
    PRINT 'pedidos_proveedores limpiada';
    
    DELETE FROM cortes_caja;
    PRINT 'cortes_caja limpiada';
    
    DELETE FROM reportes;
    PRINT 'reportes limpiada';
    
    DELETE FROM ventas;
    PRINT 'ventas limpiada';
    
    DELETE FROM promociones;
    PRINT 'promociones limpiada';
    
    DELETE FROM inventario_tienda;
    PRINT 'inventario_tienda limpiada';
    
    DELETE FROM inventario_almacen;
    PRINT 'inventario_almacen limpiada';
    
    DELETE FROM productos;
    PRINT 'productos limpiada';
    
    DELETE FROM categorias;
    PRINT 'categorias limpiada';
    
    DELETE FROM proveedores;
    PRINT 'proveedores limpiada';
    
    -- Manejar la referencia circular entre usuarios y sucursales
    UPDATE sucursales SET encargado_id = NULL;
    PRINT 'Referencias de encargado limpiadas';
    
    DELETE FROM usuarios;
    PRINT 'usuarios limpiada';
    
    DELETE FROM sucursales;
    PRINT 'sucursales limpiada';

    -- Resetear identities
    DECLARE @TableName VARCHAR(255);
    DECLARE TableCursor CURSOR FOR 
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE' 
    AND TABLE_CATALOG = 'GreenFis';
    
    OPEN TableCursor;
    FETCH NEXT FROM TableCursor INTO @TableName;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF OBJECTPROPERTY(OBJECT_ID(@TableName), 'TableHasIdentity') = 1
        BEGIN
            EXEC('DBCC CHECKIDENT (''' + @TableName + ''', RESEED, 0)');
            PRINT 'Identity reseteada en: ' + @TableName;
        END
        FETCH NEXT FROM TableCursor INTO @TableName;
    END
    
    CLOSE TableCursor;
    DEALLOCATE TableCursor;

    -- Habilitar constraints
    EXEC sp_MSforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL';

    COMMIT TRANSACTION;
    PRINT 'Base de datos limpiada exitosamente!';
    
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Error: ' + ERROR_MESSAGE();
END CATCH;