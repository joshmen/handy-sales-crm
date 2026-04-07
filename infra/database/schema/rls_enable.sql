-- ═══════════════════════════════════════════════════════════════
-- PostgreSQL Row Level Security (RLS) for multi-tenant isolation
-- Run against BOTH handy_erp AND handy_billing databases
-- ═══════════════════════════════════════════════════════════════
--
-- How it works:
-- 1. App sets: SET app.tenant_id = '{tenantId}' before each query
-- 2. RLS policy: only rows where tenant_id = current_setting('app.tenant_id') are visible
-- 3. Even if app forgets the WHERE clause, PostgreSQL blocks cross-tenant access
--
-- The app user (handy_user) is NOT a superuser, so RLS applies to them.
-- Superuser (postgres) bypasses RLS for admin/migration tasks.

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

        -- Create policy: rows visible only when tenant_id matches session variable
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I FOR ALL USING (tenant_id = current_setting(''app.tenant_id'', true)::int)',
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
