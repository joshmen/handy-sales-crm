-- Migrate existing Producto.ClaveSat values to the MapeoFiscalProducto table
-- This is a one-time migration for existing data.
-- Run AFTER the billing API has started (so EnsureCreated has created the tables).
--
-- Usage: docker exec -i handysales_postgres_dev psql -U handy_user -d handy_billing -f infra/database/schema/migrate_clave_sat_to_mapping.sql
-- Or:   docker exec -i handysales_postgres_dev psql -U handy_user -d handy_billing < infra/database/schema/migrate_clave_sat_to_mapping.sql

-- Cross-database query: read from handy_erp, write to handy_billing
-- NOTE: This requires dblink or FDW, which may not be available.
-- Alternative: run this from a psql session connected to handy_billing with access to handy_erp.

-- Simple approach: use dblink_connect if available, otherwise run manually.
-- For local dev with both DBs on same server:

DO $$
BEGIN
  -- Check if dblink extension is available
  CREATE EXTENSION IF NOT EXISTS dblink;

  -- Insert mappings from CRM products that have clave_sat set
  INSERT INTO mapeo_fiscal_producto (tenant_id, producto_id, clave_prod_serv, clave_unidad, created_at, updated_at)
  SELECT
    tenant_id::text,
    producto_id,
    clave_sat,
    COALESCE(unidad_clave_sat, 'H87'),
    NOW(),
    NOW()
  FROM dblink(
    'dbname=handy_erp user=handy_user password=handy_pass',
    'SELECT p.tenant_id, p.id, p.clave_sat, u.clave_sat
     FROM "Productos" p
     JOIN "UnidadesMedida" u ON u.id = p.unidad_medida_id AND u.tenant_id = p.tenant_id
     WHERE p.clave_sat IS NOT NULL AND p.eliminado_en IS NULL'
  ) AS t(tenant_id int, producto_id int, clave_sat text, unidad_clave_sat text)
  ON CONFLICT (tenant_id, producto_id) DO NOTHING;

  RAISE NOTICE 'Migration complete. Check mapeo_fiscal_producto for imported rows.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'dblink not available or error: %. Run migration manually.', SQLERRM;
END $$;

-- Verify
SELECT COUNT(*) AS mapeos_importados FROM mapeo_fiscal_producto;
