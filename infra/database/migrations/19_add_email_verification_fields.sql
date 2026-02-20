-- Migration 19: Add email verification fields to Usuarios
-- Required for registration flow with email verification

-- Check if columns already exist before adding (MySQL 8.0 compatible)
SET @dbname = DATABASE();

SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Usuarios' AND COLUMN_NAME = 'email_verificado';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuarios ADD COLUMN email_verificado BOOLEAN NOT NULL DEFAULT TRUE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists2
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Usuarios' AND COLUMN_NAME = 'codigo_verificacion';

SET @sql2 = IF(@col_exists2 = 0,
    'ALTER TABLE Usuarios ADD COLUMN codigo_verificacion VARCHAR(255) NULL',
    'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SELECT COUNT(*) INTO @col_exists3
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Usuarios' AND COLUMN_NAME = 'codigo_verificacion_expiry';

SET @sql3 = IF(@col_exists3 = 0,
    'ALTER TABLE Usuarios ADD COLUMN codigo_verificacion_expiry DATETIME NULL',
    'SELECT 1');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Existing users are already verified (they were created before this feature)
UPDATE Usuarios SET email_verificado = TRUE WHERE email_verificado = FALSE;
