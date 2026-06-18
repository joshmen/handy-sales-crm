using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Endpoints;

/// <summary>
/// Super admin movil: dashboard de SALUD DE PLATAFORMA (agregado, READ-ONLY).
///
/// Decision de producto (Opcion A, jun 2026): el super admin movil NO impersona
/// tenants (sin token-swap, sin PII de clientes finales, sin wipe/re-sync de WDB).
/// El drill-down por empresa (impersonation con auditoria) vive SOLO en la web.
/// Aqui solo exponemos numeros agregados de toda la plataforma para un vistazo
/// rapido en transito. Requiere rol SUPER_ADMIN.
/// </summary>
public static class MobileAdminEndpoints
{
    // Una sola TZ de plataforma para anclar "hoy"/"mes" en el agregado. Los
    // tenants pueden tener TZ distintas, pero un dashboard de salud global usa
    // una sola ancla (la TZ del negocio, Mexico) — defendible y predecible.
    private const string PlatformTz = "America/Mexico_City";

    public static void MapMobileAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/admin")
            .RequireAuthorization()
            .WithTags("Admin (Super Admin)")
            .WithOpenApi();

        // GET /api/mobile/admin/overview  -> salud de plataforma (agregado)
        group.MapGet("/overview", async (
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsSuperAdmin) return Results.Forbid();

            // Ventanas UTC del dia/mes local de la plataforma (TZ-aware).
            DateTime hoyStartUtc, hoyEndUtc, mesStartUtc, mesEndUtc;
            try
            {
                var tzInfo = TimeZoneInfo.FindSystemTimeZoneById(PlatformTz);
                var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tzInfo);
                var localDayStart = DateTime.SpecifyKind(localNow.Date, DateTimeKind.Unspecified);
                var localMonthStart = DateTime.SpecifyKind(new DateTime(localNow.Year, localNow.Month, 1), DateTimeKind.Unspecified);
                hoyStartUtc = TimeZoneInfo.ConvertTimeToUtc(localDayStart, tzInfo);
                hoyEndUtc = TimeZoneInfo.ConvertTimeToUtc(localDayStart.AddDays(1), tzInfo);
                mesStartUtc = TimeZoneInfo.ConvertTimeToUtc(localMonthStart, tzInfo);
                mesEndUtc = TimeZoneInfo.ConvertTimeToUtc(localMonthStart.AddMonths(1), tzInfo);
            }
            catch
            {
                var today = DateTime.UtcNow.Date;
                hoyStartUtc = today;
                hoyEndUtc = today.AddDays(1);
                mesStartUtc = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                mesEndUtc = mesStartUtc.AddMonths(1);
            }

            // Lista de empresas (metadata de plataforma; SIN PII de clientes finales).
            // IgnoreQueryFilters: el super admin cruza todos los tenants.
            var tenants = await db.Tenants.AsNoTracking().IgnoreQueryFilters()
                .Where(t => t.EliminadoEn == null)
                .OrderBy(t => t.NombreEmpresa)
                .Select(t => new
                {
                    id = t.Id,
                    nombre = t.NombreEmpresa,
                    plan = t.PlanTipo,
                    activo = t.Activo,
                    usuarios = db.Usuarios.IgnoreQueryFilters()
                        .Count(u => u.TenantId == t.Id && u.EliminadoEn == null && u.Activo),
                })
                .ToListAsync();

            // Pedidos de hoy por tenant (una sola query con group-by).
            var pedidosHoyPorTenant = await db.Pedidos.AsNoTracking().IgnoreQueryFilters()
                .Where(p => p.EliminadoEn == null && p.Activo
                         && p.FechaPedido >= hoyStartUtc && p.FechaPedido < hoyEndUtc)
                .GroupBy(p => p.TenantId)
                .Select(g => new { TenantId = g.Key, Count = g.Count() })
                .ToListAsync();
            var pedidosHoyMap = pedidosHoyPorTenant.ToDictionary(x => x.TenantId, x => x.Count);

            var ventasHoy = await db.Pedidos.AsNoTracking().IgnoreQueryFilters()
                .Where(p => p.EliminadoEn == null && p.Activo
                         && p.FechaPedido >= hoyStartUtc && p.FechaPedido < hoyEndUtc)
                .SumAsync(p => (decimal?)p.Total) ?? 0;

            var ventasMes = await db.Pedidos.AsNoTracking().IgnoreQueryFilters()
                .Where(p => p.EliminadoEn == null && p.Activo
                         && p.FechaPedido >= mesStartUtc && p.FechaPedido < mesEndUtc)
                .SumAsync(p => (decimal?)p.Total) ?? 0;

            var tenantsTotal = tenants.Count;
            var tenantsActivos = tenants.Count(t => t.activo);

            var tenantsData = tenants.Select(t => new
            {
                t.id,
                t.nombre,
                t.plan,
                t.activo,
                t.usuarios,
                pedidosHoy = pedidosHoyMap.TryGetValue(t.id, out var c) ? c : 0,
            });

            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    tenantsActivos,
                    tenantsInactivos = tenantsTotal - tenantsActivos,
                    tenantsTotal,
                    pedidosHoy = pedidosHoyPorTenant.Sum(x => x.Count),
                    ventasHoy,
                    ventasMes,
                    tenants = tenantsData,
                }
            });
        })
        .WithSummary("Salud de plataforma (agregado) para el super admin movil");
    }
}
