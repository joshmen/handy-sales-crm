-- ═══════════════════════════════════════════════════════════════════════
-- MATERIALIZED VIEWS FOR REPORTS — Handy Suites
-- Pre-computed aggregations for dashboards, reports, and Superset
-- All views include tenant_id for multi-tenant RLS filtering
-- Refresh via: SELECT refresh_report_materialized_views();
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Daily Sales Summary ────────────────────────────────────────
-- Base view: all other sales reports derive from this
DROP MATERIALIZED VIEW IF EXISTS mv_ventas_diarias;
CREATE MATERIALIZED VIEW mv_ventas_diarias AS
SELECT
    p.tenant_id,
    DATE(p.fecha_pedido) AS fecha,
    p.usuario_id AS vendedor_id,
    u.nombre AS vendedor_nombre,
    c.id_zona AS zona_id,
    z.nombre AS zona_nombre,
    COUNT(p.id) AS cantidad_pedidos,
    COALESCE(SUM(p.total), 0) AS total_ventas,
    COALESCE(SUM(p.subtotal), 0) AS subtotal,
    COALESCE(SUM(p.descuento), 0) AS total_descuentos,
    COALESCE(SUM(p.impuestos), 0) AS total_impuestos,
    COUNT(DISTINCT p.cliente_id) AS clientes_unicos
FROM "Pedidos" p
JOIN "Usuarios" u ON u.id = p.usuario_id
JOIN "Clientes" c ON c.id = p.cliente_id
LEFT JOIN "Zonas" z ON z.id = c.id_zona
WHERE p.estado != 6  -- Exclude cancelled (EstadoPedido.Cancelado = 6)
  AND p.eliminado_en IS NULL
  AND u.eliminado_en IS NULL
  AND c.eliminado_en IS NULL
GROUP BY p.tenant_id, DATE(p.fecha_pedido), p.usuario_id, u.nombre, c.id_zona, z.nombre;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ventas_diarias_unique
    ON mv_ventas_diarias (tenant_id, fecha, vendedor_id, COALESCE(zona_id, 0));
CREATE INDEX IF NOT EXISTS idx_mv_ventas_diarias_tenant
    ON mv_ventas_diarias (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mv_ventas_diarias_fecha
    ON mv_ventas_diarias (tenant_id, fecha);


-- ─── 2. Sales by Vendor (with visits) ─────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_ventas_vendedor;
CREATE MATERIALIZED VIEW mv_ventas_vendedor AS
SELECT
    p.tenant_id,
    p.usuario_id AS vendedor_id,
    u.nombre AS vendedor_nombre,
    COUNT(p.id) AS cantidad_pedidos,
    COALESCE(SUM(p.total), 0) AS total_ventas,
    CASE WHEN COUNT(p.id) > 0 THEN ROUND(SUM(p.total) / COUNT(p.id), 2) ELSE 0 END AS ticket_promedio,
    COUNT(DISTINCT p.cliente_id) AS clientes_unicos,
    MIN(p.fecha_pedido) AS primer_pedido,
    MAX(p.fecha_pedido) AS ultimo_pedido,
    COALESCE(v.total_visitas, 0) AS total_visitas,
    COALESCE(v.visitas_con_venta, 0) AS visitas_con_venta,
    CASE WHEN COALESCE(v.total_visitas, 0) > 0
         THEN ROUND(v.visitas_con_venta::numeric / v.total_visitas * 100, 1)
         ELSE 0 END AS efectividad_visitas
FROM "Pedidos" p
JOIN "Usuarios" u ON u.id = p.usuario_id AND u.eliminado_en IS NULL
LEFT JOIN (
    SELECT tenant_id, usuario_id,
           COUNT(*) AS total_visitas,
           COUNT(*) FILTER (WHERE resultado = 1) AS visitas_con_venta
    FROM "ClienteVisitas"
    WHERE eliminado_en IS NULL
    GROUP BY tenant_id, usuario_id
) v ON v.tenant_id = p.tenant_id AND v.usuario_id = p.usuario_id
WHERE p.estado != 6 AND p.eliminado_en IS NULL
GROUP BY p.tenant_id, p.usuario_id, u.nombre, v.total_visitas, v.visitas_con_venta;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ventas_vendedor_unique
    ON mv_ventas_vendedor (tenant_id, vendedor_id);
CREATE INDEX IF NOT EXISTS idx_mv_ventas_vendedor_tenant
    ON mv_ventas_vendedor (tenant_id);


-- ─── 3. Sales by Product ──────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_ventas_producto;
CREATE MATERIALIZED VIEW mv_ventas_producto AS
SELECT
    p.tenant_id,
    dp.producto_id,
    pr.nombre AS producto_nombre,
    pr.codigo_barra,
    fp.nombre AS familia_nombre,
    cp.nombre AS categoria_nombre,
    SUM(dp.cantidad) AS cantidad_vendida,
    COALESCE(SUM(dp.total), 0) AS total_ventas,
    COUNT(DISTINCT p.id) AS en_pedidos,
    ROUND(AVG(dp.precio_unitario), 2) AS precio_promedio
FROM "DetallePedidos" dp
JOIN "Pedidos" p ON p.id = dp.pedido_id AND p.estado != 6 AND p.eliminado_en IS NULL
JOIN "Productos" pr ON pr.id = dp.producto_id AND pr.eliminado_en IS NULL
LEFT JOIN "FamiliasProductos" fp ON fp.id = pr.familia_id
LEFT JOIN "CategoriasProductos" cp ON cp.id = pr.categoria_id
WHERE dp.eliminado_en IS NULL
GROUP BY p.tenant_id, dp.producto_id, pr.nombre, pr.codigo_barra, fp.nombre, cp.nombre;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ventas_producto_unique
    ON mv_ventas_producto (tenant_id, producto_id);
CREATE INDEX IF NOT EXISTS idx_mv_ventas_producto_tenant
    ON mv_ventas_producto (tenant_id);


-- ─── 4. Sales by Zone ─────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_ventas_zona;
CREATE MATERIALIZED VIEW mv_ventas_zona AS
SELECT
    p.tenant_id,
    COALESCE(c.id_zona, 0) AS zona_id,
    COALESCE(z.nombre, 'Sin zona') AS zona_nombre,
    COUNT(p.id) AS cantidad_pedidos,
    COALESCE(SUM(p.total), 0) AS total_ventas,
    COUNT(DISTINCT p.cliente_id) AS total_clientes
FROM "Pedidos" p
JOIN "Clientes" c ON c.id = p.cliente_id AND c.eliminado_en IS NULL
LEFT JOIN "Zonas" z ON z.id = c.id_zona
WHERE p.estado != 6 AND p.eliminado_en IS NULL
GROUP BY p.tenant_id, COALESCE(c.id_zona, 0), COALESCE(z.nombre, 'Sin zona');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ventas_zona_unique
    ON mv_ventas_zona (tenant_id, zona_id);
CREATE INDEX IF NOT EXISTS idx_mv_ventas_zona_tenant
    ON mv_ventas_zona (tenant_id);


-- ─── 5. Client Activity ──────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_actividad_clientes;
CREATE MATERIALIZED VIEW mv_actividad_clientes AS
SELECT
    c.tenant_id,
    c.id AS cliente_id,
    c.nombre AS cliente_nombre,
    COALESCE(z.nombre, 'Sin zona') AS zona_nombre,
    c.vendedor_id,
    COALESCE(u.nombre, '') AS vendedor_nombre,
    COALESCE(ord.cantidad_pedidos, 0) AS cantidad_pedidos,
    COALESCE(ord.total_ventas, 0) AS total_ventas,
    ord.ultimo_pedido,
    COALESCE(vis.total_visitas, 0) AS total_visitas,
    vis.ultima_visita,
    c.saldo,
    c.limite_credito,
    c.creado_en AS fecha_registro
FROM "Clientes" c
LEFT JOIN "Zonas" z ON z.id = c.id_zona
LEFT JOIN "Usuarios" u ON u.id = c.vendedor_id
LEFT JOIN (
    SELECT cliente_id, tenant_id,
           COUNT(*) AS cantidad_pedidos,
           COALESCE(SUM(total), 0) AS total_ventas,
           MAX(fecha_pedido) AS ultimo_pedido
    FROM "Pedidos"
    WHERE estado != 6 AND eliminado_en IS NULL
    GROUP BY cliente_id, tenant_id
) ord ON ord.cliente_id = c.id AND ord.tenant_id = c.tenant_id
LEFT JOIN (
    SELECT cliente_id, tenant_id,
           COUNT(*) AS total_visitas,
           MAX(fecha_hora_inicio) AS ultima_visita
    FROM "ClienteVisitas"
    WHERE eliminado_en IS NULL
    GROUP BY cliente_id, tenant_id
) vis ON vis.cliente_id = c.id AND vis.tenant_id = c.tenant_id
WHERE c.eliminado_en IS NULL AND c.es_prospecto = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_actividad_clientes_unique
    ON mv_actividad_clientes (tenant_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_mv_actividad_clientes_tenant
    ON mv_actividad_clientes (tenant_id);


-- ─── 6. Inventory Status Summary ─────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_inventario_resumen;
CREATE MATERIALIZED VIEW mv_inventario_resumen AS
SELECT
    i.tenant_id,
    i.producto_id,
    pr.nombre AS producto_nombre,
    pr.codigo_barra,
    COALESCE(cp.nombre, '') AS categoria_nombre,
    pr.precio_base,
    i.cantidad_actual,
    i.stock_minimo,
    i.stock_maximo,
    i.cantidad_actual * pr.precio_base AS valor_inventario,
    CASE
        WHEN i.cantidad_actual <= 0 THEN 'sin_stock'
        WHEN i.stock_minimo > 0 AND i.cantidad_actual <= i.stock_minimo THEN 'stock_bajo'
        WHEN i.stock_maximo > 0 AND i.cantidad_actual > i.stock_maximo THEN 'exceso'
        ELSE 'normal'
    END AS estado_stock
FROM "Inventario" i
JOIN "Productos" pr ON pr.id = i.producto_id AND pr.eliminado_en IS NULL
LEFT JOIN "CategoriasProductos" cp ON cp.id = pr.categoria_id
WHERE i.eliminado_en IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_inventario_resumen_unique
    ON mv_inventario_resumen (tenant_id, producto_id);
CREATE INDEX IF NOT EXISTS idx_mv_inventario_resumen_tenant
    ON mv_inventario_resumen (tenant_id);


-- ─── 7. Accounts Receivable Aging (Cartera Vencida) ──────────────
DROP MATERIALIZED VIEW IF EXISTS mv_cartera_vencida;
CREATE MATERIALIZED VIEW mv_cartera_vencida AS
SELECT
    c.tenant_id,
    c.id AS cliente_id,
    c.nombre AS cliente_nombre,
    COALESCE(z.nombre, 'Sin zona') AS zona_nombre,
    c.saldo AS saldo_pendiente,
    c.limite_credito,
    c.dias_credito,
    COALESCE(uc.ultimo_cobro, c.creado_en) AS ultimo_cobro,
    EXTRACT(DAY FROM NOW() - COALESCE(uc.ultimo_cobro, c.creado_en))::int AS dias_sin_cobro,
    CASE
        WHEN EXTRACT(DAY FROM NOW() - COALESCE(uc.ultimo_cobro, c.creado_en)) <= 30 THEN '0-30'
        WHEN EXTRACT(DAY FROM NOW() - COALESCE(uc.ultimo_cobro, c.creado_en)) <= 60 THEN '31-60'
        WHEN EXTRACT(DAY FROM NOW() - COALESCE(uc.ultimo_cobro, c.creado_en)) <= 90 THEN '61-90'
        ELSE '90+'
    END AS bucket
FROM "Clientes" c
LEFT JOIN "Zonas" z ON z.id = c.id_zona
LEFT JOIN (
    SELECT cliente_id, tenant_id, MAX(fecha_cobro) AS ultimo_cobro
    FROM "Cobros"
    WHERE eliminado_en IS NULL
    GROUP BY cliente_id, tenant_id
) uc ON uc.cliente_id = c.id AND uc.tenant_id = c.tenant_id
WHERE c.eliminado_en IS NULL AND c.saldo > 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cartera_vencida_unique
    ON mv_cartera_vencida (tenant_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_mv_cartera_vencida_tenant
    ON mv_cartera_vencida (tenant_id);


-- ─── 8. Dashboard KPIs ───────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_kpis_dashboard;
CREATE MATERIALIZED VIEW mv_kpis_dashboard AS
SELECT
    tenant_id,
    -- Sales totals (all time, non-cancelled)
    COUNT(*) AS total_pedidos,
    COALESCE(SUM(total), 0) AS total_ventas,
    CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(total) / COUNT(*), 2) ELSE 0 END AS ticket_promedio,
    COUNT(DISTINCT cliente_id) AS clientes_con_pedido,
    -- Last 7 days
    COUNT(*) FILTER (WHERE fecha_pedido >= CURRENT_DATE - 7) AS pedidos_7d,
    COALESCE(SUM(total) FILTER (WHERE fecha_pedido >= CURRENT_DATE - 7), 0) AS ventas_7d,
    -- Last 30 days
    COUNT(*) FILTER (WHERE fecha_pedido >= CURRENT_DATE - 30) AS pedidos_30d,
    COALESCE(SUM(total) FILTER (WHERE fecha_pedido >= CURRENT_DATE - 30), 0) AS ventas_30d,
    -- Last 90 days (quarter)
    COUNT(*) FILTER (WHERE fecha_pedido >= CURRENT_DATE - 90) AS pedidos_90d,
    COALESCE(SUM(total) FILTER (WHERE fecha_pedido >= CURRENT_DATE - 90), 0) AS ventas_90d
FROM "Pedidos"
WHERE estado != 6 AND eliminado_en IS NULL
GROUP BY tenant_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_kpis_dashboard_unique
    ON mv_kpis_dashboard (tenant_id);


-- ═══════════════════════════════════════════════════════════════════════
-- REFRESH FUNCTION
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION refresh_report_materialized_views()
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_ventas_diarias;
    REFRESH MATERIALIZED VIEW mv_ventas_vendedor;
    REFRESH MATERIALIZED VIEW mv_ventas_producto;
    REFRESH MATERIALIZED VIEW mv_ventas_zona;
    REFRESH MATERIALIZED VIEW mv_actividad_clientes;
    REFRESH MATERIALIZED VIEW mv_inventario_resumen;
    REFRESH MATERIALIZED VIEW mv_cartera_vencida;
    REFRESH MATERIALIZED VIEW mv_kpis_dashboard;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════
-- INITIAL DATA LOAD
-- Run this after creating the views to populate them for the first time
-- ═══════════════════════════════════════════════════════════════════════
-- SELECT refresh_report_materialized_views();
