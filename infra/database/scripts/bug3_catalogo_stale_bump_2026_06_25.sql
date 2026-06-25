-- ============================================================================
-- Bug 3 hotfix (2026-06-25) — "siempre llega TATEMADA"
-- ============================================================================
-- CAUSA: el sync de catálogo al móvil es incremental por fecha
-- (SyncRepository.GetProductosModifiedSinceAsync: ActualizadoEn > since). Si en
-- algún momento se renumeraron/recrearon productos a nivel DB con fechas NO
-- futuras (reset+reseed, limpieza de duplicados, re-importación), los
-- dispositivos que ya habían sincronizado NUNCA vuelven a bajar el catálogo:
-- conservan productos viejos cuyo server_id ahora apunta a OTRO producto. Al
-- vender, el móvil manda el server_id viejo y el server lo guarda mapeado al
-- producto actual de ese id (ej. id 1 = "SALSA CASERA TATEMADA").
--
-- REMEDIACIÓN: bumpear actualizado_en de los productos activos para forzar a
-- cada dispositivo a re-bajar el catálogo completo en su próximo sync
-- incremental (since < now()), corrigiendo el mapeo server_id -> producto.
--
-- Reproducido y verificado en local 2026-06-25. Complementa el hardening del
-- móvil (reconcileProductCatalogOnce, purga de huérfanos en upgrade) y del
-- backend (propagación de soft-deletes en el pull incremental).
--
-- USO (memoria del proyecto): aplicar SIEMPRE staging -> validar -> prod.
--   docker cp este_archivo.sql handysuites_postgres_dev:/tmp/
--   docker exec handysuites_postgres_dev psql "<DATABASE_URL>" -f /tmp/este_archivo.sql
--
-- Verificar tenant objetivo primero:
--   SELECT id, nombre_empresa FROM "Tenants" WHERE nombre_empresa ILIKE '%jeyma%';
-- ============================================================================

BEGIN;

-- Objetivo: tenant(s) "jeyma" (afectado confirmado). Targeting por nombre para
-- no depender del id (que difiere entre staging/prod).
UPDATE "Productos"
   SET actualizado_en = now(),
       version = version + 1
 WHERE eliminado_en IS NULL
   AND tenant_id IN (
       SELECT id FROM "Tenants" WHERE nombre_empresa ILIKE '%jeyma%'
   );

-- Verificación: cuántos productos quedaron marcados para re-sync.
SELECT t.nombre_empresa,
       count(*) AS productos_bumpeados
  FROM "Productos" p
  JOIN "Tenants"   t ON t.id = p.tenant_id
 WHERE p.eliminado_en IS NULL
   AND p.actualizado_en >= now() - interval '2 minutes'
 GROUP BY t.nombre_empresa;

COMMIT;

-- ----------------------------------------------------------------------------
-- VARIANTE (descomentar SOLO si el renumber/reset afectó a más de un tenant):
-- fuerza re-sync del catálogo de TODOS los tenants. Más payload una sola vez,
-- pero sana a todos los dispositivos.
-- ----------------------------------------------------------------------------
-- BEGIN;
-- UPDATE "Productos"
--    SET actualizado_en = now(), version = version + 1
--  WHERE eliminado_en IS NULL;
-- COMMIT;
