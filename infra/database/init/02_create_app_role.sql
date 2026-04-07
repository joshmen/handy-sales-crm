-- Create non-superuser role for API connections (RLS enforcement)
-- This runs on first DB init only (docker-entrypoint-initdb.d)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'handy_app') THEN
        CREATE ROLE handy_app WITH LOGIN PASSWORD 'handy_app_pass' NOSUPERUSER NOBYPASSRLS;
    END IF;
END $$;

-- Grant access to handy_erp (current DB)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO handy_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO handy_app;
GRANT USAGE ON SCHEMA public TO handy_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO handy_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO handy_app;
