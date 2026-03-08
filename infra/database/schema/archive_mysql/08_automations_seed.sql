-- =====================================================
-- Automation Templates Seed Data
-- 10 pre-built automation recipes
-- PostgreSQL 16 syntax
-- =====================================================

INSERT INTO "AutomationTemplates" (slug, nombre, descripcion, descripcion_corta, icono, categoria, trigger_type, trigger_event, trigger_cron, action_type, default_params_json, tier, orden, created_at)
VALUES
-- FREE tier (3)
('stock-bajo-alerta', 'Alerta de stock bajo',
 'Revisa periodicamente el inventario y envia una notificacion cuando un producto cae por debajo de su stock minimo configurado.',
 'Notifica cuando un producto tiene stock bajo',
 'PackageOpen', 2, 2, NULL, NULL, 0,
 '{"umbral_porcentaje": 20, "destinatario": "ambos"}',
 0, 1, NOW()),

('resumen-diario', 'Resumen del dia',
 'Genera un resumen automatico de las ventas, cobros y visitas del dia y lo envia como notificacion al administrador a la hora configurada.',
 'Resumen diario de ventas, cobros y visitas',
 'ClipboardList', 3, 1, NULL, '0 19 * * *', 0,
 '{"hora": "19:00", "incluir_cobros": true, "incluir_ventas": true, "incluir_visitas": true, "destinatario": "admin"}',
 0, 2, NOW()),

('bienvenida-cliente', 'Bienvenida cliente nuevo',
 'Cuando se registra un nuevo cliente, crea automaticamente una notificacion de seguimiento para el vendedor asignado.',
 'Notificacion de seguimiento al crear un cliente',
 'UserPlus', 1, 0, 'cliente.created', NULL, 0,
 '{"dias_seguimiento": 3, "destinatario": "vendedores"}',
 0, 3, NOW()),

-- PREMIUM tier (7)
('cobro-vencido-recordatorio', 'Recordatorio de cobro vencido',
 'Detecta saldos vencidos mas alla del periodo configurado y envia recordatorios periodicos al vendedor asignado, con un limite maximo de avisos.',
 'Recuerda cobrar saldos vencidos',
 'BellRinging', 0, 2, NULL, NULL, 0,
 '{"dias_vencimiento": 7, "frecuencia_dias": 3, "max_recordatorios": 3, "destinatario": "ambos"}',
 1, 4, NOW()),

('cliente-inactivo-visita', 'Agendar visita a cliente inactivo',
 'Identifica clientes que no han tenido actividad (pedidos ni visitas) en el periodo configurado y sugiere agendar una visita de seguimiento.',
 'Sugiere visitar clientes sin actividad reciente',
 'UserCheck', 1, 2, NULL, NULL, 0,
 '{"dias_inactividad": 15, "destinatario": "vendedores"}',
 1, 5, NOW()),

('pedido-recurrente', 'Sugerir reorden automatico',
 'Analiza patrones de compra y notifica cuando un cliente habitual no ha hecho su pedido esperado, sugiriendo contactarlo para reorden.',
 'Detecta pedidos recurrentes y sugiere reorden',
 'Repeat', 1, 2, NULL, NULL, 0,
 '{"dias_sin_pedido": 14, "min_pedidos_historicos": 3, "destinatario": "vendedores"}',
 1, 6, NOW()),

('ruta-semanal-auto', 'Ruta automatica semanal',
 'Cada lunes genera automaticamente una ruta sugerida para cada vendedor basada en clientes pendientes de visita y zona asignada.',
 'Genera ruta semanal automaticamente',
 'MapPinLine', 3, 1, NULL, '0 6 * * 1', 2,
 '{"dia": "lunes", "hora": "06:00", "max_paradas": 15, "destinatario": "vendedores"}',
 1, 7, NOW()),

('meta-no-cumplida', 'Alerta meta semanal no cumplida',
 'Al final de cada semana evalua el avance de ventas contra la meta del vendedor y envia una alerta si no se alcanzo el objetivo.',
 'Avisa si no se alcanzo la meta de ventas',
 'Target', 3, 1, NULL, '0 18 * * 5', 0,
 '{"porcentaje_alerta": 80, "destinatario": "vendedores"}',
 1, 8, NOW()),

('cobro-exitoso-aviso', 'Confirmacion de cobro registrado',
 'Detecta cobros registrados desde la ultima ejecucion y envia una notificacion de confirmacion al administrador con los detalles del pago recibido.',
 'Confirma al admin cuando se registra un cobro',
 'CheckCircle', 0, 2, NULL, NULL, 0,
 '{"destinatario": "admin"}',
 1, 9, NOW()),

('inventario-critico', 'Alerta inventario en cero',
 'Monitorea el inventario y envia una alerta urgente cuando un producto activo llega a cero unidades disponibles.',
 'Alerta urgente cuando un producto llega a 0',
 'Warning', 2, 2, NULL, NULL, 0,
 '{"destinatario": "ambos"}',
 1, 10, NOW()),

('meta-auto-renovacion', 'Auto-renovacion de metas',
 'Revisa diariamente las metas vencidas con auto-renovacion activada y crea automaticamente una nueva meta con las mismas condiciones para el siguiente periodo.',
 'Renueva metas automaticamente al vencer',
 'ArrowsClockwise', 3, 1, NULL, '0 1 * * *', 0,
 '{"destinatario": "admin"}',
 1, 11, NOW())
ON CONFLICT (slug) DO NOTHING;
