using System.Security.Claims;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
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
            HttpContext context,
            [FromServices] ITenantTimeZoneService tz) =>
        {
            var userIdStr = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? context.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();
            var tenantIdStr = context.User.FindFirst("tenant_id")?.Value;
            var tenantId = int.TryParse(tenantIdStr, out var tid) ? tid : 0;
            // FechaInicio/FechaFin son date-only (medianoche UTC). Comparar contra
            // UtcNow excluía una meta vigente HOY al cruzar medianoche UTC en vez del
            // fin de día del tenant. Usamos medianoche UTC del día tenant "hoy".
            var hoyMid = await tz.GetTenantTodayMidnightUtcAsync();

            var metas = await db.MetasVendedor
                .AsNoTracking()
                .Where(m => m.TenantId == tenantId
                    && m.UsuarioId == userId
                    && m.FechaInicio <= hoyMid
                    && m.FechaFin >= hoyMid
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
                // FechaFin es date-only (medianoche UTC). Para incluir el día COMPLETO
                // de FechaFin al comparar timestamps reales (FechaPedido/CreadoEn) se usa
                // < FechaFin.AddDays(1) en vez de <= FechaFin.
                var finExclusivo = meta.FechaFin.AddDays(1);
                if (meta.Tipo == "ventas")
                {
                    progreso = await db.Pedidos
                        .Where(p => p.TenantId == tenantId && p.UsuarioId == userId
                            && p.FechaPedido >= meta.FechaInicio && p.FechaPedido < finExclusivo
                            && p.Estado >= EstadoPedido.Enviado && p.Estado != EstadoPedido.Cancelado)
                        .SumAsync(p => p.Total);
                }
                else if (meta.Tipo == "pedidos")
                {
                    progreso = await db.Pedidos
                        .Where(p => p.TenantId == tenantId && p.UsuarioId == userId
                            && p.FechaPedido >= meta.FechaInicio && p.FechaPedido < finExclusivo
                            && p.Estado >= EstadoPedido.Enviado && p.Estado != EstadoPedido.Cancelado)
                        .CountAsync();
                }
                else if (meta.Tipo == "visitas")
                {
                    progreso = await db.ClienteVisitas
                        .Where(v => v.TenantId == tenantId && v.UsuarioId == userId
                            && v.CreadoEn >= meta.FechaInicio && v.CreadoEn < finExclusivo)
                        .CountAsync();
                }

                var porcentaje = meta.Monto > 0 ? Math.Min(100, Math.Round((progreso / meta.Monto) * 100, 1)) : 0;
                var diasRestantes = Math.Max(0, (meta.FechaFin - hoyMid).Days);

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
