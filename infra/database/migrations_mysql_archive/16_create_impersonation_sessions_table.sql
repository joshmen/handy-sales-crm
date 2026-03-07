-- =====================================================
-- Script 16: Create ImpersonationSessions table
-- Descripción: Tabla para auditoría de impersonación de SUPER_ADMIN
-- Esta es una tabla platform-level (NO tiene tenant_id)
-- Los registros son INMUTABLES para cumplimiento legal
-- =====================================================

USE handy_erp;

-- Crear tabla ImpersonationSessions
CREATE TABLE IF NOT EXISTS ImpersonationSessions (
    id CHAR(36) NOT NULL PRIMARY KEY,

    -- Información del Super Admin
    super_admin_id INT NOT NULL,
    super_admin_email VARCHAR(255) NOT NULL,
    super_admin_name VARCHAR(255) NOT NULL,

    -- Información del Tenant objetivo
    target_tenant_id INT NOT NULL,
    target_tenant_name VARCHAR(255) NOT NULL,

    -- Justificación (obligatoria)
    reason VARCHAR(1000) NOT NULL,
    ticket_number VARCHAR(100) NULL,

    -- Nivel de acceso
    access_level VARCHAR(20) NOT NULL DEFAULT 'READ_ONLY',

    -- Tiempos
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,
    expires_at DATETIME NOT NULL,

    -- Información de conexión
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(500) NULL,

    -- Estado: ACTIVE, ENDED, EXPIRED
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    -- Auditoría de acciones (JSON arrays)
    actions_performed JSON NOT NULL,
    pages_visited JSON NOT NULL,

    -- Notificaciones
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    notification_sent_at DATETIME NULL,

    -- Foreign Keys
    CONSTRAINT fk_impersonation_super_admin
        FOREIGN KEY (super_admin_id) REFERENCES Usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_impersonation_tenant
        FOREIGN KEY (target_tenant_id) REFERENCES Tenants(id) ON DELETE RESTRICT,

    -- Constraints
    CONSTRAINT chk_access_level CHECK (access_level IN ('READ_ONLY', 'READ_WRITE')),
    CONSTRAINT chk_status CHECK (status IN ('ACTIVE', 'ENDED', 'EXPIRED'))
);

-- Índices para búsqueda rápida
CREATE INDEX idx_impersonation_super_admin ON ImpersonationSessions(super_admin_id);
CREATE INDEX idx_impersonation_tenant ON ImpersonationSessions(target_tenant_id);
CREATE INDEX idx_impersonation_status ON ImpersonationSessions(status);
CREATE INDEX idx_impersonation_started_at ON ImpersonationSessions(started_at);
CREATE INDEX idx_impersonation_super_admin_status ON ImpersonationSessions(super_admin_id, status);
CREATE INDEX idx_impersonation_tenant_status ON ImpersonationSessions(target_tenant_id, status);

-- Índice compuesto para búsqueda de sesiones activas expiradas
CREATE INDEX idx_impersonation_active_expiry ON ImpersonationSessions(status, expires_at);

-- =====================================================
-- IMPORTANTE: Esta tabla NO debe tener:
-- 1. Triggers de UPDATE que modifiquen registros existentes
-- 2. Permisos de DELETE para usuarios normales
-- 3. Filtro de tenant (es platform-level)
--
-- Los únicos cambios permitidos:
-- - status: ACTIVE -> ENDED (cuando admin termina sesión)
-- - status: ACTIVE -> EXPIRED (por job de expiración)
-- - ended_at: NULL -> timestamp (cuando termina)
-- - actions_performed: append (agregar acciones)
-- - pages_visited: append (agregar páginas)
-- - notification_sent: false -> true
-- - notification_sent_at: NULL -> timestamp
-- =====================================================

-- Verificar creación
SELECT 'ImpersonationSessions table created successfully' AS status;
SELECT COUNT(*) AS row_count FROM ImpersonationSessions;
