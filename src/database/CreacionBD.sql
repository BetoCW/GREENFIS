CREATE DATABASE GreenFis;
GO

USE GreenFis;
GO

use master
-- =============================================
-- TABLAS MAESTRAS Y CONFIGURACIÓN
-- =============================================

-- Tabla de categorías para mejor normalización
CREATE TABLE categorias (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_categorias_nombre UNIQUE (nombre)
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
    nombre VARCHAR(50) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    encargado_id INT,
    CONSTRAINT UQ_sucursales_nombre UNIQUE (nombre)
);

-- Tabla de usuarios
CREATE TABLE usuarios(
    id_usuario INT PRIMARY KEY IDENTITY (1,1),
    nombre VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    sucursal_id INT,
    activo BIT DEFAULT 1,
    rol VARCHAR(15) NOT NULL,
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_ultimo_login DATETIME2,
    CONSTRAINT UQ_usuarios_correo UNIQUE (correo),
    CONSTRAINT CK_usuarios_rol CHECK (rol IN('gerente', 'almacenista', 'vendedor'))
);

-- Llaves foráneas para usuarios y sucursales
ALTER TABLE usuarios 
ADD CONSTRAINT FK_usuarios_sucursal_id 
FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal);

ALTER TABLE sucursales 
ADD CONSTRAINT FK_sucursales_encargado_id 
FOREIGN KEY (encargado_id) REFERENCES usuarios(id_usuario);

ALTER TABLE proveedores 
ADD CONSTRAINT FK_proveedores_creado_por 
FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario);

-- =============================================
-- TABLAS DE PRODUCTOS E INVENTARIOS
-- =============================================

CREATE TABLE productos (
    id INT PRIMARY KEY IDENTITY(1,1),
    codigo_barras VARCHAR(50),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    categoria_id INT,
    proveedor_id INT,
    stock_minimo INT DEFAULT 0,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_modificacion DATETIME2,
    creado_por INT,
    modificado_por INT,
    CONSTRAINT UQ_productos_codigo_barras UNIQUE (codigo_barras),
    CONSTRAINT CK_productos_precio CHECK (precio >= 0),
    CONSTRAINT CK_productos_stock_minimo CHECK (stock_minimo >= 0),
    CONSTRAINT FK_productos_categoria_id 
        FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    CONSTRAINT FK_productos_proveedor_id 
        FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    CONSTRAINT FK_productos_creado_por 
        FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario),
    CONSTRAINT FK_productos_modificado_por 
        FOREIGN KEY (modificado_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE inventario_tienda (
    id INT PRIMARY KEY IDENTITY(1,1),
    producto_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 0,
    ubicacion VARCHAR(100),
    ultima_actualizacion DATETIME2 DEFAULT GETDATE(),
    actualizado_por INT,
    CONSTRAINT CK_inventario_tienda_cantidad CHECK (cantidad >= 0),
    CONSTRAINT UQ_inventario_tienda_producto_sucursal UNIQUE (producto_id, sucursal_id),
    CONSTRAINT FK_inventario_tienda_producto_id 
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT FK_inventario_tienda_sucursal_id 
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal),
    CONSTRAINT FK_inventario_tienda_actualizado_por 
        FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE inventario_almacen (
    id INT PRIMARY KEY IDENTITY(1,1),
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 0,
    ubicacion VARCHAR(100),
    ultima_actualizacion DATETIME2 DEFAULT GETDATE(),
    actualizado_por INT,
    CONSTRAINT CK_inventario_almacen_cantidad CHECK (cantidad >= 0),
    CONSTRAINT UQ_inventario_almacen_producto UNIQUE (producto_id),
    CONSTRAINT FK_inventario_almacen_producto_id 
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT FK_inventario_almacen_actualizado_por 
        FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario)
);

-- =============================================
-- TABLAS DE VENTAS Y PROMOCIONES
-- =============================================

CREATE TABLE ventas (
    id INT PRIMARY KEY IDENTITY(1,1),
    folio VARCHAR(50) NOT NULL,
    vendedor_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    iva DECIMAL(10,2) NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(20) NOT NULL,
    estado VARCHAR(20) DEFAULT 'completada',
    fecha_venta DATETIME2 DEFAULT GETDATE(),
    fecha_cancelacion DATETIME2,
    cancelado_por INT,
    motivo_cancelacion VARCHAR(255),
    CONSTRAINT UQ_ventas_folio UNIQUE (folio),
    CONSTRAINT CK_ventas_total CHECK (total >= 0),
    CONSTRAINT CK_ventas_subtotal CHECK (subtotal >= 0),
    CONSTRAINT CK_ventas_metodo_pago 
        CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
    CONSTRAINT CK_ventas_estado 
        CHECK (estado IN ('completada', 'cancelada', 'pendiente')),
    CONSTRAINT FK_ventas_vendedor_id 
        FOREIGN KEY (vendedor_id) REFERENCES usuarios(id_usuario),
    CONSTRAINT FK_ventas_sucursal_id 
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal),
    CONSTRAINT FK_ventas_cancelado_por 
        FOREIGN KEY (cancelado_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE promociones (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    producto_id INT NOT NULL,
    tipo VARCHAR(30) NOT NULL,
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
    CONSTRAINT CK_promociones_tipo 
        CHECK (tipo IN ('descuento_porcentaje', 'descuento_fijo', '2x1', '3x2')),
    CONSTRAINT FK_promociones_producto_id 
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT FK_promociones_creada_por 
        FOREIGN KEY (creada_por) REFERENCES usuarios(id_usuario),
    CONSTRAINT FK_promociones_modificada_por 
        FOREIGN KEY (modificada_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE detalle_ventas (
    id INT PRIMARY KEY IDENTITY(1,1),
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0,
    promocion_id INT,
    CONSTRAINT CK_detalle_ventas_cantidad CHECK (cantidad > 0),
    CONSTRAINT CK_detalle_ventas_precio_unitario CHECK (precio_unitario >= 0),
    CONSTRAINT CK_detalle_ventas_subtotal CHECK (subtotal >= 0),
    CONSTRAINT FK_detalle_ventas_venta_id 
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    CONSTRAINT FK_detalle_ventas_producto_id 
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT FK_detalle_ventas_promocion_id 
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
    cantidad_solicitada INT NOT NULL,
    cantidad_aprobada INT,
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_solicitud DATETIME2 DEFAULT GETDATE(),
    fecha_aprobacion DATETIME2,
    aprobado_por INT,
    fecha_completado DATETIME2,
    completado_por INT,
    motivo_rechazo VARCHAR(255),
    CONSTRAINT CK_solicitudes_reabastecimiento_cantidad_solicitada 
        CHECK (cantidad_solicitada > 0),
    CONSTRAINT CK_solicitudes_reabastecimiento_cantidad_aprobada 
        CHECK (cantidad_aprobada >= 0),
    CONSTRAINT CK_solicitudes_reabastecimiento_estado 
        CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'completada')),
    CONSTRAINT FK_solicitudes_reabastecimiento_sucursal_id 
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal),
    CONSTRAINT FK_solicitudes_reabastecimiento_solicitante_id 
        FOREIGN KEY (solicitante_id) REFERENCES usuarios(id_usuario),
    CONSTRAINT FK_solicitudes_reabastecimiento_producto_id 
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT FK_solicitudes_reabastecimiento_aprobado_por 
        FOREIGN KEY (aprobado_por) REFERENCES usuarios(id_usuario),
    CONSTRAINT FK_solicitudes_reabastecimiento_completado_por 
        FOREIGN KEY (completado_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE transferencias_inventario (
    id INT PRIMARY KEY IDENTITY(1,1),
    solicitud_id INT,
    almacenista_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    sucursal_destino_id INT NOT NULL,
    fecha_transferencia DATETIME2 DEFAULT GETDATE(),
    estado VARCHAR(20) DEFAULT 'en_transito',
    fecha_completado DATETIME2,
    recibido_por INT,
    CONSTRAINT CK_transferencias_inventario_cantidad CHECK (cantidad > 0),
    CONSTRAINT CK_transferencias_inventario_estado 
        CHECK (estado IN ('en_transito', 'completada', 'cancelada')),
    CONSTRAINT FK_transferencias_inventario_solicitud_id 
        FOREIGN KEY (solicitud_id) REFERENCES solicitudes_reabastecimiento(id),
    CONSTRAINT FK_transferencias_inventario_almacenista_id 
        FOREIGN KEY (almacenista_id) REFERENCES usuarios(id_usuario),
    CONSTRAINT FK_transferencias_inventario_producto_id 
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT FK_transferencias_inventario_sucursal_destino_id 
        FOREIGN KEY (sucursal_destino_id) REFERENCES sucursales(id_sucursal),
    CONSTRAINT FK_transferencias_inventario_recibido_por 
        FOREIGN KEY (recibido_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE pedidos_proveedores (
    id INT PRIMARY KEY IDENTITY(1,1),
    proveedor_id INT NOT NULL,
    solicitante_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_compra DECIMAL(10,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_solicitud DATETIME2 DEFAULT GETDATE(),
    fecha_aprobacion DATETIME2,
    aprobado_por INT,
    fecha_recepcion DATETIME2,
    recibido_por INT,
    motivo_rechazo VARCHAR(255),
    CONSTRAINT CK_pedidos_proveedores_cantidad CHECK (cantidad > 0),
    CONSTRAINT CK_pedidos_proveedores_estado 
        CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'recibido')),
    CONSTRAINT FK_pedidos_proveedores_proveedor_id 
        FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    CONSTRAINT FK_pedidos_proveedores_solicitante_id 
        FOREIGN KEY (solicitante_id) REFERENCES usuarios(id_usuario),
    CONSTRAINT FK_pedidos_proveedores_producto_id 
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT FK_pedidos_proveedores_aprobado_por 
        FOREIGN KEY (aprobado_por) REFERENCES usuarios(id_usuario),
    CONSTRAINT FK_pedidos_proveedores_recibido_por 
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
    monto_total DECIMAL(12,2) DEFAULT 0,
    monto_efectivo DECIMAL(12,2) DEFAULT 0,
    monto_tarjeta DECIMAL(12,2) DEFAULT 0,
    monto_transferencia DECIMAL(12,2) DEFAULT 0,
    diferencia DECIMAL(10,2) DEFAULT 0,
    observaciones TEXT,
    fecha_cierre DATETIME2 DEFAULT GETDATE(),
    cerrado_por INT,
    CONSTRAINT CK_cortes_caja_monto_total CHECK (monto_total >= 0),
    CONSTRAINT CK_cortes_caja_monto_efectivo CHECK (monto_efectivo >= 0),
    CONSTRAINT CK_cortes_caja_monto_tarjeta CHECK (monto_tarjeta >= 0),
    CONSTRAINT CK_cortes_caja_monto_transferencia CHECK (monto_transferencia >= 0),
    CONSTRAINT FK_cortes_caja_vendedor_id 
        FOREIGN KEY (vendedor_id) REFERENCES usuarios(id_usuario),
    CONSTRAINT FK_cortes_caja_sucursal_id 
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal),
    CONSTRAINT FK_cortes_caja_cerrado_por 
        FOREIGN KEY (cerrado_por) REFERENCES usuarios(id_usuario)
);

CREATE TABLE reportes (
    id INT PRIMARY KEY IDENTITY(1,1),
    tipo VARCHAR(20) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    sucursal_id INT,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    monto_ventas DECIMAL(12,2),
    generado_por INT NOT NULL,
    fecha_generacion DATETIME2 DEFAULT GETDATE(),
    archivo_path VARCHAR(500),
    parametros TEXT,
    CONSTRAINT CK_reportes_tipo 
        CHECK (tipo IN ('ventas', 'inventario', 'solicitudes', 'promociones', 'cortes_caja')),
    CONSTRAINT FK_reportes_sucursal_id 
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id_sucursal),
    CONSTRAINT FK_reportes_generado_por 
        FOREIGN KEY (generado_por) REFERENCES usuarios(id_usuario)
);