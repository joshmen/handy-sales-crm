
-- ========================================
-- Seed de usuarios de la aplicación
-- Estos usuarios se crean en cada inicialización del contenedor
-- Password: test123 (BCrypt hash)
-- ========================================

USE handy_erp;
SET NAMES utf8mb4;

-- Crear usuarios de prueba (INSERT IGNORE para evitar duplicados)
INSERT IGNORE INTO Usuarios (tenant_id, email, password_hash, nombre, es_admin, activo, creado_en) VALUES
-- Jeyma (tenant_id = 3)
(3, 'admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Jeyma', 1, 1, NOW()),
(3, 'vendedor1@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 1 Jeyma', 0, 1, NOW()),
(3, 'vendedor2@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 2 Jeyma', 0, 1, NOW()),

-- Huichol (tenant_id = 4)
(4, 'admin@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Huichol', 1, 1, NOW()),
(4, 'vendedor1@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 1 Huichol', 0, 1, NOW()),
(4, 'vendedor2@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 2 Huichol', 0, 1, NOW()),

-- Distribuidora del Centro (tenant_id = 1)
(1, 'admin@centro.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Centro', 1, 1, NOW()),

-- Rutas Express Norte (tenant_id = 2)
(2, 'admin@rutasnorte.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Rutas Norte', 1, 1, NOW());

-- VIEWER user (read-only role, Jeyma tenant)
INSERT IGNORE INTO Usuarios (tenant_id, email, password_hash, nombre, es_admin, activo, email_verificado, rol, creado_en) VALUES
(3, 'viewer@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Viewer Jeyma', 0, 1, 1, 'VIEWER', NOW());

-- SUPERVISOR user (team manager, Jeyma tenant)
INSERT IGNORE INTO Usuarios (tenant_id, email, password_hash, nombre, es_admin, activo, email_verificado, rol, creado_en) VALUES
(3, 'supervisor@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Supervisor Jeyma', 0, 1, 1, 'SUPERVISOR', NOW());

-- Assign vendedores to supervisor (must run after users exist)
-- This uses a subquery to find the supervisor and vendedor IDs dynamically
UPDATE Usuarios SET supervisor_id = (SELECT id FROM (SELECT id FROM Usuarios WHERE email = 'supervisor@jeyma.com') AS t)
WHERE email IN ('vendedor1@jeyma.com', 'vendedor2@jeyma.com') AND supervisor_id IS NULL;

-- Ensure email_verificado is set for all test users (login requires it)
UPDATE Usuarios SET email_verificado = 1 WHERE email_verificado = 0 AND email LIKE '%@jeyma.com' OR email LIKE '%@huichol.com' OR email LIKE '%@centro.com' OR email LIKE '%@rutasnorte.com';

-- Verificar usuarios creados
SELECT id, email, nombre, tenant_id, es_admin, rol FROM Usuarios ORDER BY tenant_id, es_admin DESC;
