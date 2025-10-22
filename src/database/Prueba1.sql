-- Script Completo Base de Datos GreenFis - SQL Server 2022
-- Incluye todas las tablas, relaciones y flujos completos del sistema

CREATE DATABASE GreenFis;
GO

USE GreenFis;
GO

-- =============================================
-- TABLAS MAESTRAS Y CONFIGURACIÓN
-- =============================================

-- Tabla de categorías para mejor normalización
CREATE TABLE categorias (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME2 DEFAULT GETDATE()
);

-- Tabla de proveedores
CREATE TABLE proveedores (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(200) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    correo VARCHAR(100),
    direccion TEXT,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    creado_por INT
);

-- Tabla de sucursales
CREATE TABLE sucursales(
    id_sucursal INT PRIMARY KEY IDENTITY (1,1),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME2 DEFAULT GETDATE()
);

-- Tabla de usuarios
CREATE TABLE usuarios(
    id_usuario INT PRIMARY KEY IDENTITY (1,1),
    nombre VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    sucursal_id INT,
    activo BIT DEFAULT 1,
    rol VARCHAR(15) NOT NULL CHECK(rol IN('gerente', 'almacenista', 'vendedor')),
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_ultimo_login DATETIME2,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal)
);


-- Actualizar tabla sucursales para agregar encargado (depende de usuarios)
ALTER TABLE sucursales 
ADD encargado_id INT,
FOREIGN KEY (encargado_id) REFERENCES usuarios(id_usuario);

-- Actualizar tabla proveedores para agregar creado_por
ALTER TABLE proveedores 
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario);

-- =============================================
-- TABLAS DE PRODUCTOS E INVENTARIOS
-- =============================================

CREATE TABLE productos (
    id INT PRIMARY KEY IDENTITY(1,1),
    codigo_barras VARCHAR(50) UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    categoria_id INT,
    proveedor_id INT,
    stock_minimo INT DEFAULT 0,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_modificacion DATETIME2,
    creado_por INT,
    modificado_por INT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (modificado_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE inventario_tienda (
    id INT PRIMARY KEY IDENTITY(1,1),
    producto_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    ubicacion VARCHAR(100),
    ultima_actualizacion DATETIME2 DEFAULT GETDATE(),
    actualizado_por INT,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal),
    FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario),
    CONSTRAINT UQ_ProductoSucursal UNIQUE (producto_id, sucursal_id)
);

CREATE TABLE inventario_almacen (
    id INT PRIMARY KEY IDENTITY(1,1),
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    ubicacion VARCHAR(100),
    ultima_actualizacion DATETIME2 DEFAULT GETDATE(),
    actualizado_por INT,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario),
    CONSTRAINT UQ_ProductoAlmacen UNIQUE (producto_id)
);

-- =============================================
-- TABLAS DE VENTAS Y PROMOCIONES
-- =============================================

CREATE TABLE ventas (
    id INT PRIMARY KEY IDENTITY(1,1),
    folio VARCHAR(50) UNIQUE NOT NULL,
    vendedor_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    iva DECIMAL(10,2) NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
    estado VARCHAR(20) DEFAULT 'completada' CHECK (estado IN ('completada', 'cancelada', 'pendiente')),
    fecha_venta DATETIME2 DEFAULT GETDATE(),
    fecha_cancelacion DATETIME2,
    cancelado_por INT,
    motivo_cancelacion VARCHAR(255),
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal),
    FOREIGN KEY (cancelado_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE promociones (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    producto_id INT NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('descuento_porcentaje', 'descuento_fijo', '2x1', '3x2')),
    valor_descuento DECIMAL(10,2),
    nuevo_precio DECIMAL(10,2),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    dias_semana VARCHAR(100),
    aplica_todas_sucursales BIT DEFAULT 1,
    activa BIT DEFAULT 1,
    creada_por INT NOT NULL,
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_modificacion DATETIME2,
    modificada_por INT,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (creada_por) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (modificada_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE detalle_ventas (
    id INT PRIMARY KEY IDENTITY(1,1),
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    descuento DECIMAL(10,2) DEFAULT 0,
    promocion_id INT,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (promocion_id) REFERENCES promociones(id)
);

-- =============================================
-- TABLAS DE REABASTECIMIENTO Y TRANSFERENCIAS
-- =============================================

CREATE TABLE solicitudes_reabastecimiento (
    id INT PRIMARY KEY IDENTITY(1,1),
    sucursal_id INT NOT NULL,
    solicitante_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad_solicitada INT NOT NULL CHECK (cantidad_solicitada > 0),
    cantidad_aprobada INT CHECK (cantidad_aprobada >= 0),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'completada')),
    fecha_solicitud DATETIME2 DEFAULT GETDATE(),
    fecha_aprobacion DATETIME2,
    aprobado_por INT,
    fecha_completado DATETIME2,
    completado_por INT,
    motivo_rechazo VARCHAR(255),
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal),
    FOREIGN KEY (solicitante_id) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (completado_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE transferencias_inventario (
    id INT PRIMARY KEY IDENTITY(1,1),
    solicitud_id INT,
    almacenista_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    sucursal_destino_id INT NOT NULL,
    fecha_transferencia DATETIME2 DEFAULT GETDATE(),
    estado VARCHAR(20) DEFAULT 'en_transito' CHECK (estado IN ('en_transito', 'completada', 'cancelada')),
    fecha_completado DATETIME2,
    recibido_por INT,
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_reabastecimiento(id),
    FOREIGN KEY (almacenista_id) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (sucursal_destino_id) REFERENCES sucursales(id_sucursal),
    FOREIGN KEY (recibido_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE pedidos_proveedores (
    id INT PRIMARY KEY IDENTITY(1,1),
    proveedor_id INT NOT NULL,
    solicitante_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_compra DECIMAL(10,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'recibido')),
    fecha_solicitud DATETIME2 DEFAULT GETDATE(),
    fecha_aprobacion DATETIME2,
    aprobado_por INT,
    fecha_recepcion DATETIME2,
    recibido_por INT,
    motivo_rechazo VARCHAR(255),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (solicitante_id) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (recibido_por) REFERENCES usuarios(id_usuario)
);

-- =============================================
-- TABLAS DE REPORTES Y CORTES DE CAJA
-- =============================================

CREATE TABLE cortes_caja (
    id INT PRIMARY KEY IDENTITY(1,1),
    vendedor_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    fecha_corte DATE NOT NULL,
    ventas_totales INT DEFAULT 0,
    monto_total DECIMAL(12,2) DEFAULT 0 CHECK (monto_total >= 0),
    monto_efectivo DECIMAL(12,2) DEFAULT 0 CHECK (monto_efectivo >= 0),
    monto_tarjeta DECIMAL(12,2) DEFAULT 0 CHECK (monto_tarjeta >= 0),
    monto_transferencia DECIMAL(12,2) DEFAULT 0 CHECK (monto_transferencia >= 0),
    diferencia DECIMAL(10,2) DEFAULT 0,
    observaciones TEXT,
    fecha_cierre DATETIME2 DEFAULT GETDATE(),
    cerrado_por INT,
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal),
    FOREIGN KEY (cerrado_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE reportes (
    id INT PRIMARY KEY IDENTITY(1,1),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ventas', 'inventario', 'solicitudes', 'promociones', 'cortes_caja')),
    nombre VARCHAR(200) NOT NULL,
    sucursal_id INT,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    monto_ventas DECIMAL(12,2),
    generado_por INT NOT NULL,
    fecha_generacion DATETIME2 DEFAULT GETDATE(),
    archivo_path VARCHAR(500),
    parametros TEXT, -- JSON con parámetros del reporte
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal),
    FOREIGN KEY (generado_por) REFERENCES usuarios(id_usuario)
);

-- =============================================
-- TABLAS DE AUDITORÍA Y LOGS
-- =============================================

CREATE TABLE auditoria_inventario (
    id INT PRIMARY KEY IDENTITY(1,1),
    tabla_afectada VARCHAR(50) NOT NULL,
    registro_id INT NOT NULL,
    accion VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    usuario_id INT NOT NULL,
    fecha_accion DATETIME2 DEFAULT GETDATE(),
    valores_anteriores TEXT, -- JSON con valores anteriores
    valores_nuevos TEXT, -- JSON con valores nuevos
    ip_address VARCHAR(45),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario)
);

CREATE TABLE logs_sistema (
    id INT PRIMARY KEY IDENTITY(1,1),
    nivel VARCHAR(20) NOT NULL CHECK (nivel IN ('INFO', 'WARNING', 'ERROR')),
    modulo VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    usuario_id INT,
    fecha_log DATETIME2 DEFAULT GETDATE(),
    ip_address VARCHAR(45),
    stack_trace TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario)
);

-- =============================================
-- ÍNDICES PARA MEJOR PERFORMANCE
-- =============================================

-- Índices para ventas
CREATE INDEX IX_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX IX_ventas_vendedor ON ventas(vendedor_id);
CREATE INDEX IX_ventas_sucursal ON ventas(sucursal_id);
CREATE INDEX IX_ventas_estado ON ventas(estado);

-- Índices para inventarios
CREATE INDEX IX_inventario_tienda_sucursal ON inventario_tienda(sucursal_id);
CREATE INDEX IX_inventario_tienda_producto ON inventario_tienda(producto_id);
CREATE INDEX IX_inventario_almacen_producto ON inventario_almacen(producto_id);

-- Índices para detalle_ventas
CREATE INDEX IX_detalle_ventas_venta ON detalle_ventas(venta_id);
CREATE INDEX IX_detalle_ventas_producto ON detalle_ventas(producto_id);

-- Índices para solicitudes y transferencias
CREATE INDEX IX_solicitudes_estado ON solicitudes_reabastecimiento(estado);
CREATE INDEX IX_solicitudes_sucursal ON solicitudes_reabastecimiento(sucursal_id);
CREATE INDEX IX_transferencias_estado ON transferencias_inventario(estado);
CREATE INDEX IX_pedidos_proveedores_estado ON pedidos_proveedores(estado);

-- Índices para reportes y auditoría
CREATE INDEX IX_reportes_fecha ON reportes(fecha_generacion);
CREATE INDEX IX_auditoria_fecha ON auditoria_inventario(fecha_accion);
CREATE INDEX IX_logs_fecha ON logs_sistema(fecha_log);

-- =============================================
-- TRIGGERS PARA AUDITORÍA AUTOMÁTICA
-- =============================================

CREATE TRIGGER TR_productos_auditoria
ON productos AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO auditoria_inventario (
        tabla_afectada, registro_id, accion, usuario_id, 
        valores_anteriores, valores_nuevos
    )
    SELECT 
        'productos',
        d.id,
        'UPDATE',
        ISNULL(d.modificado_por, 1), -- Usar sistema si no hay usuario
        (SELECT * FROM deleted WHERE id = d.id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        (SELECT * FROM inserted WHERE id = d.id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted d;
    
    UPDATE productos 
    SET fecha_modificacion = GETDATE()
    FROM inserted i WHERE productos.id = i.id;
END;
GO

CREATE TRIGGER TR_inventario_tienda_auditoria
ON inventario_tienda AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO auditoria_inventario (
        tabla_afectada, registro_id, accion, usuario_id,
        valores_anteriores, valores_nuevos
    )
    SELECT 
        'inventario_tienda',
        d.id,
        'UPDATE',
        ISNULL(d.actualizado_por, 1),
        (SELECT producto_id, sucursal_id, cantidad FROM deleted WHERE id = d.id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        (SELECT producto_id, sucursal_id, cantidad FROM inserted WHERE id = d.id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted d;
END;
GO

-- =============================================
-- VISTAS ÚTILES PARA CONSULTAS FRECUENTES
-- =============================================

CREATE VIEW vw_inventario_completo AS
SELECT 
    p.id AS producto_id,
    p.nombre AS producto,
    p.codigo_barras,
    c.nombre AS categoria,
    s.id_sucursal,
    s.nombre AS sucursal,
    it.cantidad AS stock_sucursal,
    ia.cantidad AS stock_almacen,
    p.stock_minimo,
    CASE 
        WHEN it.cantidad <= p.stock_minimo THEN 'BAJO'
        WHEN it.cantidad = 0 THEN 'AGOTADO'
        ELSE 'NORMAL'
    END AS estado_stock
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN inventario_tienda it ON p.id = it.producto_id
LEFT JOIN inventario_almacen ia ON p.id = ia.producto_id
LEFT JOIN sucursales s ON it.sucursal_id = s.id_sucursal
WHERE p.activo = 1;
GO

CREATE VIEW vw_ventas_detalladas AS
SELECT 
    v.folio,
    v.fecha_venta,
    v.total,
    v.metodo_pago,
    v.estado,
    u.nombre AS vendedor,
    s.nombre AS sucursal,
    dv.producto_id,
    p.nombre AS producto,
    dv.cantidad,
    dv.precio_unitario,
    dv.subtotal,
    dv.descuento,
    prom.nombre AS promocion
FROM ventas v
JOIN usuarios u ON v.vendedor_id = u.id_usuario
JOIN sucursales s ON v.sucursal_id = s.id_sucursal
JOIN detalle_ventas dv ON v.id = dv.venta_id
JOIN productos p ON dv.producto_id = p.id
LEFT JOIN promociones prom ON dv.promocion_id = prom.id;
GO

-- =============================================
-- DATOS INICIALES DE CONFIGURACIÓN
-- =============================================

-- Insertar categorías básicas
INSERT INTO categorias (nombre, descripcion) VALUES
('Electrónicos', 'Dispositivos electrónicos y tecnología'),
('Hogar', 'Artículos para el hogar'),
('Deportes', 'Equipo y ropa deportiva'),
('Ropa', 'Prendas de vestir'),
('Alimentos', 'Productos alimenticios');

-- Insertar sucursal principal
INSERT INTO sucursales (nombre, direccion, telefono) VALUES
('Matriz', 'Av. Principal #123', '555-0001'),
('Sucursal Norte', 'Zona Norte #456', '555-0002'),
('Sucursal Sur', 'Zona Sur #789', '555-0003');

-- Insertar usuario gerente inicial (contraseña temporal)
INSERT INTO usuarios (nombre, correo, contrasena, sucursal_id, rol) VALUES
('Gerente Principal', 'gerente@greenfis.com', 'pasword', 1, 'gerente'),
('Vendedor Sucursal1', 'vendedor@greenfis.com', 'pasword', 1, 'vendedor'),
('almacenista', 'almacenista@greenfis.com', 'password', 1, 'almacenista');


INSERT INTO usuarios (nombre, correo, contrasena, sucursal_id, rol) VALUES
('almacenista', 'almacenista@greenfis.com', 'password',1,'almacenista')

-- Actualizar sucursal con gerente
UPDATE sucursales SET encargado_id = 1 WHERE id_sucursal = 1;

PRINT 'Base de datos GreenFis creada exitosamente!';
PRINT 'Estructura completa con todos los flujos implementados.';
PRINT 'Usuario inicial: gerente@greenfis.com / temp123';