# Plan 001: Envolver `GenerarFacturaGlobal` en una transacción para no dejar huecos en la serie de folios SAT

> **Executor instructions**: Sigue este plan paso a paso. Corre cada comando de
> verificación y confirma el resultado esperado antes de avanzar. Si ocurre algo
> de "STOP conditions", detente y reporta — no improvises. Al terminar, actualiza
> la fila de este plan en `plans/README.md`.
>
> **Drift check (córrelo primero)**: `git diff --stat 3fa3ba1d..HEAD -- apps/billing/HandySuites.Billing.Api/Controllers/FacturasController.cs`
> Si el archivo cambió desde que se escribió este plan, compara los excerpts de
> "Current state" contra el código vivo antes de proceder; si no coinciden, trátalo
> como STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (compliance)
- **Planned at**: commit `3fa3ba1d`, 2026-06-13

## Why this matters

`GenerarFacturaGlobal` reserva el siguiente folio de la serie y **después** guarda la factura sin transacción. Si `SaveChangesAsync` falla (constraint, caída de conexión), el folio ya quedó incrementado en `numeracion_documentos` pero no existe la factura → **hueco en la serie de folios**. El SAT (Anexo 20) exige series secuenciales sin huecos; un hueco obliga a una aclaración manual ante la autoridad. Las otras dos rutas de facturación (`CreateFactura`, `CreateFacturaFromOrder`) ya están protegidas con el patrón correcto; esta es la única que falta.

## Current state

- `apps/billing/HandySuites.Billing.Api/Controllers/FacturasController.cs` — controlador de facturas. El método `GenerarFacturaGlobal` (busca `public async Task<...> GenerarFacturaGlobal`) tiene la reserva de folio y el guardado **fuera** de cualquier transacción:

```csharp
// ~línea 826-896 (GenerarFacturaGlobal) — SIN transacción:
var serie = config.SerieFactura ?? "A";
var folio = await _folioProvider.GetNextFolioAsync(tenantId, serie);   // folio apartado
// ... construye `var factura = new Factura { ... Folio = folio, ... }`
// ... foreach order/line -> factura.Detalles.Add(...)
_context.Facturas.Add(factura);
await _context.SaveChangesAsync();                                      // si falla, folio queda gastado
// ... RegistrarAuditoria(...) + segundo SaveChangesAsync (líneas ~902-904)
```

- **Patrón exemplar a copiar** (mismo archivo, `CreateFactura`, líneas ~414-455 + su commit): la reserva de folio + construcción + `Add` + primer `SaveChanges` van dentro de una estrategia de ejecución con transacción explícita, porque el `DbContext` tiene `EnableRetryOnFailure` (un `BeginTransactionAsync` manual sin estrategia lanzaría en runtime):

```csharp
var strategy = _context.Database.CreateExecutionStrategy();
var factura = await strategy.ExecuteAsync(async () =>
{
    await using var folioTx = await _context.Database.BeginTransactionAsync();
    var folio = await _folioProvider.GetNextFolioAsync(tenantId, request.Serie ?? "A");
    var f = new Factura { ... Folio = folio, ... };
    // ... agregar detalles ...
    _context.Facturas.Add(f);
    await _context.SaveChangesAsync();
    await folioTx.CommitAsync();     // <-- confirma folio + factura atómicamente
    return f;
});
```

  (Confirma el `await folioTx.CommitAsync();` exacto leyendo `CreateFactura` completo antes de copiar el patrón.)

- Convención: el `NpgsqlFolioProvider` documenta en su XML-doc (`apps/billing/HandySuites.Billing.Api/Services/NpgsqlFolioProvider.cs:7-18`) que el folio comparte la transacción ambiente para que un fallo del save haga rollback del folio. `GenerarFacturaGlobal` viola ese contrato; este plan lo cumple.

## Commands you will need

| Propósito | Comando | Esperado |
|-----------|---------|----------|
| Tests billing | `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` | exit 0, todos pasan |
| Rebuild billing (opcional, si pruebas en Docker) | `docker-compose -f docker-compose.dev.yml up -d --build api_billing` | contenedor sano (requiere `CLOUDINARY_URL`) |

## Scope

**In scope** (los únicos archivos que modificas):
- `apps/billing/HandySuites.Billing.Api/Controllers/FacturasController.cs` (solo el método `GenerarFacturaGlobal`)
- `apps/billing/HandySuites.Billing.Tests/` (agregar/extender un test — ver Test plan)

**Out of scope** (NO tocar):
- La lógica de cálculo de montos (`subtotal`/`descuento`/`impuestos`/`total`) ni el shape del response (`MapToDto`).
- `CreateFactura` / `CreateFacturaFromOrder` — ya están correctos; son la referencia, no se modifican.
- `NpgsqlFolioProvider.cs` — eso es el Plan 002.

## Git workflow

- Rama: `advisor/001-folio-factura-global-transaccion`
- Commit estilo conventional en español, ej. `fix(billing): envolver GenerarFacturaGlobal en transaccion para no dejar huecos de folio`. **Sin** `Co-Authored-By` ni mención de IA.
- No push ni PR sin instrucción del operador.

## Steps

### Step 1: Envolver la reserva de folio + Add + primer SaveChanges en `strategy.ExecuteAsync`

En `GenerarFacturaGlobal`, mueve el bloque desde `var folio = await _folioProvider.GetNextFolioAsync(...)` hasta el primer `await _context.SaveChangesAsync();` dentro de:

```csharp
var strategy = _context.Database.CreateExecutionStrategy();
var factura = await strategy.ExecuteAsync(async () =>
{
    await using var folioTx = await _context.Database.BeginTransactionAsync();
    var folio = await _folioProvider.GetNextFolioAsync(tenantId, serie);
    var f = new Factura { /* ...exactamente lo que ya construye, con Folio = folio... */ };
    // foreach order/line -> f.Detalles.Add(...)  (mover tal cual)
    _context.Facturas.Add(f);
    await _context.SaveChangesAsync();
    await folioTx.CommitAsync();
    return f;
});
```

Deja el `RegistrarAuditoria(...)` + el segundo `SaveChangesAsync` **fuera** de la estrategia (después del `return factura;`), igual que hoy, para que un fallo de auditoría no aborte una factura ya confirmada.

**Verify**: `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` → exit 0.

### Step 2: Confirmar que no quedaron usos de la variable `folio`/`factura` fuera de scope

Tras mover el bloque, la variable `factura` debe seguir disponible para el `RegistrarAuditoria` y el `return CreatedAtAction(...)`. Asegura que el `return` final usa `factura` (el resultado del `strategy.ExecuteAsync`).

**Verify**: el proyecto compila: `dotnet build apps/billing/HandySuites.Billing.Api/HandySuites.Billing.Api.csproj` → exit 0, sin errores.

## Test plan

- Test nuevo en `apps/billing/HandySuites.Billing.Tests/Controllers/FacturasControllerTests.cs` (modelar sobre los tests existentes de ese archivo): verificar que `GenerarFacturaGlobal` con datos válidos crea la factura con un folio y estado `PENDIENTE`. Si la infraestructura de test permite simular un fallo de `SaveChanges` (in-memory/SQLite con constraint), agregar un caso que confirme que tras el fallo el folio **no** avanzó. Si simular el fallo no es práctico con el harness actual, deja documentado en el test un comentario `// TODO: caso de rollback de folio requiere harness con fallo de SaveChanges` y cubre al menos el happy-path dentro de transacción.
- Verificación: `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` → todos pasan, incluido el nuevo.

## Done criteria

ALL deben cumplirse:

- [ ] `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` exit 0
- [ ] `GenerarFacturaGlobal` ya no llama `GetNextFolioAsync` fuera de un `strategy.ExecuteAsync` con `BeginTransactionAsync` + `CommitAsync` (verificar leyendo el método)
- [ ] No se modificó ningún archivo fuera del scope (`git status`)
- [ ] Fila de este plan actualizada en `plans/README.md`

## STOP conditions

Detente y reporta (no improvises) si:

- El código de `GenerarFacturaGlobal` no coincide con los excerpts de "Current state" (el repo derivó desde `3fa3ba1d`).
- `CreateFactura` ya **no** usa el patrón `CreateExecutionStrategy` + `BeginTransactionAsync` (cambió la convención — confírmala antes de copiar).
- Los tests fallan dos veces después de un intento razonable de arreglo.
- El cambio parece requerir tocar `NpgsqlFolioProvider.cs` u otro archivo fuera de scope.

## Maintenance notes

- Si en el futuro se agrega lógica entre la reserva de folio y el save (ej. validación extra), debe quedar **dentro** de la misma transacción para preservar la atomicidad.
- El reviewer debe verificar que el segundo `SaveChangesAsync` (auditoría) sigue fuera de la transacción a propósito (un fallo de auditoría no debe abortar la factura).
- Follow-up relacionado (no en este plan): Plan 002 endurece el `NpgsqlFolioProvider` para que nunca devuelva folio 1 en silencio.
