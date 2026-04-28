-- =====================================================
-- Migración data: Legacy EstadoPedido enum cleanup
-- =====================================================
-- Antes de la simplificación de marzo 2026 el enum EstadoPedido tenía:
--   0=Borrador, 1=Enviado, 2=Confirmado, 3=EnProceso, 4=EnRuta, 5=Entregado, 6=Cancelado
-- Después se eliminaron Enviado=1 y EnProceso=3 (marcados [Obsolete] en C#).
-- El nuevo modelo usa: Borrador=0, Confirmado=2, EnRuta=4, Entregado=5, Cancelado=6.
--
-- Esta migración mapea pedidos viejos a sus equivalentes vigentes:
--   1 (Enviado) → 2 (Confirmado)
--   3 (EnProceso) → 4 (EnRuta)
--
-- Idempotente: si no hay filas en estados legacy, no hace nada.
-- Aplicar con superuser postgres (handy_app no es owner de Pedidos).
-- =====================================================

BEGIN;

-- Conteo previo (informativo)
SELECT estado, COUNT(*) AS antes_migracion
  FROM "Pedidos"
 WHERE estado IN (1, 3)
 GROUP BY estado
 ORDER BY estado;

-- Backup defensivo: marcar en notas el estado legacy antes de cambiar
UPDATE "Pedidos"
   SET notas = COALESCE(notas, '') ||
               CASE WHEN estado = 1 THEN E'\n[migración 2026: estado_legacy=Enviado(1) → Confirmado(2)]'
                    WHEN estado = 3 THEN E'\n[migración 2026: estado_legacy=EnProceso(3) → EnRuta(4)]'
               END
 WHERE estado IN (1, 3);

-- Mapeo legacy → vigente
UPDATE "Pedidos" SET estado = 2 WHERE estado = 1;
UPDATE "Pedidos" SET estado = 4 WHERE estado = 3;

-- Verificación post-migración
SELECT estado, COUNT(*) AS despues_migracion
  FROM "Pedidos"
 GROUP BY estado
 ORDER BY estado;

COMMIT;
