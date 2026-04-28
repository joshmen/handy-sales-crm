# Sweep Playwright — Findings consolidados (sweeps 1–20)

**Total acumulado ≥ 70 bugs arreglados + i18n ES↔EN + Spinner homologado + DTOs nullable + tier-gate reports. Todos en `staging`, sin push.**

> Secciones: sweeps 1–7 (módulos CRUD) abajo. Rondas 8–20 + ronda 6 de regresión al final del documento.

---

## Sweep 1 — 13 bugs (CRUD fundamentals)

| Módulo | Bug |
|--------|-----|
| Pedidos | Validator dead-code en POST y en 2 endpoints de detalles (aceptaba `detalles=[]`, `tipoVenta=9`, etc.) |
| Pedidos | Cliente/Producto inexistente → 500 FK; DELETE pedido no-Borrador → 204 (data corruption) |
| Pedidos | `TipoVenta` sin `IsInEnum()` |
| Cobranza | Pedido de otro cliente aceptado; `?desde=fecha-invalida` → 500 |
| Clientes | PUT con RFC=null corrompía DB → `InvalidCastException` encadenado |
| Productos | Validator sin `GreaterThan(0)` en FKs; existence check faltante |
| Precios | Validator exigía `TenandId` (typo dead-code); FK inexistente → 500 |

## Sweep 2 — 4 bugs

| Módulo | Bug |
|--------|-----|
| Pedidos | PUT sin validator; generador de número colisionaba con pedidos soft-deleted |
| Clientes | **Cross-tenant leak**: aceptaba zona/categoría/lista de otro tenant |
| Promociones | POST/PUT con `ProductoIds` inexistentes o de otro tenant → 500 |

## Sweep 3 — 7 bugs

| Módulo | Bug |
|--------|-----|
| Pedidos | `ListaPrecioId` FK 500; detalles con `productoId` duplicado (double-SALIDA); cancelar sin motivo |
| Cobranza | Cobro a pedido `Cancelado`/`Borrador` aceptado; `fechaCobro` 2099/1900 |
| Clientes/Pedidos/Productos | `pagina<1`/`tamanoPagina<1` → 500 / overflow `int.MinValue` |
| Precios (DC) | Crear descuento con `ProductoId` inexistente → 500 FK |

## Sweep 4 — 4 bugs

| Módulo | Bug |
|--------|-----|
| Cobranza | **Race condition**: 2 cobros paralelos → saldo negativo; fijado con `pg_advisory_xact_lock` |
| Pedidos | RBAC: VENDEDOR accedía `GET /pedidos/usuario/{id}` de otro vendedor |
| Catálogos | RBAC: VENDEDOR creaba/editaba/borraba productos, promos, listas, descuentos, precios |
| Clientes | GET sin `?pagina=` → 500 ("Required parameter int Pagina") |

## Sweep 5 — 4 bugs

| Módulo | Bug |
|--------|-----|
| Middleware | Body JSON vacío/malformed/null → 500 (no JsonException handler) |
| Cobranza | PUT cobro anulado (soft-deleted) → 204; ahora 404 (audit preservado) |
| Pedidos | Cliente DESACTIVADO y Producto DESACTIVADO aceptados en POST pedido |
| Pedidos | Descuento > subtotal → pedido con **total NEGATIVO** (data corruption) |

## Sweep 6 — 2 bugs

| Módulo | Bug |
|--------|-----|
| Middleware | `DbUpdateConcurrencyException` (p.ej. 2 batch-toggles paralelos) → 500; ahora 409 con mensaje claro |
| Pedidos | `DetallePedido.Notas` sin `MaximumLength` |

## Sweep 7 — 0 bugs críticos

Verificado sin nuevos bugs bloqueantes:
- Concurrencia PUT pedido → 204+409 (correcto).
- DELETE pedido 2× paralelos → 204+204 (idempotente, aceptable).
- PUT precio con producto soft-deleted → 400 (FK pre-check).
- Cliente con `ListaPreciosId` asignada + POST pedido → listaPrecioId queda `null` (es decisión de diseño: frontend decide).
- Búsqueda con emoji, injection, wildcards → 200 vacío (EF parametriza, no crash ni leak).
- JSON con Infinity/NaN → 400.
- Concurrencia batch-toggle → 1 OK + 1 409.

---

## Total bugs: 32 (detalle):
- 1-4 CRUD validators dead-code: Pedidos (3 endpoints), Productos (FK), Precios (typo).
- 5-9 FK/existence pre-checks: cliente/producto en Pedidos, familia/categoría/unidad en Productos, lista/producto en Precios, Promociones productos.
- 10 DELETE estado-guard: Pedidos solo Borrador.
- 11-12 Cross-tenant leaks: Clientes zona/categoría/lista.
- 13-14 Data integrity: RFC null (Clientes PUT), pedido/cliente mismatch (Cobranza).
- 15-16 Race conditions: cobros paralelos (advisory lock), DbUpdateConcurrency 409.
- 17-18 Pagination: sanitize + nullable.
- 19-21 RBAC: GET pedidos/usuario/{id}, POST/PUT/DELETE catálogos ADMIN-only.
- 22-24 Data semantics: cliente/producto inactivo, descuento excesivo, pedido duplicate detalles.
- 25-27 Cobranza: pedido Cancelado/Borrador, fechaCobro futura/antigua, PUT cobro anulado.
- 28-29 Misc: generator número con soft-deleted, PUT validator pedidos.
- 30-31 Middleware: JsonException 400, DbUpdateConcurrency 409.
- 32 Length: DetallePedido.Notas max 500.

---

## i18n ES↔EN
- **20+ claves estáticas** agregadas en `apps/web/messages/{es,en}.json` backendMessages.
- **5 patrones regex bidireccionales** en `useBackendTranslation.ts` para mensajes con placeholders (producto ID, lista IDs, stock, detalles duplicados, descuento excesivo, producto desactivado).

---

## Verificación final
- **416/417 tests xUnit** pasan (1 skipped pre-existente).
- `npm run type-check` en `apps/web` → 0 errores.
- Build de API → 0 errores (warnings preexistentes sin cambios).

---

## Gaps conocidos (no bloquean main)
- `clienteId: null` en JSON → 500 (imposible vía UI; System.Text.Json int parsing).
- Toaster no renderiza toasts en Turbopack local (funciona en prod webpack).
- CodigoBarra de Producto sin check de unicidad.
- PrecioBase sin cap superior.
- `ListaPrecio.Nombre` sin MaximumLength.
- DELETE cliente/producto con referencias → soft-delete (histórico queda huérfano pero coherente).
- DC PUT: cambiar TipoAplicacion/ProductoId se ignora por diseño (mantiene el original).
- Aplicar automáticamente `DescuentosPorCantidad`/`Promociones`/`Cliente.Descuento`/`Cliente.ListaPreciosId` al crear pedido: responsabilidad del frontend según implementación actual.

---

## 24 commits atómicos en `staging` (rama aún sin push)

```
9375974 fix(pedidos): valida detalle.notas <= 500 chars + i18n
e3a5a33 fix(concurrency): DbUpdateConcurrencyException → 409 con mensaje claro
7403933 i18n(sweep-5): traduce mensajes de cliente/producto inactivo + body inválido
66fcfd6 fix(cobranza): PUT cobro anulado → 404 + advisory lock (si no incluido antes)
ed6882b fix(pedidos): bloquea cliente/producto desactivado + descuento > subtotal
642e37b fix(middleware): JSON malformed/vacío → 400 (antes 500)
75996d4 fix(clientes): pagina/tamanoPagina opcionales para GET /clientes
e0721a7 fix(rbac): restringe writes de catálogo a ADMIN/SUPER_ADMIN
86f27d2 fix(cobranza): advisory lock por pedido previene saldo negativo en cobros paralelos
daf797b i18n(backendMessages): traduce mensajes de sweeps 1–3 a ES/EN
5d49713 fix(descuentos): valida producto existe en tenant antes de crear
7bb48ac fix(paginación): sanitiza pagina/tamanoPagina en Clientes/Pedidos/Productos
55dd2d2 fix(cobranza): bloquea cobros a pedidos Cancelado/Borrador + valida fechaCobro
15dfa41 fix(pedidos): listaPrecio FK + detalles duplicados + cancelar requiere motivo
a6b6729 docs(sweep): update findings with 2nd pass (17 bugs total)
7c8f02c fix(promociones): valida existencia + tenant de productos en POST/PUT
46b04f9 fix(clientes): bloquea cross-tenant en zona/categoría/lista de precios
b494ce1 fix(pedidos): PUT validator + generador número ignora soft-deleted
c3fc826 docs(sweep): findings of 5-module Playwright CRUD review
c87e6bc fix(precios): remove dead TenandId rule + FK existence pre-check
8d262f6 fix(productos): validator GreaterThan(0) FKs + existence pre-check
ba10093 fix(clientes): PUT con campo null corrompía DB y rompía lecturas posteriores
4423172 fix(cobranza): pedido-cliente mismatch + fecha parse 500→400
faf7bb9 fix(pedidos): validator dead-code, enum check, FK existence + DELETE estado guard
```

---

## Regresión Round 6 — visual verification en navegador (Playwright real)

Después de los sweeps 1-5 el usuario pidió validación visual (no sólo backend). Se detectaron:

| Bug | Fix |
|---|---|
| Vendedor podía navegar por URL directa a `/reports`, `/metas`, `/zones`, `/client-categories`, `/product-categories` aunque el sidebar los ocultaba | `middleware.ts` amplía `ROLE_RESTRICTED_ROUTES` (commit `34d401d`) |
| Dashboard recibía `?error=unauthorized` del middleware pero no mostraba toast — usuario aterrizaba sin saber por qué | `useEffect` en dashboard con `useRef` guard + `history.replaceState` para limpiar URL (commit `528467b`) |
| Cancelar pedido usaba `window.prompt()` nativo | Reemplazado por `<Modal>` custom con textarea (commit `b7cf296`) |
| Modal recién creado mostraba las keys i18n literales | Traducciones ES/EN agregadas (commit `94ab90b`) |
| `ClienteCreateDto` y `ProductoCreateDto` con `required` rompían deserialización JSON con body incompleto — validator nunca corría, usuario veía `"Failed to read parameter from JSON"` | Quitar `required`, `FluentValidation` corre normal (commit `866dc28`) |
| `window.confirm()` nativo al rechazar prospecto | Reemplazado por `<Modal>` (commit `ee43b53`) |

**Todos verificados visualmente con Playwright vs admin y vendedor1.**

---

## Rondas 7–20 — Regresión sistemática por módulo

Después del round 6 el usuario pidió 10–20 regresiones más con reglas de negocio del backend + Playwright. Rondas por módulo, todas commiteadas:

### Ronda 7 — Impersonation (SA → tenant)
- `useImpersonationStore` es ephemeral + modal hace hard reload → store queda vacío → sidebar sigue mostrando menú SA (commit `3ad331f`)
- `IReportAccessService` tenía un bug: `TenantEndpoints.GetById` ejecutaba 4 `CountAsync` con `Task.WhenAll` sobre el mismo `DbContext` → "A second operation started on this context" → "Empresa no encontrada" (commit `bd68528`)
- `window.location.href='/dashboard'` en el modal pierde cookie JWT recién actualizada → `?error=unauthorized` → cambio a `router.push` + `router.refresh` (commit `bd68528`)
- Loader `Loader2` (lucide) visualmente distinto del resto → nuevo `<Spinner>` homologado + homologación en 6 archivos clave (commits `3ad331f`, `fb8f551`)

### Ronda 8 — Transiciones de estado de Pedido (matriz 5×4)
- Todas las 20 transiciones devuelven el código correcto según reglas de negocio
- Bug UX: mensajes genéricos "No se pudo confirmar el pedido" sin decir por qué → nueva API `CambiarEstadoDetalladoAsync` retorna `CambiarEstadoOutcome(Status, EstadoActual)` → 404 si no existe, 400 con mensaje específico si transición inválida (commit `6df9324`)

### Ronda 9 — Cobros editar/anular + restore saldo
- `AnularAsync` no era idempotente: 2 DELETEs devolvían 204 cada uno. Fix: si `!entity.Activo` → false (→ 404) (commit `7e0dd08`)

### Ronda 10 — Rutas templates + carga + cierre
- Validator exigía `UsuarioId>0` aunque fuera template. Templates no llevan vendedor → `When(x => !x.EsTemplate)` + endpoint fuerza `EsTemplate=true` antes de validar (commit `5ed53af`)
- `InstanciarTemplateAsync` sin usuarioId producía 500 FK violation → pre-check 400 con mensaje específico (commit `5ed53af`)

### Ronda 11 — Visitas check-in/out real + GPS
- Todos los escenarios OK (check-in/out/duplicado/GPS inválido/eliminar completada) — no bugs nuevos

### Ronda 12 — Import/Export CSV
- 14 exports + 4 templates + 2 import tests OK — no bugs nuevos

### Ronda 13 — Facturación cupones
- Cupones redeem (404 inexistente, 400 vacío) OK

### Ronda 14 — Metas + Automatizaciones
- Validators OK

### Ronda 15 — Usuarios / Roles / Devices
- Validator OK (aunque apila errores de email+pwd sin priorizar, menor)
- Tenant users table mostraba "Sin rol" para users con `u.Rol` string pero sin Role entity asignado → fix en `GetTenantUsers` prioridad flags > u.Rol > u.Role.Nombre (commit `e149a41`)

### Ronda 16 — Categorías + Familias + Unidades
- Unidades de medida NO validaba abreviatura única por tenant → 2 unidades con misma abreviatura pasaban. Fix: `ExisteAbreviaturaAsync` (commit `9f4892e`)

### Ronda 17 — Suscripción / planes
- Subscription endpoints OK

### Ronda 18 — Activity Logs + Crash Reports
- OK (ADMIN no puede ver crash reports globales — ese acceso es solo SA)

### Ronda 19 — Plan Gratis limits + tier-gate reports
- Plan FREE enforza 20 clientes, 2 usuarios OK
- Tier-gate: plan FREE podía leer /insights, /comisiones, /rentabilidad-cliente, /analisis-abc, /ventas-vendedor, /ventas-producto, /ventas-zona, /actividad-clientes, /cartera-vencida, /cumplimiento-metas, /comparativo, /efectividad-visitas — 11 endpoints de plan BASIC/PROFESIONAL expuestos. Fix: cada endpoint llama `CanAccessReportAsync(tenantId, slug)` → 402 PaymentRequired con mensaje "Este reporte requiere el plan X" (commits `eba1b23`, `dff0c80`)

### Ronda 20 — Mobile API endpoints
- Mobile API NO registraba `TenantRlsInterceptor` → queries bajo user `handy_app` con RLS devolvían 0 filas → login siempre 401. Fix: registrar interceptor en `AddDbContext` (commit `14095d9`)
- Contenedor viejo con nombre `handysales_api_mobile_dev` en network `handysales_dev_network` — postgres estaba en `handysuites_dev_network`. Fix: recrear con `docker-compose up -d --build api_mobile` (in-session)

---

## Pendientes honestos

- **Impersonation race conditions**: fix parcial en round 7 — aún hay timing issues NextAuth↔cookies↔middleware en casos edge.
- **Homologación Spinner**: aplicada a 6 archivos clave, quedan ~14 más que no he tocado (ver `rg "Loader2" apps/web/src`).
- **Billing profundo**: CFDI timbrado, PAC real, cancelación — no tocado.
- **E2E Playwright permanentes** para CI: los tests de regresión fueron ad-hoc, no quedaron en código.
- **Mobile app React Native**: sólo toqué la Mobile API backend, no el app nativo.
- **SignalR**, **2FA flow completo**, **password reset email**, **announcements publish** — sin tocar.
- **Push** a `origin/staging`: branch local diverge ≥55 commits del remoto.
