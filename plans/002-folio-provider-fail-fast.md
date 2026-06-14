# Plan 002: Hacer que `NpgsqlFolioProvider` falle fuerte en vez de caer a folio 1 en silencio

> **Executor instructions**: Sigue este plan paso a paso. Corre cada verificación
> antes de avanzar. Si ocurre algo de "STOP conditions", detente y reporta. Al
> terminar, actualiza la fila de este plan en `plans/README.md`.
>
> **Drift check (primero)**: `git diff --stat 3fa3ba1d..HEAD -- apps/billing/HandySuites.Billing.Api/Services/NpgsqlFolioProvider.cs`
> Si el archivo cambió, compara contra el excerpt de "Current state" antes de proceder.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (compliance)
- **Planned at**: commit `3fa3ba1d`, 2026-06-13

## Why this matters

`GetNextFolioAsync` lee el folio con `ExecuteScalarAsync()` y hace `return folio is int f ? f : 1;`. Si el valor devuelto no es exactamente `int` (ej. la columna `folio_actual` se cambia a `bigint` y Npgsql devuelve `long`, o un `null`/`DBNull` por una query inesperada), el código **descarta el valor real y devuelve 1**. Devolver 1 reinicia la serie → folios **duplicados** en CFDI ya timbrados, lo que bajo la ley fiscal mexicana constituye emisión irregular. Es una bomba de tiempo silenciosa: hoy la columna es `integer` y funciona, pero cualquier cambio de tipo o caso borde la dispara sin un solo error en logs.

## Current state

- `apps/billing/HandySuites.Billing.Api/Services/NpgsqlFolioProvider.cs` — provider del folio. El método completo (líneas 28-57):

```csharp
public async Task<int> GetNextFolioAsync(string tenantId, string serie)
{
    var conn = (Npgsql.NpgsqlConnection)_context.Database.GetDbConnection();
    if (conn.State != System.Data.ConnectionState.Open)
        await conn.OpenAsync();
    var tx = _context.Database.CurrentTransaction?.GetDbTransaction() as Npgsql.NpgsqlTransaction;

    // set_config parametrizado (anti-inyección) — NO tocar
    await using (var setCtx = new Npgsql.NpgsqlCommand("SELECT set_config('app.tenant_id', @tid, false)", conn, tx))
    {
        setCtx.Parameters.AddWithValue("tid", tenantId);
        await setCtx.ExecuteNonQueryAsync();
    }

    const string sql = @"INSERT INTO numeracion_documentos (...)
                VALUES (@tid, 'FACTURA', @serie, 1, 1, true, NOW(), NOW())
                ON CONFLICT (tenant_id, tipo_documento, serie)
                DO UPDATE SET folio_actual = numeracion_documentos.folio_actual + 1, updated_at = NOW()
                RETURNING folio_actual";

    await using var cmd = new Npgsql.NpgsqlCommand(sql, conn, tx);
    cmd.Parameters.AddWithValue("tid", tenantId);
    cmd.Parameters.AddWithValue("serie", serie);
    var folio = await cmd.ExecuteScalarAsync();
    return folio is int f ? f : 1;          // <-- BUG: cae a 1 en cualquier mismatch
}
```

- Convención: el resto del método es SQL crudo parametrizado intencional; no se modifica nada salvo la última línea.

## Commands you will need

| Propósito | Comando | Esperado |
|-----------|---------|----------|
| Build billing | `dotnet build apps/billing/HandySuites.Billing.Api/HandySuites.Billing.Api.csproj` | exit 0 |
| Tests billing | `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` | exit 0, todos pasan |

## Scope

**In scope**:
- `apps/billing/HandySuites.Billing.Api/Services/NpgsqlFolioProvider.cs` (solo la línea de `return`)
- `apps/billing/HandySuites.Billing.Tests/` (test nuevo — ver Test plan)

**Out of scope**:
- El SQL `INSERT ... ON CONFLICT`, el `set_config`, el tipo de la columna `folio_actual`.
- Cualquier otro consumidor de `GetNextFolioAsync`.

## Git workflow

- Rama: `advisor/002-folio-provider-fail-fast`
- Commit: `fix(billing): folio provider falla fuerte en vez de reiniciar a folio 1`. Sin `Co-Authored-By` ni mención de IA.

## Steps

### Step 1: Reemplazar el fallback silencioso por fail-fast

Cambia la última línea del método:

```csharp
// ANTES:
var folio = await cmd.ExecuteScalarAsync();
return folio is int f ? f : 1;

// DESPUÉS:
var folio = await cmd.ExecuteScalarAsync();
if (folio is null or System.DBNull)
    throw new InvalidOperationException(
        $"FolioProvider: numeracion_documentos.RETURNING devolvió NULL para tenant {tenantId}, serie {serie}");
return Convert.ToInt32(folio);
```

`Convert.ToInt32` maneja correctamente `int`, `long`, `short`, `decimal` (un `bigint` que exceda `int.MaxValue` lanzará `OverflowException`, que es el comportamiento deseado — preferible a folios duplicados). Nunca devuelve 1 por accidente.

**Verify**: `dotnet build apps/billing/HandySuites.Billing.Api/HandySuites.Billing.Api.csproj` → exit 0.

## Test plan

- Test nuevo en `apps/billing/HandySuites.Billing.Tests/Services/` (crear `NpgsqlFolioProviderTests.cs` o agregar a un archivo de tests de services existente). Como el provider usa `ExecuteScalarAsync` sobre la conexión EF, lo más simple es un test que valide la **conversión**: extraer la lógica de conversión no es necesario si puedes testear contra SQLite/in-memory; si el harness lo dificulta, agrega como mínimo un test que documente el contrato esperado:
  - `ExecuteScalarAsync` devuelve `int` → retorna ese int.
  - devuelve `long` (simulando bigint) → retorna el int convertido (no 1).
  - devuelve `null`/`DBNull` → lanza `InvalidOperationException` (no retorna 1).
- Si testear el provider real contra DB es inviable en unit-test, deja un comentario `// Cobertura de integración: requiere Postgres real` y cubre la conversión con un helper testeable.
- Verificación: `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` → todos pasan.

## Done criteria

ALL deben cumplirse:

- [ ] `dotnet build apps/billing/HandySuites.Billing.Api/HandySuites.Billing.Api.csproj` exit 0
- [ ] `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` exit 0
- [ ] El método ya **no** contiene `: 1;` como fallback del folio (verificar leyendo el archivo)
- [ ] No se modificó nada fuera del scope (`git status`)
- [ ] Fila de este plan actualizada en `plans/README.md`

## STOP conditions

Detente y reporta si:

- El código no coincide con el excerpt de "Current state".
- La columna `folio_actual` ya es `bigint` en una migración reciente Y `IFolioProvider.GetNextFolioAsync` devuelve `int` — en ese caso reporta el desajuste de tipo (el contrato de retorno tendría que cambiar a `long`); no fuerces un `Convert` que truncaría.
- Los tests fallan dos veces tras un intento razonable.

## Maintenance notes

- Si algún día la serie supera `int.MaxValue` (~2.1 mil millones de folios), `Convert.ToInt32` lanzará `OverflowException` — señal de que el contrato `IFolioProvider` debe migrar a `long`. Es el fallo correcto (visible) en vez de truncar.
- El reviewer debe confirmar que el cambio es **solo** la línea de retorno; el SQL y el `set_config` quedan intactos.
