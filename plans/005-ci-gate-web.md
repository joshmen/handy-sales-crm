# Plan 005: Agregar un gate de CI para `apps/web` (type-check + lint) en cada push/PR

> **Executor instructions**: Sigue este plan paso a paso. Corre cada verificación
> antes de avanzar. Si ocurre algo de "STOP conditions", detente y reporta. Al
> terminar, actualiza la fila de este plan en `plans/README.md`.
>
> **Drift check (primero)**: `git diff --stat 3fa3ba1d..HEAD -- .github/workflows apps/web/package.json`
> Si cambiaron, compara contra los excerpts antes de proceder.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `3fa3ba1d`, 2026-06-13

## Why this matters

El único workflow de CI (`.github/workflows/deploy-apis.yml`) solo corre tests de los servicios .NET (`apps/api`, `apps/billing`, `apps/mobile`, `libs`). **No hay ningún gate para `apps/web`**: ni `type-check`, ni `lint`, ni E2E corren en CI. Un error de TypeScript o un import roto puede mergearse a `main`, dispararse el auto-deploy de Vercel, y romper el frontend de producción — el desarrollador se entera tarde (cuando el `next build` de Vercel falla, minutos después del push). `CLAUDE.md` ya **manda** correr `npm run type-check` para cambios en `apps/web/`, pero esa regla vive solo en docs, sin un gate que la haga cumplir. Un gate barato (tsc + lint) cierra el hueco más grande de calidad del repo.

## Current state

- `.github/workflows/deploy-apis.yml` — único workflow de build/test; su filtro `paths:` cubre `apps/api/**`, `apps/billing/**`, `apps/mobile/**`, `libs/**`, `infra/docker/Dockerfile.*.Prod`. **`apps/web/**` está ausente.** Estructura de referencia para copiar convenciones (runner `ubuntu-latest`, `actions/checkout@v4`, `actions/cache@v4`).
- `.github/workflows/secret-scan.yml` — gitleaks en push/PR (existe; no se toca).
- `apps/web/package.json` — scripts disponibles (existen, solo no se corren en CI):
  ```json
  "type-check": "tsc --noEmit",
  "lint": "next lint",
  "test": "jest --passWithNoTests",
  ```
  Engine: Next.js 15, React 19, TypeScript 5. ESLint 9 flat config en `apps/web/eslint.config.mjs`.
- No existe `apps/web/.github` ni workflow específico de web.

## Commands you will need

| Propósito | Comando | Esperado |
|-----------|---------|----------|
| Type-check local (sanity del gate) | `cd apps/web && npm ci && npm run type-check` | exit 0 |
| Lint local | `cd apps/web && npm run lint` | exit 0 (o warnings, ver Step 2) |
| Validar YAML | revisar sintaxis del workflow (indentación) | parsea sin error |

## Scope

**In scope** (crear UN archivo nuevo):
- `.github/workflows/web-checks.yml` (nuevo)

**Out of scope** (NO tocar):
- `.github/workflows/deploy-apis.yml` y `secret-scan.yml` — no se modifican.
- `apps/web/package.json` — no migrar `next lint` a `eslint` (eso es un hallazgo aparte, DX-02).
- No agregar Playwright al gate (requiere stack de servicios backend corriendo — follow-up separado).
- No escribir tests jest todavía (hallazgo TEST-03).

## Git workflow

- Rama: `advisor/005-ci-gate-web`
- Commit: `ci(web): agregar gate de type-check + lint para apps/web en push/PR`. Sin `Co-Authored-By` ni mención de IA.

## Steps

### Step 1: Crear el workflow `.github/workflows/web-checks.yml`

```yaml
name: Web Checks

# Gate de calidad para apps/web (Next.js). El CI de backend (deploy-apis.yml)
# solo cubre los servicios .NET; este workflow corre type-check + lint para
# que un error de TypeScript o lint no llegue a Vercel sin detectarse.

on:
  push:
    branches: [main, staging]
    paths:
      - 'apps/web/**'
  pull_request:
    branches: [main, staging]
    paths:
      - 'apps/web/**'

permissions:
  contents: read

jobs:
  web-checks:
    name: Type-check & Lint (apps/web)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/web/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint
```

Notas de implementación:
- `node-version`: alinear con la versión de Node que usa el equipo/Vercel (20 LTS es seguro para Next 15; ajustar si el repo fija otra en `.nvmrc` o `engines`).
- Si `apps/web/package-lock.json` no existe (revisar), quitar `cache-dependency-path` y `cache: 'npm'`, o ajustarlo al lockfile real.

**Verify**: el YAML parsea (indentación de 2 espacios, sin tabs). Localmente, los comandos del job pasan: `cd apps/web && npm ci && npm run type-check && npm run lint` → exit 0.

### Step 2: Decidir el estricto del lint

`next lint` puede devolver warnings sin fallar. Si el equipo quiere que warnings bloqueen, cambiar el step de lint a `run: npm run lint -- --max-warnings 0`. **Default recomendado para este plan**: dejar `npm run lint` tal cual (no `--max-warnings 0`) para no romper el primer PR por warnings preexistentes; documentar en el PR que endurecerlo es un follow-up una vez que el código esté limpio.

**Verify**: `cd apps/web && npm run lint` localmente termina exit 0 con la configuración elegida.

## Test plan

- No hay tests unitarios para un workflow. Verificación de aceptación:
  1. Localmente, correr los comandos del job sobre el código actual → exit 0 (confirma que el gate pasa en `main` hoy y no bloquea por deuda preexistente).
  2. (Manual, recomendado por el operador) En una rama de prueba, introducir un error de TypeScript a propósito (ej. asignar `const x: number = "str"` en un archivo de `apps/web/src`), abrir PR, y confirmar que el job `Web Checks` **falla**. Revertir.

## Done criteria

ALL deben cumplirse:

- [ ] `.github/workflows/web-checks.yml` existe y dispara en push/PR a main/staging con `paths: apps/web/**`
- [ ] El job corre `npm ci`, `npm run type-check`, `npm run lint` con `working-directory: apps/web`
- [ ] `cd apps/web && npm run type-check && npm run lint` pasa en el código actual (exit 0) — el gate no bloquea por deuda existente
- [ ] No se modificó `deploy-apis.yml` ni `package.json` (`git status`)
- [ ] Fila de este plan actualizada en `plans/README.md`

## STOP conditions

Detente y reporta si:

- `cd apps/web && npm run type-check` **falla** en el código actual de `main` — significa que ya hay errores de tipo en `main`; repórtalos (no los arregles en este plan — el gate debe agregarse sobre código verde, o el operador decide arreglar primero).
- No existe `apps/web/package-lock.json` (ajusta el cache del workflow y reporta).
- El equipo usa una versión de Node distinta fijada en algún lado — úsala en vez de '20'.

## Maintenance notes

- Follow-ups deliberadamente fuera de este plan: (a) agregar Playwright E2E al CI (necesita levantar los servicios backend con Docker — es un workflow más pesado); (b) migrar `next lint` → `eslint` (DX-02, ya deprecado en Next 15); (c) escribir primeros tests jest y quitar `--passWithNoTests` (TEST-03). Este plan solo pone el gate barato de tsc+lint.
- El reviewer debe confirmar que el filtro `paths` no bloquea PRs que no tocan la web (el job no debe correr para cambios solo-backend).
