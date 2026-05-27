-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill RutasCarga.cantidad_vendida + cantidad_entregada
-- ─────────────────────────────────────────────────────────────────────────────
-- Reportado prod 2026-05-26 (Rodrigo): la barra "Productos (vendidos + entregados)"
-- en mobile mostraba 0 aunque hubo ventas en el día. Causas combinadas:
--
--   1. El path web PedidoRepository.CambiarEstadoDetalladoAsync nunca incrementaba
--      las columnas (paths mobile + sync sí lo hacían).
--   2. SyncRepository.UpsertPedidoAsync buscaba "ruta activa NOW" en lugar de
--      "ruta del día del pedido" — cross-contamination entre rutas del mismo día.
--   3. Pedidos VentaDirecta creados antes de aceptar la ruta quedaban sin
--      RutasPedidos link y nunca contaban a la carga.
--
-- Este script reconstruye los contadores haciendo el sweep "lo que debería haber
-- pasado":
--   PASO 1: Para rutas estado >= CargaAceptada, vincular pedidos VentaDirecta
--           Entregado del mismo usuario+día sin RutasPedidos link existente.
--   PASO 2: Recalcular RutasCarga.cantidad_vendida desde la suma de
--           DetallePedidos via RutasPedidos para VentaDirecta+Entregado.
--   PASO 3: Recalcular RutasCarga.cantidad_entregada similar para Preventa+Entregado.
--
-- IDEMPOTENTE: el INSERT usa NOT EXISTS, los UPDATE asignan el SUM agregado
-- (no incremental). Correr dos veces produce el mismo resultado.
-- Wrap en TRANSACTION. Aplicar staging → validar muestra → prod.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- PASO 1: Vincular pedidos huérfanos VentaDirecta a la ruta del día del usuario
INSERT INTO "RutasPedidos" (ruta_id, pedido_id, tenant_id, estado, activo, creado_en)
SELECT DISTINCT ON (p.id)
    rv.id, p.id, p.tenant_id,
    1 AS estado,  -- EstadoPedidoRuta.Entregado
    true,
    NOW() AT TIME ZONE 'utc'
FROM "RutasVendedor" rv
INNER JOIN "Pedidos" p
    ON p.usuario_id = rv.usuario_id
    AND p.tenant_id = rv.tenant_id
    AND p.activo = true
    AND p.estado = 5              -- EstadoPedido.Entregado
    AND p.tipo_venta = 1          -- TipoVenta.VentaDirecta
    AND DATE(p.fecha_pedido) = DATE(rv.fecha)
WHERE rv.activo = true
    -- Estados con carga aceptada o consumida (no por orden numerico):
    -- EnProgreso(1), Completada(2), CargaAceptada(5), Cerrada(6).
    -- Excluimos Planificada(0), Cancelada(3), PendienteAceptar(4).
    AND rv.estado IN (1, 2, 5, 6)
    AND NOT EXISTS (
        SELECT 1 FROM "RutasPedidos" rp
        WHERE rp.pedido_id = p.id AND rp.activo = true
    )
-- Si hay 2 rutas el mismo día, preferimos la más reciente (DESC por hora_inicio_real
-- o creado_en como tiebreaker).
ORDER BY p.id, COALESCE(rv.hora_inicio_real, rv.aceptada_en, rv.creado_en) DESC;

-- PASO 2: Recalcular cantidad_vendida desde links VentaDirecta+Entregado
WITH vendidas AS (
    SELECT
        rp.ruta_id,
        dp.producto_id,
        SUM(dp.cantidad)::int AS total
    FROM "RutasPedidos" rp
    INNER JOIN "Pedidos" p
        ON p.id = rp.pedido_id
        AND p.tipo_venta = 1
        AND p.estado = 5
        AND p.activo = true
    INNER JOIN "DetallePedidos" dp
        ON dp.pedido_id = p.id
        AND dp.activo = true
    WHERE rp.activo = true
    GROUP BY rp.ruta_id, dp.producto_id
)
UPDATE "RutasCarga" rc
SET cantidad_vendida = v.total,
    actualizado_en = NOW() AT TIME ZONE 'utc'
FROM vendidas v
WHERE rc.ruta_id = v.ruta_id
    AND rc.producto_id = v.producto_id
    AND rc.activo = true;

-- PASO 3: Recalcular cantidad_entregada desde links Preventa+Entregado
WITH entregadas AS (
    SELECT
        rp.ruta_id,
        dp.producto_id,
        SUM(dp.cantidad)::int AS total
    FROM "RutasPedidos" rp
    INNER JOIN "Pedidos" p
        ON p.id = rp.pedido_id
        AND p.tipo_venta = 0      -- TipoVenta.Preventa
        AND p.estado = 5
        AND p.activo = true
    INNER JOIN "DetallePedidos" dp
        ON dp.pedido_id = p.id
        AND dp.activo = true
    WHERE rp.activo = true
    GROUP BY rp.ruta_id, dp.producto_id
)
UPDATE "RutasCarga" rc
SET cantidad_entregada = e.total,
    actualizado_en = NOW() AT TIME ZONE 'utc'
FROM entregadas e
WHERE rc.ruta_id = e.ruta_id
    AND rc.producto_id = e.producto_id
    AND rc.activo = true;

-- Snapshot post-backfill (validar antes de COMMIT)
SELECT
    rc.tenant_id,
    rc.ruta_id,
    COUNT(*) AS productos,
    SUM(rc.cantidad_total) AS cargado,
    SUM(rc.cantidad_vendida) AS vendidas,
    SUM(rc.cantidad_entregada) AS entregadas
FROM "RutasCarga" rc
WHERE rc.activo = true
GROUP BY rc.tenant_id, rc.ruta_id
HAVING SUM(rc.cantidad_vendida + rc.cantidad_entregada) > 0
ORDER BY rc.ruta_id DESC
LIMIT 30;

-- Si los números cuadran con expectativas:  COMMIT;
-- Si algo se ve mal:                        ROLLBACK;
COMMIT;
