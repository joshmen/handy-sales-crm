# Plan 006: Corregir la documentación que aún dice MySQL — el repo usa PostgreSQL 16

> **Executor instructions**: Sigue este plan paso a paso. Corre cada verificación
> antes de avanzar. Si ocurre algo de "STOP conditions", detente y reporta. Al
> terminar, actualiza la fila de este plan en `plans/README.md`.
>
> **Drift check (primero)**: `git grep -liE 'mysql|3306' -- docs/`
> Compara la lista resultante contra la de "Current state"; si difiere mucho, usa la lista viva (el grep es la fuente de verdad de qué archivos tocar).

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `3fa3ba1d`, 2026-06-13

## Why this matters

El proyecto migró de MySQL a **PostgreSQL 16** (marzo 2026), pero varias guías de `docs/` siguen documentando MySQL 8.0, puerto 3306 y connection strings `Server=...`. Un desarrollador o agente que siga `docs/deployment/RAILWAY_SETUP.md` para montar o aprovisionar un entorno creará una base de datos **MySQL**, usará un connection string MySQL, y **fallará al arrancar** (el código usa el provider Npgsql/PostgreSQL). Documentación activamente incorrecta es peor que ausente: dirige al lector a un callejón sin salida. `CLAUDE.md` y `.env.production.template` ya están correctos (PostgreSQL); el desfase está en las guías de deployment/arquitectura.

## Current state

- Archivos de `docs/` que contienen `mysql`/`3306` (de `git grep -liE 'mysql|3306' -- docs/` al planear):
  - `docs/architecture/DEPLOYMENT.md` — diagrama y connection strings con "MySQL 8.0", `Port=3306`, sección Azure "MySQL Flexible Server".
  - `docs/deployment/RAILWAY_SETUP.md` — guía completa escrita para MySQL ("New → Database → MySQL", `AllowPublicKeyRetrieval`, `CharSet=utf8mb4`, puerto 3306). Es la guía canónica de Railway.
  - `docs/deployment/README.md` — "MySQL 8.0 | Railway" + template de connection string MySQL.
  - `docs/PLAN_GENERAL_PENDIENTES.md` — referencia "Railway MySQL".
  - `docs/architecture/PROJECT_STRUCTURE.md`, `docs/architecture/MOBILE_APP.md`, `docs/architecture/rutas-module-plan.md`, `docs/PLAN_MEJORAS_HANDYSALES.md`, `docs/SCREEN_STATUS.md`, `docs/development/EF_MIGRATIONS.md`, `docs/plans/2026-03-05-metas-auto-renovacion.md` — referencias sueltas (revisar cada una; algunas pueden ser notas históricas legítimas de la migración).
- **Fuente de verdad del formato correcto** (PostgreSQL): `.env.production.template` (raíz) usa `Host=${PG_HOST};Port=5432;Database=...;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true`. `CLAUDE.md` "Architecture at a Glance" dice "PostgreSQL 16". Usar ese formato Npgsql como referencia.

## Commands you will need

| Propósito | Comando | Esperado |
|-----------|---------|----------|
| Listar archivos con MySQL | `git grep -liE 'mysql\|3306' -- docs/` | lista de archivos a revisar |
| Ver líneas concretas | `git grep -niE 'mysql\|3306' -- docs/<archivo>` | líneas exactas a corregir |
| Verificar al final | `git grep -niE 'mysql\|3306' -- docs/` | solo notas históricas marcadas (o vacío) |

## Scope

**In scope**:
- Los archivos `.md` bajo `docs/` que devuelva el `git grep` (lista arriba).

**Out of scope** (NO tocar):
- Cualquier código (`.cs`, `.ts`, configs). Este plan es **solo documentación**.
- `tasks/`, `CLAUDE.md` (ya correcto), `memory/`.
- No reescribir las guías completas — solo corregir lo factualmente incorrecto (motor de DB, puerto, connection strings, pasos de aprovisionamiento). No reestructurar prosa que ya es correcta.

## Git workflow

- Rama: `advisor/006-docs-mysql-a-postgresql`
- Commit: `docs: corregir referencias a MySQL — el stack usa PostgreSQL 16`. Sin `Co-Authored-By` ni mención de IA.

## Steps

### Step 1: Enumerar las ocurrencias exactas

Corre `git grep -niE 'mysql|3306' -- docs/` y revisa cada línea. Clasifica cada ocurrencia en:
- **(a) Corregir**: instrucción de setup, connection string, motor de DB, puerto actuales que dirigen a MySQL.
- **(b) Histórico legítimo**: una nota que explícitamente habla de "la migración de MySQL a PostgreSQL" (correcto dejarla, es contexto histórico). Si es ambigua, prefiere reescribirla para que quede claro que MySQL es el pasado.

**Verify**: tienes una lista de líneas a cambiar.

### Step 2: Reemplazos por tipo

- **Motor**: "MySQL 8.0" → "PostgreSQL 16".
- **Puerto**: `3306` → `5432`.
- **Connection strings**: formato MySQL (`Server=...;Port=3306;...;CharSet=utf8mb4;AllowPublicKeyRetrieval=true;...`) → formato Npgsql tomado de `.env.production.template`: `Host=...;Port=5432;Database=...;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true`.
- **Pasos de Railway** (`RAILWAY_SETUP.md`): "New → Database → **MySQL**" → "New → Database → **PostgreSQL**"; quitar flags específicos de MySQL (`AllowPublicKeyRetrieval`, `CharSet`).
- **Azure (DEPLOYMENT.md)**: "MySQL Flexible Server" → "PostgreSQL Flexible Server"; marcar como obsoleta cualquier referencia a Bicep `mysql-database.bicep`.

Mantén el resto de cada guía intacto.

**Verify**: revisión visual de cada archivo cambiado — los connection strings de ejemplo ahora son Npgsql válidos.

### Step 3: Verificación final

**Verify**: `git grep -niE 'mysql|3306' -- docs/` no devuelve referencias **activas** (solo, a lo sumo, notas históricas de la migración explícitamente marcadas como pasado).

## Test plan

- No hay tests automatizados para docs. Verificación de aceptación:
  - `git grep -niE 'mysql|3306' -- docs/` → sin ocurrencias activas (las que queden deben ser claramente "MySQL fue reemplazado por PostgreSQL").
  - Lectura cruzada: un connection string de ejemplo en `RAILWAY_SETUP.md` debe coincidir en forma con el de `.env.production.template` (Host/Port=5432/SSL Mode).

## Done criteria

ALL deben cumplirse:

- [ ] `git grep -niE 'mysql|3306' -- docs/` no devuelve instrucciones/connection-strings activos de MySQL (solo notas históricas marcadas, si acaso)
- [ ] `docs/deployment/RAILWAY_SETUP.md` aprovisiona PostgreSQL y usa connection string Npgsql
- [ ] `docs/architecture/DEPLOYMENT.md` y `docs/deployment/README.md` dicen PostgreSQL 16 / puerto 5432
- [ ] Solo se modificaron archivos `.md` bajo `docs/` (`git status`)
- [ ] Fila de este plan actualizada en `plans/README.md`

## STOP conditions

Detente y reporta si:

- Encuentras una guía que documente un servicio MySQL **realmente en uso** (no la DB principal) — ej. un MySQL para una herramienta de terceros. En ese caso no lo cambies a ciegas; reporta.
- El `git grep` devuelve cientos de ocurrencias en archivos generados o de vendor — limita el scope a `docs/` y reporta si hay ocurrencias fuera de docs que parezcan importantes (ej. en código), pero **no** las toques en este plan.

## Maintenance notes

- Tras este plan, la doc de deployment queda consistente con `CLAUDE.md` y `.env.production.template`. Si en el futuro se migra a Azure, actualizar las secciones Azure a "Azure Database for PostgreSQL Flexible Server".
- El reviewer debe abrir `RAILWAY_SETUP.md` y seguir mentalmente los pasos para confirmar que un nuevo dev llegaría a una DB PostgreSQL funcional.
- Follow-up relacionado (no en este plan): `CLAUDE.md` lista BILL-1 "Conectar PAC real" como pendiente cuando Finkok ya está integrado, y el conteo de tests "429" puede haber derivado (hallazgos DOCS-02/03) — corregirlos en una pasada futura de docs.
