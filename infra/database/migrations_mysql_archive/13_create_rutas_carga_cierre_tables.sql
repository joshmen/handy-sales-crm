-- ========================================
-- Script de Migración: Rutas - Carga de Inventario y Cierre
-- Fase 2: Soporte para flujo operativo de rutas
-- Base de datos: MySQL
-- ========================================

USE handy_erp;

-- 1. Modificar tabla RutasVendedor (nuevas columnas para carga y cierre)
ALTER TABLE RutasVendedor
  ADD COLUMN efectivo_inicial DOUBLE NULL COMMENT 'Monto de viático/efectivo inicial',
  ADD COLUMN comentarios_carga TEXT NULL COMMENT 'Comentarios al cargar inventario',
  ADD COLUMN monto_recibido DOUBLE NULL COMMENT 'Efectivo recibido al cierre',
  ADD COLUMN cerrado_en DATETIME NULL,
  ADD COLUMN cerrado_por VARCHAR(255) NULL;

-- 2. Tabla de Carga de Ruta (productos cargados a la ruta)
CREATE TABLE IF NOT EXISTS RutasCarga (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruta_id INT NOT NULL,
  producto_id INT NOT NULL,
  tenant_id INT NOT NULL,
  cantidad_entrega INT NOT NULL DEFAULT 0 COMMENT 'Cantidad asignada desde pedidos de entrega',
  cantidad_venta INT NOT NULL DEFAULT 0 COMMENT 'Cantidad asignada para venta directa',
  cantidad_total INT NOT NULL DEFAULT 0 COMMENT 'Total cargado (entrega + venta)',
  precio_unitario DOUBLE NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  creado_por VARCHAR(255) NULL,
  actualizado_en DATETIME NULL,
  actualizado_por VARCHAR(255) NULL,
  version BIGINT NOT NULL DEFAULT 1,
  FOREIGN KEY (ruta_id) REFERENCES RutasVendedor(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_rutas_carga_ruta ON RutasCarga(ruta_id);
CREATE INDEX idx_rutas_carga_tenant ON RutasCarga(tenant_id, ruta_id);
CREATE UNIQUE INDEX idx_rutas_carga_ruta_producto ON RutasCarga(ruta_id, producto_id);

-- 3. Tabla de Pedidos Asignados a Ruta (para entrega)
CREATE TABLE IF NOT EXISTS RutasPedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruta_id INT NOT NULL,
  pedido_id INT NOT NULL,
  tenant_id INT NOT NULL,
  estado TINYINT NOT NULL DEFAULT 0 COMMENT '0=Asignado, 1=Entregado, 2=Devuelto',
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  FOREIGN KEY (ruta_id) REFERENCES RutasVendedor(id) ON DELETE CASCADE,
  FOREIGN KEY (pedido_id) REFERENCES Pedidos(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_rutas_pedidos_ruta ON RutasPedidos(ruta_id);
CREATE INDEX idx_rutas_pedidos_tenant ON RutasPedidos(tenant_id, ruta_id);
CREATE UNIQUE INDEX idx_rutas_pedidos_ruta_pedido ON RutasPedidos(ruta_id, pedido_id);

-- 4. Tabla de Retorno de Inventario (reconciliación al cierre)
CREATE TABLE IF NOT EXISTS RutasRetornoInventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruta_id INT NOT NULL,
  producto_id INT NOT NULL,
  tenant_id INT NOT NULL,
  cantidad_inicial INT NOT NULL DEFAULT 0 COMMENT 'Cantidad cargada al inicio',
  vendidos INT NOT NULL DEFAULT 0 COMMENT 'Productos vendidos (venta directa)',
  entregados INT NOT NULL DEFAULT 0 COMMENT 'Productos entregados (pedidos)',
  devueltos INT NOT NULL DEFAULT 0 COMMENT 'Productos devueltos por clientes',
  mermas INT NOT NULL DEFAULT 0 COMMENT 'Productos dañados/perdidos',
  rec_almacen INT NOT NULL DEFAULT 0 COMMENT 'Devuelto a almacén',
  carga_vehiculo INT NOT NULL DEFAULT 0 COMMENT 'Se queda en vehículo para siguiente ruta',
  diferencia INT NOT NULL DEFAULT 0 COMMENT 'Faltante: inicial - vendidos - entregados - devueltos - mermas - rec_almacen - carga_vehiculo',
  ventas_monto DOUBLE NOT NULL DEFAULT 0 COMMENT 'Monto total de ventas de este producto',
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  FOREIGN KEY (ruta_id) REFERENCES RutasVendedor(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_rutas_retorno_ruta ON RutasRetornoInventario(ruta_id);
CREATE INDEX idx_rutas_retorno_tenant ON RutasRetornoInventario(tenant_id, ruta_id);
CREATE UNIQUE INDEX idx_rutas_retorno_ruta_producto ON RutasRetornoInventario(ruta_id, producto_id);
