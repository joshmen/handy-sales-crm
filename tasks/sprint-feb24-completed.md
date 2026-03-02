# Checklist Accionable — Sprint Feb 24, 2026 (COMPLETED)

> Extracted from CLAUDE.md — historical sprint tracking. Last updated: 2026-02-24.

## ✅ Paso 1: Commit pendientes — COMPLETADO

- [x] **GIT-1**: Commit Mobile API (attachment endpoint + sync service) — `8310b17`
- [x] **GIT-2**: Commit Mobile App (74 files: offline hooks, map, WDB, Maestro, TS fix) — `a6b771b`
- [x] **GIT-3**: TypeScript 0 errores confirmado (TS 5.6.3)
- [x] **Security**: Firebase files removidos de git, Google Maps key movida a env var — `d77dfa2`

## ✅ Paso 2: MOB-4 — Evidencia conectada a pantallas — COMPLETADO

> Todo ya estaba implementado. Solo faltaban botones de navegacion en cobrar/index.tsx.

- [x] **MOB-4a**: `visita-activa.tsx` — Fotos + firma + selector resultado + notas
- [x] **MOB-4b**: `cobrar/registrar.tsx` — Foto comprobante
- [x] **MOB-4c**: `evidenceManager.ts` — JWT auth header
- [x] **MOB-4d**: `syncEngine.ts` — `uploadPendingAttachments()` + `cleanUploadedFiles()` como Phase 3
- [x] **MOB-4e**: `sync.tsx` — "Fotos pendientes de subir: N"
- [x] **MOB-4f**: Fix: botones "Registrar Cobro" + "Historial" — `bf31409`

## ✅ Paso 3: Maestro E2E — Testing manual por usuario

- [x] **E2E-1/2/3**: Testing movil se hace manualmente desde dispositivo fisico

## ✅ Paso 4: Web — Limpiar mocks — COMPLETADO

- [x] **WEB-1**: `profile/page.tsx` — Mocks reemplazados por API real
- [x] **WEB-3**: Eliminados stubs mock mobile routes + middleware dead code
- [x] **WEB-2**: 210/211 E2E tests passing (1 flaky maintenance test — BAJA)

## Remaining items (moved to active tracking)

See `CLAUDE.md` section "Current Sprint & Pending Work" for:
- MOB-6: Polish (crash reporting, error boundaries, Zod validation)
- BILL-1: Conectar PAC real
- MOB-7: Store Release
- SEC-M1 to SEC-M4: Mobile security (post-launch)
