-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill RutasCarga.cantidad_vendida + cantidad_entregada
-- ─────────────────────────────────────────────────────────────────────────────
-- Reportado prod 2026-05-26 (Rodrigo): la barra "Productos (vendidos + entregados)"
-- en mobile mostraba 0 aunque hubo ventas en el día. Causa: el path web
-- PedidoRepository.CambiarEstadoDetalladoAsync nunca incrementaba las columnas
-- (solo los paths mobile + sync push lo hacían, y el sync fix se mergeó el
-- 2026-05-21 — antes de esa fecha NADA incrementaba si el pedido entró via web).
--
-- Este script reconstruye las columnas para CUALQUIER pedido Entregado existente,
-- mapeando la cantidad de cada DetallePedido al RutaCarga del producto en la ruta.
--
-- IDEMPOTENTE: sobrescribe directamente con la SUMA de detalles entregados;
-- correrlo dos veces produce el mismo resultado. Wrap en transaction.
-- Aplicar PRIMERO en staging, validar muestra de tenants, luego en prod.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

WITH consumidos AS (
    SELECT
        rp.ruta_id,
        dp.producto_id,
        p.tenant_id,
        SUM(CASE WHEN p.tipo_venta = 1 THEN dp.cantidad ELSE 0 END)::int AS ventas_directas,
        SUM(CASE WHEN p.tipo_venta = 0 THEN dp.cantidad ELSE 0 END)::int AS entregas_preventa
    FROM "RutasPedidos" rp
    INNER JOIN "Pedidos" p
        ON p.id = rp.pedido_id
        AND p.estado = 5                  -- EstadoPedido.Entregado
        AND p.activo = true
    INNER JOIN "DetallePedidos" dp
        ON dp.pedido_id = p.id
        AND dp.activo = true
    WHERE rp.activo = true
    GROUP BY rp.ruta_id, dp.producto_id, p.tenant_id

    UNION ALL

    -- VentaDirecta sin pre-link a RutasPedidos: heredan la ruta activa del
    -- vendedor en la fecha del pedido. Misma lógica que MobileVentaDirectaEndpoints.
    SELECT
        rv.id AS ruta_id,
        dp.producto_id,
        p.tenant_id,
        SUM(dp.cantidad)::int AS ventas_directas,
        0 AS entregas_preventa
    FROM "Pedidos" p
    INNER JOIN "DetallePedidos" dp
        ON dp.pedido_id = p.id
        AND dp.activo = true
    INNER JOIN "RutasVendedor" rv
        ON rv.usuario_id = p.usuario_id
        AND rv.tenant_id = p.tenant_id
        AND rv.activo = true
        AND DATE(rv.fecha) = DATE(p.fecha_pedido)
    LEFT JOIN "RutasPedidos" rp_link
        ON rp_link.pedido_id = p.id
        AND rp_link.activo = true
    WHERE p.estado = 5                    -- Entregado
        AND p.tipo_venta = 1              -- VentaDirecta
        AND p.activo = true
        AND rp_link.id IS NULL            -- sin pre-link a RutasPedidos
    GROUP BY rv.id, dp.producto_id, p.tenant_id
),
agregado AS (
    SELECT
        ruta_id, producto_id, tenant_id,
        SUM(ventas_directas)::int   AS ventas_directas,
        SUM(entregas_preventa)::int AS entregas_preventa
    FROM consumidos
    GROUP BY ruta_id, producto_id, tenant_id
)
UPDATE "RutasCarga" rc
SET
    cantidad_vendida   = a.ventas_directas,
    cantidad_entregada = a.entregas_preventa,
    actualizado_en     = NOW() AT TIME ZONE 'utc'
FROM agregado a
WHERE rc.ruta_id     = a.ruta_id
    AND rc.producto_id = a.producto_id
    AND rc.tenant_id   = a.tenant_id
    AND rc.activo      = true;

-- Snapshot post-backfill (validar manualmente antes de COMMIT)
SELECT
    rc.tenant_id,
    rc.ruta_id,
    COUNT(*) AS rows_actualizadas,
    SUM(rc.cantidad_vendida)   AS total_vendidas,
    SUM(rc.cantidad_entregada) AS total_entregadas
FROM "RutasCarga" rc
WHERE (rc.cantidad_vendida > 0 OR rc.cantidad_entregada > 0)
GROUP BY rc.tenant_id, rc.ruta_id
ORDER BY rc.tenant_id, rc.ruta_id;

-- Si los números cuadran con expectativas:  COMMIT;
-- Si algo se ve mal:                        ROLLBACK;

COMMIT;
