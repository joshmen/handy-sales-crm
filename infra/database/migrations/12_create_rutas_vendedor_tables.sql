-- ========================================
-- Script de Creacion de Tablas para Rutas de Vendedor
-- Fase 2: Rutas de Vendedor para App Movil
-- Base de datos: MySQL
-- ========================================

USE handy_erp;

-- Tabla principal de Rutas de Vendedor
CREATE TABLE IF NOT EXISTS RutasVendedor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  usuario_id INT NOT NULL,
  zona_id INT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT NULL,
  fecha DATE NOT NULL,
  hora_inicio_estimada TIME NULL,
  hora_fin_estimada TIME NULL,
  hora_inicio_real DATETIME NULL,
  hora_fin_real DATETIME NULL,
  estado TINYINT NOT NULL DEFAULT 0 COMMENT '0=Planificada, 1=EnProgreso, 2=Completada, 3=Cancelada',
  kilometros_estimados DOUBLE NULL,
  kilometros_reales DOUBLE NULL,
  motivo_cancelacion TEXT NULL,
  notas TEXT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  version BIGINT NOT NULL DEFAULT 1,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (zona_id) REFERENCES Zonas(id) ON DELETE SET NULL
);

-- Indices para consultas frecuentes
CREATE INDEX idx_rutas_tenant_usuario ON RutasVendedor(tenant_id, usuario_id);
CREATE INDEX idx_rutas_tenant_fecha ON RutasVendedor(tenant_id, fecha);
CREATE INDEX idx_rutas_tenant_estado ON RutasVendedor(tenant_id, estado);
CREATE INDEX idx_rutas_tenant_zona ON RutasVendedor(tenant_id, zona_id);

-- Tabla de Detalles de Ruta (Paradas)
CREATE TABLE IF NOT EXISTS RutasDetalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruta_id INT NOT NULL,
  cliente_id INT NOT NULL,
  orden_visita INT NOT NULL DEFAULT 0,
  hora_estimada_llegada TIME NULL,
  duracion_estimada_minutos INT NULL DEFAULT 30,
  hora_llegada_real DATETIME NULL,
  hora_salida_real DATETIME NULL,
  latitud_llegada DOUBLE NULL,
  longitud_llegada DOUBLE NULL,
  latitud DOUBLE NULL,
  longitud DOUBLE NULL,
  distancia_desde_anterior DOUBLE NULL,
  estado TINYINT NOT NULL DEFAULT 0 COMMENT '0=Pendiente, 1=EnCamino, 2=Visitado, 3=Omitido',
  razon_omision TEXT NULL,
  visita_id INT NULL COMMENT 'FK a ClienteVisitas si se creo visita',
  pedido_id INT NULL COMMENT 'FK a Pedidos si se creo pedido',
  notas TEXT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  version BIGINT NOT NULL DEFAULT 1,
  FOREIGN KEY (ruta_id) REFERENCES RutasVendedor(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (visita_id) REFERENCES ClienteVisitas(id) ON DELETE SET NULL,
  FOREIGN KEY (pedido_id) REFERENCES Pedidos(id) ON DELETE SET NULL
);

-- Indices para RutasDetalle
CREATE INDEX idx_rutas_detalle_ruta_orden ON RutasDetalle(ruta_id, orden_visita);
CREATE INDEX idx_rutas_detalle_ruta_cliente ON RutasDetalle(ruta_id, cliente_id);
CREATE INDEX idx_rutas_detalle_estado ON RutasDetalle(estado);

-- ========================================
-- Datos de ejemplo (opcional, comentar en produccion)
-- ========================================

-- Ejemplo de ruta para vendedor
-- INSERT INTO RutasVendedor (tenant_id, usuario_id, zona_id, nombre, fecha, hora_inicio_estimada, hora_fin_estimada, estado)
-- SELECT 1, u.id, z.id, 'Ruta Centro - Lunes', CURDATE(), '08:00:00', '17:00:00', 0
-- FROM Usuarios u
-- LEFT JOIN Zonas z ON z.tenant_id = 1
-- WHERE u.tenant_id = 1 AND u.es_admin = FALSE
-- LIMIT 1;
