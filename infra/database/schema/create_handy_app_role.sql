-- ═══════════════════════════════════════════════════════════════
-- Create non-superuser role for the app
-- Required because RLS is bypassed by SUPERUSER (postgres).
-- Run with the SUPERUSER (postgres) connection BEFORE applying rls_enable.sql.
--
-- IMPORTANT: Substitute __APP_PASSWORD__ with the actual password before running.
-- Usage:
--   sed "s|__APP_PASSWORD__|REPLACE_WITH_STRONG_PASSWORD|g" create_handy_app_role.sql \
--     | docker exec -i handysuites_postgres_dev psql "<SUPERUSER_URL>"
-- ═══════════════════════════════════════════════════════════════

-- Create role if not exists; otherwise update password (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'handy_app') THEN
        CREATE ROLE handy_app WITH LOGIN PASSWORD '__APP_PASSWORD__';
    ELSE
        ALTER ROLE handy_app WITH LOGIN PASSWORD '__APP_PASSWORD__';
    END IF;
END $$;

-- Explicitly non-superuser, non-bypassrls
ALTER ROLE handy_app NOSUPERUSER NOBYPASSRLS;

-- Grant access to all current tables + sequences
GRANT USAGE ON SCHEMA public TO handy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO handy_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO handy_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO handy_app;

-- Grant access to future tables/sequences created by migrations (postgres owns them)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO handy_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO handy_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO handy_app;

-- Verify
SELECT rolname, rolsuper, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname = 'handy_app';
