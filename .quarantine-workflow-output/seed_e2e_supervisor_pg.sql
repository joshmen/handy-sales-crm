-- E2E SUPERVISOR test users (Item #1 inventory gaps 2026-06-06)
-- Acompañante de seed_e2e_pg.sql. Aplicar despues del seed principal.
--
-- Password: "test123" (bcrypt hash compartido con resto de usuarios E2E)
-- Tenant: 1 (mismo tenant que admin@jeyma.com y vendedores E2E)
--
-- Slots usados por SUP_SLOT en apps/web/e2e/helpers/auth-supervisor.ts:
--   slot 1: rbac.spec.ts, rbac-negative-supervisor.spec.ts,
--           team-supervisor.spec.ts, cobranza-supervisor.spec.ts
--
-- Para que MiembrosTab y el dashboard SUPERVISOR muestren datos reales
-- del equipo, el supervisor DEBE tener vendedores asignados via
-- "SupervisorVendedores" (UsuarioIdSupervisor + UsuarioIdVendedor).
-- Asignamos los vendedores E2E existentes (e2e-vend-1, e2e-vend-2).

INSERT INTO "Usuarios" (
  tenant_id, email, password_hash, nombre, rol,
  activo, session_version, totp_enabled, email_verificado, creado_en, version
) VALUES
(1, 'e2e-sup-1@jeyma.com',
 '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO',
 'E2E Sup RBAC', 'SUPERVISOR', true, 0, false, true, NOW(), 1),
(1, 'e2e-sup-2@jeyma.com',
 '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO',
 'E2E Sup Team', 'SUPERVISOR', true, 0, false, true, NOW(), 1),
(1, 'e2e-mob-sup-1@jeyma.com',
 '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO',
 'E2E Mob Sup RBAC', 'SUPERVISOR', true, 0, false, true, NOW(), 1)
ON CONFLICT (email) DO NOTHING;

-- Asignar vendedores E2E al supervisor slot 1 para que /api/supervisores/mis-vendedores
-- retorne data real y los tests de team-supervisor + cobranza-supervisor puedan
-- verificar el filtro de equipo.
--
-- BUG / FIX TODO (2026-06-06): si la tabla "SupervisorVendedores" no existe en
-- este schema, el insert silenciosamente falla y los tests pasan en vacio.
-- Cuando se ejecuten los tests verificar que el join devuelve filas; si retorna
-- vacio revisar el modelo de relacion supervisor↔vendedor en HandySuites.Domain.
INSERT INTO "SupervisorVendedores" (
  "UsuarioIdSupervisor", "UsuarioIdVendedor", "TenantId", "CreadoEn", "Activo", "Version"
)
SELECT
  sup.id, vend.id, 1, NOW(), true, 1
FROM "Usuarios" sup
CROSS JOIN "Usuarios" vend
WHERE sup.email = 'e2e-sup-1@jeyma.com'
  AND vend.email IN ('e2e-vend-1@jeyma.com', 'e2e-vend-2@jeyma.com', 'vendedor1@jeyma.com')
ON CONFLICT DO NOTHING;
