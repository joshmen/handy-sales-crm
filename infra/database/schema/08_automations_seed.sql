-- =====================================================
-- Automation Templates Seed Data
-- 10 pre-built automation recipes
-- =====================================================

USE handy_erp;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

INSERT INTO AutomationTemplates (slug, nombre, descripcion, descripcion_corta, icono, categoria, trigger_type, trigger_event, trigger_cron, action_type, default_params_json, tier, orden, created_at)
VALUES
-- FREE tier (3)
('stock-bajo-alerta', 'Alerta de stock bajo',
 'Revisa periódicamente el inventario y envía una notificación cuando un producto cae por debajo de su stock mínimo configurado.',
 'Notifica cuando un producto tiene stock bajo',
 'PackageOpen', 2, 2, NULL, NULL, 0,
 '{"umbral_porcentaje": 20}',
 0, 1, UTC_TIMESTAMP()),

('resumen-diario', 'Resumen del día',
 'Genera un resumen automático de las ventas, cobros y visitas del día y lo envía como notificación al administrador a la hora configurada.',
 'Resumen diario de ventas, cobros y visitas',
 'ClipboardList', 3, 1, NULL, '0 19 * * *', 0,
 '{"hora": "19:00", "incluir_cobros": true, "incluir_ventas": true, "incluir_visitas": true}',
 0, 2, UTC_TIMESTAMP()),

('bienvenida-cliente', 'Bienvenida cliente nuevo',
 'Cuando se registra un nuevo cliente, crea automáticamente una notificación de seguimiento para el vendedor asignado.',
 'Notificación de seguimiento al crear un cliente',
 'UserPlus', 1, 0, 'cliente.created', NULL, 0,
 '{"dias_seguimiento": 3}',
 0, 3, UTC_TIMESTAMP()),

-- PREMIUM tier (7)
('cobro-vencido-recordatorio', 'Recordatorio de cobro vencido',
 'Detecta saldos vencidos más allá del período configurado y envía recordatorios periódicos al vendedor asignado, con un límite máximo de avisos.',
 'Recuerda cobrar saldos vencidos',
 'BellRinging', 0, 2, NULL, NULL, 0,
 '{"dias_vencimiento": 7, "frecuencia_dias": 3, "max_recordatorios": 3}',
 1, 4, UTC_TIMESTAMP()),

('cliente-inactivo-visita', 'Agendar visita a cliente inactivo',
 'Identifica clientes que no han tenido actividad (pedidos ni visitas) en el período configurado y sugiere agendar una visita de seguimiento.',
 'Sugiere visitar clientes sin actividad reciente',
 'UserCheck', 1, 2, NULL, NULL, 0,
 '{"dias_inactividad": 15}',
 1, 5, UTC_TIMESTAMP()),

('pedido-recurrente', 'Sugerir reorden automático',
 'Analiza patrones de compra y notifica cuando un cliente habitual no ha hecho su pedido esperado, sugiriendo contactarlo para reorden.',
 'Detecta pedidos recurrentes y sugiere reorden',
 'Repeat', 1, 2, NULL, NULL, 0,
 '{"dias_sin_pedido": 14, "min_pedidos_historicos": 3}',
 1, 6, UTC_TIMESTAMP()),

('ruta-semanal-auto', 'Ruta automática semanal',
 'Cada lunes genera automáticamente una ruta sugerida para cada vendedor basada en clientes pendientes de visita y zona asignada.',
 'Genera ruta semanal automáticamente',
 'MapPinLine', 3, 1, NULL, '0 6 * * 1', 2,
 '{"dia": "lunes", "hora": "06:00", "max_paradas": 15}',
 1, 7, UTC_TIMESTAMP()),

('meta-no-cumplida', 'Alerta meta semanal no cumplida',
 'Al final de cada semana evalúa el avance de ventas contra la meta del vendedor y envía una alerta si no se alcanzó el objetivo.',
 'Avisa si no se alcanzó la meta de ventas',
 'Target', 3, 1, NULL, '0 18 * * 5', 0,
 '{"porcentaje_alerta": 80}',
 1, 8, UTC_TIMESTAMP()),

('cobro-exitoso-aviso', 'Confirmación de cobro registrado',
 'Cuando se registra un cobro exitosamente, envía una notificación de confirmación al administrador con los detalles del pago recibido.',
 'Confirma al admin cuando se registra un cobro',
 'CheckCircle', 0, 0, 'cobro.created', NULL, 0,
 NULL,
 1, 9, UTC_TIMESTAMP()),

('inventario-critico', 'Alerta inventario en cero',
 'Monitorea el inventario y envía una alerta urgente cuando un producto activo llega a cero unidades disponibles.',
 'Alerta urgente cuando un producto llega a 0',
 'Warning', 2, 2, NULL, NULL, 0,
 NULL,
 1, 10, UTC_TIMESTAMP());
