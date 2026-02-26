-- E2E Parallel Test Users
-- Purpose: Dedicated users per Playwright project (Desktop Chrome / Mobile Chrome)
--          to avoid single-session enforcement conflicts during parallel execution.
--
-- Desktop Chrome: uses existing users (admin@jeyma.com, vendedor1@jeyma.com, superadmin@handysales.com)
-- Mobile Chrome:  uses these dedicated users (e2e-mobile-*)
--
-- Password for all: "test123"
-- BCrypt hash: $2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO

INSERT IGNORE INTO Usuarios (tenant_id, email, password_hash, nombre, es_admin, es_super_admin, activo, email_verificado, creado_en, creado_por) VALUES
-- Mobile Chrome Admin (tenant Jeyma, id=3)
(3, 'e2e-mobile-admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mobile Admin', 1, 0, 1, 1, NOW(), 'system'),
-- Mobile Chrome Vendedor (tenant Jeyma, id=3)
(3, 'e2e-mobile-vendedor@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mobile Vendedor', 0, 0, 1, 1, NOW(), 'system'),
-- Mobile Chrome SuperAdmin (tenant Centro, id=1 — same as original superadmin)
(1, 'e2e-mobile-sa@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mobile SuperAdmin', 1, 1, 1, 1, NOW(), 'system');
