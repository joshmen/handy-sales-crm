-- ========================================
-- HandySales - Tabla de Historial de Notificaciones
-- Script: 14_create_notification_history_table.sql
-- Fecha: 2026-01-29
-- ========================================

USE handy_erp;

-- Crear tabla NotificationHistory
CREATE TABLE IF NOT EXISTS NotificationHistory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    usuario_id INT NULL,
    device_session_id INT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo INT NOT NULL DEFAULT 0 COMMENT '0=General, 1=Order, 2=Route, 3=Visit, 4=Alert, 5=System',
    status INT NOT NULL DEFAULT 0 COMMENT '0=Pending, 1=Sent, 2=Failed, 3=Delivered, 4=Read',
    data_json TEXT NULL,
    fcm_message_id VARCHAR(255) NULL,
    error_message TEXT NULL,
    enviado_en DATETIME NULL,
    leido_en DATETIME NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL,
    creado_por VARCHAR(255) NULL,
    actualizado_por VARCHAR(255) NULL,
    version BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT fk_notification_tenant FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_usuario FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    CONSTRAINT fk_notification_device_session FOREIGN KEY (device_session_id) REFERENCES DeviceSessions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para optimización de consultas
CREATE INDEX idx_notification_tenant_usuario ON NotificationHistory(tenant_id, usuario_id);
CREATE INDEX idx_notification_tenant_status ON NotificationHistory(tenant_id, status);
CREATE INDEX idx_notification_tenant_tipo ON NotificationHistory(tenant_id, tipo);
CREATE INDEX idx_notification_creado_en ON NotificationHistory(creado_en);
CREATE INDEX idx_notification_leido ON NotificationHistory(tenant_id, usuario_id, leido_en);

-- Agregar columna push_token_platform a DeviceSessions si no existe (para manejo de plataformas)
-- ALTER TABLE DeviceSessions ADD COLUMN IF NOT EXISTS push_token_platform VARCHAR(20) NULL AFTER push_token;

SELECT 'Tabla NotificationHistory creada exitosamente' AS resultado;
