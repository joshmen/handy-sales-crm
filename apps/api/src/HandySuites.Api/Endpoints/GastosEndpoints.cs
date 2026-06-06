using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

/// <summary>
/// Endpoints admin de Gastos del vendedor. Solo lista + invalidate para v1.0.3.
/// La creacion de gastos es exclusiva del mobile (vendedor); admin solo audita.
/// </summary>
public static class GastosEndpoints
{
    public static void MapGastosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/gastos")
            .RequireAuthorization()
            .WithTags("Gastos");

        // GET /gastos — lista paginada con filtros
        group.MapGet("/", async (
            HandySuitesDbContext db,
            [FromQuery] int pagina = 1,
            [FromQuery] int tamanoPagina = 25,
            [FromQuery] int? usuarioId = null,
            [FromQuery] int? rutaId = null,
            [FromQuery] int? tipoGasto = null,
            [FromQuery] DateTime? fechaDesde = null,
            [FromQuery] DateTime? fechaHasta = null,
            [FromQuery] bool soloActivos = true) =>
        {
            var query = db.Gastos.AsNoTracking().AsQueryable();
            if (usuarioId.HasValue) query = query.Where(g => g.UsuarioId == usuarioId.Value);
            if (rutaId.HasValue) query = query.Where(g => g.RutaId == rutaId.Value);
            if (tipoGasto.HasValue) query = query.Where(g => (int)g.TipoGasto == tipoGasto.Value);
            if (fechaDesde.HasValue) query = query.Where(g => g.FechaGasto >= fechaDesde.Value);
            if (fechaHasta.HasValue) query = query.Where(g => g.FechaGasto < fechaHasta.Value.AddDays(1));
            if (soloActivos) query = query.Where(g => g.Estado == EstadoGasto.Activo);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(g => g.FechaGasto)
                .Skip((pagina - 1) * tamanoPagina)
                .Take(tamanoPagina)
                .Select(g => new
                {
                    g.Id,
                    g.UsuarioId,
                    UsuarioNombre = g.Usuario.Nombre,
                    g.RutaId,
                    RutaCodigo = g.Ruta != null ? g.Ruta.Codigo : null,
                    g.FechaGasto,
                    g.Monto,
                    TipoGasto = (int)g.TipoGasto,
                    g.Concepto,
                    g.Notas,
                    g.ComprobanteUrl,
                    g.Moneda,
                    Estado = (int)g.Estado,
                    g.InvalidadoPor,
                    g.InvalidadoEn,
                    g.MotivoInvalidacion,
                    g.CreadoEn,
                })
                .ToListAsync();

            // KPI totals (filtered scope)
            var totalActivos = await query.Where(g => g.Estado == EstadoGasto.Activo).SumAsync(g => (double?)g.Monto) ?? 0;
            var totalInvalidados = await query.IgnoreQueryFilters()
                .Where(g => g.Estado == EstadoGasto.Invalidado).SumAsync(g => (double?)g.Monto) ?? 0;

            return Results.Ok(new
            {
                items,
                totalCount = total,
                pagina,
                tamanoPagina,
                kpi = new
                {
                    totalActivos,
                    totalInvalidados,
                    countActivos = items.Count(i => i.Estado == 0),
                    countInvalidados = items.Count(i => i.Estado == 1),
                }
            });
        })
        .WithName("ListGastos")
        .WithOpenApi();

        // POST /gastos/{id}/invalidar — supervisor marca gasto como invalido.
        //
        // Sprint pre-prod #12.5 (security review 2026-06-06): role check agregado.
        // Antes cualquier VENDEDOR del tenant podia invalidar CUALQUIER gasto del
        // mismo tenant. El comentario decia "supervisor marca" pero no enforcement.
        group.MapPost("/{id:int}/invalidar", async (
            HandySuitesDbContext db,
            int id,
            [FromBody] InvalidarGastoRequest req,
            HttpContext httpContext,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            if (!currentTenant.IsStrictAdmin && !currentTenant.IsSupervisor)
                return Results.Forbid();

            var userId = currentTenant.UserId;
            var gasto = await db.Gastos.FirstOrDefaultAsync(g => g.Id == id);
            if (gasto == null) return Results.NotFound(new { error = "Gasto no encontrado" });
            if (gasto.Estado == EstadoGasto.Invalidado)
                return Results.BadRequest(new { error = "El gasto ya esta invalidado" });

            gasto.Estado = EstadoGasto.Invalidado;
            gasto.InvalidadoPor = userId;
            gasto.InvalidadoEn = DateTime.UtcNow;
            gasto.MotivoInvalidacion = req.Motivo;
            gasto.ActualizadoEn = DateTime.UtcNow;
            gasto.ActualizadoPor = userId;
            gasto.Version++;
            await db.SaveChangesAsync();

            return Results.Ok(new { gasto.Id, Estado = (int)gasto.Estado });
        })
        .WithName("InvalidarGasto")
        .WithOpenApi();
    }
}

public record InvalidarGastoRequest(string? Motivo);
