using HandySuites.Application.Tracking.Interfaces;
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
        [FromServices] ICurrentTenant currentUser,
        [FromServices] IUbicacionVendedorRepository ubicacionRepo,
        [FromServices] ISubscriptionFeatureGuard featureGuard)
    {
        var role = currentUser.Role;
        if (role != RoleNames.Admin && role != RoleNames.Supervisor && role != RoleNames.SuperAdmin)
            return Results.Forbid();

        var tenantId = currentUser.TenantId;

        // Si el plan incluye tracking_vendedor, los pings de UbicacionesVendedor
        // son la fuente PRIMARIA — más frecuentes y confiables que los 3 legacy.
        // Aún así fusionamos con las 3 fuentes legacy por si el plan se activó
        // recientemente y todavía no hay pings (la columna tendrá fallback).
        var hasTracking = await featureGuard.HasFeatureAsync(tenantId, "tracking_vendedor");
        var ubicacionesVendedor = hasTracking
            ? await ubicacionRepo.ObtenerUltimasAsync(tenantId)
            : new List<Application.Tracking.DTOs.UltimaUbicacionDto>();

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

        // Materializamos cada fuente por separado y agrupamos en C# — el
        // GroupBy.First() sobre Concat() no es traducible por EF Core. Para
        // pocos vendedores por tenant (decenas, no miles) es perfectamente OK.
        var visitasData = await visitas.ToListAsync();
        var paradasData = await paradas.ToListAsync();
        var pedidosData = await pedidos.ToListAsync();
        var legacyData = visitasData.Concat(paradasData).Concat(pedidosData)
            .GroupBy(x => x.UsuarioId)
            .Select(g => g.OrderByDescending(x => x.Cuando).First())
            .ToList();

        // Fusión: pings de UbicacionVendedor tienen prioridad si son más recientes
        // que el evento legacy del mismo vendedor.
        var byUsuario = legacyData.ToDictionary(d => d.UsuarioId);
        foreach (var ping in ubicacionesVendedor)
        {
            var existing = byUsuario.GetValueOrDefault(ping.UsuarioId);
            if (existing == null || ping.CapturadoEn > existing.Cuando)
            {
                byUsuario[ping.UsuarioId] = new RawActivity(
                    ping.UsuarioId,
                    (double)ping.Latitud,
                    (double)ping.Longitud,
                    ping.CapturadoEn,
                    ping.Tipo == TipoPingUbicacion.Checkpoint ? "checkpoint"
                        : ping.Tipo == TipoPingUbicacion.Venta ? "pedido"
                        : ping.Tipo == TipoPingUbicacion.Visita ? "visita"
                        : ping.Tipo == TipoPingUbicacion.Cobro ? "cobro"
                        : ping.Tipo == TipoPingUbicacion.InicioRuta ? "inicio_ruta"
                        : ping.Tipo == TipoPingUbicacion.FinRuta ? "fin_ruta"
                        : ping.Tipo == TipoPingUbicacion.InicioJornada ? "inicio_jornada"
                        : ping.Tipo == TipoPingUbicacion.FinJornada ? "fin_jornada"
                        : ping.Tipo == TipoPingUbicacion.StopAutomatico ? "stop_automatico"
                        : "tracking",
                    null,
                    0);
            }
        }
        var data = byUsuario.Values.ToList();

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
        [FromServices] ICurrentTenant currentUser,
        [FromServices] IUbicacionVendedorRepository ubicacionRepo,
        [FromServices] ISubscriptionFeatureGuard featureGuard)
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

        // Pings de tracking continuo (Fase B). Solo si el plan tiene la feature.
        var hasTracking = await featureGuard.HasFeatureAsync(tenantId, "tracking_vendedor");
        var trackingPings = hasTracking
            ? (await ubicacionRepo.ObtenerRecorridoDelDiaAsync(tenantId, id, DateOnly.FromDateTime(fecha)))
                .Select(p => new
                {
                    tipo = p.Tipo == TipoPingUbicacion.Checkpoint ? "checkpoint"
                        : p.Tipo == TipoPingUbicacion.Venta ? "pedido"
                        : p.Tipo == TipoPingUbicacion.Visita ? "visita"
                        : p.Tipo == TipoPingUbicacion.Cobro ? "cobro"
                        : p.Tipo == TipoPingUbicacion.InicioRuta ? "inicio_ruta"
                        : p.Tipo == TipoPingUbicacion.FinRuta ? "fin_ruta"
                        : p.Tipo == TipoPingUbicacion.InicioJornada ? "inicio_jornada"
                        : p.Tipo == TipoPingUbicacion.FinJornada ? "fin_jornada"
                        : p.Tipo == TipoPingUbicacion.StopAutomatico ? "stop_automatico"
                        : "checkpoint",
                    cuando = p.CapturadoEn,
                    latitud = (double)p.Latitud,
                    longitud = (double)p.Longitud,
                    clienteId = (int?)null,
                    clienteNombre = (string?)null,
                    distanciaCliente = (double?)null,
                    referenciaId = p.ReferenciaId,
                }).ToList()
            : new List<dynamic>().Select(_ => new { tipo = "", cuando = DateTime.MinValue, latitud = 0d, longitud = 0d, clienteId = (int?)null, clienteNombre = (string?)null, distanciaCliente = (double?)null, referenciaId = (int?)null }).ToList();

        var todos = visitas.Concat(paradas).Concat(pedidos).Concat(trackingPings)
            .OrderBy(x => x.cuando)
            .ToList();

        return Results.Ok(new { dia = fecha, usuarioId = id, eventos = todos });
    }

    private record RawActivity(int UsuarioId, double Lat, double Lng, DateTime Cuando, string Fuente, int? ClienteId, int Id);
}
