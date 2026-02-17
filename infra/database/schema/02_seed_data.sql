
-- ========================================
-- Seed de datos iniciales para Handy ERP
-- Usa INSERT IGNORE para ser idempotente
-- ========================================

USE handy_erp;
SET NAMES utf8mb4;

-- ========================================
-- TENANTS
-- ========================================
INSERT IGNORE INTO Tenants (id, nombre_empresa, rfc, contacto) VALUES
(1, 'Distribuidora del Centro', 'DCE010101AAA', 'contacto@centro.com'),
(2, 'Rutas Express Norte', 'REN020202BBB', 'admin@rutasnorte.com'),
(3, 'Jeyma S.A. de CV', 'JEY123456789', 'Director General Jeyma'),
(4, 'Huichol Especias S.A. de CV', 'HUE987654321', 'Director General Huichol');

-- ========================================
-- TENANT 1: Distribuidora del Centro
-- ========================================

-- Zonas (Tenant 1)
INSERT IGNORE INTO Zonas (tenant_id, nombre, descripcion) VALUES
(1, 'Zona Norte', 'Cobertura región norte'),
(1, 'Zona Sur', 'Cobertura región sur');

-- Categorías de Clientes (Tenant 1)
INSERT IGNORE INTO CategoriasClientes (tenant_id, nombre, descripcion) VALUES
(1, 'Mayorista', 'Cliente con alto volumen'),
(1, 'Minorista', 'Cliente de menudeo');

-- Familias de productos (Tenant 1)
INSERT IGNORE INTO FamiliasProductos (tenant_id, nombre, descripcion) VALUES
(1, 'Lácteos', 'Productos derivados de leche'),
(1, 'Bebidas', 'Refrescos y jugos');

-- Categorías de productos (Tenant 1)
INSERT IGNORE INTO CategoriasProductos (tenant_id, nombre, descripcion) VALUES
(1, 'Refrigerados', 'Necesitan refrigeración'),
(1, 'No perecederos', 'Larga vida útil');

-- Unidades de medida (Tenant 1)
INSERT IGNORE INTO UnidadesMedida (tenant_id, nombre, abreviatura) VALUES
(1, 'Litro', 'L'),
(1, 'Pieza', 'PZA');

-- ========================================
-- TENANT 2: Rutas Express Norte
-- ========================================

-- Zonas (Tenant 2)
INSERT IGNORE INTO Zonas (tenant_id, nombre, descripcion) VALUES
(2, 'Zona Metropolitana', 'Cobertura ciudad capital');

-- Categorías de Clientes (Tenant 2)
INSERT IGNORE INTO CategoriasClientes (tenant_id, nombre, descripcion) VALUES
(2, 'Frecuente', 'Cliente con visitas programadas');

-- ========================================
-- TENANT 3: Jeyma S.A. de CV (Principal)
-- ========================================

-- Zonas (Tenant 3)
INSERT IGNORE INTO Zonas (tenant_id, nombre, descripcion) VALUES
(3, 'Zona Centro', 'Cobertura zona centro'),
(3, 'Zona Norte', 'Cobertura zona norte'),
(3, 'Zona Sur', 'Cobertura zona sur'),
(3, 'Zona Oriente', 'Cobertura zona oriente'),
(3, 'Zona Poniente', 'Cobertura zona poniente');

-- Categorías de Clientes (Tenant 3)
INSERT IGNORE INTO CategoriasClientes (tenant_id, nombre, descripcion) VALUES
(3, 'Mayorista', 'Cliente con alto volumen de compra'),
(3, 'Minorista', 'Cliente de menudeo'),
(3, 'Premium', 'Cliente preferencial con beneficios exclusivos'),
(3, 'Nuevo', 'Cliente recién registrado');

-- Familias de productos (Tenant 3)
INSERT IGNORE INTO FamiliasProductos (tenant_id, nombre, descripcion) VALUES
(3, 'Especias', 'Condimentos y especias'),
(3, 'Salsas', 'Salsas y aderezos'),
(3, 'Snacks', 'Botanas y frituras'),
(3, 'Chiles', 'Variedad de chiles secos y frescos'),
(3, 'Dulces', 'Dulces tradicionales mexicanos');

-- Categorías de productos (Tenant 3)
INSERT IGNORE INTO CategoriasProductos (tenant_id, nombre, descripcion) VALUES
(3, 'Secos', 'Productos secos y empacados'),
(3, 'Líquidos', 'Salsas y líquidos'),
(3, 'Refrigerados', 'Necesitan refrigeración'),
(3, 'Congelados', 'Productos congelados');

-- Unidades de medida (Tenant 3)
INSERT IGNORE INTO UnidadesMedida (tenant_id, nombre, abreviatura) VALUES
(3, 'Kilogramo', 'KG'),
(3, 'Gramo', 'G'),
(3, 'Litro', 'L'),
(3, 'Mililitro', 'ML'),
(3, 'Pieza', 'PZA'),
(3, 'Caja', 'CJA'),
(3, 'Paquete', 'PAQ');

-- Clientes (Tenant 3) - Usando ON DUPLICATE KEY para RFC único
INSERT INTO Clientes (tenant_id, nombre, rfc, correo, telefono, direccion, id_zona, categoria_cliente_id, activo)
SELECT 3, 'Supermercados del Valle', 'SVA010101XXX', 'compras@supervalle.com', '5512345678', 'Av. Principal 100, Col. Centro',
   (SELECT id FROM Zonas WHERE tenant_id = 3 AND nombre = 'Zona Centro' LIMIT 1),
   (SELECT id FROM CategoriasClientes WHERE tenant_id = 3 AND nombre = 'Mayorista' LIMIT 1), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Clientes WHERE rfc = 'SVA010101XXX');

INSERT INTO Clientes (tenant_id, nombre, rfc, correo, telefono, direccion, id_zona, categoria_cliente_id, activo)
SELECT 3, 'Abarrotes Don José', 'ADJ020202YYY', 'contacto@donjose.com', '5587654321', 'Calle 10 #50, Col. Norte',
   (SELECT id FROM Zonas WHERE tenant_id = 3 AND nombre = 'Zona Norte' LIMIT 1),
   (SELECT id FROM CategoriasClientes WHERE tenant_id = 3 AND nombre = 'Minorista' LIMIT 1), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Clientes WHERE rfc = 'ADJ020202YYY');

INSERT INTO Clientes (tenant_id, nombre, rfc, correo, telefono, direccion, id_zona, categoria_cliente_id, activo)
SELECT 3, 'Mini Super La Esquina', 'MSE030303ZZZ', 'ventas@minisuper.com', '5511112222', 'Av. Reforma 200, Col. Centro',
   (SELECT id FROM Zonas WHERE tenant_id = 3 AND nombre = 'Zona Centro' LIMIT 1),
   (SELECT id FROM CategoriasClientes WHERE tenant_id = 3 AND nombre = 'Minorista' LIMIT 1), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Clientes WHERE rfc = 'MSE030303ZZZ');

INSERT INTO Clientes (tenant_id, nombre, rfc, correo, telefono, direccion, id_zona, categoria_cliente_id, activo)
SELECT 3, 'Tiendas García', 'TGA040404AAA', 'pedidos@garcia.com', '5533334444', 'Calle Norte 15, Col. Industrial',
   (SELECT id FROM Zonas WHERE tenant_id = 3 AND nombre = 'Zona Norte' LIMIT 1),
   (SELECT id FROM CategoriasClientes WHERE tenant_id = 3 AND nombre = 'Mayorista' LIMIT 1), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Clientes WHERE rfc = 'TGA040404AAA');

INSERT INTO Clientes (tenant_id, nombre, rfc, correo, telefono, direccion, id_zona, categoria_cliente_id, activo)
SELECT 3, 'Restaurante El Buen Sabor', 'RBS050505BBB', 'chef@buensabor.com', '5555556666', 'Av. Juárez 300, Col. Centro',
   (SELECT id FROM Zonas WHERE tenant_id = 3 AND nombre = 'Zona Centro' LIMIT 1),
   (SELECT id FROM CategoriasClientes WHERE tenant_id = 3 AND nombre = 'Premium' LIMIT 1), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Clientes WHERE rfc = 'RBS050505BBB');

INSERT INTO Clientes (tenant_id, nombre, rfc, correo, telefono, direccion, id_zona, categoria_cliente_id, activo)
SELECT 3, 'Central de Abastos Mayoreo', 'CAM060606CCC', 'ventas@centralmayor.com', '5566667777', 'Central de Abastos Local 150',
   (SELECT id FROM Zonas WHERE tenant_id = 3 AND nombre = 'Zona Oriente' LIMIT 1),
   (SELECT id FROM CategoriasClientes WHERE tenant_id = 3 AND nombre = 'Mayorista' LIMIT 1), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Clientes WHERE rfc = 'CAM060606CCC');

INSERT INTO Clientes (tenant_id, nombre, rfc, correo, telefono, direccion, id_zona, categoria_cliente_id, activo)
SELECT 3, 'Taquería Los Compadres', 'TLC070707DDD', 'pedidos@loscompadres.com', '5577778888', 'Calle Sur 45, Col. Popular',
   (SELECT id FROM Zonas WHERE tenant_id = 3 AND nombre = 'Zona Sur' LIMIT 1),
   (SELECT id FROM CategoriasClientes WHERE tenant_id = 3 AND nombre = 'Minorista' LIMIT 1), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Clientes WHERE rfc = 'TLC070707DDD');

INSERT INTO Clientes (tenant_id, nombre, rfc, correo, telefono, direccion, id_zona, categoria_cliente_id, activo)
SELECT 3, 'Mercado Hidalgo', 'MHI080808EEE', 'administracion@mercadohidalgo.com', '5588889999', 'Mercado Hidalgo Local 25',
   (SELECT id FROM Zonas WHERE tenant_id = 3 AND nombre = 'Zona Centro' LIMIT 1),
   (SELECT id FROM CategoriasClientes WHERE tenant_id = 3 AND nombre = 'Mayorista' LIMIT 1), 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Clientes WHERE rfc = 'MHI080808EEE');

-- Productos (Tenant 3) - Usando código de barras como clave única
INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Chile Guajillo Seco 100g', '7501100000001', 'Chile guajillo deshidratado premium',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Chiles' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 35.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000001');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Chile Ancho Seco 100g', '7501100000002', 'Chile ancho deshidratado',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Chiles' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 42.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000002');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Chile Pasilla Seco 100g', '7501100000003', 'Chile pasilla deshidratado',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Chiles' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 48.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000003');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Comino Molido 50g', '7501100000004', 'Comino molido premium',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Especias' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 28.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000004');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Orégano Seco 30g', '7501100000005', 'Orégano mexicano premium',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Especias' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 22.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000005');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Pimienta Negra Molida 40g', '7501100000006', 'Pimienta negra recién molida',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Especias' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 35.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000006');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Canela en Raja 50g', '7501100000007', 'Canela ceylán en raja',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Especias' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 45.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000007');

-- Productos (Tenant 3) - Salsas
INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Salsa Valentina 1L', '7501100000010', 'Salsa picante tradicional',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Salsas' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Líquidos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Litro' LIMIT 1), 45.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000010');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Salsa Huichol 150ml', '7501100000011', 'Salsa estilo Huichol',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Salsas' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Líquidos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Mililitro' LIMIT 1), 32.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000011');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Chamoy Miguelito 500ml', '7501100000012', 'Chamoy premium',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Salsas' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Líquidos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Mililitro' LIMIT 1), 55.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000012');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Salsa Maggi 190ml', '7501100000013', 'Salsa inglesa Maggi',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Salsas' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Líquidos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Mililitro' LIMIT 1), 38.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000013');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Salsa de Soya 250ml', '7501100000014', 'Salsa de soya tradicional',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Salsas' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Líquidos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Mililitro' LIMIT 1), 42.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000014');

-- Productos (Tenant 3) - Snacks
INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Cacahuates Japoneses 200g', '7501100000020', 'Cacahuates estilo japonés',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Snacks' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 38.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000020');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Pepitas de Calabaza 250g', '7501100000021', 'Pepitas tostadas con sal',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Snacks' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 65.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000021');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Chicharrón de Harina 100g', '7501100000022', 'Chicharrón para preparar',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Snacks' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 25.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000022');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Habas Enchiladas 150g', '7501100000023', 'Habas tostadas con chile',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Snacks' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 32.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000023');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Cacahuates Enchilados 200g', '7501100000024', 'Cacahuates con chile',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Snacks' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 42.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000024');

-- Productos (Tenant 3) - Dulces
INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Tamarindo Enchilado 100g', '7501100000030', 'Dulce de tamarindo con chile',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Dulces' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Gramo' LIMIT 1), 28.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000030');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Mazapán De la Rosa 12pz', '7501100000031', 'Mazapán tradicional',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Dulces' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Paquete' LIMIT 1), 45.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000031');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Obleas con Cajeta 6pz', '7501100000032', 'Obleas rellenas de cajeta',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Dulces' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Paquete' LIMIT 1), 35.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000032');

INSERT INTO Productos (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo)
SELECT 3, 'Pulparindo 20pz', '7501100000033', 'Dulce de pulpa de tamarindo',
   (SELECT id FROM FamiliasProductos WHERE tenant_id = 3 AND nombre = 'Dulces' LIMIT 1),
   (SELECT id FROM CategoriasProductos WHERE tenant_id = 3 AND nombre = 'Secos' LIMIT 1),
   (SELECT id FROM UnidadesMedida WHERE tenant_id = 3 AND nombre = 'Paquete' LIMIT 1), 55.00, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM Productos WHERE codigo_barra = '7501100000033');

-- Listas de Precios (Tenant 3)
INSERT IGNORE INTO ListasPrecios (tenant_id, nombre, descripcion, activo) VALUES
(3, 'Precio Público', 'Precio estándar para público general', 1),
(3, 'Precio Mayorista', 'Precio especial para mayoristas (10% descuento)', 1),
(3, 'Precio Premium', 'Precio exclusivo para clientes premium (15% descuento)', 1);

-- ========================================
-- TENANT 4: Huichol Especias
-- ========================================

-- Zonas (Tenant 4)
INSERT IGNORE INTO Zonas (tenant_id, nombre, descripcion) VALUES
(4, 'Zona Urbana', 'Cobertura zona urbana'),
(4, 'Zona Rural', 'Cobertura zona rural');

-- Categorías de Clientes (Tenant 4)
INSERT IGNORE INTO CategoriasClientes (tenant_id, nombre, descripcion) VALUES
(4, 'Minorista', 'Cliente de menudeo'),
(4, 'Mayorista', 'Cliente de mayoreo');

-- Familias de productos (Tenant 4)
INSERT IGNORE INTO FamiliasProductos (tenant_id, nombre, descripcion) VALUES
(4, 'Salsas Picantes', 'Variedad de salsas picantes'),
(4, 'Condimentos', 'Condimentos y sazonadores');

-- Categorías de productos (Tenant 4)
INSERT IGNORE INTO CategoriasProductos (tenant_id, nombre, descripcion) VALUES
(4, 'Líquidos', 'Salsas y líquidos'),
(4, 'Secos', 'Productos secos');

-- Unidades de medida (Tenant 4)
INSERT IGNORE INTO UnidadesMedida (tenant_id, nombre, abreviatura) VALUES
(4, 'Mililitro', 'ML'),
(4, 'Gramo', 'G'),
(4, 'Pieza', 'PZA');
