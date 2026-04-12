-- Create superset_meta database for Apache Superset metadata
-- Run this once: docker exec -i handysuites_postgres_dev psql -U handy_user -d postgres < infra/database/init/03_create_superset_db.sql
SELECT 'CREATE DATABASE superset_meta OWNER handy_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'superset_meta')\gexec
