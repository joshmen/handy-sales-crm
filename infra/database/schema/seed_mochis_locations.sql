-- ═══════════════════════════════════════════════════════════════
-- Seed: Los Mochis, Sinaloa — Ubicaciones reales de tiendas
-- Actualiza clientes existentes + agrega nuevos con lat/lng
-- Ejecutar: docker exec -i handysales_postgres_dev psql -U handy_user -d handy_erp < infra/database/schema/seed_mochis_locations.sql
-- ═══════════════════════════════════════════════════════════════

-- 1. Actualizar zonas del tenant 1 para reflejar Los Mochis
UPDATE "Zonas" SET nombre = 'Centro Mochis', descripcion = 'Zona Centro de Los Mochis' WHERE tenant_id = 1 AND nombre = 'Centro';
UPDATE "Zonas" SET nombre = 'Norte Mochis', descripcion = 'Zona Norte - Blvd Rosales / Las Fuentes' WHERE tenant_id = 1 AND nombre = 'Norte';
UPDATE "Zonas" SET nombre = 'Sur Mochis', descripcion = 'Zona Sur - Industrial / Tabachines' WHERE tenant_id = 1 AND nombre = 'Sur';

-- 2. Actualizar clientes existentes con ubicaciones reales en Los Mochis
-- Cliente 1: Tienda Don Jose → Centro, sobre Calle Morelos
UPDATE "Clientes" SET
  direccion = 'Calle Leyva 250 Pte, Centro',
  ciudad = 'Los Mochis',
  colonia = 'Centro',
  codigo_postal = '81200',
  latitud = 25.79050,
  longitud = -108.98630
WHERE tenant_id = 1 AND nombre = 'Tienda Don Jose';

-- Cliente 2: Abarrotes La Esquina → Cerca del mercado municipal
UPDATE "Clientes" SET
  direccion = 'Av Juárez 456, Centro',
  ciudad = 'Los Mochis',
  colonia = 'Centro',
  codigo_postal = '81200',
  latitud = 25.79270,
  longitud = -108.99120
WHERE tenant_id = 1 AND nombre = 'Abarrotes La Esquina';

-- Cliente 3: Mini Super El Sol → Blvd Rosales (zona norte)
UPDATE "Clientes" SET
  direccion = 'Blvd Antonio Rosales 137, Centro',
  ciudad = 'Los Mochis',
  colonia = 'Centro',
  codigo_postal = '81240',
  latitud = 25.79680,
  longitud = -108.99580
WHERE tenant_id = 1 AND nombre = 'Mini Super El Sol';

-- Cliente 4: Tienda Lupita → Fuentes de Poseidón (norte)
UPDATE "Clientes" SET
  direccion = 'Fuentes de Poseidón 102, Las Fuentes',
  ciudad = 'Los Mochis',
  colonia = 'Las Fuentes',
  codigo_postal = '81210',
  latitud = 25.81470,
  longitud = -108.98140
WHERE tenant_id = 1 AND nombre = 'Tienda Lupita';

-- 3. Agregar 8 clientes nuevos con ubicaciones reales en Los Mochis
INSERT INTO "Clientes" (
  tenant_id, nombre, rfc, correo, telefono, direccion, ciudad, colonia, codigo_postal,
  id_zona, categoria_cliente_id, vendedor_id, es_prospecto, facturable, descuento,
  saldo, limite_credito, venta_minima_efectiva, tipos_pago_permitidos, tipo_pago_predeterminado,
  dias_credito, latitud, longitud, activo, creado_en, version
) VALUES
-- OXXO Blvd Rosales (centro-norte)
(1, 'OXXO Blvd Rosales', 'OXX920101AAA', 'oxxo.rosales@email.com', '6688121001',
 'Blvd Antonio Rosales 580, Centro', 'Los Mochis', 'Centro', '81200',
 1, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor1@jeyma.com'),
 false, true, 0, 0, 15000, 0, 'EFECTIVO,TRANSFERENCIA', 'TRANSFERENCIA', 15,
 25.79880, -108.99250, true, NOW(), 1),

-- Abarrotes Doña María (centro sur)
(1, 'Abarrotes Doña María', 'MARM850505BBB', 'maria.abarrotes@email.com', '6688122002',
 'Calle Degollado 320, Centro', 'Los Mochis', 'Centro', '81200',
 1, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor1@jeyma.com'),
 false, false, 0, 1500, 8000, 0, 'EFECTIVO', 'EFECTIVO', 0,
 25.78920, -108.98850, true, NOW(), 1),

-- Super Ávila (cadena local importante)
(1, 'Super Ávila Centro', 'SAV900101CCC', 'superavila@email.com', '6688123003',
 'Blvd Rosendo G. Castro 250 Pte', 'Los Mochis', 'Centro', '81200',
 1, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor1@jeyma.com'),
 false, true, 5, 0, 25000, 500, 'EFECTIVO,TRANSFERENCIA,CHEQUE', 'TRANSFERENCIA', 30,
 25.79350, -108.99700, true, NOW(), 1),

-- Tienda EP Teresita (cadena local)
(1, 'EP Teresita Mochis 1', 'EPT880101DDD', 'teresita1@email.com', '6688127142',
 'Blvd Rosendo G. Castro 250 Pte', 'Los Mochis', 'Centro', '81200',
 1, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor2@jeyma.com'),
 false, true, 3, 0, 20000, 300, 'EFECTIVO,TRANSFERENCIA', 'TRANSFERENCIA', 15,
 25.79150, -109.00100, true, NOW(), 1),

-- Mini Super Los Álamos (zona residencial norte)
(1, 'Mini Super Los Álamos', 'MSLA870303EEE', 'alamos@email.com', '6688124004',
 'Blvd Diagonal Sur 2268, Álamos Country', 'Los Mochis', 'Álamos Country', '81230',
 2, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor2@jeyma.com'),
 false, false, 0, 800, 6000, 0, 'EFECTIVO', 'EFECTIVO', 0,
 25.80650, -108.97800, true, NOW(), 1),

-- Depósito El Güero (cerveza/refrescos, zona industrial sur)
(1, 'Depósito El Güero', 'GUEH780606FFF', 'elguero@email.com', '6688125005',
 'Calle Ignacio Ramírez 879, Los Tabachines', 'Los Mochis', 'Los Tabachines', '81220',
 3, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor1@jeyma.com'),
 false, false, 0, 3200, 12000, 0, 'EFECTIVO,TRANSFERENCIA', 'EFECTIVO', 0,
 25.78200, -108.98100, true, NOW(), 1),

-- OXXO Fuentes de Poseidón (norte)
(1, 'OXXO Fuentes Poseidón', 'OXX920102GGG', 'oxxo.poseidon@email.com', '6688126006',
 'Calle Fuentes de Poseidón, Las Fuentes', 'Los Mochis', 'Las Fuentes', '81210',
 2, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor2@jeyma.com'),
 false, true, 0, 0, 15000, 0, 'EFECTIVO,TRANSFERENCIA', 'TRANSFERENCIA', 15,
 25.81470, -108.98140, true, NOW(), 1),

-- Abarrotes Don Pancho (zona sur, cerca del estadio)
(1, 'Abarrotes Don Pancho', 'PANF830707HHH', 'donpancho@email.com', '6688127007',
 'Av Álvaro Obregón 1050, Centro', 'Los Mochis', 'Centro', '81200',
 1, 1, (SELECT id FROM "Usuarios" WHERE email='vendedor1@jeyma.com'),
 false, false, 0, 2100, 7000, 0, 'EFECTIVO', 'EFECTIVO', 0,
 25.78550, -108.99350, true, NOW(), 1);

-- 4. Actualizar zonas con centro geográfico y radio
UPDATE "Zonas" SET
  centro_latitud = 25.7920,
  centro_longitud = -108.9910,
  radio_km = 3.0
WHERE tenant_id = 1 AND nombre = 'Centro Mochis';

UPDATE "Zonas" SET
  centro_latitud = 25.8100,
  centro_longitud = -108.9800,
  radio_km = 3.0
WHERE tenant_id = 1 AND nombre = 'Norte Mochis';

UPDATE "Zonas" SET
  centro_latitud = 25.7830,
  centro_longitud = -108.9850,
  radio_km = 3.0
WHERE tenant_id = 1 AND nombre = 'Sur Mochis';

-- Verificar
SELECT c.id, c.nombre, c.direccion, c.ciudad, c.latitud, c.longitud
FROM "Clientes" c WHERE c.tenant_id = 1 AND c.eliminado_en IS NULL
ORDER BY c.id;
