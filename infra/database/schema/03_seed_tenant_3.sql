
-- ========================================
-- Seed de datos para Tenant ID = 3
-- Usuario: Cliente de desarrollo/pruebas
-- PostgreSQL 16 syntax
-- ========================================

-- ========================================
-- 1. Zonas (para clientes)
-- ========================================
INSERT INTO "Zonas" (tenant_id, nombre, descripcion) VALUES
(3, 'Zona Centro', 'Cobertura zona centro de la ciudad'),
(3, 'Zona Poniente', 'Cobertura zona poniente'),
(3, 'Zona Oriente', 'Cobertura zona oriente'),
(3, 'Zona Norte', 'Cobertura zona norte')
ON CONFLICT DO NOTHING;

-- ========================================
-- 2. Categorias de Clientes
-- ========================================
INSERT INTO "CategoriasClientes" (tenant_id, nombre, descripcion) VALUES
(3, 'Mayorista', 'Cliente con compras al mayoreo'),
(3, 'Minorista', 'Cliente con compras al menudeo'),
(3, 'VIP', 'Clientes con beneficios especiales'),
(3, 'Nuevo', 'Clientes recien registrados')
ON CONFLICT DO NOTHING;

-- ========================================
-- 3. Familias de Productos
-- ========================================
INSERT INTO "FamiliasProductos" (tenant_id, nombre, descripcion) VALUES
(3, 'Lacteos', 'Productos derivados de la leche'),
(3, 'Bebidas', 'Refrescos, jugos y agua'),
(3, 'Panaderia', 'Pan y productos de reposteria'),
(3, 'Abarrotes', 'Productos de consumo basico'),
(3, 'Limpieza', 'Productos de limpieza del hogar'),
(3, 'Botanas', 'Snacks y frituras')
ON CONFLICT DO NOTHING;

-- ========================================
-- 4. Categorias de Productos
-- ========================================
INSERT INTO "CategoriasProductos" (tenant_id, nombre, descripcion) VALUES
(3, 'Refrigerados', 'Productos que requieren refrigeracion'),
(3, 'No perecederos', 'Productos de larga duracion'),
(3, 'Congelados', 'Productos congelados'),
(3, 'Frescos', 'Productos frescos del dia')
ON CONFLICT DO NOTHING;

-- ========================================
-- 5. Unidades de Medida
-- ========================================
INSERT INTO "UnidadesMedida" (tenant_id, nombre, abreviatura) VALUES
(3, 'Pieza', 'PZA'),
(3, 'Kilogramo', 'KG'),
(3, 'Litro', 'LT'),
(3, 'Gramos', 'GR'),
(3, 'Caja', 'CJA'),
(3, 'Paquete', 'PQT'),
(3, 'Botella', 'BOT'),
(3, 'Lata', 'LTA')
ON CONFLICT DO NOTHING;

-- ========================================
-- 6. Clientes de ejemplo
-- ========================================
INSERT INTO "Clientes" (tenant_id, nombre, rfc, correo, telefono, direccion, id_zona, categoria_cliente_id, activo) VALUES
(3, 'Abarrotes Don Jose', 'ADJ010101AAA', 'contacto@donjose.com', '5512345678', 'Av. Principal 123, Col. Centro',
    (SELECT id FROM "Zonas" WHERE tenant_id = 3 AND nombre = 'Zona Centro' LIMIT 1),
    (SELECT id FROM "CategoriasClientes" WHERE tenant_id = 3 AND nombre = 'Mayorista' LIMIT 1), TRUE),
(3, 'Tienda La Esquina', 'TLE020202BBB', 'laesquina@email.com', '5523456789', 'Calle 5 #45, Col. Roma',
    (SELECT id FROM "Zonas" WHERE tenant_id = 3 AND nombre = 'Zona Centro' LIMIT 1),
    (SELECT id FROM "CategoriasClientes" WHERE tenant_id = 3 AND nombre = 'Minorista' LIMIT 1), TRUE),
(3, 'Supermercado Express', 'SEX030303CCC', 'super.express@mail.com', '5534567890', 'Blvd. Oriente 789, Col. Industrial',
    (SELECT id FROM "Zonas" WHERE tenant_id = 3 AND nombre = 'Zona Oriente' LIMIT 1),
    (SELECT id FROM "CategoriasClientes" WHERE tenant_id = 3 AND nombre = 'VIP' LIMIT 1), TRUE),
(3, 'Mini Mart 24hrs', 'MMH040404DDD', 'minimart@24hrs.com', '5545678901', 'Av. Norte 456, Col. Valle',
    (SELECT id FROM "Zonas" WHERE tenant_id = 3 AND nombre = 'Zona Norte' LIMIT 1),
    (SELECT id FROM "CategoriasClientes" WHERE tenant_id = 3 AND nombre = 'Nuevo' LIMIT 1), TRUE)
ON CONFLICT DO NOTHING;

-- ========================================
-- 7. Productos de ejemplo (variado)
-- ========================================

-- Productos Lacteos
INSERT INTO "Productos" (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo) VALUES
(3, 'Leche Entera 1L', '7501001234501', 'Leche entera pasteurizada 1 litro',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Lacteos' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'Refrigerados' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Litro' LIMIT 1), 22.50, TRUE),
(3, 'Leche Deslactosada 1L', '7501001234502', 'Leche deslactosada 1 litro',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Lacteos' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'Refrigerados' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Litro' LIMIT 1), 26.00, TRUE),
(3, 'Yogurt Natural 1kg', '7501001234503', 'Yogurt natural sin azucar',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Lacteos' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'Refrigerados' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Kilogramo' LIMIT 1), 45.00, TRUE),
(3, 'Queso Panela 400g', '7501001234504', 'Queso panela fresco',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Lacteos' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'Refrigerados' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Pieza' LIMIT 1), 58.00, TRUE),
(3, 'Crema Acida 500ml', '7501001234505', 'Crema acida para cocinar',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Lacteos' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'Refrigerados' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Pieza' LIMIT 1), 32.00, TRUE)
ON CONFLICT DO NOTHING;

-- Productos Bebidas
INSERT INTO "Productos" (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo) VALUES
(3, 'Refresco Cola 600ml', '7501002234501', 'Refresco de cola 600ml',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Bebidas' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Botella' LIMIT 1), 18.00, TRUE),
(3, 'Agua Natural 1L', '7501002234502', 'Agua purificada 1 litro',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Bebidas' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Botella' LIMIT 1), 12.00, TRUE),
(3, 'Jugo de Naranja 1L', '7501002234503', 'Jugo de naranja 100% natural',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Bebidas' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'Refrigerados' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Litro' LIMIT 1), 28.00, TRUE),
(3, 'Refresco Limon 355ml', '7501002234504', 'Refresco sabor limon lata',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Bebidas' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Lata' LIMIT 1), 15.00, TRUE),
(3, 'Energizante 473ml', '7501002234505', 'Bebida energizante',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Bebidas' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Lata' LIMIT 1), 32.00, TRUE)
ON CONFLICT DO NOTHING;

-- Productos Panaderia
INSERT INTO "Productos" (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo) VALUES
(3, 'Pan Blanco Grande', '7501003234501', 'Pan blanco de caja grande',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Panaderia' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'Frescos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Paquete' LIMIT 1), 42.00, TRUE),
(3, 'Pan Integral', '7501003234502', 'Pan integral de caja',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Panaderia' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'Frescos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Paquete' LIMIT 1), 48.00, TRUE),
(3, 'Tortillas de Harina', '7501003234503', 'Paquete de 10 tortillas',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Panaderia' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'Frescos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Paquete' LIMIT 1), 28.00, TRUE)
ON CONFLICT DO NOTHING;

-- Productos Abarrotes
INSERT INTO "Productos" (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo) VALUES
(3, 'Arroz 1kg', '7501004234501', 'Arroz grano largo 1 kilo',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Abarrotes' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Kilogramo' LIMIT 1), 32.00, TRUE),
(3, 'Frijol Negro 1kg', '7501004234502', 'Frijol negro entero 1 kilo',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Abarrotes' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Kilogramo' LIMIT 1), 38.00, TRUE),
(3, 'Aceite Vegetal 1L', '7501004234503', 'Aceite vegetal para cocinar',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Abarrotes' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Litro' LIMIT 1), 45.00, TRUE),
(3, 'Azucar 1kg', '7501004234504', 'Azucar refinada estandar',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Abarrotes' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Kilogramo' LIMIT 1), 28.00, TRUE),
(3, 'Sal de Mesa 1kg', '7501004234505', 'Sal de mesa refinada',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Abarrotes' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Kilogramo' LIMIT 1), 15.00, TRUE)
ON CONFLICT DO NOTHING;

-- Productos Limpieza
INSERT INTO "Productos" (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo) VALUES
(3, 'Detergente en Polvo 1kg', '7501005234501', 'Detergente para ropa',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Limpieza' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Kilogramo' LIMIT 1), 55.00, TRUE),
(3, 'Cloro 1L', '7501005234502', 'Cloro para limpieza',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Limpieza' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Litro' LIMIT 1), 22.00, TRUE),
(3, 'Jabon para Trastes 750ml', '7501005234503', 'Jabon liquido para trastes',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Limpieza' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Botella' LIMIT 1), 38.00, TRUE)
ON CONFLICT DO NOTHING;

-- Productos Botanas
INSERT INTO "Productos" (tenant_id, nombre, codigo_barra, descripcion, familia_id, categoria_id, unidad_medida_id, precio_base, activo) VALUES
(3, 'Papas Fritas 150g', '7501006234501', 'Papas fritas sabor natural',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Botanas' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Paquete' LIMIT 1), 25.00, TRUE),
(3, 'Cacahuates 200g', '7501006234502', 'Cacahuates japoneses',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Botanas' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Paquete' LIMIT 1), 28.00, TRUE),
(3, 'Galletas Surtidas', '7501006234503', 'Paquete de galletas surtidas',
    (SELECT id FROM "FamiliasProductos" WHERE tenant_id = 3 AND nombre = 'Botanas' LIMIT 1),
    (SELECT id FROM "CategoriasProductos" WHERE tenant_id = 3 AND nombre = 'No perecederos' LIMIT 1),
    (SELECT id FROM "UnidadesMedida" WHERE tenant_id = 3 AND nombre = 'Paquete' LIMIT 1), 35.00, TRUE)
ON CONFLICT DO NOTHING;

-- ========================================
-- 8. Inventario para los productos
-- ========================================
INSERT INTO "Inventario" (tenant_id, producto_id, cantidad_actual, stock_minimo, stock_maximo)
SELECT
    3 AS tenant_id,
    id AS producto_id,
    FLOOR(100 + RANDOM() * 400)::int AS cantidad_actual,
    20 AS stock_minimo,
    500 AS stock_maximo
FROM "Productos"
WHERE tenant_id = 3
ON CONFLICT DO NOTHING;

-- ========================================
-- 9. Lista de Precios
-- ========================================
INSERT INTO "ListasPrecios" (tenant_id, nombre, descripcion, activo) VALUES
(3, 'Precio Publico General', 'Lista de precios estandar para publico en general', TRUE),
(3, 'Precio Mayoreo', 'Precios especiales para clientes mayoristas', TRUE)
ON CONFLICT DO NOTHING;

-- ========================================
-- 10. Precios por Producto (Lista General)
-- ========================================
INSERT INTO "PreciosPorProducto" (tenant_id, producto_id, lista_precio_id, precio)
SELECT
    3 AS tenant_id,
    p.id AS producto_id,
    (SELECT id FROM "ListasPrecios" WHERE tenant_id = 3 AND nombre = 'Precio Publico General' LIMIT 1) AS lista_precio_id,
    p.precio_base AS precio
FROM "Productos" p
WHERE p.tenant_id = 3
ON CONFLICT DO NOTHING;

-- ========================================
-- 11. Descuentos por Cantidad
-- ========================================
INSERT INTO "DescuentosPorCantidad" (tenant_id, producto_id, cantidad_minima, descuento_porcentaje, tipo_aplicacion) VALUES
-- Descuentos para lacteos (compra 10+ unidades = 5% descuento)
(3, (SELECT id FROM "Productos" WHERE tenant_id = 3 AND nombre = 'Leche Entera 1L' LIMIT 1), 10, 5.00, 'Producto'),
(3, (SELECT id FROM "Productos" WHERE tenant_id = 3 AND nombre = 'Leche Deslactosada 1L' LIMIT 1), 10, 5.00, 'Producto'),
-- Descuentos para bebidas (compra 24+ unidades = 10% descuento)
(3, (SELECT id FROM "Productos" WHERE tenant_id = 3 AND nombre = 'Refresco Cola 600ml' LIMIT 1), 24, 10.00, 'Producto'),
(3, (SELECT id FROM "Productos" WHERE tenant_id = 3 AND nombre = 'Agua Natural 1L' LIMIT 1), 24, 8.00, 'Producto')
ON CONFLICT DO NOTHING;

-- ========================================
-- 12. Promociones Activas
-- ========================================
INSERT INTO "Promociones" (tenant_id, nombre, descripcion, producto_id, descuento_porcentaje, fecha_inicio, fecha_fin, activo) VALUES
(3, 'Promo Lacteos Febrero', 'Descuento especial en productos lacteos',
    (SELECT id FROM "Productos" WHERE tenant_id = 3 AND nombre = 'Yogurt Natural 1kg' LIMIT 1),
    15.00, '2026-02-01', '2026-02-28', TRUE),
(3, 'Promo Bebidas Verano', 'Descuento en refrescos y aguas',
    (SELECT id FROM "Productos" WHERE tenant_id = 3 AND nombre = 'Agua Natural 1L' LIMIT 1),
    20.00, '2026-02-01', '2026-03-31', TRUE)
ON CONFLICT DO NOTHING;

-- ========================================
-- Verificacion Final
-- ========================================
SELECT 'Seed completado para Tenant ID = 3' AS mensaje;
SELECT
    (SELECT COUNT(*) FROM "Zonas" WHERE tenant_id = 3) AS zonas,
    (SELECT COUNT(*) FROM "CategoriasClientes" WHERE tenant_id = 3) AS cat_clientes,
    (SELECT COUNT(*) FROM "FamiliasProductos" WHERE tenant_id = 3) AS familias,
    (SELECT COUNT(*) FROM "CategoriasProductos" WHERE tenant_id = 3) AS cat_productos,
    (SELECT COUNT(*) FROM "UnidadesMedida" WHERE tenant_id = 3) AS unidades,
    (SELECT COUNT(*) FROM "Clientes" WHERE tenant_id = 3) AS clientes,
    (SELECT COUNT(*) FROM "Productos" WHERE tenant_id = 3) AS productos,
    (SELECT COUNT(*) FROM "Inventario" WHERE tenant_id = 3) AS inventario,
    (SELECT COUNT(*) FROM "ListasPrecios" WHERE tenant_id = 3) AS listas_precios;
