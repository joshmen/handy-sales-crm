using System.Security.Claims;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileMetasEndpoints
{
    public static void MapMobileMetasEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/metas")
            .RequireAuthorization()
            .WithTags("Metas");

        // GET /api/mobile/metas — active goals for current user
        group.MapGet("/", async (
            HandySuitesDbContext db,
            HttpContext context) =>
        {
            var userIdStr = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? context.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();
            var tenantIdStr = context.User.FindFirst("tenant_id")?.Value;
            var tenantId = int.TryParse(tenantIdStr, out var tid) ? tid : 0;
            var now = DateTime.UtcNow;

            var metas = await db.MetasVendedor
                .AsNoTracking()
                .Where(m => m.TenantId == tenantId
                    && m.UsuarioId == userId
                    && m.FechaInicio <= now
                    && m.FechaFin >= now
                    && m.Activo)
                .OrderBy(m => m.Tipo)
                .Select(m => new
                {
                    m.Id,
                    m.Tipo,
                    m.Periodo,
                    m.Monto,
                    m.FechaInicio,
                    m.FechaFin,
                })
                .ToListAsync();

            // Calculate progress for each meta
            var results = new List<object>();
            foreach (var meta in metas)
            {
                decimal progreso = 0;
                if (meta.Tipo == "ventas")
                {
                    progreso = await db.Pedidos
                        .Where(p => p.TenantId == tenantId && p.UsuarioId == userId
                            && p.FechaPedido >= meta.FechaInicio && p.FechaPedido <= meta.FechaFin
                            && p.Estado >= EstadoPedido.Enviado && p.Estado != EstadoPedido.Cancelado)
                        .SumAsync(p => p.Total);
                }
                else if (meta.Tipo == "pedidos")
                {
                    progreso = await db.Pedidos
                        .Where(p => p.TenantId == tenantId && p.UsuarioId == userId
                            && p.FechaPedido >= meta.FechaInicio && p.FechaPedido <= meta.FechaFin
                            && p.Estado >= EstadoPedido.Enviado && p.Estado != EstadoPedido.Cancelado)
                        .CountAsync();
                }
                else if (meta.Tipo == "visitas")
                {
                    progreso = await db.ClienteVisitas
                        .Where(v => v.TenantId == tenantId && v.UsuarioId == userId
                            && v.CreadoEn >= meta.FechaInicio && v.CreadoEn <= meta.FechaFin)
                        .CountAsync();
                }

                var porcentaje = meta.Monto > 0 ? Math.Min(100, Math.Round((progreso / meta.Monto) * 100, 1)) : 0;
                var diasRestantes = Math.Max(0, (meta.FechaFin - now).Days);

                results.Add(new
                {
                    meta.Id,
                    meta.Tipo,
                    meta.Periodo,
                    Meta = meta.Monto,
                    Progreso = progreso,
                    Porcentaje = porcentaje,
                    DiasRestantes = diasRestantes,
                    meta.FechaInicio,
                    meta.FechaFin,
                });
            }

            return Results.Ok(new { data = results });
        })
        .WithSummary("Obtener metas activas del vendedor con progreso");
    }
}
