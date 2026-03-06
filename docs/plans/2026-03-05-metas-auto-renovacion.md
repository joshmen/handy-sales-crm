# Metas Auto-Renovacion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an autoRenovar boolean to MetaVendedor so the AutomationEngine automatically creates a new meta when the current one expires, indefinitely until the admin deactivates it.

**Architecture:** New auto_renovar column on MetaVendedor entity, propagated through DTOs/repo/service/endpoint/frontend. New MetaAutoRenovacionHandler registered in the AutomationEngine that runs daily via cron, queries expired active metas with autoRenovar=true, creates successor metas, and deactivates the old ones.

**Tech Stack:** .NET 8, EF Core (MySQL/Pomelo), Next.js 15 + React 19 + TypeScript, Playwright E2E

---

## Task 1: Add AutoRenovar field to Domain Entity + EF Migration

**Files:**
- Modify: `libs/HandySales.Domain/Entities/MetaVendedor.cs`
- Generate: `libs/HandySales.Infrastructure/Migrations/YYYYMMDD_AddAutoRenovarMetaVendedor.cs`

**Step 1: Add the field to the entity**

In MetaVendedor.cs, add after the FechaFin property (line 36):

```csharp
[Column("auto_renovar")]
public bool AutoRenovar { get; set; }
```

**Step 2: Generate EF Core migration**

```bash
export PATH="$PATH:/c/Users/AW AREA 51M R2/.dotnet/tools"
dotnet-ef migrations add AddAutoRenovarMetaVendedor \
  --project libs/HandySales.Infrastructure \
  --startup-project apps/api/src/HandySales.Api \
  --output-dir Migrations
```

**Step 3: Rebuild API container to verify migration applies**

```bash
docker-compose -f docker-compose.dev.yml up -d --build api_main
# Wait ~30s, then:
curl -s http://localhost:1050/health
```
Expected: Healthy

**Step 4: Commit**

```bash
git add libs/HandySales.Domain/Entities/MetaVendedor.cs libs/HandySales.Infrastructure/Migrations/
git commit -m "feat(metas): add auto_renovar column to MetaVendedor entity"
```

---

## Task 2: Update DTOs to include AutoRenovar

**Files:**
- Modify: `libs/HandySales.Application/Metas/DTOs/MetaVendedorDto.cs`

**Step 1: Add AutoRenovar to all three DTOs**

In MetaVendedorDto (read DTO), add after CreadoEn (line 15):
```csharp
public bool AutoRenovar { get; set; }
```

In CreateMetaVendedorDto record, replace with:
```csharp
public record CreateMetaVendedorDto(
    int UsuarioId, string Tipo, string Periodo,
    decimal Monto, DateTime FechaInicio, DateTime FechaFin,
    bool AutoRenovar = false
);
```

In UpdateMetaVendedorDto record, replace with:
```csharp
public record UpdateMetaVendedorDto(
    string Tipo, string Periodo, decimal Monto,
    DateTime FechaInicio, DateTime FechaFin, bool Activo,
    bool AutoRenovar = false
);
```

**Step 2: Commit**

```bash
git add libs/HandySales.Application/Metas/DTOs/MetaVendedorDto.cs
git commit -m "feat(metas): add AutoRenovar to MetaVendedor DTOs"
```

---

## Task 3: Update Repository to read/write AutoRenovar

**Files:**
- Modify: `libs/HandySales.Infrastructure/Repositories/Metas/MetaVendedorRepository.cs`

**Step 1:** Add `AutoRenovar = m.AutoRenovar,` to ALL Select projections in GetAllAsync, GetByIdAsync, GetActivasParaPeriodoAsync (after CreadoEn line in each).

**Step 2:** In CreateAsync, add `AutoRenovar = dto.AutoRenovar,` to the new MetaVendedor initializer.

**Step 3:** In UpdateAsync, add `meta.AutoRenovar = dto.AutoRenovar;` after meta.Activo line.

**Step 4: Commit**

```bash
git add libs/HandySales.Infrastructure/Repositories/Metas/MetaVendedorRepository.cs
git commit -m "feat(metas): repository support for AutoRenovar field"
```

---

## Task 4: Create MetaAutoRenovacionHandler

**Files:**
- Create: `apps/api/src/HandySales.Api/Automations/Handlers/MetaAutoRenovacionHandler.cs`

**Step 1: Write the handler**

Handler pattern matches MetaNoCumplidaHandler. Key logic:
- Slug: "meta-auto-renovacion"
- Query: context.Db.Set<MetaVendedor>() where TenantId match, Activo, AutoRenovar, FechaFin <= today
- For each expired meta:
  - nuevaInicio = meta.FechaFin.AddDays(1)
  - nuevaFin = semanal ? +7 days : +1 month
  - Create new MetaVendedor with same values, AutoRenovar=true, CreadoPor="sistema-auto-renovacion"
  - Deactivate old: meta.Activo=false
- SaveChangesAsync
- Notify admin via context.NotifyUserAsync

```csharp
using HandySales.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

public class MetaAutoRenovacionHandler : IAutomationHandler
{
    public string Slug => "meta-auto-renovacion";

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;

        var expiradas = await context.Db.Set<MetaVendedor>()
            .Where(m => m.TenantId == context.TenantId
                     && m.Activo
                     && m.AutoRenovar
                     && m.FechaFin <= today)
            .ToListAsync(ct);

        if (expiradas.Count == 0)
            return new AutomationResult(true, "Sin metas para auto-renovar");

        var renovadas = 0;

        foreach (var meta in expiradas)
        {
            var nuevaInicio = meta.FechaFin.AddDays(1);
            var nuevaFin = meta.Periodo == "semanal"
                ? nuevaInicio.AddDays(7)
                : nuevaInicio.AddMonths(1);

            var nueva = new MetaVendedor
            {
                TenantId = meta.TenantId,
                UsuarioId = meta.UsuarioId,
                Tipo = meta.Tipo,
                Periodo = meta.Periodo,
                Monto = meta.Monto,
                FechaInicio = nuevaInicio,
                FechaFin = nuevaFin,
                AutoRenovar = true,
                Activo = true,
                CreadoEn = DateTime.UtcNow,
                CreadoPor = "sistema-auto-renovacion",
            };
            context.Db.Set<MetaVendedor>().Add(nueva);

            meta.Activo = false;
            meta.ActualizadoEn = DateTime.UtcNow;
            meta.ActualizadoPor = "sistema-auto-renovacion";

            renovadas++;
        }

        await context.Db.SaveChangesAsync(ct);

        var adminId = await context.GetAdminUserIdAsync(ct);
        if (adminId.HasValue)
        {
            await context.NotifyUserAsync(adminId.Value,
                "Metas auto-renovadas",
                $"Se renovaron {renovadas} meta{(renovadas != 1 ? "s" : "")} automaticamente.",
                "Info", "push", ct);
        }

        return new AutomationResult(true,
            $"{renovadas} meta{(renovadas != 1 ? "s" : "")} renovada{(renovadas != 1 ? "s" : "")}");
    }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/HandySales.Api/Automations/Handlers/MetaAutoRenovacionHandler.cs
git commit -m "feat(metas): add MetaAutoRenovacionHandler for automatic goal renewal"
```

---

## Task 5: Register handler + add automation template seed

**Files:**
- Modify: `apps/api/src/HandySales.Api/Configuration/ServiceRegistrationExtensions.cs`
- Modify: `infra/database/schema/08_automations_seed.sql`

**Step 1:** In ServiceRegistrationExtensions.cs, add after MetaNoCumplidaHandler (line 328):

```csharp
services.AddScoped<IAutomationHandler, MetaAutoRenovacionHandler>();
```

**Step 2:** In 08_automations_seed.sql, change final `;` on line 82 to `,` and add:

```sql
('meta-auto-renovacion', 'Auto-renovacion de metas',
 'Revisa diariamente las metas vencidas con auto-renovacion activada y crea automaticamente una nueva meta con las mismas condiciones para el siguiente periodo.',
 'Renueva metas automaticamente al vencer',
 'ArrowsClockwise', 3, 1, NULL, '0 1 * * *', 0,
 '{"destinatario": "admin"}',
 1, 11, UTC_TIMESTAMP());
```

Note: trigger_type=3 (cron), trigger_cron='0 1 * * *' (daily 1AM), tier=1 (PREMIUM).

**Step 3:** Rebuild API: `docker-compose -f docker-compose.dev.yml up -d --build api_main`

**Step 4: Commit**

```bash
git add apps/api/src/HandySales.Api/Configuration/ServiceRegistrationExtensions.cs infra/database/schema/08_automations_seed.sql
git commit -m "feat(metas): register MetaAutoRenovacionHandler + automation template seed"
```

---

## Task 6: Update Frontend API service

**Files:**
- Modify: `apps/web/src/services/api/metas.ts`

**Step 1:** Add `autoRenovar: boolean` to MetaVendedor interface (after creadoEn).
Add `autoRenovar?: boolean` to CreateMetaVendedorRequest and UpdateMetaVendedorRequest.

**Step 2: Commit**

```bash
git add apps/web/src/services/api/metas.ts
git commit -m "feat(metas): add autoRenovar to frontend API types"
```

---

## Task 7: Update Frontend Metas Page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/metas/page.tsx`

**Step 1:** Add `autoRenovar: z.boolean().default(false)` to Zod schema (before .refine).

**Step 2:** Add `autoRenovar: false` to useForm defaultValues, openCreate reset, and `autoRenovar: meta.autoRenovar ?? false` to openEdit reset.

**Step 3:** Add `autoRenovar: data.autoRenovar` to both Create and Update request objects in onSubmit.

**Step 4:** Add checkbox to drawer (data-tour="metas-drawer-autorenovar") after fechas grid, before buttons:

```tsx
<div data-tour="metas-drawer-autorenovar" className="flex items-start gap-3 py-1">
  <input type="checkbox" id="autoRenovar" {...register('autoRenovar')}
    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
  <label htmlFor="autoRenovar" className="text-sm">
    <span className="font-medium text-gray-700">Auto-renovar</span>
    <p className="text-xs text-gray-500 mt-0.5">
      Al vencer, se crea automaticamente una nueva meta con los mismos valores para el siguiente periodo.
    </p>
  </label>
</div>
```

**Step 5:** Add RefreshCw icon in desktop table Vigencia cell:

```tsx
<td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
  <div className="flex items-center gap-1.5">
    <span>{fmtDate(meta.fechaInicio)} - {fmtDate(meta.fechaFin)}</span>
    {meta.autoRenovar && (
      <RefreshCw className="w-3 h-3 text-blue-500" title="Auto-renovacion activa" />
    )}
  </div>
</td>
```

**Step 6:** Add same RefreshCw indicator in mobile cards Vigencia section.

**Step 7:** Verify locally at http://localhost:1083/metas.

**Step 8: Commit**

```bash
git add apps/web/src/app/(dashboard)/metas/page.tsx
git commit -m "feat(metas): auto-renovar checkbox in drawer + RefreshCw indicator"
```

---

## Task 8: Update E2E tests

**Files:**
- Modify: `apps/web/e2e/metas.spec.ts`

**Step 1:** In drawer open test, add assertion for `[data-tour="metas-drawer-autorenovar"]`.
**Step 2:** In create test, check the autoRenovar checkbox before submit.
**Step 3:** Run: `cd apps/web && npx playwright test metas.spec.ts` (expect 22/22 pass)

**Step 4: Commit**

```bash
git add apps/web/e2e/metas.spec.ts
git commit -m "test(metas): update E2E tests for auto-renovar checkbox"
```

---

## Task 9: Full verification

**Step 1:** `dotnet test` (300+ pass)
**Step 2:** `cd apps/web && npx playwright test` (no regressions)
**Step 3:** `curl -s http://localhost:1050/health` (Healthy)

---

## Files Summary

| File | Action |
|------|--------|
| libs/HandySales.Domain/Entities/MetaVendedor.cs | Add AutoRenovar property |
| libs/HandySales.Infrastructure/Migrations/* | EF migration for auto_renovar column |
| libs/HandySales.Application/Metas/DTOs/MetaVendedorDto.cs | Add AutoRenovar to all 3 DTOs |
| libs/HandySales.Infrastructure/Repositories/Metas/MetaVendedorRepository.cs | AutoRenovar in projections + create/update |
| apps/api/src/HandySales.Api/Automations/Handlers/MetaAutoRenovacionHandler.cs | NEW automation handler |
| apps/api/src/HandySales.Api/Configuration/ServiceRegistrationExtensions.cs | Register handler |
| infra/database/schema/08_automations_seed.sql | Add template seed |
| apps/web/src/services/api/metas.ts | Add autoRenovar to TS interfaces |
| apps/web/src/app/(dashboard)/metas/page.tsx | Checkbox in drawer + RefreshCw indicator |
| apps/web/e2e/metas.spec.ts | Update tests for auto-renovar |