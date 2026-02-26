-- E2E Parallel Test Users
-- Purpose: Dedicated users per Playwright project AND per test file
--          to avoid single-session enforcement conflicts during parallel execution.
--
-- Password for all: "test123"
-- BCrypt hash: $2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO
--
-- Strategy:
--   admin@jeyma.com           — storageState (never re-login, shared by all admin tests)
--   e2e-login-admin@jeyma.com — for tests that explicitly test the login flow
--   e2e-sa-{N}@handysales.com — one SuperAdmin per SA-heavy test file (Desktop Chrome)
--   e2e-vend-{N}@jeyma.com   — one Vendedor per vendedor-heavy test file (Desktop Chrome)
--   e2e-mob-*                 — same pattern for Mobile Chrome project

INSERT IGNORE INTO Usuarios (tenant_id, email, password_hash, nombre, es_admin, es_super_admin, activo, email_verificado, creado_en, creado_por) VALUES

-- ═══════════════════════════════════════════════════════════════
-- Mobile Chrome: project-level users (shared across files)
-- ═══════════════════════════════════════════════════════════════
(3, 'e2e-mobile-admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mobile Admin', 1, 0, 1, 1, NOW(), 'system'),
(3, 'e2e-mobile-vendedor@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mobile Vendedor', 0, 0, 1, 1, NOW(), 'system'),
(1, 'e2e-mobile-sa@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mobile SuperAdmin', 1, 1, 1, 1, NOW(), 'system'),

-- ═══════════════════════════════════════════════════════════════
-- Login-test admins (for auth.spec.ts / security-announcements "Login Page UI")
-- These tests explicitly test the login flow, so they MUST use a different admin
-- than the storageState admin to avoid invalidating other workers' sessions.
-- ═══════════════════════════════════════════════════════════════
(3, 'e2e-login-admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Login Admin', 1, 0, 1, 1, NOW(), 'system'),
(3, 'e2e-mob-login-admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob Login Admin', 1, 0, 1, 1, NOW(), 'system'),

-- ═══════════════════════════════════════════════════════════════
-- Desktop Chrome: per-file SuperAdmin users
-- Each SA-heavy test file gets its own SA to avoid session_version conflicts
-- ═══════════════════════════════════════════════════════════════
-- Slot 1: superadmin.spec.ts
(1, 'e2e-sa-1@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E SA Superadmin', 1, 1, 1, 1, NOW(), 'system'),
-- Slot 2: announcement-displaymode.spec.ts
(1, 'e2e-sa-2@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E SA Announce', 1, 1, 1, 1, NOW(), 'system'),
-- Slot 3: security-announcements.spec.ts
(1, 'e2e-sa-3@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E SA Security', 1, 1, 1, 1, NOW(), 'system'),
-- Slot 4: subscription-tenant.spec.ts
(1, 'e2e-sa-4@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E SA Subscription', 1, 1, 1, 1, NOW(), 'system'),
-- Slot 5: impersonation-sidebar.spec.ts
(1, 'e2e-sa-5@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E SA Impersonation', 1, 1, 1, 1, NOW(), 'system'),

-- ═══════════════════════════════════════════════════════════════
-- Desktop Chrome: per-file Vendedor users
-- ═══════════════════════════════════════════════════════════════
-- Slot 1: rbac.spec.ts
(3, 'e2e-vend-1@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Vend RBAC', 0, 0, 1, 1, NOW(), 'system'),
-- Slot 2: perfil-empresa.spec.ts
(3, 'e2e-vend-2@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Vend Perfil', 0, 0, 1, 1, NOW(), 'system'),

-- ═══════════════════════════════════════════════════════════════
-- Mobile Chrome: per-file SuperAdmin users
-- ═══════════════════════════════════════════════════════════════
(1, 'e2e-mob-sa-1@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob SA Superadmin', 1, 1, 1, 1, NOW(), 'system'),
(1, 'e2e-mob-sa-2@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob SA Announce', 1, 1, 1, 1, NOW(), 'system'),
(1, 'e2e-mob-sa-3@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob SA Security', 1, 1, 1, 1, NOW(), 'system'),
(1, 'e2e-mob-sa-4@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob SA Subscription', 1, 1, 1, 1, NOW(), 'system'),
(1, 'e2e-mob-sa-5@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob SA Impersonation', 1, 1, 1, 1, NOW(), 'system'),

-- ═══════════════════════════════════════════════════════════════
-- Mobile Chrome: per-file Vendedor users
-- ═══════════════════════════════════════════════════════════════
(3, 'e2e-mob-vend-1@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob Vend RBAC', 0, 0, 1, 1, NOW(), 'system'),
(3, 'e2e-mob-vend-2@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob Vend Perfil', 0, 0, 1, 1, NOW(), 'system');
