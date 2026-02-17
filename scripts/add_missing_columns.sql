USE handy_erp;

-- Add missing columns to Usuarios table
ALTER TABLE Usuarios
  ADD COLUMN avatar_url VARCHAR(500) NULL,
  ADD COLUMN company_id INT NULL,
  ADD COLUMN role_id INT NULL,
  ADD COLUMN es_super_admin TINYINT(1) DEFAULT 0,
  ADD COLUMN version BIGINT DEFAULT 1;

-- Verify structure
DESCRIBE Usuarios;
