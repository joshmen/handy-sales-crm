-- Seed: Supervisor GPS data — vendedores en Los Mochis, Sinaloa
-- Run after seed_local_pg.sql on a fresh database
-- Prereqs: supervisor@jeyma.com (id=10) with vendedores 5 and 6 assigned

-- Vendedor 1 (id=5): zona centro de Los Mochis
INSERT INTO "ClienteVisitas" (tenant_id, cliente_id, usuario_id, tipo_visita, resultado,
  fecha_programada, fecha_hora_inicio, fecha_hora_fin,
  latitud_inicio, longitud_inicio, latitud_fin, longitud_fin,
  distancia_cliente, notas, activo, creado_en, actualizado_en, version)
VALUES
-- Mercado Independencia (centro)
(1, 1, 5, 0, 1, CURRENT_DATE, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 30 minutes',
 25.7903, -108.9931, 25.7903, -108.9931, 15.2, 'Pedido levantado - 3 cajas refresco', true, NOW(), NOW(), 1),
-- Tienda Don Pedro (col. Bienestar)
(1, 2, 5, 0, 1, CURRENT_DATE, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes',
 25.7845, -108.9870, 25.7845, -108.9870, 8.5, 'Exhibición montada, pedido surtido', true, NOW(), NOW(), 1),
-- Visita activa: Abarrotes La Esquina (col. Centro)
(1, 3, 5, 0, 0, CURRENT_DATE, NOW() - INTERVAL '10 minutes', NULL,
 25.7920, -108.9955, NULL, NULL, NULL, NULL, true, NOW(), NOW(), 1);

-- Vendedor 2 (id=6): zona norte de Los Mochis
INSERT INTO "ClienteVisitas" (tenant_id, cliente_id, usuario_id, tipo_visita, resultado,
  fecha_programada, fecha_hora_inicio, fecha_hora_fin,
  latitud_inicio, longitud_inicio, latitud_fin, longitud_fin,
  distancia_cliente, notas, activo, creado_en, actualizado_en, version)
VALUES
-- Minisuper El Sol (col. Las Fuentes)
(1, 4, 6, 0, 1, CURRENT_DATE, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 20 minutes',
 25.8015, -109.0050, 25.8015, -109.0050, 22.0, 'Cliente nuevo, primer pedido', true, NOW(), NOW(), 1),
-- Visita activa: Deposito Corona (Blvd. Rosales)
(1, 37, 6, 0, 0, CURRENT_DATE, NOW() - INTERVAL '25 minutes', NULL,
 25.7960, -108.9780, NULL, NULL, NULL, NULL, true, NOW(), NOW(), 1);
