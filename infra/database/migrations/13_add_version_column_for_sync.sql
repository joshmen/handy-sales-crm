-- ========================================
-- Script para agregar columna version para sincronizacion offline
-- Fase 2: Offline Sync para App Movil
-- Base de datos: MySQL
-- ========================================

USE handy_erp;

-- Agregar columna version a Clientes
ALTER TABLE Clientes ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Agregar columna version a Productos
ALTER TABLE Productos ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Agregar columna version a Pedidos
ALTER TABLE Pedidos ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Agregar columna version a DetallePedidos
ALTER TABLE DetallePedidos ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Agregar columna version a ClienteVisitas
ALTER TABLE ClienteVisitas ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Agregar columna version a RutasVendedor
ALTER TABLE RutasVendedor ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Agregar columna version a RutasDetalle
ALTER TABLE RutasDetalle ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Agregar columna version a otras tablas relevantes
ALTER TABLE Zonas ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE CategoriasClientes ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE CategoriasProductos ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE ListasPrecios ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE PreciosPorProducto ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE Inventario ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Crear indices para mejorar rendimiento de consultas de sincronizacion
-- (Solo si no existen)
CREATE INDEX IF NOT EXISTS idx_clientes_sync ON Clientes(tenant_id, actualizado_en);
CREATE INDEX IF NOT EXISTS idx_productos_sync ON Productos(tenant_id, actualizado_en);
CREATE INDEX IF NOT EXISTS idx_pedidos_sync ON Pedidos(tenant_id, usuario_id, actualizado_en);
CREATE INDEX IF NOT EXISTS idx_visitas_sync ON ClienteVisitas(tenant_id, usuario_id, actualizado_en);
CREATE INDEX IF NOT EXISTS idx_rutas_sync ON RutasVendedor(tenant_id, usuario_id, actualizado_en);

-- ========================================
-- Verificar que las columnas fueron agregadas
-- ========================================
-- SELECT
--     TABLE_NAME,
--     COLUMN_NAME,
--     COLUMN_TYPE
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = 'handy_erp'
-- AND COLUMN_NAME = 'version'
-- ORDER BY TABLE_NAME;
