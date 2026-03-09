-- ═══════════════════════════════════════════════════════════════
-- AI PostgreSQL Optimization Layer
-- Materialized Views + Functions + Indexes para endpoints AI
-- Ejecutar: docker exec -i handysales_postgres_dev psql -U handy_user -d handy_erp < infra/database/schema/ai_pg_optimization.sql
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. FUNCIÓN: Haversine nativa en PostgreSQL
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION haversine_km(
    lat1 double precision, lng1 double precision,
    lat2 double precision, lng2 double precision
) RETURNS double precision AS $$
    SELECT 6371.0 * 2.0 * ASIN(SQRT(
        POWER(SIN(RADIANS(lat2 - lat1) / 2.0), 2) +
        COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
        POWER(SIN(RADIANS(lng2 - lng1) / 2.0), 2)
    ));
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- ─────────────────────────────────────────────
-- 2. MATERIALIZED VIEW: Productos sugeridos por cliente
--    Pre-calcula top productos por frecuencia (últimos 90 días)
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_suggested_products;
CREATE MATERIALIZED VIEW mv_suggested_products AS
SELECT
    ped.tenant_id,
    ped.cliente_id,
    d.producto_id,
    pr.nombre AS producto_nombre,
    pr.codigo_barra,
    pr.precio_base,
    pr."ImagenUrl",
    COUNT(*)::int AS frecuencia,
    SUM(d.cantidad)::decimal AS cantidad_total,
    MAX(ped.fecha_pedido) AS ultima_compra,
    ROW_NUMBER() OVER (
        PARTITION BY ped.tenant_id, ped.cliente_id
        ORDER BY COUNT(*) DESC, MAX(ped.fecha_pedido) DESC
    ) AS ranking
FROM "DetallePedidos" d
INNER JOIN "Pedidos" ped ON ped.id = d.pedido_id
INNER JOIN "Productos" pr ON pr.id = d.producto_id
WHERE d.activo = true
  AND ped.activo = true
  AND ped.eliminado_en IS NULL
  AND d.eliminado_en IS NULL
  AND ped.fecha_pedido >= (NOW() - INTERVAL '90 days')
GROUP BY ped.tenant_id, ped.cliente_id, d.producto_id, pr.nombre, pr.codigo_barra, pr.precio_base, pr."ImagenUrl";

CREATE UNIQUE INDEX idx_mv_suggested_products_pk
    ON mv_suggested_products (tenant_id, cliente_id, producto_id);
CREATE INDEX idx_mv_suggested_products_ranking
    ON mv_suggested_products (tenant_id, cliente_id, ranking);

-- ─────────────────────────────────────────────
-- 3. MATERIALIZED VIEW: Prioridad de cobranza
--    Score de urgencia por cliente con saldo pendiente
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_collection_priority;
CREATE MATERIALIZED VIEW mv_collection_priority AS
WITH pedido_stats AS (
    SELECT
        p.tenant_id,
        p.cliente_id,
        MIN(p.fecha_pedido) AS pedido_mas_antiguo,
        COUNT(*)::int AS pedidos_pendientes
    FROM "Pedidos" p
    WHERE p.activo = true
      AND p.eliminado_en IS NULL
      AND p.estado IN (3, 4, 5, 6)  -- Confirmado, EnProceso, EnRuta, Entregado
    GROUP BY p.tenant_id, p.cliente_id
),
ultimo_cobro AS (
    SELECT
        co.tenant_id,
        co.cliente_id,
        MAX(co.fecha_cobro) AS ultimo_cobro
    FROM "Cobros" co
    WHERE co.activo = true AND co.eliminado_en IS NULL
    GROUP BY co.tenant_id, co.cliente_id
)
SELECT
    c.tenant_id,
    c.id AS cliente_id,
    c.nombre AS cliente_nombre,
    c.saldo AS saldo_pendiente,
    c.limite_credito,
    COALESCE(EXTRACT(DAY FROM NOW() - ps.pedido_mas_antiguo)::int, 0) AS dias_vencido,
    COALESCE(EXTRACT(DAY FROM NOW() - uc.ultimo_cobro)::int, 999) AS dias_sin_cobro,
    COALESCE(ps.pedidos_pendientes, 0) AS pedidos_pendientes,
    -- Urgency score: 40% monto + 30% días vencido + 20% utilización crédito + 10% días sin cobro
    LEAST(
        (LEAST(c.saldo::float / 10000.0, 1.0) * 40 +
         LEAST(COALESCE(EXTRACT(DAY FROM NOW() - ps.pedido_mas_antiguo)::float / 30.0, 0), 1.0) * 30 +
         LEAST(CASE WHEN c.limite_credito > 0 THEN c.saldo::float / c.limite_credito::float ELSE 1.0 END, 1.0) * 20 +
         LEAST(COALESCE(EXTRACT(DAY FROM NOW() - uc.ultimo_cobro)::float / 30.0, 33.3), 1.0) * 10
        )::int,
        100
    ) AS urgency_score,
    CASE
        WHEN COALESCE(EXTRACT(DAY FROM NOW() - ps.pedido_mas_antiguo), 0) > 14 THEN 'Vencido'
        WHEN c.limite_credito > 0 AND c.saldo::float / c.limite_credito::float > 0.8 THEN 'Límite crédito'
        WHEN c.saldo > 5000 THEN 'Monto alto'
        ELSE 'Seguimiento'
    END AS razon
FROM "Clientes" c
LEFT JOIN pedido_stats ps ON ps.tenant_id = c.tenant_id AND ps.cliente_id = c.id
LEFT JOIN ultimo_cobro uc ON uc.tenant_id = c.tenant_id AND uc.cliente_id = c.id
WHERE c.activo = true
  AND c.eliminado_en IS NULL
  AND c.saldo > 0;

CREATE UNIQUE INDEX idx_mv_collection_priority_pk
    ON mv_collection_priority (tenant_id, cliente_id);
CREATE INDEX idx_mv_collection_priority_score
    ON mv_collection_priority (tenant_id, urgency_score DESC);

-- ─────────────────────────────────────────────
-- 4. MATERIALIZED VIEW: Duración promedio de visita por cliente
--    Para predicción de paradas en ruta
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_visit_duration_avg;
CREATE MATERIALIZED VIEW mv_visit_duration_avg AS
SELECT
    v.tenant_id,
    v.cliente_id,
    COUNT(*)::int AS total_visitas,
    AVG(EXTRACT(EPOCH FROM (v.fecha_hora_fin - v.fecha_hora_inicio)) / 60.0) AS avg_minutos,
    CASE
        WHEN COUNT(*) >= 5 THEN 0.9
        WHEN COUNT(*) >= 2 THEN 0.6
        ELSE 0.3
    END AS confianza,
    CASE
        WHEN COUNT(*) >= 5 THEN COUNT(*) || ' visitas previas'
        WHEN COUNT(*) >= 2 THEN COUNT(*) || ' visitas previas (pocos datos)'
        ELSE 'Estimado por defecto (sin historial)'
    END AS basado_en
FROM "ClienteVisitas" v
WHERE v.fecha_hora_inicio IS NOT NULL
  AND v.fecha_hora_fin IS NOT NULL
  AND v.fecha_hora_inicio >= (NOW() - INTERVAL '90 days')
  AND v.eliminado_en IS NULL
GROUP BY v.tenant_id, v.cliente_id;

CREATE UNIQUE INDEX idx_mv_visit_duration_pk
    ON mv_visit_duration_avg (tenant_id, cliente_id);

-- ─────────────────────────────────────────────
-- 5. MATERIALIZED VIEW: Historial promedio por producto/cliente
--    Para detección de anomalías en pedidos
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_order_history_avg;
CREATE MATERIALIZED VIEW mv_order_history_avg AS
SELECT
    ped.tenant_id,
    ped.cliente_id,
    d.producto_id,
    AVG(d.cantidad::float) AS avg_cantidad,
    MAX(d.cantidad) AS max_cantidad,
    AVG(d.precio_unitario::float) AS avg_precio,
    COUNT(*)::int AS compras
FROM "DetallePedidos" d
INNER JOIN "Pedidos" ped ON ped.id = d.pedido_id
WHERE d.activo = true
  AND ped.activo = true
  AND ped.eliminado_en IS NULL
  AND d.eliminado_en IS NULL
  AND ped.fecha_pedido >= (NOW() - INTERVAL '90 days')
  AND ped.estado != 8  -- No cancelados
GROUP BY ped.tenant_id, ped.cliente_id, d.producto_id;

CREATE UNIQUE INDEX idx_mv_order_history_pk
    ON mv_order_history_avg (tenant_id, cliente_id, producto_id);

-- ─────────────────────────────────────────────
-- 6. MATERIALIZED VIEW: Promedio de total de pedido por cliente
--    Para detección de pedidos con total anómalo
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_order_total_avg;
CREATE MATERIALIZED VIEW mv_order_total_avg AS
SELECT
    p.tenant_id,
    p.cliente_id,
    AVG(p.total::float) AS avg_total,
    COUNT(*)::int AS total_pedidos
FROM "Pedidos" p
WHERE p.activo = true
  AND p.eliminado_en IS NULL
  AND p.fecha_pedido >= (NOW() - INTERVAL '90 days')
  AND p.estado != 8  -- No cancelados
GROUP BY p.tenant_id, p.cliente_id;

CREATE UNIQUE INDEX idx_mv_order_total_pk
    ON mv_order_total_avg (tenant_id, cliente_id);

-- ─────────────────────────────────────────────
-- 7. MATERIALIZED VIEW: Predicción de demanda
--    Weighted moving average por producto (últimos 12 semanas)
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_demand_forecast;
CREATE MATERIALIZED VIEW mv_demand_forecast AS
WITH weekly_sales AS (
    SELECT
        ped.tenant_id,
        d.producto_id,
        pr.nombre AS producto_nombre,
        DATE_TRUNC('week', ped.fecha_pedido) AS semana,
        SUM(d.cantidad)::float AS cantidad_semanal,
        COUNT(DISTINCT ped.cliente_id)::int AS clientes_unicos
    FROM "DetallePedidos" d
    INNER JOIN "Pedidos" ped ON ped.id = d.pedido_id
    INNER JOIN "Productos" pr ON pr.id = d.producto_id
    WHERE d.activo = true
      AND ped.activo = true
      AND ped.eliminado_en IS NULL
      AND d.eliminado_en IS NULL
      AND ped.fecha_pedido >= (NOW() - INTERVAL '12 weeks')
      AND ped.estado != 8
    GROUP BY ped.tenant_id, d.producto_id, pr.nombre, DATE_TRUNC('week', ped.fecha_pedido)
),
weighted AS (
    SELECT
        tenant_id,
        producto_id,
        producto_nombre,
        semana,
        cantidad_semanal,
        clientes_unicos,
        -- Peso: semanas recientes pesan más (1=antigua, 12=reciente)
        ROW_NUMBER() OVER (PARTITION BY tenant_id, producto_id ORDER BY semana ASC) AS peso,
        COUNT(*) OVER (PARTITION BY tenant_id, producto_id) AS total_semanas
    FROM weekly_sales
)
SELECT
    tenant_id,
    producto_id,
    producto_nombre,
    -- Weighted moving average (semanas recientes pesan más)
    ROUND(
        (SUM(cantidad_semanal * peso) / NULLIF(SUM(peso), 0))::numeric
    , 1) AS demanda_semanal_estimada,
    ROUND(AVG(cantidad_semanal)::numeric, 1) AS promedio_simple,
    MIN(cantidad_semanal) AS min_semanal,
    MAX(cantidad_semanal) AS max_semanal,
    -- Tendencia: comparar últimas 4 semanas vs anteriores 4
    CASE
        WHEN total_semanas >= 8 THEN
            ROUND((
                (SELECT AVG(w2.cantidad_semanal) FROM weighted w2
                 WHERE w2.tenant_id = w.tenant_id AND w2.producto_id = w.producto_id
                 AND w2.peso > w2.total_semanas - 4) -
                (SELECT AVG(w3.cantidad_semanal) FROM weighted w3
                 WHERE w3.tenant_id = w.tenant_id AND w3.producto_id = w.producto_id
                 AND w3.peso <= w3.total_semanas - 4)
            )::numeric, 1)
        ELSE NULL
    END AS tendencia_cambio,
    CASE
        WHEN total_semanas < 4 THEN 'baja'
        WHEN total_semanas < 8 THEN 'media'
        ELSE 'alta'
    END AS confianza,
    total_semanas AS semanas_con_datos,
    ROUND(AVG(clientes_unicos)::numeric, 1) AS avg_clientes_por_semana
FROM weighted w
GROUP BY tenant_id, producto_id, producto_nombre, total_semanas;

CREATE UNIQUE INDEX idx_mv_demand_forecast_pk
    ON mv_demand_forecast (tenant_id, producto_id);

-- ─────────────────────────────────────────────
-- 8. MATERIALIZED VIEW: Riesgo de pago por cliente
--    Score basado en historial de pagos
-- ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_payment_risk;
CREATE MATERIALIZED VIEW mv_payment_risk AS
WITH cobro_intervalos AS (
    -- Pre-compute intervals between consecutive payments per client
    SELECT
        co.tenant_id,
        co.cliente_id,
        co.monto,
        co.fecha_cobro,
        EXTRACT(EPOCH FROM (co.fecha_cobro - LAG(co.fecha_cobro) OVER (
            PARTITION BY co.tenant_id, co.cliente_id ORDER BY co.fecha_cobro
        ))) / 86400.0 AS dias_desde_anterior
    FROM "Cobros" co
    WHERE co.activo = true
      AND co.eliminado_en IS NULL
      AND co.fecha_cobro >= (NOW() - INTERVAL '180 days')
),
cobro_stats AS (
    SELECT
        ci.tenant_id,
        ci.cliente_id,
        COUNT(*)::int AS total_cobros,
        AVG(ci.monto::float) AS avg_monto_cobro,
        MAX(ci.fecha_cobro) AS ultimo_cobro,
        STDDEV(ci.dias_desde_anterior) AS stddev_dias_entre_cobros,
        AVG(ci.dias_desde_anterior) AS avg_dias_entre_cobros
    FROM cobro_intervalos ci
    GROUP BY ci.tenant_id, ci.cliente_id
),
pedido_stats AS (
    SELECT
        p.tenant_id,
        p.cliente_id,
        COUNT(*)::int AS total_pedidos_periodo,
        SUM(p.total::float) AS total_facturado
    FROM "Pedidos" p
    WHERE p.activo = true
      AND p.eliminado_en IS NULL
      AND p.fecha_pedido >= (NOW() - INTERVAL '180 days')
      AND p.estado != 8
    GROUP BY p.tenant_id, p.cliente_id
)
SELECT
    c.tenant_id,
    c.id AS cliente_id,
    c.nombre AS cliente_nombre,
    c.saldo AS saldo_actual,
    c.limite_credito,
    COALESCE(cs.total_cobros, 0) AS cobros_6_meses,
    COALESCE(ps.total_pedidos_periodo, 0) AS pedidos_6_meses,
    COALESCE(cs.avg_dias_entre_cobros, 999)::int AS avg_dias_entre_cobros,
    -- Payment ratio: qué % del facturado ha pagado
    CASE
        WHEN COALESCE(ps.total_facturado, 0) > 0
        THEN LEAST(ROUND((COALESCE(cs.total_cobros * cs.avg_monto_cobro, 0) / ps.total_facturado * 100)::numeric, 1), 100)
        ELSE 100  -- Sin pedidos = sin riesgo
    END AS ratio_pago_pct,
    -- Risk score 0-100 (0=bajo riesgo, 100=alto riesgo)
    LEAST(
        (
            -- 35% utilización de crédito
            CASE WHEN c.limite_credito > 0
                THEN LEAST(c.saldo::float / c.limite_credito::float, 1.0) * 35
                ELSE CASE WHEN c.saldo > 0 THEN 35 ELSE 0 END
            END +
            -- 25% días sin pagar
            LEAST(COALESCE(EXTRACT(DAY FROM NOW() - cs.ultimo_cobro)::float / 60.0, 1.0), 1.0) * 25 +
            -- 20% irregularidad de pagos (alta stddev = irregular)
            CASE WHEN cs.stddev_dias_entre_cobros IS NOT NULL
                THEN LEAST(cs.stddev_dias_entre_cobros / 30.0, 1.0) * 20
                ELSE 20  -- Sin datos = riesgo
            END +
            -- 20% ratio de pago bajo
            CASE WHEN COALESCE(ps.total_facturado, 0) > 0
                THEN (1.0 - LEAST(COALESCE(cs.total_cobros * cs.avg_monto_cobro, 0) / ps.total_facturado, 1.0)) * 20
                ELSE 0
            END
        )::int,
        100
    ) AS risk_score,
    CASE
        WHEN c.limite_credito > 0 AND c.saldo::float / c.limite_credito::float > 0.9 THEN 'critico'
        WHEN COALESCE(EXTRACT(DAY FROM NOW() - cs.ultimo_cobro), 999) > 30 THEN 'alto'
        WHEN COALESCE(cs.total_cobros, 0) < 2 THEN 'sin_historial'
        WHEN COALESCE(cs.stddev_dias_entre_cobros, 99) > 15 THEN 'irregular'
        ELSE 'bajo'
    END AS nivel_riesgo,
    CASE
        WHEN c.limite_credito > 0 AND c.saldo::float / c.limite_credito::float > 0.9
            THEN 'Crédito casi agotado (' || ROUND(c.saldo::numeric / c.limite_credito::numeric * 100, 0) || '% usado)'
        WHEN COALESCE(EXTRACT(DAY FROM NOW() - cs.ultimo_cobro), 999) > 30
            THEN COALESCE(EXTRACT(DAY FROM NOW() - cs.ultimo_cobro)::int::text, '?') || ' días sin pagar'
        WHEN COALESCE(cs.total_cobros, 0) < 2
            THEN 'Sin historial de pagos suficiente'
        WHEN COALESCE(cs.stddev_dias_entre_cobros, 99) > 15
            THEN 'Pagos irregulares (cada ' || COALESCE(ROUND(cs.avg_dias_entre_cobros::numeric), 0) || '±' || COALESCE(ROUND(cs.stddev_dias_entre_cobros::numeric), 0) || ' días)'
        ELSE 'Buen historial de pagos'
    END AS razon
FROM "Clientes" c
LEFT JOIN cobro_stats cs ON cs.tenant_id = c.tenant_id AND cs.cliente_id = c.id
LEFT JOIN pedido_stats ps ON ps.tenant_id = c.tenant_id AND ps.cliente_id = c.id
WHERE c.activo = true
  AND c.eliminado_en IS NULL;

CREATE UNIQUE INDEX idx_mv_payment_risk_pk
    ON mv_payment_risk (tenant_id, cliente_id);
CREATE INDEX idx_mv_payment_risk_score
    ON mv_payment_risk (tenant_id, risk_score DESC);

-- ─────────────────────────────────────────────
-- 9. FUNCIÓN: Refrescar TODAS las vistas materializadas AI
--    Llamar al cerrar ruta o vía cron nocturno
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_ai_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_suggested_products;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_collection_priority;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_visit_duration_avg;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_history_avg;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_total_avg;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_demand_forecast;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_payment_risk;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 10. ÍNDICES ADICIONALES para queries AI frecuentes
-- ─────────────────────────────────────────────

-- Para suggested products: frecuencia por cliente
CREATE INDEX IF NOT EXISTS idx_detallespedido_cliente_producto
    ON "DetallePedidos" (producto_id)
    INCLUDE (cantidad, pedido_id)
    WHERE activo = true AND eliminado_en IS NULL;

-- Para GPS anomaly detection: ubicación de clientes
CREATE INDEX IF NOT EXISTS idx_clientes_ubicacion_geo
    ON "Clientes" USING GIST (ubicacion)
    WHERE activo = true AND eliminado_en IS NULL;

-- Para demand forecast: ventas semanales
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_tenant
    ON "Pedidos" (tenant_id, fecha_pedido)
    INCLUDE (cliente_id, total, estado)
    WHERE activo = true AND eliminado_en IS NULL;

-- Refrescar vistas con datos iniciales
SELECT refresh_ai_materialized_views();

-- Verificar
SELECT 'mv_suggested_products' AS vista, COUNT(*) FROM mv_suggested_products
UNION ALL SELECT 'mv_collection_priority', COUNT(*) FROM mv_collection_priority
UNION ALL SELECT 'mv_visit_duration_avg', COUNT(*) FROM mv_visit_duration_avg
UNION ALL SELECT 'mv_order_history_avg', COUNT(*) FROM mv_order_history_avg
UNION ALL SELECT 'mv_order_total_avg', COUNT(*) FROM mv_order_total_avg
UNION ALL SELECT 'mv_demand_forecast', COUNT(*) FROM mv_demand_forecast
UNION ALL SELECT 'mv_payment_risk', COUNT(*) FROM mv_payment_risk;
