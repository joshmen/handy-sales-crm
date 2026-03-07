-- Create the billing database (handy_erp is created via POSTGRES_DB env var)
SELECT 'CREATE DATABASE handy_billing OWNER handy_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'handy_billing')\gexec

-- PostGIS extension (Phase 3 — requires postgis/postgis Docker image)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- pgvector extension (Phase 3 — requires pgvector installed)
-- CREATE EXTENSION IF NOT EXISTS vector;
