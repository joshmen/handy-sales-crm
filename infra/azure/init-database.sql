-- =============================================
-- Script de inicialización para Azure Database for MySQL
-- Ejecutar después del despliegue de la base de datos
-- =============================================

-- Crear las bases de datos si no existen
CREATE DATABASE IF NOT EXISTS handy_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS handy_billing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar base de datos principal
USE handy_erp;
SET NAMES utf8mb4;

-- =============================================
-- USUARIO ADMINISTRADOR INICIAL
-- =============================================
-- Datos del tenant por defecto
INSERT IGNORE INTO company_settings (
    id,
    tenant_id, 
    company_name, 
    contact_email, 
    contact_phone,
    address,
    city,
    state,
    country,
    postal_code,
    tax_id,
    currency,
    timezone,
    created_at,
    updated_at
) VALUES (
    1,
    '00000000-0000-0000-0000-000000000001',
    'HandySales Demo Company',
    'admin@handysales.com',
    '+1234567890',
    '123 Business St',
    'Business City',
    'Business State',
    'Mexico',
    '12345',
    'DEMO123456789',
    'MXN',
    'America/Mexico_City',
    NOW(),
    NOW()
);

-- Rol de super administrador
INSERT IGNORE INTO Roles (id, tenant_id, name, description, is_system_role, created_at, updated_at) 
VALUES (
    1, 
    '00000000-0000-0000-0000-000000000001',
    'Super Admin', 
    'Administrador del sistema con acceso completo', 
    1, 
    NOW(), 
    NOW()
);

-- Rol de administrador
INSERT IGNORE INTO Roles (id, tenant_id, name, description, is_system_role, created_at, updated_at) 
VALUES (
    2,
    '00000000-0000-0000-0000-000000000001', 
    'Admin', 
    'Administrador con permisos de gestión', 
    1, 
    NOW(), 
    NOW()
);

-- Rol de vendedor
INSERT IGNORE INTO Roles (id, tenant_id, name, description, is_system_role, created_at, updated_at) 
VALUES (
    3,
    '00000000-0000-0000-0000-000000000001',
    'Vendedor', 
    'Usuario con permisos de ventas', 
    0, 
    NOW(), 
    NOW()
);

-- Usuario administrador inicial
INSERT IGNORE INTO Usuarios (
    id,
    tenant_id,
    nombre,
    apellido,
    email,
    password_hash,
    is_active,
    role_id,
    created_at,
    updated_at,
    last_login
) VALUES (
    1,
    '00000000-0000-0000-0000-000000000001',
    'Administrador',
    'Sistema',
    'admin@handysales.com',
    '$2a$11$rQZdB8xw8QFxL8XjQQ8dBeJ2P1XYNp7lVxQoJxGxVxGxVxGxVxGxV', -- password: Admin123!
    1,
    1,
    NOW(),
    NOW(),
    NULL
);

-- =============================================
-- CONFIGURACIÓN INICIAL DE FACTURACIÓN
-- =============================================
USE handy_billing;

-- Configuración fiscal por defecto
INSERT IGNORE INTO configuracion_fiscal (
    id,
    tenant_id,
    empresa_id,
    regimen_fiscal,
    rfc,
    razon_social,
    direccion_fiscal,
    codigo_postal,
    pais,
    moneda,
    serie_factura,
    folio_actual,
    activo,
    created_at,
    updated_at
) VALUES (
    1,
    '00000000-0000-0000-0000-000000000001',
    1,
    '601 - General de Ley Personas Morales',
    'DEMO123456789',
    'HandySales Demo Company',
    '123 Business St, Business City, Business State',
    '12345',
    'México',
    'MXN',
    'A',
    1,
    1,
    NOW(),
    NOW()
);

-- Numeración inicial para facturas
INSERT IGNORE INTO numeracion_documentos (
    tenant_id,
    tipo_documento,
    serie,
    folio_inicial,
    folio_actual,
    folio_final,
    activo,
    created_at,
    updated_at
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'FACTURA',
    'A',
    1,
    1,
    9999,
    1,
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0000-000000000001',
    'NOTA_CREDITO',
    'NC',
    1,
    1,
    9999,
    1,
    NOW(),
    NOW()
);

-- =============================================
-- DATOS DE PRUEBA MÍNIMOS
-- =============================================
USE handy_erp;

-- Categoría de cliente por defecto
INSERT IGNORE INTO CategoriaCliente (
    id,
    tenant_id,
    nombre,
    descripcion,
    descuento_porcentaje,
    activo,
    created_at,
    updated_at
) VALUES (
    1,
    '00000000-0000-0000-0000-000000000001',
    'General',
    'Categoría general de clientes',
    0.00,
    1,
    NOW(),
    NOW()
);

-- Cliente de prueba
INSERT IGNORE INTO Clientes (
    id,
    tenant_id,
    nombre,
    email,
    telefono,
    direccion,
    ciudad,
    estado,
    codigo_postal,
    pais,
    rfc,
    categoria_cliente_id,
    credito_limite,
    credito_utilizado,
    activo,
    created_at,
    updated_at
) VALUES (
    1,
    '00000000-0000-0000-0000-000000000001',
    'Cliente Demo',
    'cliente@demo.com',
    '+1234567890',
    '456 Client St',
    'Client City',
    'Client State',
    '54321',
    'México',
    'DEMO987654321',
    1,
    10000.00,
    0.00,
    1,
    NOW(),
    NOW()
);

-- Familia de productos
INSERT IGNORE INTO FamiliaProductos (
    id,
    tenant_id,
    nombre,
    descripcion,
    activo,
    created_at,
    updated_at
) VALUES (
    1,
    '00000000-0000-0000-0000-000000000001',
    'General',
    'Familia general de productos',
    1,
    NOW(),
    NOW()
);

-- Unidad de medida
INSERT IGNORE INTO UnidadesMedida (
    id,
    tenant_id,
    nombre,
    abreviacion,
    activo,
    created_at,
    updated_at
) VALUES (
    1,
    '00000000-0000-0000-0000-000000000001',
    'Pieza',
    'PZA',
    1,
    NOW(),
    NOW()
);

-- Producto de prueba
INSERT IGNORE INTO Productos (
    id,
    tenant_id,
    nombre,
    descripcion,
    sku,
    codigo_barras,
    precio_venta,
    precio_compra,
    familia_producto_id,
    unidad_medida_id,
    stock_actual,
    stock_minimo,
    activo,
    created_at,
    updated_at
) VALUES (
    1,
    '00000000-0000-0000-0000-000000000001',
    'Producto Demo',
    'Producto de demostración',
    'PROD-001',
    '1234567890123',
    100.00,
    80.00,
    1,
    1,
    100,
    10,
    1,
    NOW(),
    NOW()
);

-- =============================================
-- MENSAJE FINAL
-- =============================================
SELECT 'Base de datos inicializada correctamente' as STATUS;
SELECT 'Usuario: admin@handysales.com' as ADMIN_EMAIL;
SELECT 'Password: Admin123!' as ADMIN_PASSWORD;
SELECT 'Tenant ID: 00000000-0000-0000-0000-000000000001' as TENANT_ID;