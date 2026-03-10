-- =====================================================
-- HandySales Local Development Seed (PostgreSQL + EF Core)
-- Run AFTER EF Core migrations have created all tables
--
-- Usage:
--   docker exec -i handysales_postgres_dev psql -U handy_user -d handy_erp < infra/database/schema/seed_local_pg.sql
--
-- Data layers:
--   Section 1: Global system data (subscription plans, roles, automation templates)
--   Section 2: Dev tenants (4 test companies + business identity + UI settings)
--   Section 3: Dev users (admin + vendedores + viewer + supervisor per tenant)
--   Section 4: Tenant 1 (Jeyma) product catalog for testing
--
-- Note: When a REAL user registers via /auth/register, the system creates:
--   Tenant + DatosEmpresa + Admin user + demo data (via TenantSeedService)
--   This file is ONLY for local dev bootstrapping.
-- =====================================================

BEGIN;

-- =====================================================
-- SECTION 1: GLOBAL SYSTEM DATA
-- These exist once, shared by ALL tenants.
-- In production, seeded by EF Core HasData or a one-time migration.
-- =====================================================

-- Subscription Plans (3)
INSERT INTO subscription_plans (nombre, codigo, precio_mensual, precio_anual, max_usuarios, max_productos, max_clientes_por_mes, incluye_reportes, incluye_soporte_prioritario, caracteristicas, activo, orden) VALUES
('Gratis', 'FREE', 0, 0, 2, 50, 20, false, false, '["Hasta 2 usuarios","50 productos","20 clientes"]'::jsonb, true, 1),
('Basico', 'BASIC', 499, 4990, 5, 500, 100, true, false, '["Hasta 5 usuarios","500 productos","100 clientes","Reportes"]'::jsonb, true, 2),
('Profesional', 'PRO', 999, 9990, 20, 5000, 500, true, true, '["Hasta 20 usuarios","5000 productos","500 clientes","Reportes","Soporte prioritario"]'::jsonb, true, 3)
ON CONFLICT DO NOTHING;

-- Roles (5)
INSERT INTO roles (nombre, descripcion, created_at, updated_at, activo, creado_en, version) VALUES
('SUPER_ADMIN', 'Super administrador del sistema', NOW(), NOW(), true, NOW(), 1),
('ADMIN', 'Administrador de empresa', NOW(), NOW(), true, NOW(), 1),
('SUPERVISOR', 'Supervisor de vendedores', NOW(), NOW(), true, NOW(), 1),
('VENDEDOR', 'Vendedor de ruta', NOW(), NOW(), true, NOW(), 1),
('VIEWER', 'Solo lectura', NOW(), NOW(), true, NOW(), 1)
ON CONFLICT (nombre) DO NOTHING;

-- Automation Templates (11) -- global recipes, tenants activate via TenantAutomations
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
-- SECTION 2: DEV TENANTS (4 test companies)
-- These simulate real businesses for local development.
-- =====================================================

-- Tenants
INSERT INTO "Tenants" (nombre_empresa, plan_tipo, max_usuarios, subscription_status, activo, creado_en, version) VALUES
('Jeyma S.A. de C.V.', 'PRO', 20, 'Active', true, NOW(), 1),
('Huichol Distribuciones', 'BASIC', 5, 'Active', true, NOW(), 1),
('Distribuidora del Centro', 'FREE', 2, 'Trial', true, NOW(), 1),
('Rutas Express Norte', 'FREE', 2, 'Trial', true, NOW(), 1);

-- Business Identity (1:1 with Tenant)
INSERT INTO "DatosEmpresa" (tenant_id, razon_social, identificador_fiscal, tipo_identificador_fiscal, telefono, email, contacto, direccion, ciudad, estado, codigo_postal, activo, creado_en, version) VALUES
(1, 'Jeyma S.A. de C.V.', 'JEY210101AAA', 'RFC', '3331234567', 'admin@jeyma.com', 'Admin Jeyma', 'Av Vallarta 1234', 'Guadalajara', 'Jalisco', '44100', true, NOW(), 1),
(2, 'Huichol Distribuciones S.A.', 'HUI210101BBB', 'RFC', '3339876543', 'admin@huichol.com', 'Admin Huichol', 'Av Lopez Mateos 567', 'Zapopan', 'Jalisco', '45050', true, NOW(), 1),
(3, 'Distribuidora del Centro S.A.', 'DCE210101CCC', 'RFC', '4771234567', 'admin@centro.com', 'Admin Centro', 'Blvd Lopez Mateos 890', 'Leon', 'Guanajuato', '37000', true, NOW(), 1),
(4, 'Rutas Express Norte S.A.', 'REN210101DDD', 'RFC', '8181234567', 'admin@rutasnorte.com', 'Admin Norte', 'Av Constitucion 456', 'Monterrey', 'Nuevo Leon', '64000', true, NOW(), 1);

-- UI / Branding Settings (1:1 with Tenant)
INSERT INTO company_settings (tenant_id, company_name, primary_color, secondary_color, timezone, language, currency, theme, activo, creado_en, version) VALUES
(1, 'Jeyma S.A. de C.V.', '#16A34A', '#0F766E', 'America/Mexico_City', 'es', 'MXN', 'system', true, NOW(), 1),
(2, 'Huichol Distribuciones', '#2563EB', '#0F766E', 'America/Mexico_City', 'es', 'MXN', 'system', true, NOW(), 1),
(3, 'Distribuidora del Centro', '#9333EA', '#0F766E', 'America/Mexico_City', 'es', 'MXN', 'system', true, NOW(), 1),
(4, 'Rutas Express Norte', '#EA580C', '#0F766E', 'America/Mexico_City', 'es', 'MXN', 'system', true, NOW(), 1);

-- =====================================================
-- SECTION 3: DEV USERS
-- Password for all: test123
-- BCrypt: $2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO
-- =====================================================

INSERT INTO "Usuarios" (tenant_id, email, password_hash, nombre, es_admin, es_super_admin, rol, activo, session_version, totp_enabled, email_verificado, creado_en, version) VALUES
-- Super Admin (plataforma)
(1, 'superadmin@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Super Administrador', true, true, 'SUPER_ADMIN', true, 0, false, true, NOW(), 1),
-- Admins (1 per tenant)
(1, 'admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Jeyma', true, false, 'ADMIN', true, 0, false, true, NOW(), 1),
(2, 'admin@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Huichol', true, false, 'ADMIN', true, 0, false, true, NOW(), 1),
(3, 'admin@centro.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Centro', true, false, 'ADMIN', true, 0, false, true, NOW(), 1),
(4, 'admin@rutasnorte.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Rutas Norte', true, false, 'ADMIN', true, 0, false, true, NOW(), 1),
-- Vendedores (Jeyma + Huichol)
(1, 'vendedor1@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 1 Jeyma', false, false, 'VENDEDOR', true, 0, false, true, NOW(), 1),
(1, 'vendedor2@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 2 Jeyma', false, false, 'VENDEDOR', true, 0, false, true, NOW(), 1),
(2, 'vendedor1@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 1 Huichol', false, false, 'VENDEDOR', true, 0, false, true, NOW(), 1),
(2, 'vendedor2@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 2 Huichol', false, false, 'VENDEDOR', true, 0, false, true, NOW(), 1),
-- Viewer + Supervisor (Jeyma)
(1, 'viewer@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Viewer Jeyma', false, false, 'VIEWER', true, 0, false, true, NOW(), 1),
(1, 'supervisor@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Supervisor Jeyma', false, false, 'SUPERVISOR', true, 0, false, true, NOW(), 1);

-- Link vendedores to supervisor
UPDATE "Usuarios" SET supervisor_id = (SELECT id FROM "Usuarios" WHERE email = 'supervisor@jeyma.com')
WHERE email IN ('vendedor1@jeyma.com', 'vendedor2@jeyma.com') AND supervisor_id IS NULL;

-- =====================================================
-- SECTION 4: TENANT 1 (JEYMA) PRODUCT CATALOG
-- Minimal catalog so the dashboard and pages have data to display.
-- Real tenants get demo data via TenantSeedService on registration.
-- =====================================================

INSERT INTO "CategoriasProductos" (tenant_id, nombre, descripcion, activo, creado_en, version) VALUES
(1, 'Bebidas', 'Refrescos aguas y jugos', true, NOW(), 1),
(1, 'Botanas', 'Frituras y snacks', true, NOW(), 1),
(1, 'Dulces', 'Dulces y chocolates', true, NOW(), 1);

INSERT INTO "FamiliasProductos" (tenant_id, nombre, descripcion, activo, creado_en, version) VALUES
(1, 'Coca-Cola', 'Productos Coca-Cola', true, NOW(), 1),
(1, 'Sabritas', 'Productos PepsiCo/Sabritas', true, NOW(), 1);

INSERT INTO "UnidadesMedida" (tenant_id, nombre, abreviatura, activo, creado_en, version) VALUES
(1, 'Pieza', 'PZA', true, NOW(), 1),
(1, 'Caja', 'CJA', true, NOW(), 1),
(1, 'Paquete', 'PQT', true, NOW(), 1);

INSERT INTO "Zonas" (tenant_id, nombre, descripcion, activo, creado_en, version) VALUES
(1, 'Centro', 'Zona Centro de Guadalajara', true, NOW(), 1),
(1, 'Norte', 'Zona Norte Zapopan', true, NOW(), 1),
(1, 'Sur', 'Zona Sur Tlaquepaque', true, NOW(), 1);

INSERT INTO "CategoriasClientes" (tenant_id, nombre, descripcion, activo, creado_en, version) VALUES
(1, 'General', 'Cliente general', true, NOW(), 1);

INSERT INTO "Productos" (tenant_id, nombre, codigo_barra, descripcion, precio_base, familia_id, categoria_id, unidad_medida_id, activo, creado_en, version) VALUES
(1, 'Coca-Cola 600ml', 'CC600', 'Refresco Coca-Cola 600ml', 18.50, 1, 1, 1, true, NOW(), 1),
(1, 'Coca-Cola 2L', 'CC2L', 'Refresco Coca-Cola 2 litros', 32.00, 1, 1, 1, true, NOW(), 1),
(1, 'Sabritas Original 45g', 'SAB45', 'Papas Sabritas Original 45g', 16.00, 2, 2, 1, true, NOW(), 1),
(1, 'Ruffles Queso 45g', 'RUF45', 'Papas Ruffles Queso 45g', 16.00, 2, 2, 1, true, NOW(), 1),
(1, 'Mazapan De La Rosa', 'MAZ01', 'Mazapan De La Rosa individual', 5.00, 1, 3, 1, true, NOW(), 1);

INSERT INTO "Clientes" (tenant_id, nombre, rfc, correo, telefono, direccion, id_zona, categoria_cliente_id, vendedor_id, es_prospecto, facturable, descuento, saldo, limite_credito, venta_minima_efectiva, tipos_pago_permitidos, tipo_pago_predeterminado, dias_credito, ciudad, activo, creado_en, version) VALUES
(1, 'Tienda Don Jose', 'LOGJ800101ABC', 'donjose@email.com', '3331001001', 'Calle Morelos 123', 1, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor1@jeyma.com'), false, false, 0, 0, 5000, 0, 'EFECTIVO,TRANSFERENCIA', 'EFECTIVO', 0, 'Guadalajara', true, NOW(), 1),
(1, 'Abarrotes La Esquina', 'GAHM900202DEF', 'laesquina@email.com', '3331002002', 'Av Juarez 456', 1, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor1@jeyma.com'), false, false, 0, 0, 10000, 0, 'EFECTIVO,TRANSFERENCIA', 'EFECTIVO', 0, 'Guadalajara', true, NOW(), 1),
(1, 'Mini Super El Sol', 'RATP850303GHI', 'elsol@email.com', '3331003003', 'Blvd Tlaquepaque 789', 3, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor2@jeyma.com'), false, false, 0, 0, 8000, 0, 'EFECTIVO,TRANSFERENCIA', 'EFECTIVO', 0, 'Tlaquepaque', true, NOW(), 1),
(1, 'Tienda Lupita', 'MAGL880404JKL', 'lupita@email.com', '3331004004', 'Av Patria 234', 2, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor2@jeyma.com'), false, false, 0, 0, 5000, 0, 'EFECTIVO,TRANSFERENCIA', 'EFECTIVO', 0, 'Zapopan', true, NOW(), 1);

-- Set Jeyma tenant to PROFESIONAL plan (for AI credits)
UPDATE "Tenants" SET plan_tipo = 'PROFESIONAL' WHERE id = 1 AND plan_tipo IN ('BASIC', 'FREE', 'basico', 'free');

-- AI Credit Balances (for Jeyma tenant = id 1, PRO plan)
INSERT INTO ai_credit_balances (tenant_id, anio, mes, creditos_asignados, creditos_usados, creditos_extras, fecha_reset, creado_en) VALUES
(1, EXTRACT(YEAR FROM NOW())::int, EXTRACT(MONTH FROM NOW())::int, 100, 0, 0, DATE_TRUNC('month', NOW()) + INTERVAL '1 month', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
