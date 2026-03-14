-- SAT Catalogs Seed for HandySales Billing
-- Generated: 2026-03-14T09:42:51.046Z
-- Source: bambucode/catalogos_sat_JSON (GitHub)
-- Run: docker exec -i handysales_postgres_dev psql -U handy_user -d handy_billing < infra/database/schema/seed_catalogo_sat.sql

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create tables if not exist (EnsureCreated should handle this, but just in case)
CREATE TABLE IF NOT EXISTS catalogo_prod_serv (
  clave VARCHAR(10) PRIMARY KEY,
  descripcion TEXT NOT NULL,
  pais VARCHAR(5) DEFAULT 'MX',
  activo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS catalogo_unidad (
  clave VARCHAR(10) PRIMARY KEY,
  nombre TEXT NOT NULL,
  pais VARCHAR(5) DEFAULT 'MX',
  activo BOOLEAN DEFAULT true
);

-- Clear existing data (safe to re-run)
TRUNCATE catalogo_prod_serv;
TRUNCATE catalogo_unidad;

-- Bulk load from CSV
\COPY catalogo_prod_serv(clave, descripcion) FROM 'C:/Users/AW AREA 51M R2/OneDrive/Offshore_Projects/HandySales/infra/database/schema/catalogo_sat_prodserv.csv' WITH (FORMAT csv, HEADER true);
\COPY catalogo_unidad(clave, nombre) FROM 'C:/Users/AW AREA 51M R2/OneDrive/Offshore_Projects/HandySales/infra/database/schema/catalogo_sat_unidades.csv' WITH (FORMAT csv, HEADER true);

-- GIN trigram indexes for fast fuzzy search (<5ms on 53K rows)
CREATE INDEX IF NOT EXISTS idx_prodserv_desc_trgm ON catalogo_prod_serv USING gin (descripcion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prodserv_clave_trgm ON catalogo_prod_serv USING gin (clave gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_unidad_nombre_trgm ON catalogo_unidad USING gin (nombre gin_trgm_ops);

-- Verify
SELECT 'catalogo_prod_serv' AS tabla, COUNT(*) AS registros FROM catalogo_prod_serv
UNION ALL
SELECT 'catalogo_unidad', COUNT(*) FROM catalogo_unidad;
