-- E2E Parallel Test Users for fresh PostgreSQL

INSERT INTO "Usuarios" (tenant_id, email, password_hash, nombre, es_admin, es_super_admin, rol, activo, session_version, totp_enabled, email_verificado, creado_en, version) VALUES
(1, 'xjoshmenx@gmail.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Josh E2E Admin', true, false, 'ADMIN', true, 0, false, true, NOW(), 1);

INSERT INTO "Usuarios" (tenant_id, email, password_hash, nombre, es_admin, es_super_admin, rol, activo, session_version, totp_enabled, email_verificado, creado_en, version) VALUES
(1, 'e2e-mobile-admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mobile Admin', true, false, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-mobile-vendedor@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mobile Vendedor', false, false, 'VENDEDOR', true, 0, false, true, NOW(), 1),
(1, 'e2e-mobile-sa@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mobile SuperAdmin', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-login-admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Login Admin', true, false, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-mob-login-admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob Login Admin', true, false, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-sa-1@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E SA Superadmin', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-sa-2@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E SA Announce', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-sa-3@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E SA Security', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-sa-4@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E SA Subscription', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-sa-5@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E SA Impersonation', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-vend-1@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Vend RBAC', false, false, 'VENDEDOR', true, 0, false, true, NOW(), 1),
(1, 'e2e-vend-2@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Vend Perfil', false, false, 'VENDEDOR', true, 0, false, true, NOW(), 1),
(1, 'e2e-mob-sa-1@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob SA Superadmin', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-mob-sa-2@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob SA Announce', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-mob-sa-3@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob SA Security', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-mob-sa-4@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob SA Subscription', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-mob-sa-5@handysales.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob SA Impersonation', true, true, 'ADMIN', true, 0, false, true, NOW(), 1),
(1, 'e2e-mob-vend-1@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob Vend RBAC', false, false, 'VENDEDOR', true, 0, false, true, NOW(), 1),
(1, 'e2e-mob-vend-2@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'E2E Mob Vend Perfil', false, false, 'VENDEDOR', true, 0, false, true, NOW(), 1);