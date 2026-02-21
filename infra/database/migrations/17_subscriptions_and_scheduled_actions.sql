-- Migration 17: Add Stripe subscription fields, ScheduledActions, and SubscriptionPlans
-- Run on: local Docker MySQL + Railway production MySQL

USE handy_erp;

-- ============================================================
-- 1. Add Stripe + subscription status fields to Tenants
-- ============================================================

-- Use a procedure to safely add columns (MySQL 8.0 lacks ADD COLUMN IF NOT EXISTS)
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS add_column_if_missing(
    IN tbl VARCHAR(64), IN col VARCHAR(64), IN col_def VARCHAR(500)
)
BEGIN
    SET @exists = (SELECT COUNT(*) FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = col);
    IF @exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', col_def);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL add_column_if_missing('Tenants', 'stripe_customer_id', 'VARCHAR(255) NULL');
CALL add_column_if_missing('Tenants', 'stripe_subscription_id', 'VARCHAR(255) NULL');
CALL add_column_if_missing('Tenants', 'stripe_price_id', 'VARCHAR(255) NULL');
CALL add_column_if_missing('Tenants', 'subscription_status', "VARCHAR(20) NOT NULL DEFAULT 'Trial'");
CALL add_column_if_missing('Tenants', 'grace_period_end', 'DATETIME NULL');
CALL add_column_if_missing('Tenants', 'cancelled_at', 'DATETIME NULL');
CALL add_column_if_missing('Tenants', 'cancellation_reason', 'VARCHAR(500) NULL');

DROP PROCEDURE IF EXISTS add_column_if_missing;

-- Set existing tenants to 'Active' status
UPDATE Tenants SET subscription_status = 'Active' WHERE activo = 1 AND subscription_status = 'Trial';

-- ============================================================
-- 2. Create scheduled_actions table
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduled_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    target_id INT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    executed_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    notification_sent TINYINT(1) NOT NULL DEFAULT 0,
    reason VARCHAR(500) NULL,
    notes TEXT NULL,
    created_by_user_id INT NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_scheduled_status_at (status, scheduled_at),
    INDEX idx_scheduled_target (action_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Create subscription_plans table
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    precio_mensual DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_anual DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_usuarios INT NOT NULL DEFAULT 5,
    max_productos INT NOT NULL DEFAULT 100,
    max_clientes_por_mes INT NOT NULL DEFAULT 50,
    incluye_reportes TINYINT(1) NOT NULL DEFAULT 0,
    incluye_soporte_prioritario TINYINT(1) NOT NULL DEFAULT 0,
    stripe_price_id_mensual VARCHAR(255) NULL,
    stripe_price_id_anual VARCHAR(255) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    orden INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Seed subscription plans (Free, Basic, Pro)
-- ============================================================

INSERT INTO subscription_plans (nombre, codigo, precio_mensual, precio_anual, max_usuarios, max_productos, max_clientes_por_mes, incluye_reportes, incluye_soporte_prioritario, orden)
VALUES
    ('Gratis', 'FREE', 0, 0, 2, 50, 20, 0, 0, 1),
    ('Básico', 'BASIC', 499, 4990, 5, 500, 100, 1, 0, 2),
    ('Profesional', 'PRO', 999, 9990, 20, 5000, 500, 1, 1, 3)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
