-- E2E SUPERVISOR test users (Item #1 inventory gaps 2026-06-06)
-- Acompanante de seed_e2e_pg.sql. Aplicar despues del seed principal.
--
-- Password: "test123" (bcrypt hash compartido con resto de usuarios E2E)
-- Tenant: 1 (mismo tenant que admin@jeyma.com y vendedores E2E)
--
-- Slots usados por SUP_SLOT en apps/web/e2e/helpers/auth-supervisor.ts:
--   slot 1: rbac.spec.ts, rbac-negative-supervisor.spec.ts,
--           team-supervisor.spec.ts, cobranza-supervisor.spec.ts
--
-- Relacion supervisor-vendedor: usa columna "supervisor_id" de Usuarios
-- (NO existe tabla join "SupervisorVendedores" — usa FK simple).

-- 1) Insertar supervisores E2E (idempotente via NOT EXISTS, Usuarios no tiene
--    unique constraint en email)
INSERT INTO "Usuarios" (
  tenant_id, email, password_hash, nombre, rol,
  activo, session_version, totp_enabled, email_verificado, creado_en, version
)
SELECT 1, 'e2e-sup-1@jeyma.com',
       '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO',
       'E2E Sup RBAC', 'SUPERVISOR', true, 0, false, true, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM "Usuarios" WHERE email = 'e2e-sup-1@jeyma.com');

INSERT INTO "Usuarios" (
  tenant_id, email, password_hash, nombre, rol,
  activo, session_version, totp_enabled, email_verificado, creado_en, version
)
SELECT 1, 'e2e-sup-2@jeyma.com',
       '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO',
       'E2E Sup Team', 'SUPERVISOR', true, 0, false, true, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM "Usuarios" WHERE email = 'e2e-sup-2@jeyma.com');

INSERT INTO "Usuarios" (
  tenant_id, email, password_hash, nombre, rol,
  activo, session_version, totp_enabled, email_verificado, creado_en, version
)
SELECT 1, 'e2e-mob-sup-1@jeyma.com',
       '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO',
       'E2E Mob Sup RBAC', 'SUPERVISOR', true, 0, false, true, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM "Usuarios" WHERE email = 'e2e-mob-sup-1@jeyma.com');

-- 2) Asignar vendedores E2E al supervisor slot 1 — el join supervisor↔vendedor
--    es via columna supervisor_id (no tabla join). Update solo si el usuario
--    no ya tiene supervisor asignado o es diferente.
UPDATE "Usuarios" v
SET supervisor_id = (SELECT id FROM "Usuarios" WHERE email = 'e2e-sup-1@jeyma.com' LIMIT 1)
WHERE v.email IN ('e2e-vend-1@jeyma.com', 'e2e-vend-2@jeyma.com', 'vendedor1@jeyma.com')
  AND v.tenant_id = 1
  AND EXISTS (SELECT 1 FROM "Usuarios" WHERE email = 'e2e-sup-1@jeyma.com');
