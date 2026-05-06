using HandySuites.Application.Common.Interfaces;
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
        [FromServices] ISubscriptionFeatureGuard featureGuard,
        [FromServices] ITenantTimeZoneService tenantTz)
    {
        var role = currentUser.Role;
        if (role != RoleNames.Admin && role != RoleNames.Supervisor && role != RoleNames.SuperAdmin)
            return Results.Forbid();

        var tenantId = currentUser.TenantId;
        // Window calculado en TZ del tenant. Reportado 2026-05-06: vendedor en
        // Mazatlán (UTC-7) veía pings del 5 mayo 17:19 (=00:19 UTC del 6) como
        // si fueran "hoy" porque el server filtraba con DateTime.UtcNow.Date.
        var fechaTenant = dia.HasValue
            ? DateOnly.FromDateTime(dia.Value)
            : await tenantTz.GetTenantTodayAsync();
        var (inicio, fin) = await tenantTz.GetTenantDayWindowUtcAsync(fechaTenant);

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
        var rawPings = hasTracking
            ? await ubicacionRepo.ObtenerRecorridoEntreAsync(tenantId, id, inicio, fin)
            : new List<HandySuites.Application.Tracking.DTOs.UbicacionVendedorDto>();

        // Dedupe contra fuentes canónicas (Pedidos / ClienteVisitas):
        // Cada venta produce DOS eventos: uno desde la tabla `Pedidos` (con
        // clienteNombre + coords del cliente) y uno desde el ping `Venta` que
        // mobile dispara al confirmar (con coords reales del vendedor pero
        // sin clienteNombre). Lo mismo para visitas.
        //
        // Estrategia de matching en dos pasos:
        //   PASS 1 (exacto)    — ping.ReferenciaId == Pedido/Visita.Id.
        //   PASS 2 (proximity) — para pings sin ReferenciaId, matchear con
        //                        el Pedido/Visita NO cubierto del mismo
        //                        vendedor cuyo timestamp está más cerca,
        //                        dentro de ±5 min. Mobile dispara `recordPing`
        //                        sub-segundo después de crear la entidad,
        //                        así que sub-minuto es lo esperado; los 5 min
        //                        son margen para clock-skew + latencia sync.
        //
        // El ping ganador conserva sus coords (ubicación REAL del vendedor)
        // y se enriquece con clienteNombre/clienteId/referenciaId desde la
        // fuente canónica. La fuente canónica matcheada se descarta.
        // Edge cases preservados: pings sin match alguno y entidades canónicas
        // sin ping matching pasan tal cual — no perdemos data.
        var pedidoLookup = pedidos.ToDictionary(p => p.referenciaId!.Value);
        var visitaLookup = visitas.ToDictionary(v => v.referenciaId!.Value);
        var pedidoIdsCubiertos = new HashSet<int>();
        var visitaIdsCubiertos = new HashSet<int>();

        // Resolución por índice del rawPings — calculamos antes de materializar
        // los anon types para que cada ping tenga su info de cliente correcta.
        var pingResolution = new Dictionary<int, (int? clienteId, string? clienteNombre, int? referenciaId)>();

        static string MapTipo(TipoPingUbicacion t) => t switch
        {
            TipoPingUbicacion.Checkpoint => "checkpoint",
            TipoPingUbicacion.Venta => "pedido",
            TipoPingUbicacion.Visita => "visita",
            TipoPingUbicacion.Cobro => "cobro",
            TipoPingUbicacion.InicioRuta => "inicio_ruta",
            TipoPingUbicacion.FinRuta => "fin_ruta",
            TipoPingUbicacion.InicioJornada => "inicio_jornada",
            TipoPingUbicacion.FinJornada => "fin_jornada",
            TipoPingUbicacion.StopAutomatico => "stop_automatico",
            _ => "checkpoint"
        };

        // PASS 1: matching exacto por ReferenciaId.
        for (int i = 0; i < rawPings.Count; i++)
        {
            var p = rawPings[i];
            if (!p.ReferenciaId.HasValue) continue;
            var tipo = MapTipo(p.Tipo);

            if (tipo == "pedido"
                && !pedidoIdsCubiertos.Contains(p.ReferenciaId.Value)
                && pedidoLookup.TryGetValue(p.ReferenciaId.Value, out var ped))
            {
                pedidoIdsCubiertos.Add(p.ReferenciaId.Value);
                pingResolution[i] = (ped.clienteId, ped.clienteNombre, p.ReferenciaId);
            }
            else if (tipo == "visita"
                     && !visitaIdsCubiertos.Contains(p.ReferenciaId.Value)
                     && visitaLookup.TryGetValue(p.ReferenciaId.Value, out var vis))
            {
                visitaIdsCubiertos.Add(p.ReferenciaId.Value);
                pingResolution[i] = (vis.clienteId, vis.clienteNombre, p.ReferenciaId);
            }
        }

        // PASS 2: proximity match para pings sin ReferenciaId. Greedy en orden
        // cronológico — el primer ping reclama el pedido más cercano disponible.
        // Como pings y pedidos llegan en mismo orden temporal, el greedy es
        // suficientemente robusto sin requerir bipartite matching óptimo.
        const double maxDeltaSeconds = 300.0; // 5 min
        for (int i = 0; i < rawPings.Count; i++)
        {
            if (pingResolution.ContainsKey(i)) continue; // ya matcheado
            var p = rawPings[i];
            if (p.ReferenciaId.HasValue) continue; // tiene ref pero no matcheó (no debería pasar)
            var tipo = MapTipo(p.Tipo);

            if (tipo == "pedido")
            {
                var match = pedidos
                    .Where(ped => !pedidoIdsCubiertos.Contains(ped.referenciaId!.Value))
                    .Select(ped => new { ped, delta = Math.Abs((ped.cuando - p.CapturadoEn).TotalSeconds) })
                    .OrderBy(x => x.delta)
                    .FirstOrDefault();
                if (match != null && match.delta <= maxDeltaSeconds)
                {
                    pedidoIdsCubiertos.Add(match.ped.referenciaId!.Value);
                    pingResolution[i] = (match.ped.clienteId, match.ped.clienteNombre, match.ped.referenciaId);
                }
            }
            else if (tipo == "visita")
            {
                var match = visitas
                    .Where(vis => !visitaIdsCubiertos.Contains(vis.referenciaId!.Value))
                    .Select(vis => new { vis, delta = Math.Abs((vis.cuando - p.CapturadoEn).TotalSeconds) })
                    .OrderBy(x => x.delta)
                    .FirstOrDefault();
                if (match != null && match.delta <= maxDeltaSeconds)
                {
                    visitaIdsCubiertos.Add(match.vis.referenciaId!.Value);
                    pingResolution[i] = (match.vis.clienteId, match.vis.clienteNombre, match.vis.referenciaId);
                }
            }
        }

        // Materializar trackingPings con la resolución calculada.
        var trackingPings = rawPings.Select((p, i) =>
        {
            int? clienteId = null;
            string? clienteNombre = null;
            int? referenciaId = p.ReferenciaId;
            if (pingResolution.TryGetValue(i, out var res))
            {
                clienteId = res.clienteId;
                clienteNombre = res.clienteNombre;
                referenciaId = res.referenciaId;
            }
            return new
            {
                tipo = MapTipo(p.Tipo),
                cuando = p.CapturadoEn,
                latitud = (double)p.Latitud,
                longitud = (double)p.Longitud,
                clienteId,
                clienteNombre,
                distanciaCliente = (double?)null,
                referenciaId,
            };
        }).ToList();

        // Filtrar las fuentes canónicas: solo dejamos los que NO fueron
        // absorbidos por un ping. Si no hay ping (mobile no capturó por
        // permiso/red/etc.), el evento del Pedido/Visita queda como única
        // representación en la timeline — no perdemos data.
        var pedidosFinal = pedidos.Where(p => !pedidoIdsCubiertos.Contains(p.referenciaId!.Value)).ToList();
        var visitasFinal = visitas.Where(v => !visitaIdsCubiertos.Contains(v.referenciaId!.Value)).ToList();

        var todos = visitasFinal.Concat(paradas).Concat(pedidosFinal).Concat(trackingPings)
            .OrderBy(x => x.cuando)
            .ToList();

        return Results.Ok(new { dia = fechaTenant, usuarioId = id, eventos = todos });
    }

    private record RawActivity(int UsuarioId, double Lat, double Lng, DateTime Cuando, string Fuente, int? ClienteId, int Id);
}
