-- ========================================
-- Migración: Agregar tabla MovimientosInventario
-- Fecha: 2026-02-07
-- Descripción: Tabla para registrar entradas, salidas y ajustes de inventario
-- ========================================

USE handy_erp;

-- Crear tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS MovimientosInventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    producto_id INT NOT NULL,
    tipo_movimiento VARCHAR(20) NOT NULL COMMENT 'ENTRADA, SALIDA, AJUSTE',
    cantidad DECIMAL(18,4) NOT NULL,
    cantidad_anterior DECIMAL(18,4) NOT NULL,
    cantidad_nueva DECIMAL(18,4) NOT NULL,
    motivo VARCHAR(50) NULL COMMENT 'COMPRA, VENTA, DEVOLUCION, AJUSTE_INVENTARIO, MERMA, TRANSFERENCIA',
    comentario VARCHAR(500) NULL,
    usuario_id INT NOT NULL,
    referencia_id INT NULL COMMENT 'ID de pedido, compra, etc.',
    referencia_tipo VARCHAR(50) NULL COMMENT 'PEDIDO, COMPRA, AJUSTE_MANUAL',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por VARCHAR(100) NULL,
    actualizado_en TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    actualizado_por VARCHAR(100) NULL,
    activo BOOLEAN DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 1,

    -- Foreign Keys
    CONSTRAINT fk_movimiento_tenant FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_movimiento_producto FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_movimiento_usuario FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE RESTRICT,

    -- Indexes
    INDEX idx_movimiento_tenant (tenant_id),
    INDEX idx_movimiento_producto (producto_id),
    INDEX idx_movimiento_fecha (creado_en),
    INDEX idx_movimiento_tipo (tipo_movimiento),
    INDEX idx_movimiento_tenant_fecha (tenant_id, creado_en DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificación
SELECT 'Tabla MovimientosInventario creada exitosamente' as mensaje;
DESCRIBE MovimientosInventario;
