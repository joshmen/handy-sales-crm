# Implementation Plans

Generados por la skill `/improve` el 2026-06-13 (audit read-only del monorepo HandySuites, planeado contra commit `3fa3ba1d`). Cada ejecutor: lee el plan completo antes de empezar, respeta sus condiciones STOP, y actualiza su fila al terminar.

Todos los planes son **autocontenidos** — el ejecutor no vio la auditoría ni esta conversación. No hagas push ni PR sin instrucción explícita del operador.

## Orden de ejecución y estado

| Plan | Título | Prioridad | Esfuerzo | Depende de | Estado |
|------|--------|-----------|----------|------------|--------|
| 005  | Gate de CI para `apps/web` (type-check + lint) | P1 | S | — | DONE (worktree `worktree-agent-ae7f1887fba76c5b2`, commit e88aff0d) |
| 001  | Folio de Factura Global dentro de transacción | P1 | S | — | DONE (worktree `worktree-agent-a45f1a32204198ce6`, commit 9fe308e5) |
| 002  | Folio provider: fail-fast en vez de caer a folio 1 | P1 | S | — | DONE (worktree `worktree-agent-a9cf9f17b719e4a7b`, commit a096df7e) |
| 003  | CFDI: total de impuestos == desglose (evita CFDI40135) | P1 | M | — | DONE (worktree `worktree-agent-a1b7b2999f0afbfa8`, commit 7653b059) |
| 004  | ObjetoImp por producto (no forzar "02" gravado) | P2 | M | 003 | DONE (worktree `worktree-agent-a762f9aee11164c85`, commit b8d2cceb) |
| 006  | Docs: reemplazar MySQL → PostgreSQL | P2 | M | — | DONE (worktree `worktree-agent-ac0891ed7beedfdd1`, commit 8ba31b4e) |

Valores de estado: TODO | IN PROGRESS | DONE | BLOCKED (con razón en una línea) | REJECTED (con motivo).

Orden recomendado: **005** (red de seguridad de CI primero) → **001, 002** (folio, triviales) → **003** → **004** → **006**. Salvo la dependencia 004→003, todos son independientes y pueden ejecutarse en cualquier orden o en paralelo por distintos agentes.

## Consolidación (2026-06-13)

Los 6 planes fueron ejecutados (cada uno por un agente en worktree aislado) y revisados (APPROVE). Luego se **consolidaron en una sola rama** vía cherry-pick:

- **Rama consolidada**: `worktree-agent-a6e860ab467b9e19f` (6 commits sobre `3fa3ba1d`).
- **Verificado**: `dotnet test` billing **243/243 verdes**, build 0 errores, `web-checks.yml` presente, `git grep mysql docs/` = solo notas históricas.
- **Conflicto 001↔004 resuelto** en `FacturasController.cs` + `FacturasControllerTests.cs`: `GenerarFacturaGlobal` quedó con transacción (001) + `ObjetoImp` (004) + el fix CFDI40167 `ValorUnitario` neto (preservado de la base). Se conservaron ambos sets de tests.
- **Hallazgo**: los worktrees del harness se crean off `main` (978eb20f), no off `feat/finkok-emisor-tenant` (3fa3ba1d). La consolidación re-basó a 3fa3ba1d y preservó los fixes Finkok — un merge directo de las ramas sueltas habría revertido el fix CFDI40167.
- **Para integrar** (decisión del operador): desde `feat/finkok-emisor-tenant`, `git merge worktree-agent-a6e860ab467b9e19f`.

## Notas de dependencias

- **004 requiere 003**: ambos modifican el armado del nodo `<Impuestos>` del CFDI. Ejecutar 003 primero evita re-trabajar el redondeo y los tests.

## Contexto compartido (todos los planes de facturación)

- Monorepo .NET; el servicio de facturación es `apps/billing` (.NET 9, EF Core + Npgsql, PostgreSQL 16, separado del API principal).
- Emite CFDI 4.0 timbrado vía PAC Finkok (SOAP). Multi-tenant: toda fila tiene `tenant_id`; RLS por `app.tenant_id` (`set_config`) para el usuario `handy_app`.
- Convención de commits: conventional commits en español (ej. `fix(finkok): ...`). Ver `git log --oneline -5`. **NUNCA** incluir `Co-Authored-By` ni mención de IA en los mensajes de commit (regla del repo).
- Comandos de verificación:
  - Tests billing: `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj`
  - Rebuild billing local (si pruebas contra Docker): `docker-compose -f docker-compose.dev.yml up -d --build api_billing` (requiere env var `CLOUDINARY_URL` seteada, ej. `cloudinary://000:000@placeholder` para build local).

## Findings considerados y rechazados (para que nadie los re-audite)

- **"Credenciales reales subidas a git"** (reportado por un agente): FALSO. `.env` y `apps/web/.env.local` están en `.gitignore` y **nunca** estuvieron en el historial de git (verificado con `git log --all -- .env`). No hay fuga por el repo. No requiere acción.
- **Rate-limit en `GET /api/facturas/public/{uuid}`**: el endpoint es público por diseño SAT (los UUID son públicos). El rate limiter global de 60/min ya aplica. Hardening opcional, no un bug.

## Hallazgos del audit NO incluidos en este set (backlog, por si se retoman)

Seguridad/correctness menores: idempotencia de webhooks Stripe + 500→reintento infinito; `invoice.paid` sin match de subscription; `GetSatStatusAsync` filtra `ex.Message` crudo; `OrderReader` `GetString(10)` NRE con RFC null; checks de rol SUPER_ADMIN en código de app en vez de policy.
Performance: sync pull sin paginación (cliff de escala); N+1 en side-effects de entrega; `BatchToggleActivo` load-then-loop en 14 repos.
Tests: webhooks Stripe + 2FA sin cobertura; 538 `waitForTimeout` flaky en E2E.
Deps: `next-auth` v4 en Next 15; split net8/net9; 3 libs de gráficas + 2 de mapas.
Direction: AI Gateway (`apps/ai`) y Marketplace de Integraciones especificados sin código; cancelación bilateral sin entrada de UI; `/orders/new` inexistente (la web no puede crear pedidos).
