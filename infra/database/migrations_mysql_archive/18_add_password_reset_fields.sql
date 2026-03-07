-- Migration 18: Add password reset fields to Usuarios
-- Run on: local Docker MySQL + Railway production MySQL

USE handy_erp;

-- Use procedure to safely add columns (MySQL 8.0 lacks ADD COLUMN IF NOT EXISTS)
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

CALL add_column_if_missing('Usuarios', 'password_reset_token', 'VARCHAR(255) NULL');
CALL add_column_if_missing('Usuarios', 'password_reset_expiry', 'DATETIME NULL');

DROP PROCEDURE IF EXISTS add_column_if_missing;
