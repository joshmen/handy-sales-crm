
-- ========================================
-- Creacion de usuario handy_user
-- PostgreSQL 16 syntax
-- ========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'handy_user') THEN
        CREATE USER handy_user WITH PASSWORD 'handy_pass';
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE handy_erp TO handy_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO handy_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO handy_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO handy_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO handy_user;
