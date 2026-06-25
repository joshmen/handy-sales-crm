using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Contabilidad;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

/// <summary>
/// CRUD de Gastos Contables (insumo del CORE contable / partida doble).
///
/// NOTA: distinto del grupo `/gastos` (gasto de campo del vendedor, mobile).
/// Este modela el gasto de operacion del negocio (base + IVA acreditable +
/// proveedor para DIOT). Solo ADMIN / SUPER_ADMIN.
/// </summary>
public static class GastoContableEndpoints
{
    private static readonly string[] CategoriasValidas =
        { "Sueldos", "Comisiones", "Combustible", "Renta", "Servicios", "Otros" };

    private static decimal R(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    public static void MapGastoContableEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/gastos-contables")
            .RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"))
            .WithTags("GastosContables");

        // GET /api/gastos-contables?desde=&hasta=
        group.MapGet("/", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] ITenantTimeZoneService tz,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            // GastoContable.Fecha es date-only. Defaults anclados al calendario tenant:
            // desde = 1° del mes tenant; hasta (exclusivo) = inicio del día tenant siguiente
            // a "hoy", para incluir el día completo. Antes los defaults UtcNow + el filtro
            // `<= hasta` recortaban el día corriente cerca de medianoche en TZ no-UTC.
            var hoy = await tz.GetTenantTodayAsync();
            var defDesde = await tz.ConvertTenantDateToUtcAsync(new DateOnly(hoy.Year, hoy.Month, 1));
            var defHasta = await tz.ConvertTenantDateToUtcAsync(hoy.AddDays(1));
            var fechaDesde = desde ?? defDesde;
            var fechaHasta = hasta ?? defHasta;

            var items = await db.GastosContables
                .AsNoTracking()
                .Where(g => g.TenantId == tenantId && g.Fecha >= fechaDesde && g.Fecha < fechaHasta)
                .OrderByDescending(g => g.Fecha)
                .Select(g => new
                {
                    g.Id,
                    g.Fecha,
                    g.Categoria,
                    g.Descripcion,
                    g.Base,
                    g.Iva,
                    g.Total,
                    g.ProveedorRfc,
                    g.ProveedorNombre,
                    g.UsuarioId,
                    g.CreadoEn
                })
                .ToListAsync();

            return Results.Ok(new
            {
                items,
                total = items.Count,
                totalBase = items.Sum(i => i.Base),
                totalIva = items.Sum(i => i.Iva),
                totalGeneral = items.Sum(i => i.Total)
            });
        });

        // POST /api/gastos-contables
        group.MapPost("/", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] ICurrentTenant currentTenant,
            [FromBody] GastoContableCreateDto dto) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Descripcion))
                return Results.BadRequest(new { error = "La descripcion es obligatoria." });
            if (!CategoriasValidas.Contains(dto.Categoria))
                return Results.BadRequest(new { error = $"Categoria invalida. Validas: {string.Join(", ", CategoriasValidas)}." });
            if (dto.Base < 0 || dto.Iva < 0)
                return Results.BadRequest(new { error = "Base e IVA no pueden ser negativos." });

            int.TryParse(currentTenant.UserId, out var usuarioId);

            var gasto = new GastoContable
            {
                TenantId = tenantId,
                Fecha = dto.Fecha == default ? DateTime.UtcNow : dto.Fecha,
                Categoria = dto.Categoria,
                Descripcion = dto.Descripcion.Trim(),
                Base = R(dto.Base),
                Iva = R(dto.Iva),
                Total = R(dto.Base + dto.Iva),
                ProveedorRfc = string.IsNullOrWhiteSpace(dto.ProveedorRfc) ? null : dto.ProveedorRfc.Trim().ToUpperInvariant(),
                ProveedorNombre = string.IsNullOrWhiteSpace(dto.ProveedorNombre) ? null : dto.ProveedorNombre.Trim(),
                UsuarioId = usuarioId
            };

            db.GastosContables.Add(gasto);
            await db.SaveChangesAsync();

            return Results.Created($"/api/gastos-contables/{gasto.Id}", new
            {
                gasto.Id,
                gasto.Fecha,
                gasto.Categoria,
                gasto.Descripcion,
                gasto.Base,
                gasto.Iva,
                gasto.Total,
                gasto.ProveedorRfc,
                gasto.ProveedorNombre,
                gasto.UsuarioId
            });
        });

        // PATCH /api/gastos-contables/{id}
        group.MapPatch("/{id:int}", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            int id,
            [FromBody] GastoContableUpdateDto dto) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Descripcion))
                return Results.BadRequest(new { error = "La descripcion es obligatoria." });
            if (!CategoriasValidas.Contains(dto.Categoria))
                return Results.BadRequest(new { error = $"Categoria invalida. Validas: {string.Join(", ", CategoriasValidas)}." });
            if (dto.Base < 0 || dto.Iva < 0)
                return Results.BadRequest(new { error = "Base e IVA no pueden ser negativos." });

            var gasto = await db.GastosContables
                .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == tenantId);
            if (gasto == null) return Results.NotFound(new { error = "Gasto contable no encontrado." });

            gasto.Fecha = dto.Fecha == default ? gasto.Fecha : dto.Fecha;
            gasto.Categoria = dto.Categoria;
            gasto.Descripcion = dto.Descripcion.Trim();
            gasto.Base = R(dto.Base);
            gasto.Iva = R(dto.Iva);
            gasto.Total = R(dto.Base + dto.Iva);
            gasto.ProveedorRfc = string.IsNullOrWhiteSpace(dto.ProveedorRfc) ? null : dto.ProveedorRfc.Trim().ToUpperInvariant();
            gasto.ProveedorNombre = string.IsNullOrWhiteSpace(dto.ProveedorNombre) ? null : dto.ProveedorNombre.Trim();

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                gasto.Id,
                gasto.Fecha,
                gasto.Categoria,
                gasto.Descripcion,
                gasto.Base,
                gasto.Iva,
                gasto.Total,
                gasto.ProveedorRfc,
                gasto.ProveedorNombre,
                gasto.UsuarioId
            });
        });

        // DELETE /api/gastos-contables/{id} — soft delete (SaveChanges override convierte .Remove())
        group.MapDelete("/{id:int}", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            int id) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var gasto = await db.GastosContables
                .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == tenantId);
            if (gasto == null) return Results.NotFound(new { error = "Gasto contable no encontrado." });

            db.GastosContables.Remove(gasto); // soft delete via SaveChangesAsync override
            await db.SaveChangesAsync();

            return Results.NoContent();
        });
    }
}
