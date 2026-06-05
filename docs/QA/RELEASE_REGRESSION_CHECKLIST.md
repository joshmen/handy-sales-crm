# Release Regression Checklist — Handy Suites

**ESTE CHECKLIST ES OBLIGATORIO antes de promover de `staging` → `main` (producción).**

Versión: v1.0 — 2026-06-05
Autor: QA pipeline (post incidente Rodrigo 32 pedidos perdidos)

## Por qué este documento existe

Producción ha visto bugs que NO se detectaron en testing porque los tests eran superficiales (smoke tests sin validar DB, UI sin verificar que la data persiste, mobile sync sin validar idempotency). Este checklist documenta los **casos de uso mínimos** que SIEMPRE deben pasar antes de cualquier release.

## Cómo usar este documento

1. Antes de PR a `staging`: correr **Sección A** (smoke) — autor del PR.
2. Antes de PR `staging` → `main`: correr **Sección A + B + C** (regresión completa) — QA lead.
3. Cada caso tiene **acceptance criteria** explícito. NO marcar ✅ sin verificar contra DB cuando aplique.

## Subagentes especializados

Los 3 agents en `.claude/agents/` ejecutan partes de este checklist automáticamente:
- `qa-backend` — Sección A.1, A.2, B.1
- `qa-frontend` — Sección A.3, B.2, B.3
- `qa-integration` — Sección C (UI → DB end-to-end, lo más crítico)

Invocar con: `Agent(subagent_type: "qa-backend")` desde Claude Code.

---

## SECCIÓN A — Smoke tests (autor del PR)

### A.1 Backend health
- [ ] Docker stack up: `docker ps | grep handysuites` muestra 5+ containers healthy
- [ ] Main API responde: `curl http://localhost:1050/health` → 200
- [ ] Billing API: `curl http://localhost:1051/health` → 200
- [ ] Mobile API: `curl http://localhost:1052/health` → 200
- [ ] DB conectividad: `docker exec handysuites_postgres_dev psql -U handy_user -d handy_erp -c "SELECT 1"` → resultado

### A.2 Backend tests unitarios
- [ ] `dotnet test apps/api/tests/HandySuites.Tests/HandySuites.Tests.csproj --nologo` → 558+ pass, 0 fail
- [ ] Build limpio Main API: 0 errores
- [ ] No hay migrations EF Core pendientes sin commitear: `git status libs/HandySuites.Infrastructure/Migrations/`

### A.3 Frontend type-check + build
- [ ] `cd apps/web && npm run type-check` → 0 errores
- [ ] `cd apps/mobile-app && npx tsc --noEmit` → 0 errores

### A.4 Health del web
- [ ] `curl http://localhost:1083` → 200 con HTML
- [ ] Dashboard renderiza tras login admin@jeyma.com (browser visual)

---

## SECCIÓN B — Regresión funcional (QA lead)

### B.1 Backend regression (xUnit + smoke endpoints)
- [ ] xUnit Main API: 558+ pass
- [ ] xUnit Billing API: pass
- [ ] xUnit Mobile API: pass
- [ ] Endpoint smoke contra DB seed:
  - [ ] `POST /api/auth/login` con admin@jeyma.com → 200 + JWT
  - [ ] `GET /api/clientes` con JWT → 200 + array
  - [ ] `GET /api/productos` → 200
  - [ ] `GET /api/pedidos` → 200
  - [ ] `GET /api/cobros` → 200
  - [ ] `GET /api/dashboard/metrics` → 200 < 2s p95
  - [ ] `GET /api/catalogos/zonas` → 200 array > 0
  - [ ] `GET /api/catalogos/categorias-cliente` → 200 array > 0
  - [ ] `GET /api/catalogos/categorias-producto` → 200 array > 0
  - [ ] `GET /api/catalogos/familias-producto` → 200 array > 0
  - [ ] `GET /api/catalogos/listas-precio` → 200 array > 0
  - [ ] `GET /api/catalogos/unidades-medida` → 200 array > 0

### B.2 Playwright suite (regresión web)
- [ ] `cd apps/web && npx playwright test --workers=4`
- [ ] Pass rate >= 95% — fails justificados con investigación
- [ ] Áreas cubiertas:
  - [ ] Auth (login, logout, 2FA, session-conflict)
  - [ ] Clientes (CRUD + import + transferir-cartera)
  - [ ] Productos (CRUD + import)
  - [ ] Pedidos (crear + revisión)
  - [ ] Cobros (registrar + historial)
  - [ ] Dashboard (métricas + charts)
  - [ ] Reports (builder + export)
  - [ ] SuperAdmin (impersonation, system metrics, global users)
  - [ ] Visual audit (todas las pages renderizan desktop + mobile)

### B.3 CARGA de catálogos en UI (verificación visual)
Login admin@jeyma.com en http://localhost:1083, ejecutar:
- [ ] /clients → Nuevo cliente → drawer abre:
  - [ ] Selector **Zona**: lista NO vacía
  - [ ] Selector **Categoría cliente**: lista NO vacía
- [ ] /products → Nuevo producto:
  - [ ] **Categoría producto**: NO vacío
  - [ ] **Familia producto**: NO vacío
  - [ ] **Unidad medida**: NO vacío
- [ ] /orders/new (o equivalente):
  - [ ] Search **Cliente** funciona (typing → resultados)
  - [ ] Search **Producto** funciona
  - [ ] **Lista de precio**: NO vacío
- [ ] /settings/roles: listado > 0
- [ ] /price-lists: listado > 0
- [ ] /zones: listado > 0
- [ ] /units: listado > 0
- [ ] **Si ALGÚN catálogo está vacío en UI pero la API retorna datos → BUG. HOLD.**

### B.4 Mobile Maestro suite
- [ ] Emulator running: `adb devices` muestra emulator-5554
- [ ] APK instalado: `adb shell pm list packages | grep com.handysuites.app`
- [ ] Maestro audit-integral: `maestro test apps/mobile-app/.maestro/audit-integral.yaml` → exit 0
- [ ] Maestro sync sub-flows pasan

---

## SECCIÓN C — Integración end-to-end (UI → API → DB)

**Esta es la sección que detectaría los bugs de producción que el smoke testing no atrapa.**

### C.1 Crear cliente UI → DB
1. SQL pre: `SELECT MAX(id) FROM "Clientes" WHERE tenant_id=1` → `id_pre`
2. UI: admin@jeyma.com → /clients → Nuevo → llenar formulario → Guardar
3. UI assert: notification "Cliente creado" + lista muestra el nuevo
4. SQL post: `SELECT id, nombre, tenant_id, creado_por, creado_en FROM "Clientes" WHERE id > <id_pre> ORDER BY id DESC LIMIT 1`
   - [ ] Existe fila NUEVA con datos correctos
   - [ ] `tenant_id = 1`
   - [ ] `creado_por = <id admin>`
   - [ ] `creado_en` reciente
5. Cleanup: soft delete

### C.2 Crear producto UI → DB
Mismo patrón. Verificar `precio_base` y FK a categoría existente.

### C.3 Crear pedido completo UI → DB (multi-tabla atómico)
1. UI: vendedor1@jeyma.com → Pedidos → Nuevo → cliente + 2 productos → Finalizar
2. SQL:
   ```sql
   SELECT p.id, p.numero_pedido, p.estado, p.total, p.cliente_id, p.usuario_id, p.tenant_id,
          (SELECT COUNT(*) FROM "DetallePedidos" WHERE pedido_id=p.id) AS detalles
   FROM "Pedidos" p WHERE tenant_id=1 ORDER BY id DESC LIMIT 1;
   ```
   - [ ] Pedido nuevo + 2 DetallePedidos
   - [ ] `total = SUM(detalle.cantidad * detalle.precio_unitario)` (no NULL, no 0)
3. **Si falta un DetallePedido: HOLD (transaction parcial)**

### C.4 Crear cobro UI → DB + side-effect pedido
1. Pre: pedido con `Estado=Entregado total=1000`
2. UI: registrar cobro 1000 efectivo
3. SQL:
   - [ ] `"Cobros"` tiene fila nueva con monto=1000, pedido_id=<id>
   - [ ] `"Pedidos"` actualizado: estado_pago / saldo según flow

### C.5 Mobile sync push offline (incidente Rodrigo)
1. APK login vendedor1@jeyma.com con red
2. Airplane mode ON
3. Crear pedido en APK (Vender → cliente → productos → Finalizar)
4. WDB local: pedido con `_status='created'` y `mobile_record_id` generado
5. Airplane mode OFF
6. Esperar 10s para sync push
7. SQL en `handy_erp`:
   ```sql
   SELECT id, mobile_record_id, estado, numero_pedido, usuario_id, tenant_id, creado_en
   FROM "Pedidos" WHERE usuario_id=6 AND mobile_record_id IS NOT NULL ORDER BY id DESC LIMIT 1;
   ```
   - [ ] Aparece Pedido con `mobile_record_id` igual al generado en mobile
8. **HOLD si no aparece — esto es el incidente Rodrigo.**

### C.6 Mobile sync idempotency
1. Después de C.5, llamar sync 2x más manualmente
2. SQL: `SELECT mobile_record_id, COUNT(*) FROM "Pedidos" GROUP BY mobile_record_id HAVING COUNT(*) > 1;`
   - [ ] 0 filas (sin duplicados)
3. **HOLD si hay duplicados — idempotency rota.**

### C.7 Mobile sync pull (web → mobile)
1. Web admin@jeyma.com: crear cliente "QA-Pull-Test"
2. APK: forzar sync (Más → Sincronización → Sincronizar ahora)
3. APK: Clientes → buscar "QA-Pull-Test"
   - [ ] Cliente aparece
4. Cleanup web

### C.8 Eager-save mobile (B.1 plan durabilidad)
1. APK con red, login vendedor1
2. Crear pedido + finalizar
3. **Dentro de 3 segundos**, SQL:
   ```sql
   SELECT id, mobile_record_id, estado, creado_en
   FROM "Pedidos" WHERE tenant_id=1 AND usuario_id=6 AND mobile_record_id IS NOT NULL
   ORDER BY id DESC LIMIT 5;
   ```
   - [ ] Pedido más reciente tiene `mobile_record_id` y `estado=0 Borrador` o estado del flow finalizado
4. **HOLD si tardó > 5s — eager-save no funciona.**

### C.9 Cross-tenant isolation
1. Login admin@huichol.com (otro tenant)
2. GET /api/clientes
   - [ ] Solo clientes de tenant huichol
   - [ ] Cero clientes de jeyma
3. Intentar GET /api/clientes/<id-cliente-jeyma> con JWT huichol
   - [ ] 404 (no 403 que revela existencia)

### C.10 AuditableEntity + soft delete
1. Crear cliente vía UI admin
2. SQL: `creado_en` y `creado_por` no NULL
3. Editar cliente
4. SQL: `actualizado_en` y `version` cambiaron
5. Eliminar cliente
6. SQL:
   ```sql
   SELECT id, eliminado_en, eliminado_por, activo FROM "Clientes" WHERE id=<id>;
   SELECT id FROM "Clientes" WHERE id=<id> AND eliminado_en IS NULL;
   ```
   - [ ] `eliminado_en` NOT NULL
   - [ ] Segunda query retorna 0 filas (global filter excluye)

### C.11 Dashboard /metrics ↔ DB consistente
1. SQL: `SELECT COUNT(*) FROM "ActivityLogs" WHERE tenant_id=1 AND created_at >= CURRENT_DATE`
2. UI: dashboard → tarjeta "Actividades hoy" muestra el mismo número
3. **HOLD si discrepan.**

### C.12 Session expired flow (data-loss prevention sistémico)
1. APK login vendedor1
2. Admin web: revocar sesión del device
3. Esperar SignalR push (10s) → `sessionExpired=true` en APK
4. APK debe redirigir AUTOMÁTICAMENTE a login (no banner-only)
5. Intentar back, navegar a otra tab → debe seguir en login
6. **HOLD si el APK deja navegar a tabs autenticadas con sesión revocada.**

---

## SECCIÓN D — Pre-deploy a producción

- [ ] Todas las secciones A + B + C pasaron
- [ ] Variables de entorno nuevas documentadas en `.env.production.template`
- [ ] Migrations EF Core revisadas + tested Down() en staging
- [ ] Endpoints nuevos documentados en Swagger
- [ ] Breaking changes API documentados con versioning si aplica
- [ ] Mobile APK versionCode incrementado en `app.json`
- [ ] CHANGELOG.md o release notes actualizadas

---

## Anti-patterns que CAUSAN incidentes (evitar SIEMPRE)

1. **"El test pasó pero no lo verifiqué contra DB"** — bug invisible hasta producción
2. **Mobile sync silent catch** — `.catch(() => {})` sin telemetría = data loss invisible
3. **EF Core projection sin `.AsNoTracking()`** — tracking inadvertido + perf
4. **`IgnoreQueryFilters()` sin re-validar tenant_id** — IDOR cross-tenant
5. **`SaveChangesAsync` sin transaction en flow multi-tabla** — partial commits
6. **`mobile_record_id` no enviado en eager-save** — duplicate creation on retry
7. **Catálogos cached sin invalidation** — UI vacía o stale

## Próximas mejoras al checklist

- Automatizar Sección C con Playwright + SQL helpers
- Integrar a CI/CD: bloquear merge a `main` si Sección C falla
- Métrica: tiempo promedio de cada caso para detectar regresiones de perf
- Cobertura por feature: cuando se agrega un dominio nuevo (e.g., DevolucionesPedido), agregar su caso C aquí

---

**Mantener este documento ACTUALIZADO.** Cada incidente en producción debe resultar en:
1. Caso nuevo en este checklist que lo hubiera detectado
2. PR del fix que incluya el caso correspondiente
3. Sección "Anti-patterns" actualizada si el patrón es repetible
