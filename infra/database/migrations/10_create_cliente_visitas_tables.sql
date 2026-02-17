-- ========================================
-- Script de Creacion de Tablas para Sistema de Visitas a Clientes
-- Fase 1: Visitas para App Movil
-- Base de datos: MySQL 8.0
-- ========================================

USE handy_erp;

-- Agregar columnas de geolocalizacion a Clientes (procedimiento seguro)
DELIMITER //
CREATE PROCEDURE AddColumnIfNotExists()
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'handy_erp'
                   AND TABLE_NAME = 'Clientes'
                   AND COLUMN_NAME = 'latitud') THEN
        ALTER TABLE Clientes ADD COLUMN latitud DOUBLE NULL;
    END IF;

    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'handy_erp'
                   AND TABLE_NAME = 'Clientes'
                   AND COLUMN_NAME = 'longitud') THEN
        ALTER TABLE Clientes ADD COLUMN longitud DOUBLE NULL;
    END IF;
END //
DELIMITER ;

CALL AddColumnIfNotExists();
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- Tabla principal de Visitas a Clientes
CREATE TABLE IF NOT EXISTS ClienteVisitas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  cliente_id INT NOT NULL,
  usuario_id INT NOT NULL,
  pedido_id INT NULL,
  fecha_programada DATETIME NULL,
  fecha_hora_inicio DATETIME NULL,
  fecha_hora_fin DATETIME NULL,
  tipo_visita TINYINT NOT NULL DEFAULT 0 COMMENT '0=Rutina, 1=Cobranza, 2=Entrega, 3=Prospeccion, 4=Seguimiento, 5=Otro',
  resultado TINYINT NOT NULL DEFAULT 0 COMMENT '0=Pendiente, 1=Venta, 2=SinVenta, 3=NoEncontrado, 4=Reprogramada, 5=Cancelada',
  latitud_inicio DOUBLE NULL,
  longitud_inicio DOUBLE NULL,
  latitud_fin DOUBLE NULL,
  longitud_fin DOUBLE NULL,
  distancia_cliente DOUBLE NULL COMMENT 'Distancia en metros desde check-in hasta ubicacion del cliente',
  notas TEXT NULL,
  notas_privadas TEXT NULL COMMENT 'Notas visibles solo para el vendedor',
  fotos JSON NULL COMMENT 'Array de URLs de fotos',
  duracion_minutos INT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (pedido_id) REFERENCES Pedidos(id) ON DELETE SET NULL
);

-- Indices para consultas frecuentes (usar IF NOT EXISTS para idempotencia)
-- Nota: MySQL no soporta CREATE INDEX IF NOT EXISTS, usamos ignorar errores
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = 'handy_erp' AND TABLE_NAME = 'ClienteVisitas' AND INDEX_NAME = 'idx_visitas_tenant_cliente') = 0,
    'CREATE INDEX idx_visitas_tenant_cliente ON ClienteVisitas(tenant_id, cliente_id)',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = 'handy_erp' AND TABLE_NAME = 'ClienteVisitas' AND INDEX_NAME = 'idx_visitas_tenant_usuario') = 0,
    'CREATE INDEX idx_visitas_tenant_usuario ON ClienteVisitas(tenant_id, usuario_id)',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = 'handy_erp' AND TABLE_NAME = 'ClienteVisitas' AND INDEX_NAME = 'idx_visitas_tenant_fecha_programada') = 0,
    'CREATE INDEX idx_visitas_tenant_fecha_programada ON ClienteVisitas(tenant_id, fecha_programada)',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = 'handy_erp' AND TABLE_NAME = 'ClienteVisitas' AND INDEX_NAME = 'idx_visitas_tenant_fecha_inicio') = 0,
    'CREATE INDEX idx_visitas_tenant_fecha_inicio ON ClienteVisitas(tenant_id, fecha_hora_inicio)',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = 'handy_erp' AND TABLE_NAME = 'ClienteVisitas' AND INDEX_NAME = 'idx_visitas_resultado') = 0,
    'CREATE INDEX idx_visitas_resultado ON ClienteVisitas(resultado)',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = 'handy_erp' AND TABLE_NAME = 'ClienteVisitas' AND INDEX_NAME = 'idx_visitas_pedido') = 0,
    'CREATE INDEX idx_visitas_pedido ON ClienteVisitas(pedido_id)',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
