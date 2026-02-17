
-- ========================================
-- Creación de usuario handy_user
-- ========================================

DROP USER IF EXISTS 'handy_user'@'%';

CREATE USER 'handy_user'@'%' IDENTIFIED WITH mysql_native_password BY 'handy_pass';

GRANT ALL PRIVILEGES ON handy_erp.* TO 'handy_user'@'%' WITH GRANT OPTION;

FLUSH PRIVILEGES;
