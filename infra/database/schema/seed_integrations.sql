-- ============================================
-- Seed: Integration Catalog (global, no tenant_id)
-- Run after EF Core migration AddIntegrationsMarketplace
-- ============================================

INSERT INTO "Integrations" (
  slug, nombre, descripcion, icono, categoria,
  tipo_precio, precio_mxn, estado,
  activo, creado_en, actualizado_en, version
) VALUES
(
  'facturacion-sat',
  'Facturación SAT (CFDI 4.0)',
  'Emite facturas electrónicas CFDI 4.0 directamente desde tus pedidos. Incluye complemento de pago, notas de crédito y cancelaciones ante el SAT.',
  'receipt',
  'facturacion',
  'MENSUAL',
  299.00,
  'DISPONIBLE',
  true, NOW(), NOW(), 1
),
(
  'whatsapp-business',
  'WhatsApp Business API',
  'Envía confirmaciones de pedido, recordatorios de cobro y notificaciones automáticas a tus clientes por WhatsApp.',
  'message-square',
  'comunicacion',
  'MENSUAL',
  199.00,
  'PROXIMO',
  true, NOW(), NOW(), 1
),
(
  'google-maps-avanzado',
  'Google Maps Avanzado',
  'Optimización de rutas con tráfico en tiempo real, geocodificación de clientes y visualización avanzada de zonas de cobertura.',
  'map-pin',
  'mapas',
  'MENSUAL',
  149.00,
  'PROXIMO',
  true, NOW(), NOW(), 1
),
(
  'pagos-en-linea',
  'Pagos en Línea (Stripe)',
  'Acepta pagos con tarjeta de crédito/débito y transferencias bancarias directamente desde la app. Cobros automáticos y conciliación.',
  'credit-card',
  'pagos',
  'GRATIS',
  0.00,
  'PROXIMO',
  true, NOW(), NOW(), 1
)
ON CONFLICT (slug) DO NOTHING;
