-- ═══════════════════════════════════════════════════════════════
-- PostgreSQL RLS for handy_billing database
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'auditoria_facturacion',
        'configuracion_fiscal',
        'defaults_fiscales_tenant',
        'facturas',
        'mapeo_fiscal_producto',
        'numeracion_documentos'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I FOR ALL USING (tenant_id = current_setting(''app.tenant_id'', true)::text)',
            t
        );
        RAISE NOTICE 'RLS enabled on %', t;
    END LOOP;
END $$;

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;
