-- ========================================
-- Script de Creacion de Tabla para Sesiones de Dispositivos
-- Fase 1: Gestion de Dispositivos para App Movil
-- Base de datos: MySQL
-- ========================================

USE handy_erp;

-- Tabla de Sesiones de Dispositivos
CREATE TABLE IF NOT EXISTS DeviceSessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  usuario_id INT NOT NULL,
  device_id VARCHAR(255) NOT NULL COMMENT 'Identificador unico del dispositivo',
  device_name VARCHAR(255) NULL COMMENT 'Nombre del dispositivo',
  device_type TINYINT NOT NULL DEFAULT 0 COMMENT '0=Unknown, 1=Web, 2=Android, 3=iOS, 4=Desktop',
  device_model VARCHAR(255) NULL COMMENT 'Modelo del dispositivo (ej: iPhone 15, Galaxy S24)',
  os_version VARCHAR(50) NULL COMMENT 'Version del sistema operativo',
  app_version VARCHAR(50) NULL COMMENT 'Version de la app instalada',
  push_token TEXT NULL COMMENT 'Token para notificaciones push (FCM/APNs)',
  refresh_token_id INT NULL COMMENT 'ID del refresh token asociado',
  ip_address VARCHAR(45) NULL COMMENT 'Direccion IP del ultimo acceso',
  user_agent TEXT NULL COMMENT 'User-Agent del navegador/app',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0=Active, 1=LoggedOut, 2=Expired, 3=RevokedByAdmin, 4=RevokedByUser',
  last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ultima actividad registrada',
  logged_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha/hora de inicio de sesion',
  logged_out_at DATETIME NULL COMMENT 'Fecha/hora de cierre de sesion',
  logout_reason VARCHAR(255) NULL COMMENT 'Razon del cierre de sesion',
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (refresh_token_id) REFERENCES RefreshTokens(Id) ON DELETE SET NULL
);

-- Indices para consultas frecuentes
CREATE INDEX idx_device_sessions_tenant_usuario ON DeviceSessions(tenant_id, usuario_id);
CREATE INDEX idx_device_sessions_tenant_device ON DeviceSessions(tenant_id, device_id);
CREATE INDEX idx_device_sessions_tenant_status ON DeviceSessions(tenant_id, status);
CREATE INDEX idx_device_sessions_last_activity ON DeviceSessions(last_activity);
CREATE INDEX idx_device_sessions_push_token ON DeviceSessions(push_token(255));
