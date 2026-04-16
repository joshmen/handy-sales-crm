-- =====================================================
-- HandySuites PRODUCTION Seed (PostgreSQL + EF Core)
-- Run ONCE after EF Core migrations create all tables.
--
-- Usage (from Railway PG or Docker):
--   psql -U postgres -d handy_erp < infra/database/schema/seed_production.sql
--
-- Contains ONLY:
--   - Subscription plans (3)
--   - System roles (4 — no VIEWER)
--   - Automation templates (11)
--   - Timbre packages (3)
--   - 1 Super Admin user
--   - 1 Coupon for first client (Jeyma)
--
-- Does NOT contain:
--   - Test tenants, products, clients, orders
--   - Test users (admin@jeyma.com, etc.)
--   - E2E test data
--
-- Real tenants are created via /auth/register in the app.
-- =====================================================

BEGIN;

-- =====================================================
-- SECTION 1: SUBSCRIPTION PLANS
-- =====================================================

INSERT INTO subscription_plans (nombre, codigo, precio_mensual, precio_anual, max_usuarios, max_productos, max_clientes_por_mes, incluye_reportes, incluye_soporte_prioritario, caracteristicas, activo, orden) VALUES
('Gratis', 'FREE', 0, 0, 2, 50, 20, false, false, '["Hasta 2 usuarios","50 productos","20 clientes"]'::jsonb, true, 1),
('Basico', 'BASIC', 499, 4990, 5, 500, 100, true, false, '["Hasta 5 usuarios","500 productos","100 clientes","Reportes","25 timbres CFDI"]'::jsonb, true, 2),
('Profesional', 'PRO', 999, 9990, 20, 5000, 500, true, true, '["Hasta 20 usuarios","5000 productos","500 clientes","Reportes avanzados","100 timbres CFDI","Asistente IA","Soporte prioritario"]'::jsonb, true, 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 2: TIMBRE PACKAGES (CFDI stamps)
-- =====================================================

INSERT INTO timbre_packages (nombre, cantidad, precio_mxn, precio_unitario, stripe_price_id, badge, activo, orden) VALUES
('Paquete 25', 25, 50.00, 2.00, NULL, NULL, true, 1),
('Paquete 50', 50, 85.00, 1.70, NULL, 'mostPopular', true, 2),
('Paquete 100', 100, 150.00, 1.50, NULL, 'bestValue', true, 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 3: SYSTEM ROLES (4 — no VIEWER)
-- =====================================================

INSERT INTO roles (nombre, descripcion, created_at, updated_at, activo, creado_en, version) VALUES
('SUPER_ADMIN', 'Super administrador del sistema', NOW(), NOW(), true, NOW(), 1),
('ADMIN', 'Administrador de empresa', NOW(), NOW(), true, NOW(), 1),
('SUPERVISOR', 'Supervisor de vendedores', NOW(), NOW(), true, NOW(), 1),
('VENDEDOR', 'Vendedor de ruta', NOW(), NOW(), true, NOW(), 1)
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- SECTION 4: AUTOMATION TEMPLATES (11 global recipes)
-- =====================================================

INSERT INTO "AutomationTemplates" (slug, nombre, descripcion, descripcion_corta, icono, categoria, trigger_type, trigger_event, trigger_cron, action_type, default_params_json, tier, orden, created_at) VALUES
('stock-bajo-alerta', 'Alerta de stock bajo', 'Revisa periodicamente el inventario y envia una notificacion cuando un producto cae por debajo de su stock minimo configurado.', 'Notifica cuando un producto tiene stock bajo', 'PackageOpen', 2, 2, NULL, NULL, 0, '{"umbral_porcentaje": 20, "destinatario": "ambos"}'::jsonb, 0, 1, NOW()),
('resumen-diario', 'Resumen del dia', 'Genera un resumen automatico de las ventas, cobros y visitas del dia y lo envia como notificacion al administrador a la hora configurada.', 'Resumen diario de ventas cobros y visitas', 'ClipboardList', 3, 1, NULL, '0 19 * * *', 0, '{"hora": "19:00", "incluir_cobros": true, "incluir_ventas": true, "incluir_visitas": true, "destinatario": "admin"}'::jsonb, 0, 2, NOW()),
('bienvenida-cliente', 'Bienvenida cliente nuevo', 'Cuando se registra un nuevo cliente, crea automaticamente una notificacion de seguimiento para el vendedor asignado.', 'Notificacion de seguimiento al crear un cliente', 'UserPlus', 1, 0, 'cliente.created', NULL, 0, '{"dias_seguimiento": 3, "destinatario": "vendedores"}'::jsonb, 0, 3, NOW()),
('cobro-vencido-recordatorio', 'Recordatorio de cobro vencido', 'Detecta saldos vencidos mas alla del periodo configurado y envia recordatorios periodicos al vendedor asignado, con un limite maximo de avisos.', 'Recuerda cobrar saldos vencidos', 'BellRinging', 0, 2, NULL, NULL, 0, '{"dias_vencimiento": 7, "frecuencia_dias": 3, "max_recordatorios": 3, "destinatario": "ambos"}'::jsonb, 1, 4, NOW()),
('cliente-inactivo-visita', 'Agendar visita a cliente inactivo', 'Identifica clientes que no han tenido actividad (pedidos ni visitas) en el periodo configurado y sugiere agendar una visita de seguimiento.', 'Sugiere visitar clientes sin actividad reciente', 'UserCheck', 1, 2, NULL, NULL, 0, '{"dias_inactividad": 15, "destinatario": "vendedores"}'::jsonb, 1, 5, NOW()),
('pedido-recurrente', 'Sugerir reorden automatico', 'Analiza patrones de compra y notifica cuando un cliente habitual no ha hecho su pedido esperado, sugiriendo contactarlo para reorden.', 'Detecta pedidos recurrentes y sugiere reorden', 'Repeat', 1, 2, NULL, NULL, 0, '{"dias_sin_pedido": 14, "min_pedidos_historicos": 3, "destinatario": "vendedores"}'::jsonb, 1, 6, NOW()),
('ruta-semanal-auto', 'Ruta automatica semanal', 'Cada lunes genera automaticamente una ruta sugerida para cada vendedor basada en clientes pendientes de visita y zona asignada.', 'Genera ruta semanal automaticamente', 'MapPinLine', 3, 1, NULL, '0 6 * * 1', 2, '{"dia": "lunes", "hora": "06:00", "max_paradas": 15, "destinatario": "vendedores"}'::jsonb, 1, 7, NOW()),
('meta-no-cumplida', 'Alerta meta semanal no cumplida', 'Al final de cada semana evalua el avance de ventas contra la meta del vendedor y envia una alerta si no se alcanzo el objetivo.', 'Avisa si no se alcanzo la meta de ventas', 'Target', 3, 1, NULL, '0 18 * * 5', 0, '{"porcentaje_alerta": 80, "destinatario": "vendedores"}'::jsonb, 1, 8, NOW()),
('cobro-exitoso-aviso', 'Confirmacion de cobro registrado', 'Detecta cobros registrados desde la ultima ejecucion y envia una notificacion de confirmacion al administrador con los detalles del pago recibido.', 'Confirma al admin cuando se registra un cobro', 'CheckCircle', 0, 2, NULL, NULL, 0, '{"destinatario": "admin"}'::jsonb, 1, 9, NOW()),
('inventario-critico', 'Alerta inventario en cero', 'Monitorea el inventario y envia una alerta urgente cuando un producto activo llega a cero unidades disponibles.', 'Alerta urgente cuando un producto llega a 0', 'Warning', 2, 2, NULL, NULL, 0, '{"destinatario": "ambos"}'::jsonb, 1, 10, NOW()),
('meta-auto-renovacion', 'Auto-renovacion de metas', 'Revisa diariamente las metas vencidas con auto-renovacion activada y crea automaticamente una nueva meta con las mismas condiciones para el siguiente periodo.', 'Renueva metas automaticamente al vencer', 'ArrowsClockwise', 3, 1, NULL, '0 1 * * *', 0, '{"destinatario": "admin"}'::jsonb, 1, 11, NOW())
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- SECTION 5: SUPER ADMIN USER
-- This is the ONLY user seeded in production.
-- All other users are created via the app registration flow.
-- =====================================================

-- Create a minimal tenant for the super admin
INSERT INTO "Tenants" (nombre_empresa, plan_tipo, max_usuarios, subscription_status, activo, creado_en, version) VALUES
('HandySuites Platform', 'PRO', 100, 'Active', true, NOW(), 1);

INSERT INTO "DatosEmpresa" (tenant_id, razon_social, identificador_fiscal, tipo_identificador_fiscal, telefono, email, contacto, activo, creado_en, version) VALUES
(1, 'HandySuites Platform', 'HSU260101AAA', 'RFC', '0000000000', 'admin@handysuites.com', 'Platform Admin', true, NOW(), 1);

INSERT INTO company_settings (tenant_id, company_name, primary_color, secondary_color, timezone, language, currency, theme, activo, creado_en, version) VALUES
(1, 'HandySuites Platform', '#16A34A', '#0F766E', 'America/Mexico_City', 'es', 'MXN', 'system', true, NOW(), 1);

-- Super Admin user
-- Password: Hs!Pr0d#2026SuperAdm1n (CHANGE THIS after first login!)
INSERT INTO "Usuarios" (tenant_id, email, password_hash, nombre, es_admin, es_super_admin, rol, role_id, activo, session_version, totp_enabled, email_verificado, creado_en, version) VALUES
(1, 'superadmin@handysuites.com',
 '$2b$10$6L4Pou.rBfAdIWv/ZEU27usdJY3yu2wJ/5qWGZltwnlMfAQ1Q0SJi',
 'Super Administrador', true, true, 'SUPER_ADMIN',
 (SELECT id FROM roles WHERE nombre = 'SUPER_ADMIN'),
 true, 0, false, true, NOW(), 1);

-- =====================================================
-- SECTION 6: LAUNCH COUPON (Jeyma — first client)
-- Type 3 = PlanGratisPermanente → upgrades to PRO for free, forever
-- =====================================================

INSERT INTO "Cupones" (codigo, nombre, tipo_cupon, plan_objetivo, meses_gratis, descuento_porcentaje, activo, max_usos, usos_actuales, fecha_expiracion, creado_en, version) VALUES
('JEYMA-FAMILIA-2026', 'Plan Profesional Gratis - Jeyma (Primer Cliente)', 3, 'PRO', 0, 0, true, 1, 0, '2027-12-31', NOW(), 1)
ON CONFLICT DO NOTHING;

COMMIT;

-- =====================================================
-- POST-SEED VERIFICATION
-- Run these queries to verify the seed was applied correctly:
--
--   SELECT nombre, codigo, precio_mensual FROM subscription_plans ORDER BY orden;
--   SELECT nombre FROM roles ORDER BY nombre;
--   SELECT slug FROM "AutomationTemplates" ORDER BY orden;
--   SELECT email, rol FROM "Usuarios";
--   SELECT codigo, nombre, tipo_cupon FROM "Cupones";
-- =====================================================
