# Matriz cross-role x cross-layer � 180 gaps detallados

Sprint correctivo 2026-06-06 � workflow `wrleo01wo` (62 agentes paralelos).
- **641 items inventariados** (endpoints + screens + specs + yamls + xUnit files)
- **180 gaps detectados**: 71 HIGH / 78 MEDIUM / 31 LOW
- **40 test stubs generados** para los HIGH gaps

## Distribucion gaps por (rol x capa)

| Rol | Backend | Frontend | Mobile | Total |
|-----|---------|----------|--------|-------|
| SUPER_ADMIN | 15 (5H/7M/3L) | 15 (4H/7M/4L) | 15 (6H/4M/5L) | 45 |
| ADMIN | 14 (8H/6M/0L) | 15 (5H/6M/4L) | 15 (6H/7M/2L) | 44 |
| SUPERVISOR | 15 (7H/7M/1L) | 15 (5H/8M/2L) | 15 (5H/8M/2L) | 45 |
| VENDEDOR | 15 (7H/7M/1L) | 15 (6H/6M/3L) | 15 (7H/5M/3L) | 45 |
| **TOTAL** | **59** | **60** | **60** | **180** |

## 71 HIGH gaps

### [SUPER_ADMIN / backend] SubscriptionPlanAdminEndpoints (Main API)
**Descripcion**: El endpoint /api/admin/subscription-plans esta protegido con RequireRole("SUPER_ADMIN") (MigrationEndpoints/SubscriptionPlanAdminEndpoints) y permite GET/POST/PUT planes de suscripcion (hot path billing). No existe ningun archivo *Test*.cs que cubra estos endpoints ni positive (SA ok) ni negative (ADMIN/VENDEDOR 403).
**Sugerido**: Crear SubscriptionPlanAdminEndpointsTests con casos: SA crea/actualiza plan -> 200, ADMIN -> 403, VENDEDOR -> 403, anonymous -> 401.

### [SUPER_ADMIN / backend] GlobalSettingsEndpoints (Main API)
**Descripcion**: /api/global-settings PUT modifica configuracion global de la plataforma y solo SA puede usarlo (IsSuperAdmin guard in-code). No hay ningun test que valide ni el happy path SA ni el rechazo a ADMIN/SUPERVISOR. Grep en apps/api/tests no devuelve nada para 'global-settings' ni 'GlobalSettings'.
**Sugerido**: GlobalSettingsEndpointsTests: SA GET/PUT -> 200, ADMIN PUT -> 403, ADMIN GET -> 200 (returns basic info), VENDEDOR -> 403.

### [SUPER_ADMIN / backend] MigrationEndpoints (Main API)
**Descripcion**: Endpoint protegido con RequireRole("SUPER_ADMIN") que ejecuta operaciones de migracion en runtime. Sin tests asociados (grep 'MigrationEndpoint' y '/migrations' en tests devuelve 0). Riesgo critico: ejecutar migrations sin permiso podria corromper DB en prod.
**Sugerido**: MigrationEndpointsTests: SA dispara migration -> 200, ADMIN -> 403, VENDEDOR -> 403, anonymous -> 401. Mockear el migration runner para no aplicar realmente.

### [SUPER_ADMIN / backend] FinkokAdminController (Billing API)
**Descripcion**: Controller protege 7+ endpoints (listar emisores, suspender, reactivar, cambiar modalidad, asignar creditos) con IsSuperAdmin() in-code. FinkokRegistrationServiceTests prueba el servicio HTTP de Finkok directamente, NO el controller ni los Forbid() del guard. Hot path: cualquier ADMIN podria bypassear si el guard se rompe.
**Sugerido**: FinkokAdminControllerTests con TestServer: SA -> 200, ADMIN -> 403, SUPERVISOR -> 403, VENDEDOR -> 403, anonymous -> 401. Tambien validar audit logs.

### [SUPER_ADMIN / backend] CompanyEndpoints (Main API) - /api/companies (cross-tenant)
**Descripcion**: GET /api/companies, POST /api/companies, DELETE /api/companies/{id} son SUPER_ADMIN only (cross-tenant). No existe archivo de tests para CompanyEndpoints. ADMIN/VENDEDOR podrian listar/eliminar tenants si se rompe el IsSuperAdmin guard.
**Sugerido**: CompanyEndpointsTests: SA GET /api/companies -> 200, ADMIN -> 403; SA crea tenant -> 200, ADMIN -> 403; SA DELETE tenant -> 200, ADMIN -> 403.

### [SUPER_ADMIN / frontend] /admin/finkok
**Descripcion**: Pagina Finkok admin (registro de emisores PAC) existe en (dashboard)/admin/finkok/page.tsx y consume FinkokAdminController, pero no hay spec Playwright que valide acceso SA, listado de emisores, registro de nuevo emisor, ni RBAC negativo (admin debe ser bloqueado). Branch actual feat/finkok-registration-emisores trabaja activamente este modulo sin cobertura E2E.
**Sugerido**: e2e/finkok-admin.spec.ts: loginAsSuperAdmin -> /admin/finkok carga; lista emisores se renderiza; click 'Registrar emisor' abre modal/form; submit con RFC test valido muestra success; loginAsAdmin -> /admin/finkok redirige a /admin/access-denied.

### [SUPER_ADMIN / frontend] /admin/global-users
**Descripcion**: Pagina global-users (gestion de usuarios cross-tenant SA-only) existe pero sin spec. Sin test, regresiones en listado/filtrado/edicion/suspension de usuarios globales pasan inadvertidas. Hot path para soporte/admin SaaS.
**Sugerido**: e2e/global-users.spec.ts: SA navega a /admin/global-users; ve tabla con usuarios de multiples tenants; filtros por tenant funcionan; admin/vendedor reciben access-denied.

### [SUPER_ADMIN / frontend] /admin/subscription-plans
**Descripcion**: Pagina subscription-plans (CRUD planes SaaS, precios, features incluidos como tracking GPS) existe sin spec. MEMORY.md indica que el flag incluye_tracking_vendedor en planes es activable solo por SA — sin test, cambios accidentales en planes prod pasan sin captura.
**Sugerido**: e2e/subscription-plans.spec.ts: SA lista planes; abre edit en plan PRO; toggle 'incluye tracking GPS' actualiza; guarda y persiste tras reload; admin recibe access-denied.

### [SUPER_ADMIN / frontend] /admin/tenants - CREATE flow
**Descripcion**: superadmin.spec.ts SA-1 valida que existe boton 'Nueva empresa', pero no completa el flujo: abrir modal/wizard, llenar form (razon social, RFC, plan, admin email), submit, y verificar que la nueva empresa aparece en lista. POST /api/companies (SA-only) sin cobertura E2E.
**Sugerido**: Ampliar superadmin.spec.ts: click 'Nueva empresa' -> rellenar form -> submit -> esperar toast success -> reload list -> verificar nueva fila.

### [SUPER_ADMIN / mobile] MobileLogLevelEndpoints (/api/superadmin/log-level)
**Descripcion**: SA-only endpoint (GET/POST log level) has zero coverage: no xUnit test in apps/mobile/HandySuites.Mobile.Tests and no Maestro flow. Role guard is hand-rolled string compare (role != 'SUPER_ADMIN') — a regression to 'SUPERADMIN'/'super_admin' casing would lock SA out silently in prod.
**Sugerido**: Add MobileLogLevelEndpointsTests.cs with 3 cases: (1) SA jwt → 200 + level echoed; (2) ADMIN jwt → 403 Forbid; (3) anonymous → 401. Plus POST happy path that sets Warning/Information/Debug and rejects invalid level with 400.

### [SUPER_ADMIN / mobile] Mobile auth login as SUPER_ADMIN
**Descripcion**: All Maestro auth flows (.maestro/auth/01-login-admin.yaml, 01-login-quick.yaml) use admin@jeyma.com which per MEMORY.md is now ADMIN (xjoshmenx is the sole SA). There is no Maestro flow that proves SA can log in to the mobile app at all — token claim 'role=SUPER_ADMIN' is never exercised in the device runtime.
**Sugerido**: Add .maestro/auth/01-login-superadmin.yaml using xjoshmenx@gmail.com that asserts: login succeeds, lands on AdminDashboard (Hoy), and the 'Super Admin' chip from app/(tabs)/mas.tsx ROLE_LABELS renders with color #7c3aed.

### [SUPER_ADMIN / mobile] AdminDashboard role-routing (app/(tabs)/index.tsx)
**Descripcion**: Routing logic 'if (role === "ADMIN" || role === "SUPER_ADMIN") return <AdminDashboard />' has no test. A typo or refactor that drops SUPER_ADMIN from the OR would silently fall through to the vendedor dashboard for SA users — there is no E2E or unit guard.
**Sugerido**: Maestro flow logging in as SA and asserting AdminDashboard-specific elements (greeting 'Admin', resumen-tenant KPI cards, vendedores list section). Optionally a jest snapshot of <DashboardRouter role='SUPER_ADMIN' />.

### [SUPER_ADMIN / mobile] MobileSupervisorEndpoints — /resumen-tenant
**Descripcion**: Tenant-wide KPI endpoint used by AdminDashboard for SA/ADMIN has explicit 'Forbid()' for non-admin but no xUnit test in HandySuites.Mobile.Tests. The query also depends on CompanySettings.Timezone — a SA with no CompanySettings row would silently fall to UTC and report wrong day. Hot path: this is the first thing SA sees after login.
**Sugerido**: Add MobileSupervisorEndpointsTests covering: (1) SA → 200 with aggregate counts; (2) SUPERVISOR → 403; (3) VENDEDOR → 403; (4) SA on tenant with no CompanySettings → defaults to America/Mexico_City.

### [SUPER_ADMIN / mobile] MobileSupervisorEndpoints — /mis-vendedores admin branch
**Descripcion**: SA/ADMIN branch returns ALL vendedores+supervisors of tenant (excluding self and other admins), while SUPERVISOR branch returns only direct subordinates. No test pins the SA branch — a regression that flipped the predicate (e.g. dropped 'u.Id != supervisorId') would expose SA seeing themselves in their own team list. Hot path for AdminDashboard team section.
**Sugerido**: xUnit test seeding tenant with 1 SA + 2 admins + 1 supervisor + 3 vendedores; assert SA-call returns exactly {supervisor + 3 vendedores}, no admins, no self.

### [SUPER_ADMIN / mobile] MobileSupervisorEndpoints — /pedidos & /cobros tenant-wide
**Descripcion**: These endpoints power AdminTenantPedidosList / AdminTenantCobrosList on the SA mobile dashboard. The admin branch skips the subordinate-filter and exposes tenant-wide rows. No test verifies that a SA gets cross-vendedor pedidos in the response, nor that the response stays scoped to tenant_id (cross-tenant leak risk if filter regressed).
**Sugerido**: xUnit: seed two tenants with pedidos, log in as SA of tenant A, hit /api/mobile/supervisor/pedidos, assert response contains pedidos of all vendedores of tenant A and NONE of tenant B.

### [ADMIN / backend] POST /clientes/transferir-cartera
**Descripcion**: Endpoint estricto ADMIN/SUPER_ADMIN (cambia cartera de clientes entre vendedores). No existe ningun test en ClienteEndpointsTests ni en otro archivo. Hot path admin: error puede mover clientes entre tenants o vendedores incorrectos.
**Sugerido**: Agregar tests en ClienteEndpointsTests: (1) ADMIN puede transferir cartera entre vendedores del mismo tenant; (2) SUPERVISOR recibe 403; (3) VENDEDOR recibe 403; (4) ADMIN no puede transferir a vendedor de otro tenant.

### [ADMIN / backend] PATCH /clientes/batch-toggle
**Descripcion**: Endpoint con RequireRole(ADMIN, SUPER_ADMIN) — batch activar/desactivar clientes. ClienteEndpointsTests no contiene ningun assertion sobre batch-toggle (grep batch-toggle = 0 matches en suite Clientes). Hot path: usuario activo/inactivo masivo.
**Sugerido**: Test ADMIN happy path con List<int> ids, verifica que SUPERVISOR/VENDEDOR reciban 403, y que ids de otros tenants se filtren.

### [ADMIN / backend] PUT/POST /api/company/settings, /upload-logo, /initialize-folder
**Descripcion**: Modulo de configuracion de empresa (IsStrictAdmin) sin tests. CompanyController grep en tests retorna solo 1 referencia en AuthServiceTests (no es test del endpoint). Logo upload e initialize-folder son hot paths de onboarding ADMIN.
**Sugerido**: Suite CompanyEndpointsTests: ADMIN PUT settings (happy + validation), upload-logo multipart (acepta png/jpg, rechaza otros), DELETE logo, initialize-folder. RBAC negative: SUPERVISOR/VENDEDOR reciben 403.

### [ADMIN / backend] GET/POST/PUT /api/company/billing (datos fiscales tenant)
**Descripcion**: Sin tests del endpoint. ADMIN puede crear/actualizar datos fiscales SAT (RFC, regimen, CSD). Solo SUPER_ADMIN puede DELETE. La diferencia de permisos POST/PUT (ADMIN) vs DELETE (SUPER_ADMIN only) no esta verificada.
**Sugerido**: ADMIN POST + PUT crea/actualiza DatosEmpresa con RFC valido; ADMIN DELETE recibe 403; SUPER_ADMIN DELETE 200. Validar FiscalIdValidator integration en POST/PUT.

### [ADMIN / backend] GET /api/companies/{id} y PUT /api/companies/{id} (ADMIN solo own tenant)
**Descripcion**: Acceso tenant-scoped: SUPER_ADMIN cualquier tenant, ADMIN solo su propio tenant. TenantEndpointsTests existe pero no se verifico que cubra el negative case 'ADMIN de tenant A consulta tenant B → 403/404'. Riesgo cross-tenant leak.
**Sugerido**: Test cross-tenant: ADMIN del tenant A intenta GET/PUT /api/companies/{idTenantB} debe retornar 403 o 404 (no datos), nunca 200 con datos del otro tenant.

### [ADMIN / backend] POST /api/Catalogos/configuracion-fiscal (billing)
**Descripcion**: CatalogosControllerTests existe pero la signature del endpoint lista 'ADMIN,SUP' (truncado en inventario) sugiere RBAC mas restrictivo en escritura. Falta verificar happy path ADMIN POST configuracion-fiscal y rechazo para SUPERVISOR/VENDEDOR en write.
**Sugerido**: ADMIN POST configuracion-fiscal con tenant_id claim → 200 persiste; VENDEDOR/SUPERVISOR → 403; GET (lectura) → permite a todos los roles autenticados.

### [ADMIN / backend] FinkokAdminController (registro emisores PAC)
**Descripcion**: Branch actual feat/finkok-registration-emisores modifica FinkokAdminController.cs pero solo FinkokRegistrationServiceTests cubre el service. El controller RBAC, validacion de input (RFC valido, CSD upload) y la integracion ADMIN-only no tiene endpoint test. Hot path billing onboarding.
**Sugerido**: Integration test FinkokAdminController: ADMIN POST registrar-emisor con RFC valido → 200; VENDEDOR → 403; payload invalido (RFC malformado) → 400 con FluentValidation errors.

### [ADMIN / backend] Authorization layer: ADMIN scope filter (TenantId enforcement)
**Descripcion**: El query filter global (ShouldApplyTenantFilter && TenantId == CurrentTenantId) es critico para ADMIN — un bypass deja al ADMIN ver datos de otros tenants. No hay un test cross-tenant explicito (ej. ADMIN del tenant A intenta listar clientes/cobros/pedidos del tenant B). El unico test que toca multi-tenant es TenantEndpointsTests.
**Sugerido**: Test integracion 'AdminCrossTenantIsolation': seedear 2 tenants, login como ADMIN de tenant A, intentar GET /clientes/{idDeTenantB} → 404; GET /clientes → no debe incluir registros de tenant B.

### [ADMIN / frontend] orders / create-order
**Descripcion**: El unico spec orders.spec.ts esta entero en test.describe.skip (TODO auth). No hay E2E que cubra ADMIN creando un pedido (hot path CRUD principal). RBAC test solo valida que ADMIN ve el filtro de vendedor.
**Sugerido**: Crear spec orders-admin.spec.ts con loginAsAdmin: listar pedidos, abrir /orders/new, agregar 1 producto, guardar y verificar redirect a /orders/[id].

### [ADMIN / frontend] cobranza / cobros CRUD
**Descripcion**: El endpoint /cobros (CRUD + saldos + estado-cuenta cliente) es accesible para ADMIN pero no hay spec dedicado. Solo aparece como navegacion en visual-audit y drawer-tour. Es modulo financiero critico (registrar pago, ver saldos).
**Sugerido**: cobranza.spec.ts: loginAsAdmin -> /cobranza, validar tabla saldos, abrir cliente, registrar cobro y validar que el saldo disminuye.

### [ADMIN / frontend] billing/invoices/new (CFDI)
**Descripcion**: Pages /billing/invoices/new, /billing/pre-factura, /billing/fiscal-mapping y /billing/invoices/[id] existen pero ningun spec las visita con ADMIN. subscription-fiscal cubre solo configuracion previa; impuestos-catalogo solo el catalogo. El timbrado SAT es el feature de mayor riesgo regulatorio.
**Sugerido**: billing-admin.spec.ts: loginAsAdmin -> /billing/invoices -> /billing/invoices/new, llenar emisor/receptor/concepto y crear borrador. Validar render del detalle /billing/invoices/[id].

### [ADMIN / frontend] products CRUD
**Descripcion**: products/page.tsx, products/units, products/taxes, product-categories, product-families, price-lists no tienen spec funcional. Solo aparecen en visual-audit/dark-mode/navigation (smoke render). ADMIN no tiene cobertura de crear/editar producto, ajustar precio, asignar familia/categoria/impuesto.
**Sugerido**: products-admin.spec.ts: loginAsAdmin -> /products -> drawer crear producto con familia + categoria + impuesto + lista de precios; validar que aparece en la tabla.

### [ADMIN / frontend] inventory
**Descripcion**: /inventory existe en navegacion ADMIN pero no tiene spec funcional. Solo render en visual-audit/dark-mode/navigation. Ajustes de inventario son auditables y criticos.
**Sugerido**: inventory-admin.spec.ts: loginAsAdmin -> /inventory -> hacer un ajuste (entrada/salida) y validar el nuevo stock + log de movimiento.

### [ADMIN / mobile] MobileSyncEndpoints (WatermelonDB push/pull)
**Descripcion**: Sync push/pull/status es el hot path principal mobile (offline-first). No existe ningun test xUnit en HandySuites.Mobile.Tests para MobileSyncEndpoints, ni Maestro spec que verifique sync con usuario ADMIN. Solo hay sync/01-sync-screen.yaml y 02-sync-status-card-states.yaml usando vendedor.
**Sugerido**: Crear MobileSyncEndpointsTests.cs cubriendo push/pull/status como ADMIN (debe ver TODOS los registros del tenant, no solo los asignados). Agregar suite-sync-admin.yaml en Maestro.

### [ADMIN / mobile] MobilePedidoEndpoints (crear/enviar/confirmar/entregar)
**Descripcion**: MobilePedidoEagerSaveTests solo prueba con RoleNames.Vendedor. ADMIN debe poder crear/confirmar/entregar pedidos en mobile (scope completo del tenant) y no hay coverage. Maestro supervisor/03-crear-pedido-completo.yaml usa SUPERVISOR, no ADMIN.
**Sugerido**: MobilePedidoEndpointsTests: ADMIN crea pedido + confirma + entrega; verifica que ADMIN ve pedidos de otros vendedores (scope tenant).

### [ADMIN / mobile] MobileCobroEndpoints (saldos, estado-cuenta, registrar cobro)
**Descripcion**: No existe MobileCobroEndpointsTests.cs en HandySuites.Mobile.Tests. Maestro cobrar/01-saldos.yaml y 02-registrar-cobro.yaml usan vendedor. ADMIN debe ver saldos/cobros de TODOS los vendedores, sin coverage.
**Sugerido**: MobileCobroEndpointsTests con ADMIN: GET saldos retorna todos los clientes del tenant; POST cobro registrado por admin queda correctamente atribuido.

### [ADMIN / mobile] MobileSupervisorEndpoints (RBAC negative — ADMIN must pass)
**Descripcion**: MobileSupervisorEndpoints rechaza VENDEDOR con Forbid. No hay test que confirme que ADMIN/SUPER_ADMIN SI puedan acceder (IsAdminOrAbove path). Es el unico endpoint con check in-code mas alla del [Authorize] estandar.
**Sugerido**: MobileSupervisorEndpointsTests: 200 OK con ADMIN, 200 OK con SUPER_ADMIN, 403 con VENDEDOR (RBAC matrix completa).

### [ADMIN / mobile] MobileVentaDirectaEndpoints
**Descripcion**: No hay MobileVentaDirectaEndpointsTests.cs. Maestro suite-vender-venta-directa.yaml ejercita vendedor/supervisor. Venta directa por ADMIN (caso real: admin captura venta en mostrador) sin coverage de POST.
**Sugerido**: MobileVentaDirectaEndpointsTests: ADMIN crea venta directa con cliente generico; verifica que retorna folio y persiste con CreadoPor=adminUserId.

### [ADMIN / mobile] MobileFacturaEndpoints (from-order, PDF, enviar)
**Descripcion**: No existe MobileFacturaEndpointsTests.cs. Facturacion mobile (timbrar desde pedido, descargar PDF, enviar por email) es la responsabilidad clasica de ADMIN. Cero coverage backend + Maestro.
**Sugerido**: MobileFacturaEndpointsTests: ADMIN dispara from-order, mock PAC, verifica respuesta CFDI. Maestro suite-facturar-admin.yaml para flow visible.

### [SUPERVISOR / backend] MobileSupervisorEndpoints (apps/mobile)
**Descripcion**: Endpoint principal del rol SUPERVISOR en mobile API (in-code check IsSupervisor || IsAdminOrAbove con Forbid para VENDEDOR) no tiene NINGUN test xUnit en HandySuites.Mobile.Tests. No hay archivo MobileSupervisorEndpointsTests.cs. Sin coverage del happy path ni del negative RBAC (VENDEDOR debe recibir 403).
**Sugerido**: Crear MobileSupervisorEndpointsTests.cs con: (1) SUPERVISOR autenticado -> 200 con lista de vendedores asignados; (2) VENDEDOR autenticado -> 403 Forbidden; (3) sin auth -> 401; (4) ADMIN/SUPER_ADMIN -> 200.

### [SUPERVISOR / backend] Cobros (/cobros/*)
**Descripcion**: CobroEndpointsTests.cs no contiene ninguna referencia a SUPERVISOR. Los 8 endpoints de cobros (GET, POST, PUT, DELETE, saldos, estado-cuenta) permiten SUPERVISOR pero solo se prueban con autenticacion generica. Falta scoping: un SUPERVISOR solo deberia ver cobros de SUS vendedores asignados, no de todo el tenant.
**Sugerido**: Agregar tests en CobroEndpointsTests: (1) SUPERVISOR GET /cobros -> solo retorna cobros de vendedores en su jerarquia; (2) SUPERVISOR DELETE -> verificar si esta autorizado (RBAC negativo); (3) SUPERVISOR vs cobros de otro supervisor -> 403/empty.

### [SUPERVISOR / backend] Clientes (/clientes/* + aprobar-prospecto + rechazar-prospecto)
**Descripcion**: ClienteEndpointsTests.cs y ClienteServiceTests.cs no tienen tests con rol SUPERVISOR. Hot path: aprobar/rechazar prospecto es accion EXCLUSIVA de IsStrictAdmin || IsSupervisor segun el inventario, pero no se valida que un SUPERVISOR pueda hacerlo ni que un VENDEDOR sea rechazado. Tambien falta validar transferir-cartera (que SUPERVISOR NO puede hacer, solo IsStrictAdmin).
**Sugerido**: Tests: (1) SUPERVISOR POST /clientes/{id}/aprobar-prospecto -> 200; (2) VENDEDOR POST /clientes/{id}/aprobar-prospecto -> 403; (3) SUPERVISOR POST /clientes/transferir-cartera -> 403 (solo IsStrictAdmin); (4) SUPERVISOR PATCH /clientes/batch-toggle -> 403 (solo ADMIN/SUPER_ADMIN).

### [SUPERVISOR / backend] Pedidos (/api/pedidos/* + /api/admin/pedidos/drafts)
**Descripcion**: PedidoEndpointsTests.cs no tiene tests con SUPERVISOR. El endpoint /api/admin/pedidos/drafts esta en grupo RequireRole(ADMIN, SUPER_ADMIN, SUPERVISOR) pero no hay test que valide que SUPERVISOR puede acceder ni que VENDEDOR es rechazado. Tampoco hay scoping (solo deberia ver pedidos de sus vendedores).
**Sugerido**: Tests: (1) SUPERVISOR GET /api/admin/pedidos/drafts -> 200 con datos filtrados a sus vendedores; (2) VENDEDOR GET /api/admin/pedidos/drafts -> 403; (3) SUPERVISOR ve solo pedidos de sus vendedores asignados, no de otros.

### [SUPERVISOR / backend] SupervisorEndpointsTests assertions (apps/api)
**Descripcion**: Los tests existentes en SupervisorEndpointsTests.cs aceptan BeOneOf(OK, Forbidden, InternalServerError) — assertion permisiva que pasaria incluso si el endpoint esta roto. MisVendedores y Dashboard nunca se validan estrictamente. Esto es 'happy path falso': el test verde no garantiza funcionalidad.
**Sugerido**: Reescribir: (1) MisVendedores como SUPERVISOR 200 debe estrictamente retornar OK con lista; (2) Dashboard debe estrictamente retornar OK con shape esperado; sin BeOneOf permisivos.

### [SUPERVISOR / backend] Usuarios (UsuarioService.CrearUsuarioAsync)
**Descripcion**: RoleHierarchyTests.cs cubre el helper unit (CanCreateRole) pero UsuarioEndpointsTests.cs no tiene tests de integracion donde SUPERVISOR llama POST /api/usuarios para crear VENDEDOR/VIEWER (deberia 200) ni para crear ADMIN/SUPER_ADMIN (deberia 403). Privilege escalation real no esta validado end-to-end.
**Sugerido**: (1) SUPERVISOR POST /api/usuarios body rol=VENDEDOR -> 201; (2) SUPERVISOR POST /api/usuarios body rol=ADMIN -> 403; (3) SUPERVISOR POST rol=SUPERVISOR -> 403 (mismo rol bloqueado).

### [SUPERVISOR / backend] Mobile Sync (MobileSyncEndpoints push/pull)
**Descripcion**: MobileSyncEndpoints no tiene tests con SUPERVISOR. Hot path offline-first. Un SUPERVISOR sincroniza datos en mobile (clientes, pedidos, cobros) — el filtro de pull debe respetar scoping (solo entidades de sus vendedores). No hay test que lo valide.
**Sugerido**: (1) SUPERVISOR POST /api/mobile/sync/pull -> retorna entidades de SUS vendedores; (2) SUPERVISOR push de entidad de vendedor no asignado -> 403; (3) VENDEDOR pull no incluye datos de otros vendedores del mismo supervisor.

### [SUPERVISOR / frontend] auth/login helpers
**Descripcion**: No existe loginAsSupervisor() en apps/web/e2e/helpers/auth.ts. El helper define loginAsAdmin/loginAsVendedor/loginAsSuperAdmin pero ZERO soporte para SUPERVISOR. Sin un slot dedicado tipo SUP_SLOT y usuarios e2e-sup-N@jeyma.com, ningun spec puede probar el rol en paralelo de forma confiable.
**Sugerido**: Agregar SUP_SLOT + helper loginAsSupervisor(page) en e2e/helpers/auth.ts y sembrar usuarios e2e-sup-1@jeyma.com (rol SUPERVISOR, password test123) en 06_e2e_parallel_users.sql.

### [SUPERVISOR / frontend] rbac.spec.ts (Dashboard/Orders/Routes/Clients)
**Descripcion**: El unico spec dedicado a RBAC (apps/web/e2e/rbac.spec.ts) solo cubre Admin vs Vendedor. SUPERVISOR no aparece en ningun describe — la matriz de permisos en lib/permissions.ts incluye view_orders/view_routes/view_clients/view_visits/view_metas/view_team pero ningun test confirma que SUPERVISOR vea esas paginas con datos del equipo asignado.
**Sugerido**: Replicar bloques RBAC - Dashboard/Pedidos/Rutas/Clientes con loginAsSupervisor: verificar que /dashboard, /orders, /routes, /clients cargan; que el filtro vendedor SOLO muestra vendedores de su cartera (no 'Todos los vendedores' globales).

### [SUPERVISOR / frontend] /team (MiembrosTab - mis vendedores)
**Descripcion**: MiembrosTab.tsx tiene logica especifica isSupervisor (lineas 185, 1607-1609, 1851-1853) para limitar a SUPERVISOR a ver/gestionar SUPERVISOR|VIEWER|VENDEDOR. team-invite-flow.spec.ts solo valida que 'SUPERVISOR' aparece como opcion al INVITAR — no prueba que un usuario SUPERVISOR logueado vea solo sus vendedores ni que /api/supervisores/mis-vendedores se llame.
**Sugerido**: Spec team-supervisor.spec.ts: loginAsSupervisor -> /team -> MiembrosTab. Esperar lista de vendedores asignados; bloqueo al invitar ADMIN/SUPER_ADMIN; supervisorService.getMisVendedores ejecutado (mock response).

### [SUPERVISOR / frontend] /team/transferir-cartera (negative RBAC)
**Descripcion**: Pagina /team/transferir-cartera y /clients/transferir-cartera son IsStrictAdmin (ADMIN+SUPER_ADMIN solamente, ver clientes.ts POST /clientes/transferir-cartera). middleware.ts NO incluye /team/transferir-cartera en ROLE_RESTRICTED_ROUTES — un SUPERVISOR podria llegar a la ruta y solo fallar al hacer POST. Sin test que confirme bloqueo (redirect a /dashboard?error o boton ausente), la regresion pasaria silenciosa.
**Sugerido**: Spec rbac-negative: loginAsSupervisor -> page.goto('/team/transferir-cartera') -> esperar redirect a /dashboard?error=unauthorized o mensaje de acceso denegado en UI.

### [SUPERVISOR / frontend] /cobranza (saldos / estado-cuenta)
**Descripcion**: middleware.ts permite /cobranza a SUPERVISOR (ADMIN, SUPERVISOR, SUPER_ADMIN) y el backend /cobros/* permite VENDEDOR+. No hay e2e que verifique que SUPERVISOR ve cobranza/saldos restringidos a su equipo (no globales). El endpoint /cobros/saldos/resumen es hot-path mensual.
**Sugerido**: Spec cobranza-supervisor: loginAsSupervisor -> /cobranza. Stubear GET /cobros/saldos con vendedorId scope; afirmar que la tabla renderiza filas y que NO aparece selector 'Todos los vendedores' global, solo dropdown de su equipo.

### [SUPERVISOR / mobile] MobileSupervisorEndpoints (RBAC negative)
**Descripcion**: There are NO xUnit/integration tests for /api/mobile/supervisor/* endpoints. No test verifies that a VENDEDOR token gets 403 from /mis-vendedores, /dashboard, /ubicaciones, /actividad, /vendedor/{id}/resumen, /resumen-tenant, /pedidos, /cobros. The role-gating logic (IsSupervisor || IsAdmin || IsSuperAdmin) is critical — a regression would silently leak team data.
**Sugerido**: Add MobileSupervisorEndpointsTests.cs with cases: (1) VENDEDOR token -> 403 on each route; (2) SUPERVISOR token -> 200 returning only own subordinates; (3) ADMIN -> sees all non-admin users; (4) cross-tenant isolation.

### [SUPERVISOR / mobile] GET /api/mobile/supervisor/ubicaciones (GPS team map)
**Descripcion**: Maestro 01-login-supervisor opens the map UI (`ver-mapa`) but only asserts header visibility. There is no test exercising the underlying /ubicaciones endpoint to verify that pings respect the tenant filter and the supervisor only sees pings of their assigned vendedores. Tracking GPS is a paid feature gated by subscription_plans.incluye_tracking_vendedor — no test confirms behavior when the flag is OFF.
**Sugerido**: Backend xUnit: SUPERVISOR with tracking flag OFF -> empty/forbidden; SUPERVISOR with assigned vendedores -> only their last-15-min pings; cross-supervisor isolation.

### [SUPERVISOR / mobile] GET /api/mobile/supervisor/vendedor/{id}/resumen
**Descripcion**: Maestro 01 taps `vendedor-1` and asserts `supervisor-stats` is visible, but no test verifies that a SUPERVISOR cannot fetch the resumen of a vendedor that is NOT their subordinate (cross-supervisor leak). Also no negative RBAC test for VENDEDOR hitting this route.
**Sugerido**: xUnit: SUPERVISOR A requesting vendedor of SUPERVISOR B -> 403/empty; VENDEDOR -> 403; ADMIN -> any vendedor in tenant.

### [SUPERVISOR / mobile] GET /api/mobile/supervisor/pedidos & /cobros (team aggregation)
**Descripcion**: No Maestro yaml or xUnit test exercises the supervisor team-pedidos and team-cobros aggregation endpoints. Maestro 02-dia-completo only opens Cobrar and Vender tabs (own data view), not the supervisor team views. These endpoints filter by SupervisorId — a bug would either over-share or under-share.
**Sugerido**: xUnit: SUPERVISOR sees only pedidos/cobros from their subordinates; date-range filters; pagination; VENDEDOR -> 403.

### [SUPERVISOR / mobile] MobileSyncEndpoints (WatermelonDB push/pull)
**Descripcion**: No test verifies SUPERVISOR sync semantics. A SUPERVISOR sees team data on the supervisor screens but their WatermelonDB sync must still scope to their own field activity (visitas/pedidos creados por ellos). No xUnit or Maestro spec covers SUPERVISOR sync push/pull payload shape vs VENDEDOR.
**Sugerido**: xUnit: SUPERVISOR pull returns own clientes/pedidos/cobros (not team) on the mobile sync; push permission identical to VENDEDOR.

### [VENDEDOR / backend] MobilePedidoEndpoints (apps/mobile)
**Descripcion**: Hot path para VENDEDOR (crear/enviar/confirmar/entregar pedidos, agregar productos) sin tests xUnit. Solo existe MobilePedidoEagerSaveTests.cs (focused en EagerSave). Sin cobertura para crear pedido, validacion de TenantId/UsuarioId, ni flow check-in -> pedido -> sync.
**Sugerido**: Agregar apps/mobile/HandySuites.Mobile.Tests/Endpoints/MobilePedidoEndpointsTests.cs cubriendo POST /pedidos (happy + 400 sin productos), PUT enviar/confirmar/entregar, GET productos del pedido, y forbid si tenant no coincide.

### [VENDEDOR / backend] MobileVisitaEndpoints (apps/mobile)
**Descripcion**: Check-in / check-out de visitas (uso principal mobile vendedor) sin tests. No hay archivo MobileVisitaEndpointsTests.cs ni se valida calculo de tiempo/GPS/foto evidencia.
**Sugerido**: Test happy path POST check-in con lat/lng + check-out cierre, ademas negative: VENDEDOR de otro tenant no puede ver/cerrar visita ajena (TenantId guard).

### [VENDEDOR / backend] MobileCobroEndpoints (apps/mobile)
**Descripcion**: Cobros / saldos / estado de cuenta para VENDEDOR sin coverage en HandySuites.Mobile.Tests. Sin tests sobre crear cobro, validar saldo del cliente, ni multitenancy.
**Sugerido**: Agregar MobileCobroEndpointsTests.cs: GET saldos retorna solo clientes del tenant; POST crear cobro reduce saldo; VENDEDOR no puede cobrar cliente de otro tenant (403/empty).

### [VENDEDOR / backend] MobileSyncEndpoints (apps/mobile, WatermelonDB push/pull)
**Descripcion**: Sync offline-first (uso principal del vendedor) sin tests xUnit. Push/pull/status sin cobertura, riesgo de corrupcion / leak cross-tenant en sincronizacion. Critico pre-prod por uso continuo en campo.
**Sugerido**: Tests para POST /sync/push (resolver conflictos lastWriteWins), GET /sync/pull (delta por updated_at), y assertion: pull no retorna registros de otro tenant aunque IDs colisionen.

### [VENDEDOR / backend] MobileVentaDirectaEndpoints (apps/mobile)
**Descripcion**: Venta directa POST (transaccion monetaria) sin tests. Sin validacion de stock, sin verificar generacion automatica de cobro/factura asociada, sin tests de descuentos aplicados al vendedor.
**Sugerido**: Test E2E mobile: POST venta directa con productos, verificar Pedido + Cobro + (opcional) Factura creados con TenantId/UsuarioId correctos.

### [VENDEDOR / backend] MobileFacturaEndpoints (apps/mobile)
**Descripcion**: Factura from-order, PDF, enviar, ticket-data sin tests. Riesgo SAT: VENDEDOR podria timbrar factura sin tener permisos de facturacion o sobre cliente de otro tenant.
**Sugerido**: Tests: facturar desde Pedido propio (200), facturar Pedido de otro tenant (404/403), generar PDF sin RFC del cliente (400), envio por email sanitizado.

### [VENDEDOR / backend] MobileTrackingEndpoints (apps/mobile)
**Descripcion**: Tracking GPS batch (Fase A/B vendedores) tiene UbicacionVendedorServiceTests para feature flag y dedup, pero NO existe MobileTrackingEndpointsTests para la capa HTTP — falta test integration que valide auth + binding del DTO + 403 cuando tenant no tiene incluye_tracking_vendedor.
**Sugerido**: MobileTrackingEndpointsTests: POST /api/mobile/tracking/batch con feature OFF -> 403/disabled; con feature ON pero con coords invalidas -> 400; VENDEDOR autenticado guarda ubicacion bajo su UsuarioId (no spoofing).

### [VENDEDOR / frontend] mobile-app/auth/login-vendedor (Maestro)
**Descripcion**: No existe flow Maestro dedicado login-vendedor.yaml. Solo hay 01-login-admin.yaml y login-supervisor.yaml. Los flows en .maestro/vendedor/ asumen que el vendedor ya esta logueado, pero no hay setup/entrypoint que loguee con vendedor1@jeyma.com → quien corre la suite manualmente debe loguearse a mano. Sin login automatizado no hay garantia de hot-path VENDEDOR end-to-end.
**Sugerido**: Crear .maestro/auth/01-login-vendedor.yaml (copia de login-admin con vendedor1@jeyma.com/test123) y agregar entrypoint .maestro/vendedor-flow.yaml que clear state + onboarding + login + corre vendedor/*.yaml

### [VENDEDOR / frontend] mobile-app/sync (MobileSyncEndpoints push/pull)
**Descripcion**: sync/01-sync-screen.yaml solo valida UI de la pantalla Sync (visible 'Conectado', 'Pendientes de sincronizar', boton 'Sincronizar Ahora') pero no valida push real ni pull WatermelonDB. No hay test offline → online resolviendo cambios pendientes (hot path offline-first del rol VENDEDOR).
**Sugerido**: Flow Maestro: crear pedido en modo airplane → reactivar wifi → ejecutar Sincronizar Ahora → verificar 0 pendientes + pedido aparece en lista. Cubre push del cambio offline.

### [VENDEDOR / frontend] mobile-app/vender (MobileVentaDirectaEndpoints)
**Descripcion**: 01-flow-venta-acelerada.yaml prueba SOLO modo Preventa (tap 'Preventa' cuando aparece bottom sheet). No hay flow Maestro que verifique Venta Directa (POST /api/mobile/venta-directa), feature explicito de la mobile API para VENDEDOR.
**Sugerido**: Nuevo flow vender/04-venta-directa.yaml: en bottom sheet tipo venta → tap 'Venta Directa' → flujo cobro inmediato + verificar saldo no cambia (porque pago contado).

### [VENDEDOR / frontend] mobile-app/clients (crear cliente offline)
**Descripcion**: MEMORY.md confirma 'Crear cliente offline desde mobile: DONE (May 2 2026)' pero no existe Maestro yaml que cubra crear cliente desde mobile-app (grep 'crear.*cliente|nuevo.*cliente' en .maestro/ = 0 resultados). Es CRUD principal de VENDEDOR sin cobertura E2E.
**Sugerido**: Maestro clients/03-crear-cliente.yaml: tap '+', llenar form (razon social, RFC, direccion, telefono), submit → verificar aparece en lista + pendiente sync.

### [VENDEDOR / frontend] mobile-app/tracking GPS background (real streaming)
**Descripcion**: tracking/01-gps-background-toggle.yaml valida SOLO el toggle UI + permission flow (documentado: 'expo-task-manager + foreground service NO funcionan en Expo Go' / 'La validacion REAL de background streaming requiere dev build APK'). El hot path Fase B (POST /api/mobile/tracking/batch desde background) sigue sin test E2E.
**Sugerido**: Script post-merge con APK dev build: 'adb emu geo fix' + background, despues query UbicacionesVendedor en PG y verificar batch llego con coords correctas + intervalo correcto.

### [VENDEDOR / frontend] web/rbac negative (impersonation + admin routes)
**Descripcion**: rbac.spec.ts verifica que VENDEDOR no ve filtro 'Todos los vendedores' en orders/routes/clients (good), pero NO verifica que VENDEDOR redirige fuera al hit directo /admin, /superadmin, /admin/finkok, /admin/companies, /admin/cupones, /admin/team. Una regresion en middleware/guard expondria UI admin a VENDEDOR.
**Sugerido**: rbac.spec.ts: para cada ruta admin → loginAsVendedor → page.goto('/admin/...') → expect redirect a /unauthorized o /dashboard + no DOM admin visible.

### [VENDEDOR / mobile] MobileSupervisorEndpoints (RBAC negative)
**Descripcion**: No existe spec/yaml que valide que un VENDEDOR autenticado recibe 403 Forbid al llamar endpoints de /api/mobile/supervisor/*. El endpoint depende de un check in-code (IsSupervisor || IsAdminOrAbove || IsSuperAdmin) que si se regresiona dejaria datos cross-rol accesibles. No hay xUnit test ni Maestro flow que pruebe rechazo.
**Sugerido**: Agregar xUnit MobileSupervisorEndpointsTests con TenantInfoService mockeado como VENDEDOR -> assert Forbid. Adicional Maestro flow vendedor/05-supervisor-rbac-denied.yaml que verifique que el tab/menu de Supervisor no es visible o regresa error.

### [VENDEDOR / mobile] MobileFacturaEndpoints (from-order/PDF/enviar/ticket-data)
**Descripcion**: Solo hay cobertura de facturas dentro de flows supervisor (supervisor/05-cobro-completo y 02-dia-completo). VENDEDOR es rol primario que emite facturas desde venta directa/preventa. No hay vendedor/*.yaml ni xUnit que cubra factura.from-order, factura.pdf, factura.enviar, factura.ticket-data en hot-path VENDEDOR.
**Sugerido**: Maestro flow vendedor/05-factura-desde-pedido.yaml: vendedor crea pedido -> emite factura -> verifica PDF visible y endpoint enviar. xUnit MobileFacturaEndpointsTests con rol VENDEDOR.

### [VENDEDOR / mobile] MobileSyncEndpoints (push/pull/status)
**Descripcion**: Hot path offline-first principal del VENDEDOR. Existen flows yaml (sync/01-sync-screen, sync/02-sync-status-card-states, suite-sync-forzado) pero NO hay xUnit cubriendo push/pull con conflictos, tenant isolation ni rol VENDEDOR. Si el endpoint regresiona, WatermelonDB queda inconsistente para todos los vendedores en produccion.
**Sugerido**: Crear MobileSyncEndpointsTests cubriendo: pull con tenant_id correcto, push de cambios offline, manejo de conflictos lastWriteWins, rol VENDEDOR no puede sync data de otro vendedor.

### [VENDEDOR / mobile] MobileCobroEndpoints (xUnit backend)
**Descripcion**: Existe cobertura Maestro extensa (cobrar/01-saldos, cobrar/02-registrar-cobro, suite-cobrar-flow) pero ningun xUnit test backend para MobileCobroEndpoints. Hot path: registrar cobros, ver saldos, estado de cuenta. Sin xUnit cualquier regresion de calculo de saldo no se detecta hasta E2E manual.
**Sugerido**: Crear MobileCobroEndpointsTests con happy path POST cobro + GET saldos + GET estado-cuenta usando rol VENDEDOR; assert que solo ve clientes del propio vendedor.

### [VENDEDOR / mobile] MobileVentaDirectaEndpoints
**Descripcion**: Existe Maestro suite-vender-venta-directa.yaml y supervisor/04-venta-directa-completa.yaml pero NO hay xUnit test. Hot path comercial (cierre de venta inmediato). Sin xUnit, una regresion en calculo de totales, descuentos o aplicacion de stock queda invisible hasta produccion.
**Sugerido**: MobileVentaDirectaEndpointsTests con rol VENDEDOR: POST venta-directa con items + descuentos -> assert totals, decremento de stock, registro en cobranza.

### [VENDEDOR / mobile] MobileRutaEndpoints (iniciar/completar parada)
**Descripcion**: Existe cobertura Maestro (ruta/01, ruta/02 evidencia, ruta/03 devolucion, suite-ruta-flow) pero NO hay xUnit backend. Endpoints criticos: GET rutas hoy, POST iniciar parada, POST completar parada. Sin xUnit no se valida que vendedor solo ve su ruta del dia ni la transicion de estados.
**Sugerido**: MobileRutaEndpointsTests con rol VENDEDOR: assert /rutas/hoy solo regresa rutas del UsuarioId del token, transiciones de estado parada (pendiente -> en-curso -> completada).

### [VENDEDOR / mobile] MobileVisitaEndpoints (check-in/check-out)
**Descripcion**: Existe ruta/02-visita-activa-evidence.yaml pero NO hay xUnit que cubra MobileVisitaEndpoints (check-in/check-out). Hot path: cada visita del vendedor genera evidencia GPS + timestamp. Sin xUnit no se valida regla de visita unica activa por vendedor ni que check-out cierra correctamente.
**Sugerido**: MobileVisitaEndpointsTests rol VENDEDOR: POST check-in -> assert estado activo, POST check-in segunda vez -> assert conflict, POST check-out -> assert cierre + duracion calculada.

