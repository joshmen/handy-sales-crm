# Plan de Testing E2E exhaustivo — Plan `eager-drifting-journal`

## Objetivo
Verificar 100% que las 8 features del plan funcionan end-to-end:
- Web (Playwright) — no rompimos nada del web admin/dashboard
- Mobile (Maestro/emulador) — los 8 cambios del cliente mobile + integración con backend

## Cobertura por feature

### Parte A — Single-session strict
| Test | Tipo | Estado backend | Pendiente E2E |
|---|---|---|---|
| 409 SESSION_BLOCKED en login con sesión activa | xUnit (Part A commit) | ✓ | Maestro: login device B con sesión device A → ver picker |
| Force-login revoca sesiones previas | Smoke verde (admin@jeyma login restore) | ✓ | Maestro: force-login dispara revoke + JWT nuevo |
| ForceSingleSession default = false (Netflix picker) | xUnit (Part A commit) | ✓ | Maestro: SESSION_LIMIT_REACHED 200 muestra picker |

### B.1 — Eager-save server-side
| Test | Tipo | Estado backend | Pendiente E2E |
|---|---|---|---|
| Crea Pedido Borrador idempotente | 5 repo + 4 service tests | ✓ | Maestro: crear pedido → ver Borrador en DB en <5s |
| Idempotente vía mobile_record_id | xUnit | ✓ | Curl 2x → ServerId mismo, idempotent=true (HECHO) |
| Fire-and-forget no bloquea UI | Type-check ✓ | ✓ | Maestro: red caída → pedido se guarda local sin error UI |
| Hook en createPedidoOffline + createVentaDirectaOffline | Type-check ✓ | ✓ | Maestro: crear venta directa → eager-save POST observable en logs |

### B.2 — Telemetría heartbeat
| Test | Tipo | Estado backend | Pendiente E2E |
|---|---|---|---|
| Heartbeat persiste con tenant+user del JWT | 10 xUnit | ✓ | Maestro: dejar app 5min → telemetry row aparece |
| Backlog triggers shouldForceSyncPush | xUnit | ✓ | Curl directo verde (HECHO) |
| Admin sync-health solo ve su tenant | xUnit | ✓ | Curl directo verde (HECHO) |
| Cliente mobile registra heartbeat post-30s | Hook integrado en (tabs)/_layout | ✓ | Maestro: verificar POST /telemetry/heartbeat en 30-330s |

### B.3 — Reliability sync
| Test | Tipo | Estado backend | Pendiente E2E |
|---|---|---|---|
| Retry agresivo 500/2k/5k | Code change | ✓ | Maestro: simular 503 → ver 3 retries en logs |
| Safety net interval 60s | useAutoSync | ✓ | Maestro: app idle 70s → ver sync auto disparado |
| Block logout si pending > 0 | Code change | ✓ | Maestro: crear pedido offline → intentar logout → ver modal "Datos sin sincronizar" |

### B.4 — SignalR SESSION_REPLACED
| Test | Tipo | Estado backend | Pendiente E2E |
|---|---|---|---|
| /api/internal/session-replaced emite ForceLogout | InternalEndpoints | ✓ | Curl directo + ver evento en hub (puede testear en 2 device) |
| Mobile filtra por newDeviceId | useRealtime | ✓ | Maestro: 2 dispositivos → device A logout instantáneo |
| Broadcast fire-and-forget desde MobileAuthService | Code change | ✓ | Maestro: force-login dispara broadcast (verificable en logs) |

### B.5 — Conflict resolver per-collection
| Test | Tipo | Estado backend | Pendiente E2E |
|---|---|---|---|
| Pedidos: server-wins en Estado | conflictResolver en syncEngine | ✓ | Maestro: cancelar pedido desde web admin → ver mobile actualizado tras sync |
| Cobros: LWW por updated_at | conflictResolver | ✓ | Maestro: edit cobro 2 devices → ver versión más reciente wins |
| Default: per-column client-wins | conflictResolver | ✓ | Maestro: edit notas pedido offline → no se pierden al sync |

### C.1 — Admin drafts huérfanos
| Test | Tipo | Estado backend | Pendiente E2E |
|---|---|---|---|
| GET /api/admin/pedidos/drafts lista Borrador | Curl directo verde (HECHO) | ✓ | Playwright: ¿hay UI web? sino solo curl |
| Filter por usuarioId funciona | Repo code | ✓ | Curl con ?usuarioId=N |
| Filter por minAgeMinutes default 30 | Endpoint code | ✓ | Curl con valores diferentes |
| Solo ADMIN/SUPERVISOR/SUPER_ADMIN | RequireRole | ✓ | Curl con vendedor → 403 |

### C.2 — Restaurar desde servidor
| Test | Tipo | Estado backend | Pendiente E2E |
|---|---|---|---|
| Botón gated por isOnline + pendingCount=0 | Component code | ✓ | Maestro: tocar botón con pendings → disabled + hint |
| Confirmación destructiva | ConfirmModal | ✓ | Maestro: tocar botón → ver modal "¿Continuar?" |
| resetDatabase + sync funciona | Code change | ✓ | Maestro: confirmar → ver "Restaurando..." → toast success |

## Plan de ejecución por orden

### Fase 1: Playwright suite (15-25 min)
Objetivo: cero regresiones en web admin/dashboard.

1. `cd apps/web && npx playwright test` (full suite)
2. Si hay fails, investigar y fix
3. Target: 0 fails (puede haber skips pre-existentes documentados)

### Fase 2: Smoke curl directo (10 min)
Tests rápidos que no requieren emulador. Ya pasamos los principales — completar los pendientes:

1. Curl C.1: filter por usuarioId
2. Curl C.1: filter por minAgeMinutes
3. Curl C.1: vendedor → 403
4. Curl B.4: trigger session-replaced manual + observar hub

### Fase 3: Setup emulador (10 min)
Pre-requisito hard.

1. Verificar emulador Android running (`adb devices`)
2. Si no: lanzar AVD con dns-server 8.8.8.8 (per memory emulator_metro_setup)
3. Metro: `cd apps/mobile-app && npx expo start --go --port 8081`
4. APK install si necesario (Expo Go o EAS dev build)
5. Login vendedor1@jeyma.com (force-login automático)

### Fase 4: Maestro flows críticos (60-90 min)
Flujos en orden de criticidad pre-incidente Rodrigo:

1. **Crear pedido con red** → verificar eager-save en logs + DB shows Borrador
2. **Crear pedido offline → reconnect** → ver sync push exitoso (B.1+B.3 combo)
3. **Logout con pendings** → ver modal bloqueo (B.3)
4. **Logout sin pendings** → confirmación normal funciona
5. **Heartbeat polling** → esperar 5+ min, ver POST telemetry en logs
6. **Restaurar desde servidor con pendings** → botón disabled + hint correcto
7. **Restaurar desde servidor sin pendings** → confirmación + reset + sync OK
8. **Single-session SESSION_REPLACED** → login device B con cuenta device A → device A logout instantáneo (requiere 2 emuladores o emulador + telefono físico — opcional)

### Fase 5: Stress E2E real (30 min)
Simular el escenario Rodrigo:

1. Vendedor crea 5 pedidos offline (sin red)
2. Reconectar
3. Verificar todos llegan a server (Borrador via eager-save + Confirmado via sync push)
4. Backend dashboard sync-health en otro tab muestra el backlog momentáneo
5. Después de sync, dashboard shows 0 pending

### Fase 6: Validación final cross-checks (10 min)

1. xUnit suite full: 558+53 verdes
2. Type-check mobile + web verde
3. Build all 3 APIs (main + mobile + billing) verde
4. Lint mobile + web (si están configurados)

## Criterios de éxito

- **0 fails** en Playwright (post-fix de regresiones si las hay)
- **8/8 Maestro flows críticos** pasan
- **Smoke curl 100%** verde
- **xUnit suites** verdes (ya están)
- Performance: eager-save < 2s end-to-end (vendedor toca finalizar → DB row visible)

## Out-of-scope (no testeo en esta vuelta)

- Test de carga (50 vendedores × heartbeat = 14.4k rows/día) — separado, requiere k6
- Test de pérdida WDB corrupción real (sólo el flujo restore button) — requiere device manipulation
- Production deploy validation — pertenece a deployment checklist, no a este plan
