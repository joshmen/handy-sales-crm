-- Migration 008: Add subscription and contact fields to Tenants
-- Run on: local Docker MySQL + Railway production MySQL

USE handy_erp;

ALTER TABLE Tenants ADD COLUMN plan_tipo VARCHAR(20) DEFAULT 'basic' AFTER activo;
ALTER TABLE Tenants ADD COLUMN max_usuarios INT NOT NULL DEFAULT 10 AFTER plan_tipo;
ALTER TABLE Tenants ADD COLUMN fecha_suscripcion DATETIME NULL AFTER max_usuarios;
ALTER TABLE Tenants ADD COLUMN fecha_expiracion DATETIME NULL AFTER fecha_suscripcion;
ALTER TABLE Tenants ADD COLUMN telefono VARCHAR(20) NULL AFTER contacto;
ALTER TABLE Tenants ADD COLUMN email VARCHAR(255) NULL AFTER telefono;
ALTER TABLE Tenants ADD COLUMN direccion VARCHAR(500) NULL AFTER email;

-- Set subscription dates for existing tenants
UPDATE Tenants SET
    fecha_suscripcion = creado_en,
    fecha_expiracion = DATE_ADD(NOW(), INTERVAL 1 YEAR)
WHERE fecha_suscripcion IS NULL;
