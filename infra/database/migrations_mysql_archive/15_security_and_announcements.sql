-- ========================================
-- HandySales - Seguridad y Anuncios
-- Script: 15_security_and_announcements.sql
-- Fecha: 2026-02-11
-- ========================================

USE handy_erp;

-- ========================================
-- Session Version (sesión única por usuario)
-- ========================================
-- Note: MySQL 8.0 doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS
-- Run this only once or check column existence before running
ALTER TABLE Usuarios ADD COLUMN session_version INT NOT NULL DEFAULT 1;

-- ========================================
-- TOTP 2FA
-- ========================================
ALTER TABLE Usuarios ADD COLUMN totp_secret_encrypted VARCHAR(128) NULL;
ALTER TABLE Usuarios ADD COLUMN totp_enabled TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE Usuarios ADD COLUMN totp_enabled_at DATETIME NULL;

-- Recovery codes para 2FA
CREATE TABLE IF NOT EXISTS TwoFactorRecoveryCodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    used_at DATETIME NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recovery_usuario FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Announcements (Sistema de anuncios SuperAdmin)
-- ========================================
CREATE TABLE IF NOT EXISTS Announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo INT NOT NULL DEFAULT 0 COMMENT '0=Broadcast, 1=Maintenance, 2=Banner',
    prioridad INT NOT NULL DEFAULT 1 COMMENT '0=Low, 1=Normal, 2=High, 3=Critical',
    target_tenant_ids TEXT NULL COMMENT 'JSON array de tenant IDs, null=todos',
    target_roles TEXT NULL COMMENT 'JSON array de roles, null=todos',
    scheduled_at DATETIME NULL,
    expires_at DATETIME NULL,
    is_dismissible TINYINT(1) NOT NULL DEFAULT 1,
    super_admin_id INT NOT NULL,
    data_json TEXT NULL,
    sent_count INT NOT NULL DEFAULT 0,
    read_count INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL,
    creado_por VARCHAR(255) NULL,
    actualizado_por VARCHAR(255) NULL,
    version BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_announcement_superadmin FOREIGN KEY (super_admin_id) REFERENCES Usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tracking de banners descartados por usuarios
CREATE TABLE IF NOT EXISTS AnnouncementDismissals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    usuario_id INT NOT NULL,
    dismissed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dismissal_announcement FOREIGN KEY (announcement_id) REFERENCES Announcements(id) ON DELETE CASCADE,
    CONSTRAINT fk_dismissal_usuario FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uk_dismissal (announcement_id, usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Migración 15: Seguridad y Anuncios aplicada exitosamente' AS resultado;
