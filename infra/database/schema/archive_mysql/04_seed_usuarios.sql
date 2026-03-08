
-- ========================================
-- Seed de usuarios de la aplicacion
-- Estos usuarios se crean en cada inicializacion del contenedor
-- Password: test123 (BCrypt hash)
-- PostgreSQL 16 syntax
-- ========================================

-- Crear usuarios de prueba (ON CONFLICT DO NOTHING para evitar duplicados)
INSERT INTO "Usuarios" (tenant_id, email, password_hash, nombre, es_admin, activo, creado_en) VALUES
-- Jeyma (tenant_id = 3)
(3, 'admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Jeyma', TRUE, TRUE, NOW()),
(3, 'vendedor1@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 1 Jeyma', FALSE, TRUE, NOW()),
(3, 'vendedor2@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 2 Jeyma', FALSE, TRUE, NOW()),

-- Huichol (tenant_id = 4)
(4, 'admin@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Huichol', TRUE, TRUE, NOW()),
(4, 'vendedor1@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 1 Huichol', FALSE, TRUE, NOW()),
(4, 'vendedor2@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Vendedor 2 Huichol', FALSE, TRUE, NOW()),

-- Distribuidora del Centro (tenant_id = 1)
(1, 'admin@centro.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Centro', TRUE, TRUE, NOW()),

-- Rutas Express Norte (tenant_id = 2)
(2, 'admin@rutasnorte.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Rutas Norte', TRUE, TRUE, NOW())
ON CONFLICT (email) DO NOTHING;

-- VIEWER user (read-only role, Jeyma tenant)
INSERT INTO "Usuarios" (tenant_id, email, password_hash, nombre, es_admin, activo, email_verificado, rol, creado_en) VALUES
(3, 'viewer@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Viewer Jeyma', FALSE, TRUE, TRUE, 'VIEWER', NOW())
ON CONFLICT (email) DO NOTHING;

-- SUPERVISOR user (team manager, Jeyma tenant)
INSERT INTO "Usuarios" (tenant_id, email, password_hash, nombre, es_admin, activo, email_verificado, rol, creado_en) VALUES
(3, 'supervisor@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Supervisor Jeyma', FALSE, TRUE, TRUE, 'SUPERVISOR', NOW())
ON CONFLICT (email) DO NOTHING;

-- Assign vendedores to supervisor (must run after users exist)
UPDATE "Usuarios" SET supervisor_id = (SELECT id FROM "Usuarios" WHERE email = 'supervisor@jeyma.com')
WHERE email IN ('vendedor1@jeyma.com', 'vendedor2@jeyma.com') AND supervisor_id IS NULL;

-- Ensure email_verificado is set for all test users (login requires it)
UPDATE "Usuarios" SET email_verificado = TRUE WHERE email_verificado = FALSE AND (email LIKE '%@jeyma.com' OR email LIKE '%@huichol.com' OR email LIKE '%@centro.com' OR email LIKE '%@rutasnorte.com');

-- Verificar usuarios creados
SELECT id, email, nombre, tenant_id, es_admin, rol FROM "Usuarios" ORDER BY tenant_id, es_admin DESC;
