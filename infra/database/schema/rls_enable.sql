-- ═══════════════════════════════════════════════════════════════
-- PostgreSQL Row Level Security (RLS) for multi-tenant isolation
-- Run against BOTH handy_erp AND handy_billing databases
-- ═══════════════════════════════════════════════════════════════
--
-- How it works:
-- 1. App sets TWO session vars per request:
--      SET app.tenant_id = '{tenantId}'
--      SET app.is_super_admin = 'true' | 'false'
-- 2. RLS policy: rows visible when
--      tenant_id = current_setting('app.tenant_id')::int
--      OR current_setting('app.is_super_admin', true) = 'true'
-- 3. Even if app forgets the WHERE clause, PostgreSQL blocks cross-tenant access
--    for non-SA users.
--
-- Role model (required for RLS to enforce at all):
--   - postgres (superuser): used ONLY for migrations and admin tasks. Bypasses RLS.
--   - handy_app (non-superuser): used by Main API + Billing API runtime. RLS enforced.
-- On Railway, create handy_app with: see create_handy_app_role.sql
--
-- SA bypass: SUPER_ADMIN users receive app.is_super_admin='true' from the interceptor
-- (read from es_super_admin JWT claim). This lets SA endpoints query all tenants
-- without IgnoreQueryFilters gymnastics at the PG layer.
--
-- Worker context: background workers (SubscriptionMonitor, etc.) have no HttpContext.
-- The interceptor falls back to app.is_super_admin='true' so workers can iterate all
-- tenants. Workers are trusted code — this is equivalent to running as SA.

-- ═══════════════════════════════════════════════════════════════
-- handy_erp tables with tenant_id (33 tables)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS + create policy for each tenant-scoped table
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'AutomationExecutions',
        'CategoriasClientes',
        'CategoriasProductos',
        'ClienteVisitas',
        'Clientes',
        'Cobros',
        'CrashReports',
        'CuponRedenciones',
        'DatosEmpresa',
        'DescuentosPorCantidad',
        'DeviceSessions',
        'FamiliasProductos',
        'IntegrationLogs',
        'Inventario',
        'ListasPrecios',
        'MetasVendedor',
        'MovimientosInventario',
        'NotificationHistory',
        'Pedidos',
        'PreciosPorProducto',
        'Productos',
        'PromocionProductos',
        'Promociones',
        'RutasCarga',
        'RutasPedidos',
        'RutasRetornoInventario',
        'RutasVendedor',
        'TenantAutomations',
        'TenantIntegrations',
        'TimbrePurchases',
        'UnidadesMedida',
        'Usuarios',
        'Zonas',
        'activity_logs',
        'ai_credit_balances',
        'ai_credit_purchases',
        'ai_embeddings',
        'ai_usage_logs',
        'company_settings'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        -- Enable RLS on table
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

        -- Drop existing policy if any
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);

        -- Create policy: rows visible only when tenant matches session variable
        -- OR caller is SUPER_ADMIN (set via app.is_super_admin from es_super_admin JWT claim)
        -- OR caller is a trusted worker (no HttpContext → interceptor sets is_super_admin='true')
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I FOR ALL USING (
                current_setting(''app.is_super_admin'', true) = ''true''
                OR tenant_id = current_setting(''app.tenant_id'', true)::int
            )',
            t
        );

        RAISE NOTICE 'RLS enabled on %', t;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Verify RLS is enabled
-- ═══════════════════════════════════════════════════════════════
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;
