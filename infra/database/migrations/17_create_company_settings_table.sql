-- Migration: Create company_settings table
-- Date: 2026-02-02
-- Description: Creates the company_settings table for storing per-tenant company configuration

USE handy_erp;

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    company_id INT NULL,
    company_name VARCHAR(255) NOT NULL DEFAULT 'Mi Empresa',
    primary_color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    secondary_color VARCHAR(20) NOT NULL DEFAULT '#8B5CF6',
    logo_url VARCHAR(500) NULL,
    logo_public_id VARCHAR(255) NULL,
    address VARCHAR(500) NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    website VARCHAR(255) NULL,
    description TEXT NULL,
    cloudinary_folder VARCHAR(255) NULL,
    -- Audit columns from AuditableEntity
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    creado_por VARCHAR(100) NULL,
    actualizado_por VARCHAR(100) NULL,
    version BIGINT NOT NULL DEFAULT 1,
    -- Foreign keys
    CONSTRAINT fk_company_settings_tenant FOREIGN KEY (tenant_id)
        REFERENCES Tenants(id) ON DELETE CASCADE,
    -- Unique constraint: one settings record per tenant
    CONSTRAINT uq_company_settings_tenant UNIQUE (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index for faster lookups
CREATE INDEX idx_company_settings_tenant_id ON company_settings(tenant_id);

-- Insert default settings for existing tenants
INSERT INTO company_settings (tenant_id, company_name, primary_color, secondary_color, creado_en)
SELECT id, nombre_empresa, '#3B82F6', '#8B5CF6', NOW()
FROM Tenants
WHERE id NOT IN (SELECT tenant_id FROM company_settings);

-- Verify migration
SELECT 'Migration 17: company_settings table created successfully' AS status;
SELECT COUNT(*) AS settings_count FROM company_settings;
