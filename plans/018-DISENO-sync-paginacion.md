# Plan 018 (DISEÑO/SPIKE): Paginación en el pull de sincronización móvil

> Plan de **diseño**, no de ejecución directa. Toca BACKEND **y** cliente móvil de forma coordinada; hacerlo mal causa pérdida de datos o loops de sync. Ejecutar con cuidado e iteración.

## Status
- Prioridad: P2 (escalabilidad) | Esfuerzo: L | Riesgo: HIGH | Categoría: perf/arquitectura | Planned at: commit `975e4145`, 2026-06-14

## Por qué (y por qué NO one-shot)
El pull de sync devuelve **tablas completas** en el primer sync (sin paginación). Un tenant con decenas de miles de clientes/productos baja cientos de MB en una sola respuesta → **timeout / cliff de escala**. **No es one-shot** porque requiere cambiar el protocolo en DOS lados a la vez: el **backend** (`SyncRepository` + endpoint de pull) y el **cliente móvil** (`apps/mobile-app/src/sync/syncEngine.ts`, que debe hacer pulls multi-ronda antes de commitear). Un solo worktree de backend no basta.

## Estado actual (a confirmar)
- Backend: `libs/HandySuites.Infrastructure/Repositories/Sync/SyncRepository.cs` — métodos `Get*ModifiedSinceAsync` hacen `.ToListAsync()` sin `Take`/cursor (clientes, productos, pedidos, visitas, cobros, gastos, catálogos).
- Endpoint de pull: `apps/api`/`apps/mobile` (el que sirve `/sync/pull` o equivalente).
- Cliente: `apps/mobile-app/src/sync/syncEngine.ts` llama `synchronize()` de WatermelonDB con `entityTypes: null` (pull completo).

## Enfoque propuesto
1. **Backend**: agregar `maxRecords` + `pageToken`/cursor a cada `Get*ModifiedSinceAsync` y al endpoint de pull. Devolver un **cursor de continuación** cuando el resultado se trunca. Mantener **backward-compatible**: sin cursor → comportamiento actual (pull completo).
2. **Cliente móvil**: `syncEngine` hace pulls de varias rondas (sigue el cursor) y aplica todo antes de commitear. WatermelonDB `synchronize()` soporta múltiples rondas de pull. Manejar reintentos/errores por ronda.
3. **Cursor**: decidir diseño (por-entidad: `lastPulledAt` + `id > lastId` por tabla; o token opaco). Estable ante inserciones concurrentes.
4. **Pruebas**: simular tenant grande (sembrar N=50k) y validar que el primer sync completa en varias rondas sin perder ni duplicar registros, y que el `mobile_record_id` idempotency sigue intacto.

## Verificación
- Backend: `dotnet test` (api + mobile) verde; tests nuevos de paginación del SyncRepository.
- Móvil: tests de `syncEngine` (mock multi-ronda) + Maestro E2E de sync.
- Manual: sync de tenant grande termina sin timeout; conteos coinciden DB↔móvil.

## Preguntas abiertas
- ¿Diseño del cursor: por-entidad vs token global? ¿Tamaño de página (500? 1000?)?
- ¿Cómo testear la multi-ronda del cliente sin un device real (mock de `synchronize`)?
- ¿Orden de pull entre entidades (FKs: productos antes que pedidos)?

## Recomendación
Es el **problema de perf más serio para escalar**, pero también el más riesgoso (pérdida de datos si el cursor está mal). Hacerlo en una rama, backend primero (backward-compatible, no rompe el cliente actual), luego el cliente, con pruebas de tenant grande antes de mergear. NO mezclar con otros cambios.
