using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

/// <summary>
/// Fase A del feature "tracking vendedores" — expone la actividad GPS que YA
/// se captura hoy (visitas a cliente, paradas de ruta, pedidos con dirección
/// de entrega geo-localizada). Sin nuevas tablas, sin tracking continuo.
///
/// Pensado como quick win mientras la Fase B (UbicacionVendedor + ping
/// automático cada 15min) entra. Solo accesible para ADMIN/SUPERVISOR.
/// </summary>
public static class TeamLocationEndpoints
{
    public static void MapTeamLocationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/team")
            .RequireAuthorization()
            .WithTags("TeamLocation");

        group.MapGet("/ubicaciones-recientes", GetUltimasUbicaciones)
            .WithName("GetUltimasUbicacionesEquipo")
            .WithSummary("Última ubicación GPS conocida de cada vendedor del tenant");

        group.MapGet("/usuarios/{id:int}/actividad-gps", GetActividadGpsDelDia)
            .WithName("GetActividadGpsDelDia")
            .WithSummary("Lista cronológica de eventos con GPS del vendedor en una fecha");
    }

    private static async Task<IResult> GetUltimasUbicaciones(
        [FromServices] HandySuitesDbContext db,
        [FromServices] ICurrentTenant currentUser)
    {
        var role = currentUser.Role;
        if (role != RoleNames.Admin && role != RoleNames.Supervisor && role != RoleNames.SuperAdmin)
            return Results.Forbid();

        var tenantId = currentUser.TenantId;

        // Combinamos 3 fuentes de GPS existentes y nos quedamos con el evento más
        // reciente por usuario:
        //   - ClienteVisitas: latitud_inicio/longitud_inicio (check-in del vendedor)
        //   - RutasDetalle: latitud/longitud (cuando se llegó a parada)
        //   - Pedidos: latitud/longitud (cuando se creó el pedido en sitio)
        // No hay tracking continuo todavía (eso es Fase B). Si un vendedor no
        // disparó ninguno de estos eventos hoy, el resultado tiene
        // ultima_actividad = null y la UI muestra "—".

        var visitas = db.ClienteVisitas.AsNoTracking()
            .Where(v => v.TenantId == tenantId
                        && v.Activo
                        && v.LatitudInicio != null
                        && v.LongitudInicio != null)
            .Select(v => new RawActivity(
                v.UsuarioId, v.LatitudInicio!.Value, v.LongitudInicio!.Value,
                v.FechaHoraInicio ?? v.CreadoEn, "visita", v.ClienteId, v.Id));

        var paradas = (
            from d in db.Set<RutaDetalle>().AsNoTracking()
            join r in db.Set<RutaVendedor>().AsNoTracking() on d.RutaId equals r.Id
            where r.TenantId == tenantId && r.UsuarioId != null
                  && d.Latitud != null && d.Longitud != null && d.HoraLlegadaReal != null
            select new RawActivity(
                r.UsuarioId!.Value, d.Latitud!.Value, d.Longitud!.Value,
                d.HoraLlegadaReal!.Value, "parada", d.ClienteId, d.Id));

        var pedidos = db.Pedidos.AsNoTracking()
            .Where(p => p.TenantId == tenantId
                        && p.Activo
                        && p.Latitud != null
                        && p.Longitud != null)
            .Select(p => new RawActivity(
                p.UsuarioId, p.Latitud!.Value, p.Longitud!.Value,
                p.CreadoEn, "pedido", p.ClienteId, p.Id));

        var union = visitas.Concat(paradas).Concat(pedidos);

        var data = await union
            .GroupBy(x => x.UsuarioId)
            .Select(g => g.OrderByDescending(x => x.Cuando).First())
            .ToListAsync();

        var usuarioIds = data.Select(d => d.UsuarioId).ToList();
        var usuarios = await db.Usuarios.AsNoTracking()
            .Where(u => usuarioIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Nombre, u.Email })
            .ToDictionaryAsync(u => u.Id);

        var clienteIds = data.Where(d => d.ClienteId.HasValue).Select(d => d.ClienteId!.Value).Distinct().ToList();
        var clientes = await db.Clientes.AsNoTracking()
            .Where(c => clienteIds.Contains(c.Id))
            .Select(c => new { c.Id, c.Nombre })
            .ToDictionaryAsync(c => c.Id);

        var result = data.Select(d => new
        {
            usuarioId = d.UsuarioId,
            nombre = usuarios.TryGetValue(d.UsuarioId, out var u) ? u.Nombre : "(desconocido)",
            email = usuarios.TryGetValue(d.UsuarioId, out var u2) ? u2.Email : null,
            ultimaActividad = d.Cuando,
            ultimaLat = d.Lat,
            ultimaLng = d.Lng,
            fuente = d.Fuente,
            clienteId = d.ClienteId,
            clienteNombre = d.ClienteId.HasValue && clientes.TryGetValue(d.ClienteId.Value, out var c) ? c.Nombre : null,
        }).OrderByDescending(x => x.ultimaActividad);

        return Results.Ok(result);
    }

    private static async Task<IResult> GetActividadGpsDelDia(
        int id,
        [FromQuery] DateTime? dia,
        [FromServices] HandySuitesDbContext db,
        [FromServices] ICurrentTenant currentUser)
    {
        var role = currentUser.Role;
        if (role != RoleNames.Admin && role != RoleNames.Supervisor && role != RoleNames.SuperAdmin)
            return Results.Forbid();

        var tenantId = currentUser.TenantId;
        var fecha = (dia ?? DateTime.UtcNow).Date;
        var inicio = fecha;
        var fin = fecha.AddDays(1);

        var visitas = await db.ClienteVisitas.AsNoTracking()
            .Where(v => v.TenantId == tenantId
                        && v.UsuarioId == id
                        && v.Activo
                        && v.LatitudInicio != null
                        && v.LongitudInicio != null
                        && v.FechaHoraInicio >= inicio
                        && v.FechaHoraInicio < fin)
            .Select(v => new
            {
                tipo = "visita",
                cuando = v.FechaHoraInicio!.Value,
                latitud = v.LatitudInicio!.Value,
                longitud = v.LongitudInicio!.Value,
                clienteId = (int?)v.ClienteId,
                clienteNombre = v.Cliente.Nombre,
                distanciaCliente = v.DistanciaCliente,
                referenciaId = (int?)v.Id,
            }).ToListAsync();

        var paradas = await (
            from d in db.Set<RutaDetalle>().AsNoTracking()
            join r in db.Set<RutaVendedor>().AsNoTracking() on d.RutaId equals r.Id
            where r.TenantId == tenantId
                  && r.UsuarioId == id
                  && d.Latitud != null && d.Longitud != null
                  && d.HoraLlegadaReal != null
                  && d.HoraLlegadaReal >= inicio && d.HoraLlegadaReal < fin
            select new
            {
                tipo = "parada",
                cuando = d.HoraLlegadaReal!.Value,
                latitud = d.Latitud!.Value,
                longitud = d.Longitud!.Value,
                clienteId = (int?)d.ClienteId,
                clienteNombre = d.Cliente.Nombre,
                distanciaCliente = (double?)null,
                referenciaId = (int?)d.Id,
            }).ToListAsync();

        var pedidos = await db.Pedidos.AsNoTracking()
            .Where(p => p.TenantId == tenantId
                        && p.UsuarioId == id
                        && p.Activo
                        && p.Latitud != null && p.Longitud != null
                        && p.CreadoEn >= inicio && p.CreadoEn < fin)
            .Select(p => new
            {
                tipo = "pedido",
                cuando = p.CreadoEn,
                latitud = p.Latitud!.Value,
                longitud = p.Longitud!.Value,
                clienteId = (int?)p.ClienteId,
                clienteNombre = p.Cliente.Nombre,
                distanciaCliente = (double?)null,
                referenciaId = (int?)p.Id,
            }).ToListAsync();

        var todos = visitas.Concat(paradas).Concat(pedidos)
            .OrderBy(x => x.cuando)
            .ToList();

        return Results.Ok(new { dia = fecha, usuarioId = id, eventos = todos });
    }

    private record RawActivity(int UsuarioId, double Lat, double Lng, DateTime Cuando, string Fuente, int? ClienteId, int Id);
}
