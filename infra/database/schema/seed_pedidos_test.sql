-- ============================================================
-- SEED: 12 Pedidos + DetallePedidos for Tenant 1 (Jeyma)
-- Vendedor 5 = Vendedor 1, Vendedor 6 = Vendedor 2
-- Clientes: 1=Don Jose, 2=La Esquina, 3=El Sol, 4=Lupita
-- Productos: 1=CC600($18.50), 2=CC2L($32), 3=Sabritas($16), 4=Ruffles($16), 5=Mazapan($5)
-- ============================================================

BEGIN;

-- Pedido 1: Vendedor1 -> Don Jose — 2 dias — Entregado
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 1, 5, 'PED-2026-0001', NOW() - INTERVAL '2 days', 5, 1, 2976.00, 0, 476.16, 3452.16, true, NOW() - INTERVAL '2 days', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 48, 18.50, 0, 0, 888.00, 142.08, 1030.08, true, NOW() - INTERVAL '2 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 24, 32.00, 0, 0, 768.00, 122.88, 890.88, true, NOW() - INTERVAL '2 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 3, 36, 16.00, 0, 0, 576.00, 92.16, 668.16, true, NOW() - INTERVAL '2 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 4, 39, 16.00, 0, 0, 624.00, 99.84, 723.84, true, NOW() - INTERVAL '2 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 5, 24, 5.00, 0, 0, 120.00, 19.20, 139.20, true, NOW() - INTERVAL '2 days', 1);

-- Pedido 2: Vendedor1 -> La Esquina — 5 dias — Entregado
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 2, 5, 'PED-2026-0002', NOW() - INTERVAL '5 days', 5, 0, 4380.00, 200.00, 668.80, 4848.80, true, NOW() - INTERVAL '5 days', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 96, 18.50, 0, 0, 1776.00, 284.16, 2060.16, true, NOW() - INTERVAL '5 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 48, 32.00, 0, 0, 1536.00, 245.76, 1781.76, true, NOW() - INTERVAL '5 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 3, 48, 16.00, 200.00, 0, 568.00, 90.88, 658.88, true, NOW() - INTERVAL '5 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 5, 60, 5.00, 0, 0, 300.00, 48.00, 348.00, true, NOW() - INTERVAL '5 days', 1);

-- Pedido 3: Vendedor2 -> El Sol — 3 dias — Entregado
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 3, 6, 'PED-2026-0003', NOW() - INTERVAL '3 days', 5, 1, 6684.00, 0, 1069.44, 7753.44, true, NOW() - INTERVAL '3 days', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 120, 18.50, 0, 0, 2220.00, 355.20, 2575.20, true, NOW() - INTERVAL '3 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 72, 32.00, 0, 0, 2304.00, 368.64, 2672.64, true, NOW() - INTERVAL '3 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 3, 60, 16.00, 0, 0, 960.00, 153.60, 1113.60, true, NOW() - INTERVAL '3 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 4, 48, 16.00, 0, 0, 768.00, 122.88, 890.88, true, NOW() - INTERVAL '3 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 5, 48, 5.00, 0, 0, 240.00, 38.40, 278.40, true, NOW() - INTERVAL '3 days', 1);

-- Pedido 4: Vendedor2 -> Lupita — 1 dia — EnRuta
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 4, 6, 'PED-2026-0004', NOW() - INTERVAL '1 day', 4, 0, 3030.00, 150.00, 460.80, 3340.80, true, NOW() - INTERVAL '1 day', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 60, 18.50, 0, 0, 1110.00, 177.60, 1287.60, true, NOW() - INTERVAL '1 day', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 36, 32.00, 0, 0, 1152.00, 184.32, 1336.32, true, NOW() - INTERVAL '1 day', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 3, 24, 16.00, 150.00, 0, 234.00, 37.44, 271.44, true, NOW() - INTERVAL '1 day', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 5, 36, 5.00, 0, 0, 180.00, 28.80, 208.80, true, NOW() - INTERVAL '1 day', 1);

-- Pedido 5: Vendedor1 -> Don Jose — 10 dias — Entregado (grande)
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 1, 5, 'PED-2026-0005', NOW() - INTERVAL '10 days', 5, 1, 8750.00, 0, 1400.00, 10150.00, true, NOW() - INTERVAL '10 days', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 200, 18.50, 0, 0, 3700.00, 592.00, 4292.00, true, NOW() - INTERVAL '10 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 100, 32.00, 0, 0, 3200.00, 512.00, 3712.00, true, NOW() - INTERVAL '10 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 3, 80, 16.00, 0, 0, 1280.00, 204.80, 1484.80, true, NOW() - INTERVAL '10 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 5, 100, 5.00, 0, 0, 500.00, 80.00, 580.00, true, NOW() - INTERVAL '10 days', 1);

-- Pedido 6: Vendedor2 -> El Sol — 8 dias — Entregado
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 3, 6, 'PED-2026-0006', NOW() - INTERVAL '8 days', 5, 1, 4938.00, 0, 790.08, 5728.08, true, NOW() - INTERVAL '8 days', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 100, 18.50, 0, 0, 1850.00, 296.00, 2146.00, true, NOW() - INTERVAL '8 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 60, 32.00, 0, 0, 1920.00, 307.20, 2227.20, true, NOW() - INTERVAL '8 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 4, 48, 16.00, 0, 0, 768.00, 122.88, 890.88, true, NOW() - INTERVAL '8 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 5, 80, 5.00, 0, 0, 400.00, 64.00, 464.00, true, NOW() - INTERVAL '8 days', 1);

-- Pedido 7: Vendedor1 -> La Esquina — 15 dias — Entregado
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 2, 5, 'PED-2026-0007', NOW() - INTERVAL '15 days', 5, 0, 7380.00, 300.00, 1132.80, 8212.80, true, NOW() - INTERVAL '15 days', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 150, 18.50, 0, 0, 2775.00, 444.00, 3219.00, true, NOW() - INTERVAL '15 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 80, 32.00, 0, 0, 2560.00, 409.60, 2969.60, true, NOW() - INTERVAL '15 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 3, 72, 16.00, 0, 0, 1152.00, 184.32, 1336.32, true, NOW() - INTERVAL '15 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 4, 36, 16.00, 300.00, 0, 276.00, 44.16, 320.16, true, NOW() - INTERVAL '15 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 5, 120, 5.00, 0, 0, 600.00, 96.00, 696.00, true, NOW() - INTERVAL '15 days', 1);

-- Pedido 8: Vendedor2 -> Lupita — 12 dias — Entregado
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 4, 6, 'PED-2026-0008', NOW() - INTERVAL '12 days', 5, 1, 2400.00, 0, 384.00, 2784.00, true, NOW() - INTERVAL '12 days', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 48, 18.50, 0, 0, 888.00, 142.08, 1030.08, true, NOW() - INTERVAL '12 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 24, 32.00, 0, 0, 768.00, 122.88, 890.88, true, NOW() - INTERVAL '12 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 3, 24, 16.00, 0, 0, 384.00, 61.44, 445.44, true, NOW() - INTERVAL '12 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 5, 48, 5.00, 0, 0, 240.00, 38.40, 278.40, true, NOW() - INTERVAL '12 days', 1);

-- Pedido 9: Vendedor1 -> Don Jose — 20 dias — Entregado
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 1, 5, 'PED-2026-0009', NOW() - INTERVAL '20 days', 5, 1, 4168.00, 0, 666.88, 4834.88, true, NOW() - INTERVAL '20 days', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 80, 18.50, 0, 0, 1480.00, 236.80, 1716.80, true, NOW() - INTERVAL '20 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 48, 32.00, 0, 0, 1536.00, 245.76, 1781.76, true, NOW() - INTERVAL '20 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 3, 48, 16.00, 0, 0, 768.00, 122.88, 890.88, true, NOW() - INTERVAL '20 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 4, 24, 16.00, 0, 0, 384.00, 61.44, 445.44, true, NOW() - INTERVAL '20 days', 1);

-- Pedido 10: Vendedor2 -> La Esquina — 18 dias — Entregado
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 2, 6, 'PED-2026-0010', NOW() - INTERVAL '18 days', 5, 0, 3444.00, 0, 551.04, 3995.04, true, NOW() - INTERVAL '18 days', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 72, 18.50, 0, 0, 1332.00, 213.12, 1545.12, true, NOW() - INTERVAL '18 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 36, 32.00, 0, 0, 1152.00, 184.32, 1336.32, true, NOW() - INTERVAL '18 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 3, 36, 16.00, 0, 0, 576.00, 92.16, 668.16, true, NOW() - INTERVAL '18 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 4, 24, 16.00, 0, 0, 384.00, 61.44, 445.44, true, NOW() - INTERVAL '18 days', 1);

-- Pedido 11: Vendedor1 -> El Sol — hoy — Confirmado
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 3, 5, 'PED-2026-0011', NOW(), 2, 1, 5268.00, 0, 842.88, 6110.88, true, NOW(), 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 120, 18.50, 0, 0, 2220.00, 355.20, 2575.20, true, NOW(), 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 60, 32.00, 0, 0, 1920.00, 307.20, 2227.20, true, NOW(), 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 3, 48, 16.00, 0, 0, 768.00, 122.88, 890.88, true, NOW(), 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 5, 60, 5.00, 0, 0, 300.00, 48.00, 348.00, true, NOW(), 1);

-- Pedido 12: Vendedor2 -> Don Jose — 25 dias — Cancelado
INSERT INTO "Pedidos" (tenant_id, cliente_id, usuario_id, numero_pedido, fecha_pedido, estado, tipo_venta, subtotal, descuento, impuestos, total, activo, creado_en, version)
VALUES (1, 1, 6, 'PED-2026-0012', NOW() - INTERVAL '25 days', 6, 0, 1212.00, 0, 193.92, 1405.92, true, NOW() - INTERVAL '25 days', 1);

INSERT INTO "DetallePedidos" (pedido_id, producto_id, cantidad, precio_unitario, descuento, porcentaje_descuento, subtotal, impuesto, total, activo, creado_en, version)
VALUES
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 1, 24, 18.50, 0, 0, 444.00, 71.04, 515.04, true, NOW() - INTERVAL '25 days', 1),
  (currval(pg_get_serial_sequence('"Pedidos"', 'id')), 2, 24, 32.00, 0, 0, 768.00, 122.88, 890.88, true, NOW() - INTERVAL '25 days', 1);

COMMIT;
