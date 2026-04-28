using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class RutaSemanalAutoHandler : IAutomationHandler
{
    public string Slug => "ruta-semanal-auto";
    private const string Canal = "push";

    private static string M(string key, string lang) => AutomationMessages.Get(key, lang);

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var lang = culture.TwoLetterISOLanguageName; // "es" or "en"
        var maxParadas = context.GetParam("max_paradas", 15);

        var vendedores = await context.Db.Usuarios
            .Where(u => u.TenantId == context.TenantId && u.Activo
                && u.RolExplicito != RoleNames.SuperAdmin && u.RolExplicito != RoleNames.Admin)
            .Select(u => new { u.Id, u.Nombre })
            .ToListAsync(ct);

        if (vendedores.Count == 0)
            return new AutomationResult(true, M("result.sinVendedoresActivos", lang));

        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var tz = TimeZoneInfo.FindSystemTimeZoneById(tenantTz ?? "America/Mexico_City");
        var today = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz).Date;
        var nextMonday = today.AddDays(((int)DayOfWeek.Monday - (int)today.DayOfWeek + 7) % 7);
        if (nextMonday == today) nextMonday = nextMonday.AddDays(7);

        var rutasCreadas = 0;

        foreach (var vendedor in vendedores)
        {
            var yaExiste = await context.Db.RutasVendedor
                .AnyAsync(r => r.TenantId == context.TenantId
                             && r.UsuarioId == vendedor.Id
                             && r.Fecha.Date == nextMonday
                             && r.Estado != EstadoRuta.Cancelada, ct);

            if (yaExiste) continue;

            // Pull assigned active clients with coordinates
            var clientes = await context.Db.Clientes
                .Where(c => c.TenantId == context.TenantId
                         && c.VendedorId == vendedor.Id
                         && c.Activo
                         && !c.EsProspecto)
                .Select(c => new { c.Id, c.Latitud, c.Longitud })
                .ToListAsync(ct);

            if (clientes.Count == 0) continue;

            // Pull last completed visit per client (two queries avoids complex correlated subquery)
            var clienteIds = clientes.Select(c => c.Id).ToList();
            var ultimasVisitas = await context.Db.ClienteVisitas
                .Where(v => clienteIds.Contains(v.ClienteId) && v.FechaHoraFin != null)
                .GroupBy(v => v.ClienteId)
                .Select(g => new { ClienteId = g.Key, UltimaVisita = g.Max(v => v.FechaHoraFin) })
                .ToDictionaryAsync(x => x.ClienteId, x => x.UltimaVisita, ct);

            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);

            // Urgency = days since last completed visit (never visited = very high priority)
            var scored = clientes
                .Select(c =>
                {
                    var diasDesde = ultimasVisitas.TryGetValue(c.Id, out var ultima) && ultima.HasValue
                        ? (now - ultima.Value).TotalDays
                        : 999.0;
                    return (c.Id, c.Latitud, c.Longitud, Urgency: diasDesde);
                })
                .OrderByDescending(c => c.Urgency)
                .ToList();

            // Pre-select top candidates (2× pool for geo clustering)
            var pool = scored.Take(maxParadas * 2).ToList();
            var conCoordenadas = pool.Count(c => c.Latitud.HasValue && c.Longitud.HasValue);

            List<int> ordenados;
            bool geoOptimizado;

            if (conCoordenadas >= pool.Count / 2)
            {
                // Nearest-neighbor geographic clustering with urgency weighting
                ordenados = BuildGeoRoute(
                    pool.Select(c => (c.Id, c.Latitud, c.Longitud, c.Urgency)).ToList(),
                    maxParadas);
                geoOptimizado = true;
            }
            else
            {
                // Fallback: pure urgency order (no coordinates)
                ordenados = pool.Take(maxParadas).Select(c => c.Id).ToList();
                geoOptimizado = false;
            }

            // Create route
            var ruta = new RutaVendedor
            {
                TenantId = context.TenantId,
                UsuarioId = vendedor.Id,
                Nombre = string.Format(M("rutaSemanal.routeName", lang), nextMonday.ToString("dd/MM/yyyy")),
                Fecha = nextMonday,
                Estado = EstadoRuta.Planificada,
                Activo = true,
                CreadoEn = DateTime.UtcNow,
                CreadoPor = "AutomationEngine",
            };

            context.Db.RutasVendedor.Add(ruta);
            await context.Db.SaveChangesAsync(ct);

            var orden = 1;
            foreach (var clienteId in ordenados)
            {
                context.Db.RutasDetalle.Add(new RutaDetalle
                {
                    RutaId = ruta.Id,
                    ClienteId = clienteId,
                    OrdenVisita = orden++,
                    Estado = EstadoParada.Pendiente,
                    Activo = true,
                    CreadoEn = DateTime.UtcNow,
                    CreadoPor = "AutomationEngine",
                });
            }

            await context.Db.SaveChangesAsync(ct);
            rutasCreadas++;

            if (context.Destinatario is "vendedores" or "ambos")
            {
                await context.NotifyUserAsync(vendedor.Id,
                    M("rutaSemanal.routeName", lang),
                    string.Format(M("rutaSemanal.notification", lang), nextMonday.ToString("dd/MM/yyyy"), ordenados.Count),
                    "General", Canal, ct);
            }
        }

        if (rutasCreadas > 0 && context.Destinatario is "admin" or "ambos")
        {
            var adminId = await context.GetAdminUserIdAsync(ct);
            if (adminId.HasValue)
            {
                await context.NotifyUserAsync(adminId.Value,
                    string.Format(M("rutaSemanal.routeName", lang), nextMonday.ToString("dd/MM/yyyy")),
                    lang == "en"
                        ? $"{rutasCreadas} routes — {nextMonday:dd/MM/yyyy}"
                        : $"{rutasCreadas} rutas — {nextMonday:dd/MM/yyyy}",
                    "General", Canal, ct,
                    new Dictionary<string, string> { { "url", "/routes" } });
            }
        }

        return rutasCreadas > 0
            ? new AutomationResult(true, lang == "en"
                ? $"{rutasCreadas} weekly routes generated"
                : $"{rutasCreadas} rutas semanales generadas")
            : new AutomationResult(true, lang == "en"
                ? "No new routes to generate (already exist or no assigned clients)"
                : "Sin rutas nuevas por generar (ya existen o sin clientes asignados)");
    }

    /// <summary>
    /// Nearest-neighbor route using Haversine distance weighted by urgency.
    /// Score = distance_km / urgency_days → minimized at each step (close + overdue wins).
    /// Clients without coordinates are appended at the end by urgency.
    /// </summary>
    private static List<int> BuildGeoRoute(
        List<(int Id, double? Lat, double? Lon, double Urgency)> candidates,
        int maxParadas)
    {
        var conCoords = candidates.Where(c => c.Lat.HasValue && c.Lon.HasValue).ToList();
        var sinCoords = candidates.Where(c => !c.Lat.HasValue || !c.Lon.HasValue)
            .OrderByDescending(c => c.Urgency).ToList();

        if (conCoords.Count == 0)
            return candidates.Take(maxParadas).Select(c => c.Id).ToList();

        var result = new List<int>();
        var remaining = conCoords.ToList();

        // Start: most urgent client with coordinates
        var current = remaining.OrderByDescending(c => c.Urgency).First();
        result.Add(current.Id);
        remaining.Remove(current);

        while (result.Count < maxParadas && remaining.Count > 0)
        {
            // Pick next: minimize distance / urgency (closer and more overdue = lower score)
            var next = remaining
                .OrderBy(c => Haversine(current.Lat!.Value, current.Lon!.Value, c.Lat!.Value, c.Lon!.Value)
                               / Math.Max(c.Urgency, 1.0))
                .First();
            result.Add(next.Id);
            remaining.Remove(next);
            current = next;
        }

        // Append high-urgency clients without coordinates at end
        foreach (var c in sinCoords)
        {
            if (result.Count >= maxParadas) break;
            result.Add(c.Id);
        }

        return result;
    }

    private static double Haversine(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371.0;
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0)
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2.0 * R * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));
    }
}
