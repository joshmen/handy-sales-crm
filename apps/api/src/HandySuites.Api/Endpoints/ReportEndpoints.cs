using HandySuites.Application.Contabilidad;
using HandySuites.Application.SubscriptionPlans.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

public static class ReportEndpoints
{
    // Lightweight projections to avoid loading columns that may not exist in DB (e.g. Version)
    private record PedidoRow(int Id, int ClienteId, int UsuarioId, DateTime FechaPedido, decimal Total, EstadoPedido Estado);
    private record VisitaRow(int ClienteId, int UsuarioId, DateTime? FechaHoraInicio, ResultadoVisita Resultado);
    private record DetalleRow(int PedidoId, int ProductoId, string ProductoNombre, decimal Cantidad, decimal Total);

    // ── Default date range anclado al calendario del tenant ──────────────
    // Estos reportes filtran timestamps REALES (FechaPedido/CreadoEn/FechaHoraInicio)
    // contra el rango [fechaDesde, fechaHasta]. Cuando el cliente no envía desde/hasta
    // (rango por defecto), antes se usaba UtcNow → cerca de medianoche en TZ no-UTC
    // (MX UTC-6) el rango "último mes/trimestre" no coincidía con el día tenant que ve
    // el admin. Anclamos los límites al día calendario del tenant igual que /ejecutivo:
    // límite superior = inicio del día tenant SIGUIENTE a "hoy" (fin de día, inclusivo
    // para los filtros `<= hasta`).
    private static async Task<(DateTime desde, DateTime hasta)> DefaultRangeAsync(
        HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tz,
        DateTime? desde, DateTime? hasta, int mesesAtras)
    {
        var hoy = await tz.GetTenantTodayAsync();
        var fechaDesde = desde ?? await tz.ConvertTenantDateToUtcAsync(hoy.AddMonths(-mesesAtras));
        var fechaHasta = hasta ?? await tz.ConvertTenantDateToUtcAsync(hoy.AddDays(1));
        return (fechaDesde, fechaHasta);
    }

    public static void MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        // RBAC: Reports expose tenant-wide aggregates (cross-vendedor ventas,
        // cartera, metas, comisiones, insights). Vendedores/Viewers no deben
        // verlos — restringir a roles de gestión.
        //
        // FINDING 4.3 (HIGH) — SUPERVISOR scope:
        // SUPERVISOR is a team-scoped role (only sees members of its assigned
        // team), but these report queries are tenant-wide aggregates with no
        // per-supervisor filtering. Exposing them to SUPERVISOR would leak
        // data from vendedores outside the supervisor's team (ventas totales,
        // cartera de otros equipos, metas/comisiones cross-team, etc.).
        //
        // Decision: restrict to ADMIN / SUPER_ADMIN only. Supervisors must use
        // their dedicated team-scoped endpoints (e.g. /api/team/*) which already
        // enforce the supervisor->team filter at the query level. Adding a
        // proper supervisor-scoped variant of these reports would require
        // rewriting every query to join through the supervisor->team->vendedor
        // graph and is tracked as future work, not a security patch.
        var group = app.MapGroup("/api/reports")
            .RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        // ═══════════════════════════════════════════════════════
        // TIER INFO (for frontend gating)
        // ═══════════════════════════════════════════════════════
        group.MapGet("/tier-info", async (
            [FromServices] IReportAccessService reportAccess,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var info = await reportAccess.GetReportTierInfoAsync(tenantId);
            return Results.Ok(info);
        });

        // ═══════════════════════════════════════════════════════
        // SPARKLINES — mini-tendencias REALES por reporte (catálogo)
        // 3 series base de los últimos 14 días: ventas diarias, clientes nuevos,
        // visitas. Se mapean a los reportes con agregado barato. Reportes sin
        // actividad (serie en cero) se omiten → el front no dibuja sparkline.
        // ═══════════════════════════════════════════════════════
        group.MapGet("/sparklines", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            const int days = 14;
            // Ventana anclada al día calendario del tenant (filtra timestamps reales
            // FechaPedido/CreadoEn/FechaHoraInicio). Antes UtcNow.Date desfasaba el
            // bucketing cerca de medianoche en TZ no-UTC.
            var hoy = await tzService.GetTenantTodayAsync();
            var since = await tzService.ConvertTenantDateToUtcAsync(hoy.AddDays(-(days - 1)));

            var ventasRows = await db.Pedidos
                .Where(p => p.TenantId == tenantId && p.FechaPedido >= since && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new { p.FechaPedido, p.Total })
                .ToListAsync();
            var clienteFechas = await db.Clientes
                .Where(c => c.TenantId == tenantId && c.CreadoEn >= since)
                .Select(c => c.CreadoEn)
                .ToListAsync();
            var visitaFechas = await db.Set<ClienteVisita>()
                .Where(v => v.TenantId == tenantId && v.FechaHoraInicio != null && v.FechaHoraInicio >= since)
                .Select(v => v.FechaHoraInicio!.Value)
                .ToListAsync();

            int Bucket(DateTime d) => (int)(d.Date - since).TotalDays;
            double[] DailyCount(IEnumerable<DateTime> dates)
            {
                var arr = new double[days];
                foreach (var d in dates) { var i = Bucket(d); if (i >= 0 && i < days) arr[i] += 1; }
                return arr;
            }
            var ventas = new double[days];
            foreach (var r in ventasRows) { var i = Bucket(r.FechaPedido); if (i >= 0 && i < days) ventas[i] += (double)r.Total; }
            var nuevos = DailyCount(clienteFechas);
            var visitas = DailyCount(visitaFechas);

            var mapping = new (string id, double[] serie)[]
            {
                ("ventas-periodo", ventas), ("ventas-vendedor", ventas), ("ventas-producto", ventas),
                ("ventas-zona", ventas), ("ejecutivo", ventas), ("comparativo", ventas),
                ("rentabilidad-cliente", ventas), ("analisis-abc", ventas),
                ("nuevos-clientes", nuevos),
                ("actividad-clientes", visitas), ("efectividad-visitas", visitas),
            };
            var result = new Dictionary<string, double[]>();
            foreach (var (id, serie) in mapping)
                if (serie.Sum() > 0) result[id] = serie; // omitir series en cero (no inventar trend)

            return Results.Ok(result);
        });


        // ═══════════════════════════════════════════════════════
        // R1: VENTAS POR PERÍODO
        // ═══════════════════════════════════════════════════════
        group.MapGet("/ventas-periodo", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] string agrupacion = "dia") =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var (fechaDesde, fechaHasta) = await DefaultRangeAsync(tzService, desde, hasta, 1);

            var pedidos = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new PedidoRow(p.Id, p.ClienteId, p.UsuarioId, p.FechaPedido, p.Total, p.Estado))
                .ToListAsync();

            IEnumerable<object> periodos = agrupacion switch
            {
                "semana" => pedidos
                    .GroupBy(p => new { Anio = p.FechaPedido.Year, Semana = System.Globalization.ISOWeek.GetWeekOfYear(p.FechaPedido) })
                    .OrderBy(g => g.Key.Anio).ThenBy(g => g.Key.Semana)
                    .Select(g => new
                    {
                        fecha = $"{g.Key.Anio}-S{g.Key.Semana:D2}",
                        totalVentas = g.Sum(p => p.Total),
                        cantidadPedidos = g.Count(),
                        ticketPromedio = g.Count() > 0 ? g.Sum(p => p.Total) / g.Count() : 0
                    }),
                "mes" => pedidos
                    .GroupBy(p => new { p.FechaPedido.Year, p.FechaPedido.Month })
                    .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                    .Select(g => new
                    {
                        fecha = $"{g.Key.Year}-{g.Key.Month:D2}",
                        totalVentas = g.Sum(p => p.Total),
                        cantidadPedidos = g.Count(),
                        ticketPromedio = g.Count() > 0 ? g.Sum(p => p.Total) / g.Count() : 0
                    }),
                _ => pedidos
                    .GroupBy(p => p.FechaPedido.Date)
                    .OrderBy(g => g.Key)
                    .Select(g => new
                    {
                        fecha = g.Key.ToString("yyyy-MM-dd"),
                        totalVentas = g.Sum(p => p.Total),
                        cantidadPedidos = g.Count(),
                        ticketPromedio = g.Count() > 0 ? g.Sum(p => p.Total) / g.Count() : 0
                    })
            };

            var data = periodos.ToList();
            return Results.Ok(new
            {
                periodos = data,
                totales = new
                {
                    totalVentas = pedidos.Sum(p => p.Total),
                    cantidadPedidos = pedidos.Count,
                    ticketPromedio = pedidos.Count > 0 ? pedidos.Sum(p => p.Total) / pedidos.Count : 0
                }
            });
        });

        // ═══════════════════════════════════════════════════════
        // R2: VENTAS POR VENDEDOR
        // ═══════════════════════════════════════════════════════
        group.MapGet("/ventas-vendedor", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "ventas-vendedor");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var (fechaDesde, fechaHasta) = await DefaultRangeAsync(tzService, desde, hasta, 1);

            var vendedores = await db.Usuarios
                .Where(u => u.TenantId == tenantId && u.Activo)
                .Select(u => new { u.Id, u.Nombre, u.Email })
                .ToListAsync();

            var pedidos = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new PedidoRow(p.Id, p.ClienteId, p.UsuarioId, p.FechaPedido, p.Total, p.Estado))
                .ToListAsync();

            var visitas = await db.ClienteVisitas
                .Where(v => v.TenantId == tenantId
                    && v.FechaHoraInicio >= fechaDesde
                    && v.FechaHoraInicio <= fechaHasta)
                .Select(v => new VisitaRow(v.ClienteId, v.UsuarioId, v.FechaHoraInicio, v.Resultado))
                .ToListAsync();

            var result = vendedores.Select(v =>
            {
                var pedidosVendedor = pedidos.Where(p => p.UsuarioId == v.Id).ToList();
                var visitasVendedor = visitas.Where(vi => vi.UsuarioId == v.Id).ToList();
                var visitasConVenta = visitasVendedor.Count(vi => vi.Resultado == ResultadoVisita.Venta);
                var totalVisitas = visitasVendedor.Count;

                return new
                {
                    usuarioId = v.Id,
                    nombre = v.Nombre,
                    email = v.Email,
                    totalVentas = pedidosVendedor.Sum(p => p.Total),
                    cantidadPedidos = pedidosVendedor.Count,
                    ticketPromedio = pedidosVendedor.Count > 0 ? pedidosVendedor.Sum(p => p.Total) / pedidosVendedor.Count : 0,
                    totalVisitas,
                    visitasConVenta,
                    efectividadVisitas = totalVisitas > 0 ? Math.Round((double)visitasConVenta / totalVisitas * 100, 1) : 0,
                    primerPedido = pedidosVendedor.MinBy(p => p.FechaPedido)?.FechaPedido,
                    ultimoPedido = pedidosVendedor.MaxBy(p => p.FechaPedido)?.FechaPedido
                };
            })
            .OrderByDescending(v => v.totalVentas)
            .ToList();

            return Results.Ok(new { vendedores = result });
        });

        // ═══════════════════════════════════════════════════════
        // R3: VENTAS POR PRODUCTO
        // ═══════════════════════════════════════════════════════
        group.MapGet("/ventas-producto", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int top = 20) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "ventas-producto");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            // Clamp top a [1, 500] para evitar DoS y resultados sin sentido.
            if (top < 1) top = 1;
            if (top > 500) top = 500;

            var (fechaDesde, fechaHasta) = await DefaultRangeAsync(tzService, desde, hasta, 1);

            var pedidoIds = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => p.Id)
                .ToListAsync();

            var detalles = await db.DetallePedidos
                .Where(d => pedidoIds.Contains(d.PedidoId))
                .Select(d => new DetalleRow(d.PedidoId, d.ProductoId, d.Producto.Nombre, d.Cantidad, d.Total))
                .ToListAsync();

            var totalGeneral = detalles.Sum(d => d.Total);

            var masVendidos = detalles
                .GroupBy(d => new { d.ProductoId, d.ProductoNombre })
                .Select(g => new
                {
                    productoId = g.Key.ProductoId,
                    nombre = g.Key.ProductoNombre,
                    cantidadVendida = g.Sum(d => d.Cantidad),
                    totalVentas = g.Sum(d => d.Total),
                    porcentajeDelTotal = totalGeneral > 0 ? Math.Round((double)(g.Sum(d => d.Total) / totalGeneral * 100), 1) : 0
                })
                .OrderByDescending(p => p.cantidadVendida)
                .Take(top)
                .ToList();

            var mayorVenta = detalles
                .GroupBy(d => new { d.ProductoId, d.ProductoNombre })
                .Select(g => new
                {
                    productoId = g.Key.ProductoId,
                    nombre = g.Key.ProductoNombre,
                    cantidadVendida = g.Sum(d => d.Cantidad),
                    totalVentas = g.Sum(d => d.Total),
                    porcentajeDelTotal = totalGeneral > 0 ? Math.Round((double)(g.Sum(d => d.Total) / totalGeneral * 100), 1) : 0
                })
                .OrderByDescending(p => p.totalVentas)
                .Take(top)
                .ToList();

            var productosConVenta = detalles.Select(d => d.ProductoId).Distinct().ToHashSet();
            var sinVenta = await db.Productos
                .Where(p => p.TenantId == tenantId && p.Activo && !productosConVenta.Contains(p.Id))
                .Select(p => new { productoId = p.Id, nombre = p.Nombre })
                .ToListAsync();

            return Results.Ok(new { masVendidos, mayorVenta, sinVenta, totalGeneral });
        });

        // ═══════════════════════════════════════════════════════
        // VENTAS POR CATEGORÍA (donut del dashboard de Reportes)
        // ═══════════════════════════════════════════════════════
        group.MapGet("/ventas-categoria", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var (fechaDesde, fechaHasta) = await DefaultRangeAsync(tzService, desde, hasta, 1);

            var pedidoIds = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => p.Id)
                .ToListAsync();

            var rows = await db.DetallePedidos
                .Where(d => pedidoIds.Contains(d.PedidoId))
                .Select(d => new { Categoria = d.Producto.Categoria != null ? d.Producto.Categoria.Nombre : "Sin categoría", d.Total })
                .ToListAsync();

            var totalGeneral = rows.Sum(r => r.Total);

            var categorias = rows
                .GroupBy(r => r.Categoria)
                .Select(g => new
                {
                    categoria = g.Key,
                    totalVentas = g.Sum(r => r.Total),
                    porcentajeDelTotal = totalGeneral > 0 ? Math.Round((double)(g.Sum(r => r.Total) / totalGeneral * 100), 1) : 0
                })
                .OrderByDescending(c => c.totalVentas)
                .ToList();

            return Results.Ok(new { categorias, totalGeneral });
        });

        // ═══════════════════════════════════════════════════════
        // R4: VENTAS POR ZONA
        // ═══════════════════════════════════════════════════════
        group.MapGet("/ventas-zona", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "ventas-zona");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var (fechaDesde, fechaHasta) = await DefaultRangeAsync(tzService, desde, hasta, 1);

            var zonas = await db.Zonas
                .Where(z => z.TenantId == tenantId)
                .Select(z => new { z.Id, z.Nombre })
                .ToListAsync();

            var clientes = await db.Clientes
                .Where(c => c.TenantId == tenantId)
                .Select(c => new { c.Id, c.IdZona })
                .ToListAsync();

            var pedidos = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new { p.ClienteId, p.Total })
                .ToListAsync();

            var result = zonas.Select(z =>
            {
                var clientesZona = clientes.Where(c => c.IdZona == z.Id).Select(c => c.Id).ToHashSet();
                var pedidosZona = pedidos.Where(p => clientesZona.Contains(p.ClienteId)).ToList();

                return new
                {
                    zonaId = z.Id,
                    nombre = z.Nombre,
                    totalClientes = clientesZona.Count,
                    pedidos = pedidosZona.Count,
                    ventasTotales = pedidosZona.Sum(p => p.Total)
                };
            })
            .OrderByDescending(z => z.ventasTotales)
            .ToList();

            return Results.Ok(new
            {
                zonas = result,
                totales = new
                {
                    totalClientes = clientes.Count,
                    totalPedidos = pedidos.Count,
                    totalVentas = pedidos.Sum(p => p.Total)
                }
            });
        });

        // ═══════════════════════════════════════════════════════
        // R5: ACTIVIDAD DE CLIENTES
        // ═══════════════════════════════════════════════════════
        group.MapGet("/actividad-clientes", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int? zonaId,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 50) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "actividad-clientes");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var (fechaDesde, fechaHasta) = await DefaultRangeAsync(tzService, desde, hasta, 1);

            var zonasDict = await db.Zonas
                .Where(z => z.TenantId == tenantId)
                .ToDictionaryAsync(z => z.Id, z => z.Nombre);

            var clientesQuery = db.Clientes
                .Where(c => c.TenantId == tenantId);
            if (zonaId.HasValue) clientesQuery = clientesQuery.Where(c => c.IdZona == zonaId.Value);

            var clientes = await clientesQuery
                .Select(c => new { c.Id, c.Nombre, c.IdZona })
                .ToListAsync();

            var pedidos = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new PedidoRow(p.Id, p.ClienteId, p.UsuarioId, p.FechaPedido, p.Total, p.Estado))
                .ToListAsync();

            var visitas = await db.ClienteVisitas
                .Where(v => v.TenantId == tenantId
                    && v.FechaHoraInicio >= fechaDesde
                    && v.FechaHoraInicio <= fechaHasta)
                .Select(v => new VisitaRow(v.ClienteId, v.UsuarioId, v.FechaHoraInicio, v.Resultado))
                .ToListAsync();

            var result = clientes.Select(c =>
            {
                var pedidosCliente = pedidos.Where(p => p.ClienteId == c.Id).ToList();
                var visitasCliente = visitas.Where(v => v.ClienteId == c.Id).ToList();

                return new
                {
                    clienteId = c.Id,
                    nombre = c.Nombre,
                    zona = zonasDict.GetValueOrDefault(c.IdZona, ""),
                    pedidos = pedidosCliente.Count,
                    ventasTotales = pedidosCliente.Sum(p => p.Total),
                    visitas = visitasCliente.Count,
                    ultimaVisita = visitasCliente.MaxBy(v => v.FechaHoraInicio)?.FechaHoraInicio,
                    ultimoPedido = pedidosCliente.MaxBy(p => p.FechaPedido)?.FechaPedido
                };
            })
            .OrderByDescending(c => c.ventasTotales)
            .ToList();

            var total = result.Count;
            var paged = result.Skip((page - 1) * limit).Take(limit).ToList();

            return Results.Ok(new { clientes = paged, total, page, limit });
        });

        // ═══════════════════════════════════════════════════════
        // R6: NUEVOS CLIENTES
        // ═══════════════════════════════════════════════════════
        group.MapGet("/nuevos-clientes", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int? zonaId) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var (fechaDesde, fechaHasta) = await DefaultRangeAsync(tzService, desde, hasta, 1);

            var zonasDict = await db.Zonas
                .Where(z => z.TenantId == tenantId)
                .ToDictionaryAsync(z => z.Id, z => z.Nombre);

            var query = db.Clientes
                .Where(c => c.TenantId == tenantId
                    && c.CreadoEn >= fechaDesde
                    && c.CreadoEn <= fechaHasta);

            if (zonaId.HasValue) query = query.Where(c => c.IdZona == zonaId.Value);

            var clientesRaw = await query
                .OrderByDescending(c => c.CreadoEn)
                .Select(c => new
                {
                    clienteId = c.Id,
                    nombre = c.Nombre,
                    idZona = c.IdZona,
                    correo = c.Correo,
                    telefono = c.Telefono,
                    fechaCreacion = c.CreadoEn,
                    creadoPor = c.CreadoPor ?? ""
                })
                .ToListAsync();

            var clientes = clientesRaw.Select(c => new
            {
                c.clienteId,
                c.nombre,
                zona = zonasDict.GetValueOrDefault(c.idZona, ""),
                c.correo,
                c.telefono,
                c.fechaCreacion,
                c.creadoPor
            }).ToList();

            var porMes = clientes
                .GroupBy(c => c.fechaCreacion.ToString("yyyy-MM"))
                .OrderBy(g => g.Key)
                .Select(g => new { mes = g.Key, cantidad = g.Count() })
                .ToList();

            return Results.Ok(new { clientes, total = clientes.Count, porMes });
        });

        // ═══════════════════════════════════════════════════════
        // R7: INVENTARIO ACTUAL
        // ═══════════════════════════════════════════════════════
        group.MapGet("/inventario", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var inventario = await db.Inventarios
                .Where(i => i.TenantId == tenantId)
                .Include(i => i.Producto)
                .Select(i => new
                {
                    productoId = i.ProductoId,
                    nombre = i.Producto.Nombre,
                    codigoBarra = i.Producto.CodigoBarra,
                    stockActual = i.CantidadActual,
                    stockMinimo = i.StockMinimo,
                    stockMaximo = i.StockMaximo,
                    estado = i.CantidadActual <= 0 ? "sin_stock"
                           : i.CantidadActual < i.StockMinimo ? "bajo"
                           : i.CantidadActual > i.StockMaximo ? "exceso"
                           : "normal"
                })
                .OrderBy(i => i.estado == "sin_stock" ? 0 : i.estado == "bajo" ? 1 : i.estado == "exceso" ? 2 : 3)
                .ThenBy(i => i.nombre)
                .ToListAsync();

            var resumen = new
            {
                total = inventario.Count,
                sinStock = inventario.Count(i => i.estado == "sin_stock"),
                bajo = inventario.Count(i => i.estado == "bajo"),
                normal = inventario.Count(i => i.estado == "normal"),
                exceso = inventario.Count(i => i.estado == "exceso")
            };

            return Results.Ok(new { productos = inventario, resumen });
        });

        // ═══════════════════════════════════════════════════════
        // R8: DASHBOARD EJECUTIVO
        // ═══════════════════════════════════════════════════════
        group.MapGet("/ejecutivo", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService,
            [FromQuery] string periodo = "mes",
            [FromQuery] DateTime? desde = null,
            [FromQuery] DateTime? hasta = null) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            // Anclar las ventanas al DIA CALENDARIO del tenant (no a UtcNow). Antes
            // el back restaba dias/meses a UtcNow mientras el front (getDateRange)
            // usa tenantToday() -> cerca de medianoche en TZ no-UTC los KPIs del
            // dashboard ejecutivo discrepaban del rango que muestra el admin.
            //
            // Soporta rango LIBRE (desde/hasta, dias tenant) ademas del enum
            // `periodo` (back-compat). Con rango libre, la ventana "anterior" es
            // del mismo ancho inmediatamente previa.
            var tenantToday = await tzService.GetTenantTodayAsync();
            DateOnly desdeDay, hastaDay, desdeAntDay, hastaAntDay;
            if (desde.HasValue && hasta.HasValue)
            {
                desdeDay = DateOnly.FromDateTime(desde.Value);
                hastaDay = DateOnly.FromDateTime(hasta.Value);
                if (hastaDay < desdeDay) (desdeDay, hastaDay) = (hastaDay, desdeDay);
                var widthDays = hastaDay.DayNumber - desdeDay.DayNumber + 1; // inclusivo
                desdeAntDay = desdeDay.AddDays(-widthDays);
                hastaAntDay = desdeDay; // limite superior exclusivo de la ventana anterior
            }
            else
            {
                hastaDay = tenantToday;
                switch (periodo)
                {
                    case "semana":
                        desdeDay = tenantToday.AddDays(-7);
                        desdeAntDay = tenantToday.AddDays(-14);
                        hastaAntDay = tenantToday.AddDays(-7);
                        break;
                    case "trimestre":
                        desdeDay = tenantToday.AddMonths(-3);
                        desdeAntDay = tenantToday.AddMonths(-6);
                        hastaAntDay = tenantToday.AddMonths(-3);
                        break;
                    default:
                        desdeDay = tenantToday.AddMonths(-1);
                        desdeAntDay = tenantToday.AddMonths(-2);
                        hastaAntDay = tenantToday.AddMonths(-1);
                        break;
                }
            }
            // Cada limite = 00:00 en TZ tenant convertido a instante UTC (las
            // queries comparan FechaPedido, almacenada en UTC). El limite superior
            // es el inicio del dia SIGUIENTE a hastaDay (fin de dia tenant, exclusivo).
            var fechaDesde = await tzService.ConvertTenantDateToUtcAsync(desdeDay);
            var fechaHasta = await tzService.ConvertTenantDateToUtcAsync(hastaDay.AddDays(1));
            var fechaDesdeAnterior = await tzService.ConvertTenantDateToUtcAsync(desdeAntDay);
            var fechaHastaAnterior = await tzService.ConvertTenantDateToUtcAsync(hastaAntDay);

            var pedidosActual = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido < fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new PedidoRow(p.Id, p.ClienteId, p.UsuarioId, p.FechaPedido, p.Total, p.Estado))
                .ToListAsync();

            var pedidosAnterior = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesdeAnterior
                    && p.FechaPedido < fechaHastaAnterior
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new PedidoRow(p.Id, p.ClienteId, p.UsuarioId, p.FechaPedido, p.Total, p.Estado))
                .ToListAsync();

            var ventasActual = pedidosActual.Sum(p => p.Total);
            var ventasAnterior = pedidosAnterior.Sum(p => p.Total);
            var crecimiento = ventasAnterior > 0
                ? Math.Round((double)((ventasActual - ventasAnterior) / ventasAnterior * 100), 1)
                : 0;

            var visitas = await db.ClienteVisitas
                .Where(v => v.TenantId == tenantId && v.FechaHoraInicio >= fechaDesde && v.FechaHoraInicio < fechaHasta)
                .Select(v => new VisitaRow(v.ClienteId, v.UsuarioId, v.FechaHoraInicio, v.Resultado))
                .ToListAsync();

            var nuevosClientes = await db.Clientes
                .Where(c => c.TenantId == tenantId && c.CreadoEn >= fechaDesde && c.CreadoEn < fechaHasta)
                .CountAsync();

            var clientesActivos = await db.Clientes
                .Where(c => c.TenantId == tenantId && c.Activo)
                .CountAsync();

            var topVendedor = pedidosActual
                .GroupBy(p => p.UsuarioId)
                .OrderByDescending(g => g.Sum(p => p.Total))
                .Select(g => new { usuarioId = g.Key, totalVentas = g.Sum(p => p.Total) })
                .FirstOrDefault();

            string? topVendedorNombre = null;
            if (topVendedor != null)
            {
                topVendedorNombre = await db.Usuarios
                    .Where(u => u.Id == topVendedor.usuarioId)
                    .Select(u => u.Nombre)
                    .FirstOrDefaultAsync();
            }

            var pedidoIdsActual = pedidosActual.Select(p => p.Id).ToList();
            var detalles = await db.DetallePedidos
                .Where(d => pedidoIdsActual.Contains(d.PedidoId))
                .Select(d => new DetalleRow(d.PedidoId, d.ProductoId, d.Producto.Nombre, d.Cantidad, d.Total))
                .ToListAsync();

            var topProducto = detalles
                .GroupBy(d => new { d.ProductoId, d.ProductoNombre })
                .OrderByDescending(g => g.Sum(d => d.Total))
                .Select(g => new { nombre = g.Key.ProductoNombre, totalVentas = g.Sum(d => d.Total), cantidadVendida = g.Sum(d => d.Cantidad) })
                .FirstOrDefault();

            var alertasInventario = await db.Inventarios
                .Where(i => i.TenantId == tenantId && (i.CantidadActual <= 0 || i.CantidadActual < i.StockMinimo))
                .CountAsync();

            return Results.Ok(new
            {
                ventas = new
                {
                    total = ventasActual,
                    pedidos = pedidosActual.Count,
                    ticketPromedio = pedidosActual.Count > 0 ? ventasActual / pedidosActual.Count : 0,
                    crecimientoPct = crecimiento,
                    ventasPeriodoAnterior = ventasAnterior
                },
                visitas = new
                {
                    total = visitas.Count,
                    conVenta = visitas.Count(v => v.Resultado == ResultadoVisita.Venta),
                    sinVenta = visitas.Count(v => v.Resultado == ResultadoVisita.SinVenta),
                    efectividadPct = visitas.Count > 0
                        ? Math.Round((double)visitas.Count(v => v.Resultado == ResultadoVisita.Venta) / visitas.Count * 100, 1)
                        : 0
                },
                nuevosClientes,
                clientesActivos,
                topVendedor = topVendedor != null ? new { nombre = topVendedorNombre, topVendedor.totalVentas } : null,
                topProducto,
                alertas = new
                {
                    inventarioBajo = alertasInventario
                }
            });
        });

        // ═══════════════════════════════════════════════════════
        // R9: CARTERA VENCIDA (AR Aging)
        // ═══════════════════════════════════════════════════════
        group.MapGet("/cartera-vencida", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] string? agrupar) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "cartera-vencida");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            // 'cliente' (default) | 'vendedor'
            var modoAgrupar = agrupar == "vendedor" ? "vendedor" : "cliente";

            var (fechaDesde, fechaHasta) = await DefaultRangeAsync(tzService, desde, hasta, 3);

            // Clients with outstanding balance
            var clientes = await db.Clientes
                .Where(c => c.TenantId == tenantId && c.Saldo > 0)
                .Select(c => new { c.Id, c.Nombre, c.Saldo, c.DiasCredito })
                .ToListAsync();

            // Pedidos in range
            var pedidos = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new { p.Id, p.ClienteId, p.UsuarioId, p.FechaPedido, p.Total })
                .ToListAsync();

            // Cobros in range
            var cobros = await db.Cobros
                .Where(c => c.TenantId == tenantId
                    && c.FechaCobro >= fechaDesde
                    && c.FechaCobro <= fechaHasta)
                .Select(c => new { c.ClienteId, c.Monto, c.FechaCobro })
                .ToListAsync();

            // Nombres de vendedores (para agrupar por vendedor del pedido mas reciente).
            var vendedoresDict = await db.Usuarios
                .Where(u => u.TenantId == tenantId)
                .Select(u => new { u.Id, u.Nombre })
                .ToDictionaryAsync(u => u.Id, u => u.Nombre);

            var ahora = DateTime.UtcNow;

            var detalle = clientes.Select(c =>
            {
                var pedidosCliente = pedidos.Where(p => p.ClienteId == c.Id).OrderBy(p => p.FechaPedido).ToList();
                // Age = days since oldest unpaid pedido
                var oldestPedido = pedidosCliente.FirstOrDefault();
                var diasVencido = oldestPedido != null ? (int)(ahora - oldestPedido.FechaPedido).TotalDays : 0;

                // Vendedor = el del pedido mas reciente del cliente (para agrupar por vendedor).
                var pedidoReciente = pedidosCliente.LastOrDefault();
                var vendedorNombre = pedidoReciente != null
                    ? vendedoresDict.GetValueOrDefault(pedidoReciente.UsuarioId, "")
                    : "";

                // "Por vencer": saldo cuyo pedido mas reciente sigue dentro de los dias de credito.
                bool dentroCredito = pedidoReciente != null
                    && (ahora - pedidoReciente.FechaPedido).TotalDays <= c.DiasCredito;

                var bucket = dentroCredito ? "porVencer"
                           : diasVencido <= 30 ? "corriente"
                           : diasVencido <= 60 ? "31-60"
                           : diasVencido <= 90 ? "61-90"
                           : "90+";

                return new
                {
                    clienteId = c.Id,
                    nombre = c.Nombre,
                    saldo = c.Saldo,
                    diasVencido,
                    bucket,
                    diasCredito = c.DiasCredito,
                    vendedor = vendedorNombre,
                    ultimoPago = cobros.Where(co => co.ClienteId == c.Id).MaxBy(co => co.FechaCobro)?.FechaCobro
                };
            })
            .Where(c => c.saldo > 0)
            .OrderByDescending(c => c.diasVencido)
            .ToList();

            // Buckets originales (compat). El bucket "porVencer" no entra en estos cuatro:
            // representa saldo aun dentro de credito, antes de "corriente" (0-30 vencidos).
            var buckets = new
            {
                corriente = new { count = detalle.Count(d => d.bucket == "corriente"), total = detalle.Where(d => d.bucket == "corriente").Sum(d => d.saldo) },
                d31_60 = new { count = detalle.Count(d => d.bucket == "31-60"), total = detalle.Where(d => d.bucket == "31-60").Sum(d => d.saldo) },
                d61_90 = new { count = detalle.Count(d => d.bucket == "61-90"), total = detalle.Where(d => d.bucket == "61-90").Sum(d => d.saldo) },
                d90plus = new { count = detalle.Count(d => d.bucket == "90+"), total = detalle.Where(d => d.bucket == "90+").Sum(d => d.saldo) }
            };

            // Antiguedad de saldos: filas agrupadas por cliente o por vendedor, con
            // saldo distribuido en su bucket de antiguedad (porVencer + 4 vencidos).
            var filas = detalle
                .GroupBy(d => modoAgrupar == "vendedor" ? d.vendedor : d.nombre)
                .Select(g =>
                {
                    var porVencer = g.Where(d => d.bucket == "porVencer").Sum(d => d.saldo);
                    var b0_30 = g.Where(d => d.bucket == "corriente").Sum(d => d.saldo);
                    var b1_31_60 = g.Where(d => d.bucket == "31-60").Sum(d => d.saldo);
                    var b2_61_90 = g.Where(d => d.bucket == "61-90").Sum(d => d.saldo);
                    var b3_mas90 = g.Where(d => d.bucket == "90+").Sum(d => d.saldo);
                    return new
                    {
                        nombre = string.IsNullOrEmpty(g.Key) ? "Sin asignar" : g.Key,
                        porVencer,
                        b0_30,
                        b1_31_60,
                        b2_61_90,
                        b3_mas90,
                        total = porVencer + b0_30 + b1_31_60 + b2_61_90 + b3_mas90
                    };
                })
                .OrderByDescending(f => f.total)
                .ToList();

            var totalesPorBucket = new
            {
                porVencer = detalle.Where(d => d.bucket == "porVencer").Sum(d => d.saldo),
                b0_30 = detalle.Where(d => d.bucket == "corriente").Sum(d => d.saldo),
                b1_31_60 = detalle.Where(d => d.bucket == "31-60").Sum(d => d.saldo),
                b2_61_90 = detalle.Where(d => d.bucket == "61-90").Sum(d => d.saldo),
                b3_mas90 = detalle.Where(d => d.bucket == "90+").Sum(d => d.saldo),
                total = detalle.Sum(d => d.saldo)
            };

            return Results.Ok(new
            {
                clientes = detalle,
                buckets,
                totalCartera = detalle.Sum(d => d.saldo),
                totalClientes = detalle.Count,
                filas,
                totalesPorBucket,
                agrupar = modoAgrupar
            });
        });

        // ═══════════════════════════════════════════════════════
        // R10: CUMPLIMIENTO DE METAS
        // ═══════════════════════════════════════════════════════
        group.MapGet("/cumplimiento-metas", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] HandySuites.Application.Common.Interfaces.ITenantTimeZoneService tzService,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int? usuarioId) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "cumplimiento-metas");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var (fechaDesde, fechaHasta) = await DefaultRangeAsync(tzService, desde, hasta, 1);

            var metasQuery = db.MetasVendedor
                .Where(m => m.TenantId == tenantId
                    && m.FechaInicio <= fechaHasta
                    && m.FechaFin >= fechaDesde);

            if (usuarioId.HasValue) metasQuery = metasQuery.Where(m => m.UsuarioId == usuarioId.Value);

            var metas = await metasQuery
                .Select(m => new { m.Id, m.UsuarioId, m.Tipo, m.Periodo, m.Monto, m.FechaInicio, m.FechaFin })
                .ToListAsync();

            var vendedorIds = metas.Select(m => m.UsuarioId).Distinct().ToList();
            var vendedores = await db.Usuarios
                .Where(u => vendedorIds.Contains(u.Id))
                .Select(u => new { u.Id, u.Nombre })
                .ToDictionaryAsync(u => u.Id, u => u.Nombre);

            var pedidos = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new { p.UsuarioId, p.Total })
                .ToListAsync();

            var visitas = await db.ClienteVisitas
                .Where(v => v.TenantId == tenantId
                    && v.FechaHoraInicio >= fechaDesde
                    && v.FechaHoraInicio <= fechaHasta)
                .Select(v => new { v.UsuarioId })
                .ToListAsync();

            var result = metas.Select(m =>
            {
                decimal actual = m.Tipo switch
                {
                    "ventas" => pedidos.Where(p => p.UsuarioId == m.UsuarioId).Sum(p => p.Total),
                    "visitas" => visitas.Count(v => v.UsuarioId == m.UsuarioId),
                    "pedidos" => pedidos.Count(p => p.UsuarioId == m.UsuarioId),
                    _ => 0
                };

                var porcentaje = m.Monto > 0 ? Math.Round((double)(actual / m.Monto * 100), 1) : 0;

                return new
                {
                    metaId = m.Id,
                    usuarioId = m.UsuarioId,
                    vendedor = vendedores.GetValueOrDefault(m.UsuarioId, ""),
                    tipo = m.Tipo,
                    periodo = m.Periodo,
                    meta = m.Monto,
                    actual,
                    porcentajeCumplimiento = porcentaje,
                    cumplida = actual >= m.Monto,
                    fechaInicio = m.FechaInicio,
                    fechaFin = m.FechaFin
                };
            })
            .OrderByDescending(m => m.porcentajeCumplimiento)
            .ToList();

            var totalMetas = result.Count;
            var cumplidas = result.Count(m => m.cumplida);
            var promedioCumplimiento = totalMetas > 0 ? Math.Round(result.Average(m => m.porcentajeCumplimiento), 1) : 0;

            return Results.Ok(new
            {
                metas = result,
                resumen = new { totalMetas, cumplidas, noCumplidas = totalMetas - cumplidas, promedioCumplimiento }
            });
        });

        // ═══════════════════════════════════════════════════════
        // R11: COMPARATIVO DE PERÍODOS
        // ═══════════════════════════════════════════════════════
        group.MapGet("/comparativo", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] DateTime periodo1Desde,
            [FromQuery] DateTime periodo1Hasta,
            [FromQuery] DateTime periodo2Desde,
            [FromQuery] DateTime periodo2Hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "comparativo");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            if (periodo1Desde > periodo1Hasta || periodo2Desde > periodo2Hasta)
                return Results.BadRequest(new { message = "La fecha 'desde' no puede ser posterior a 'hasta' en ninguno de los dos periodos." });

            async Task<object> GetMetrics(DateTime desde, DateTime hasta, string label)
            {
                var pedidos = await db.Pedidos
                    .Where(p => p.TenantId == tenantId
                        && p.FechaPedido >= desde && p.FechaPedido <= hasta
                        && p.Estado != EstadoPedido.Cancelado)
                    .Select(p => new PedidoRow(p.Id, p.ClienteId, p.UsuarioId, p.FechaPedido, p.Total, p.Estado))
                    .ToListAsync();

                var visitas = await db.ClienteVisitas
                    .Where(v => v.TenantId == tenantId
                        && v.FechaHoraInicio >= desde && v.FechaHoraInicio <= hasta)
                    .CountAsync();

                var nuevosClientes = await db.Clientes
                    .Where(c => c.TenantId == tenantId && c.CreadoEn >= desde && c.CreadoEn <= hasta)
                    .CountAsync();

                var cobros = await db.Cobros
                    .Where(c => c.TenantId == tenantId
                        && c.FechaCobro >= desde && c.FechaCobro <= hasta)
                    .SumAsync(c => c.Monto);

                return new
                {
                    label,
                    desde,
                    hasta,
                    totalVentas = pedidos.Sum(p => p.Total),
                    cantidadPedidos = pedidos.Count,
                    ticketPromedio = pedidos.Count > 0 ? pedidos.Sum(p => p.Total) / pedidos.Count : 0,
                    clientesUnicos = pedidos.Select(p => p.ClienteId).Distinct().Count(),
                    totalVisitas = visitas,
                    nuevosClientes,
                    totalCobros = cobros
                };
            }

            var p1 = await GetMetrics(periodo1Desde, periodo1Hasta, "Periodo 1");
            var p2 = await GetMetrics(periodo2Desde, periodo2Hasta, "Periodo 2");

            // Calculate deltas using JSON serialization
            var j1 = System.Text.Json.JsonSerializer.Serialize(p1);
            var j2 = System.Text.Json.JsonSerializer.Serialize(p2);
            var d1 = System.Text.Json.JsonDocument.Parse(j1).RootElement;
            var d2 = System.Text.Json.JsonDocument.Parse(j2).RootElement;

            var deltas = new Dictionary<string, object>();
            foreach (var metric in new[] { "totalVentas", "cantidadPedidos", "ticketPromedio", "clientesUnicos", "totalVisitas", "nuevosClientes", "totalCobros" })
            {
                var v1 = d1.GetProperty(metric).GetDecimal();
                var v2 = d2.GetProperty(metric).GetDecimal();
                var diff = v2 - v1;
                var pct = v1 != 0 ? Math.Round((double)(diff / v1 * 100), 1) : 0;
                deltas[metric] = new { valor1 = v1, valor2 = v2, diferencia = diff, porcentajeCambio = pct };
            }

            return Results.Ok(new { periodo1 = p1, periodo2 = p2, deltas });
        });

        // ═══════════════════════════════════════════════════════
        // R12: AUTO-INSIGHTS (heuristicas estadisticas)
        // ═══════════════════════════════════════════════════════
        group.MapGet("/insights", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "insights");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;
            var diasRango = (fechaHasta - fechaDesde).TotalDays;
            var prevDesde = fechaDesde.AddDays(-diasRango);

            var insights = new List<object>();

            // -- Sales trend --
            var ventasActual = await db.Pedidos
                .Where(p => p.TenantId == tenantId && p.FechaPedido >= fechaDesde && p.FechaPedido <= fechaHasta && p.Estado != EstadoPedido.Cancelado)
                .SumAsync(p => p.Total);
            var ventasPrev = await db.Pedidos
                .Where(p => p.TenantId == tenantId && p.FechaPedido >= prevDesde && p.FechaPedido < fechaDesde && p.Estado != EstadoPedido.Cancelado)
                .SumAsync(p => p.Total);

            if (ventasPrev > 0)
            {
                var pct = Math.Round((double)((ventasActual - ventasPrev) / ventasPrev * 100), 1);
                insights.Add(new
                {
                    tipo = "ventas",
                    titulo = pct >= 0 ? "Ventas en crecimiento" : "Ventas en declive",
                    descripcion = $"Las ventas {(pct >= 0 ? "crecieron" : "cayeron")} {Math.Abs(pct)}% respecto al periodo anterior.",
                    valor = pct,
                    tendencia = pct > 5 ? "up" : pct < -5 ? "down" : "stable"
                });
            }

            // -- Top/worst zone by growth --
            var zonas = await db.Zonas.Where(z => z.TenantId == tenantId).Select(z => new { z.Id, z.Nombre }).ToListAsync();
            var clienteZona = await db.Clientes.Where(c => c.TenantId == tenantId).Select(c => new { c.Id, c.IdZona }).ToListAsync();
            var pedidosPeriodo = await db.Pedidos
                .Where(p => p.TenantId == tenantId && p.FechaPedido >= fechaDesde && p.FechaPedido <= fechaHasta && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new { p.ClienteId, p.Total }).ToListAsync();
            var pedidosPrev = await db.Pedidos
                .Where(p => p.TenantId == tenantId && p.FechaPedido >= prevDesde && p.FechaPedido < fechaDesde && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new { p.ClienteId, p.Total }).ToListAsync();

            if (zonas.Count > 1)
            {
                var zonaGrowth = zonas.Select(z =>
                {
                    var cids = clienteZona.Where(c => c.IdZona == z.Id).Select(c => c.Id).ToHashSet();
                    var actual = pedidosPeriodo.Where(p => cids.Contains(p.ClienteId)).Sum(p => p.Total);
                    var prev = pedidosPrev.Where(p => cids.Contains(p.ClienteId)).Sum(p => p.Total);
                    var growth = prev > 0 ? (double)((actual - prev) / prev * 100) : 0;
                    return new { z.Nombre, actual, prev, growth };
                }).OrderByDescending(z => z.growth).ToList();

                var best = zonaGrowth.First();
                var worst = zonaGrowth.Last();

                if (best.growth > 0)
                    insights.Add(new { tipo = "zona", titulo = $"Mejor zona: {best.Nombre}", descripcion = $"Crecio {Math.Round(best.growth, 1)}% en ventas este periodo.", valor = Math.Round(best.growth, 1), tendencia = "up" });
                if (worst.growth < 0)
                    insights.Add(new { tipo = "zona", titulo = $"Zona con oportunidad: {worst.Nombre}", descripcion = $"Cayo {Math.Abs(Math.Round(worst.growth, 1))}% en ventas. Revisar cobertura.", valor = Math.Round(worst.growth, 1), tendencia = "down" });
            }

            // -- Inventory alerts --
            var invCritico = await db.Inventarios
                .Where(i => i.TenantId == tenantId && (i.CantidadActual <= 0 || i.CantidadActual < i.StockMinimo))
                .CountAsync();
            if (invCritico > 0)
                insights.Add(new { tipo = "inventario", titulo = $"{invCritico} productos con stock critico", descripcion = "Productos sin stock o por debajo del minimo que requieren reabastecimiento.", valor = invCritico, tendencia = "down" });

            // -- Visit effectiveness --
            var visitasTotal = await db.ClienteVisitas
                .Where(v => v.TenantId == tenantId && v.FechaHoraInicio >= fechaDesde && v.FechaHoraInicio <= fechaHasta)
                .CountAsync();
            var visitasConVenta = await db.ClienteVisitas
                .Where(v => v.TenantId == tenantId && v.FechaHoraInicio >= fechaDesde && v.FechaHoraInicio <= fechaHasta && v.Resultado == ResultadoVisita.Venta)
                .CountAsync();

            if (visitasTotal > 0)
            {
                var efectividad = Math.Round((double)visitasConVenta / visitasTotal * 100, 1);
                insights.Add(new
                {
                    tipo = "visitas",
                    titulo = $"Efectividad de visitas: {efectividad}%",
                    descripcion = $"{visitasConVenta} de {visitasTotal} visitas resultaron en venta.",
                    valor = efectividad,
                    tendencia = efectividad >= 50 ? "up" : efectividad >= 30 ? "stable" : "down"
                });
            }

            // -- Top product trend --
            var pedidoIdsActual = await db.Pedidos
                .Where(p => p.TenantId == tenantId && p.FechaPedido >= fechaDesde && p.FechaPedido <= fechaHasta && p.Estado != EstadoPedido.Cancelado)
                .Select(p => p.Id).ToListAsync();
            var pedidoIdsPrev = await db.Pedidos
                .Where(p => p.TenantId == tenantId && p.FechaPedido >= prevDesde && p.FechaPedido < fechaDesde && p.Estado != EstadoPedido.Cancelado)
                .Select(p => p.Id).ToListAsync();

            var prodActual = await db.DetallePedidos
                .Where(d => pedidoIdsActual.Contains(d.PedidoId))
                .GroupBy(d => new { d.ProductoId, d.Producto.Nombre })
                .Select(g => new { g.Key.ProductoId, g.Key.Nombre, Total = g.Sum(d => d.Total) })
                .OrderByDescending(g => g.Total)
                .Take(5)
                .ToListAsync();

            var prodPrev = await db.DetallePedidos
                .Where(d => pedidoIdsPrev.Contains(d.PedidoId))
                .GroupBy(d => d.ProductoId)
                .Select(g => new { ProductoId = g.Key, Total = g.Sum(d => d.Total) })
                .ToListAsync();

            foreach (var prod in prodActual.Take(1))
            {
                var prev = prodPrev.FirstOrDefault(p => p.ProductoId == prod.ProductoId);
                if (prev != null && prev.Total > 0)
                {
                    var growth = Math.Round((double)((prod.Total - prev.Total) / prev.Total * 100), 1);
                    if (Math.Abs(growth) > 10)
                        insights.Add(new { tipo = "producto", titulo = $"Producto destacado: {prod.Nombre}", descripcion = $"{(growth > 0 ? "Crecio" : "Cayo")} {Math.Abs(growth)}% en ventas.", valor = growth, tendencia = growth > 0 ? "up" : "down" });
                }
            }

            // -- New clients trend --
            var nuevosActual = await db.Clientes.Where(c => c.TenantId == tenantId && c.CreadoEn >= fechaDesde && c.CreadoEn <= fechaHasta).CountAsync();
            var nuevosPrev = await db.Clientes.Where(c => c.TenantId == tenantId && c.CreadoEn >= prevDesde && c.CreadoEn < fechaDesde).CountAsync();
            if (nuevosPrev > 0)
            {
                var pctClientes = Math.Round((double)(nuevosActual - nuevosPrev) / nuevosPrev * 100, 1);
                insights.Add(new { tipo = "clientes", titulo = $"{nuevosActual} nuevos clientes", descripcion = $"{(pctClientes >= 0 ? "Aumento" : "Disminucion")} de {Math.Abs(pctClientes)}% vs periodo anterior.", valor = pctClientes, tendencia = pctClientes > 0 ? "up" : pctClientes < 0 ? "down" : "stable" });
            }
            else if (nuevosActual > 0)
            {
                insights.Add(new { tipo = "clientes", titulo = $"{nuevosActual} nuevos clientes", descripcion = "Nuevos clientes registrados en este periodo.", valor = nuevosActual, tendencia = "up" });
            }

            return Results.Ok(new { insights, periodo = new { desde = fechaDesde, hasta = fechaHasta } });
        });


        // ═══════════════════════════════════════════════════════
        // R13: EFECTIVIDAD DE VISITAS
        // ═══════════════════════════════════════════════════════
        group.MapGet("/efectividad-visitas", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "efectividad-visitas");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            var vendedores = await db.Usuarios
                .Where(u => u.TenantId == tenantId && u.Activo)
                .Select(u => new { u.Id, u.Nombre })
                .ToListAsync();

            var visitas = await db.ClienteVisitas
                .Where(v => v.TenantId == tenantId
                    && v.FechaHoraInicio >= fechaDesde
                    && v.FechaHoraInicio <= fechaHasta)
                .Select(v => new { v.UsuarioId, v.FechaHoraInicio, v.FechaHoraFin, v.Resultado })
                .ToListAsync();

            var porVendedor = vendedores.Select(v =>
            {
                var vis = visitas.Where(vi => vi.UsuarioId == v.Id).ToList();
                var total = vis.Count;
                var conVenta = vis.Count(vi => vi.Resultado == ResultadoVisita.Venta);
                var duraciones = vis
                    .Where(vi => vi.FechaHoraInicio.HasValue && vi.FechaHoraFin.HasValue)
                    .Select(vi => (vi.FechaHoraFin!.Value - vi.FechaHoraInicio!.Value).TotalMinutes)
                    .ToList();

                return new
                {
                    usuarioId = v.Id,
                    nombre = v.Nombre,
                    totalVisitas = total,
                    visitasConVenta = conVenta,
                    tasaConversion = total > 0 ? Math.Round((double)conVenta / total * 100, 1) : 0,
                    duracionPromedio = duraciones.Count > 0 ? Math.Round(duraciones.Average(), 1) : 0
                };
            })
            .Where(v => v.totalVisitas > 0)
            .OrderByDescending(v => v.tasaConversion)
            .ToList();

            // Heatmap: dia semana x hora
            var heatmap = visitas
                .Where(v => v.FechaHoraInicio.HasValue)
                .GroupBy(v => new { Dia = v.FechaHoraInicio!.Value.DayOfWeek, Hora = v.FechaHoraInicio!.Value.Hour })
                .Select(g => new { dia = (int)g.Key.Dia, hora = g.Key.Hora, cantidad = g.Count() })
                .OrderBy(h => h.dia).ThenBy(h => h.hora)
                .ToList();

            var totalVisitas = visitas.Count;
            var totalConVenta = visitas.Count(v => v.Resultado == ResultadoVisita.Venta);

            return Results.Ok(new
            {
                vendedores = porVendedor,
                heatmap,
                resumen = new
                {
                    totalVisitas,
                    totalConVenta,
                    tasaConversionGeneral = totalVisitas > 0 ? Math.Round((double)totalConVenta / totalVisitas * 100, 1) : 0
                }
            });
        });

        // ═══════════════════════════════════════════════════════
        // R14: COMISIONES
        // ═══════════════════════════════════════════════════════
        group.MapGet("/comisiones", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] double porcentaje = 5.0) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "comisiones");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            // Porcentaje de comisión debe estar en rango razonable.
            if (porcentaje < 0 || porcentaje > 100)
                return Results.BadRequest(new { message = "El porcentaje de comisión debe estar entre 0 y 100." });

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            // Try to get tenant-specific commission rate from CompanySetting
            var setting = await db.CompanySettings
                .Where(s => s.TenantId == tenantId)
                .Select(s => new { s.TenantId })
                .FirstOrDefaultAsync();

            var comisionPct = porcentaje / 100.0;

            var vendedores = await db.Usuarios
                .Where(u => u.TenantId == tenantId && u.Activo)
                .Select(u => new { u.Id, u.Nombre })
                .ToListAsync();

            var pedidos = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new { p.UsuarioId, p.Total })
                .ToListAsync();

            var result = vendedores.Select(v =>
            {
                var ventas = pedidos.Where(p => p.UsuarioId == v.Id).ToList();
                var totalVentas = ventas.Sum(p => p.Total);
                var comision = Math.Round(totalVentas * (decimal)comisionPct, 2);

                return new
                {
                    usuarioId = v.Id,
                    nombre = v.Nombre,
                    totalVentas,
                    cantidadPedidos = ventas.Count,
                    porcentajeComision = porcentaje,
                    comision
                };
            })
            .Where(v => v.totalVentas > 0)
            .OrderByDescending(v => v.comision)
            .ToList();

            return Results.Ok(new
            {
                vendedores = result,
                totalComisiones = result.Sum(v => v.comision),
                totalVentas = result.Sum(v => v.totalVentas),
                porcentajeAplicado = porcentaje
            });
        });

        // ═══════════════════════════════════════════════════════
        // R15: RENTABILIDAD POR CLIENTE
        // ═══════════════════════════════════════════════════════
        group.MapGet("/rentabilidad-cliente", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int top = 20) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "rentabilidad-cliente");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            if (top < 1) top = 1;
            if (top > 500) top = 500;

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-3);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            var clientes = await db.Clientes
                .Where(c => c.TenantId == tenantId)
                .Select(c => new { c.Id, c.Nombre })
                .ToListAsync();

            var pedidos = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new { p.ClienteId, p.Total, p.FechaPedido })
                .ToListAsync();

            var result = clientes.Select(c =>
            {
                var pedidosCliente = pedidos.Where(p => p.ClienteId == c.Id).OrderBy(p => p.FechaPedido).ToList();
                var totalVentas = pedidosCliente.Sum(p => p.Total);
                var cantidadPedidos = pedidosCliente.Count;
                var ticketPromedio = cantidadPedidos > 0 ? totalVentas / cantidadPedidos : 0;

                // Average days between orders
                double diasEntrePedidos = 0;
                if (pedidosCliente.Count > 1)
                {
                    var diffs = new List<double>();
                    for (int i = 1; i < pedidosCliente.Count; i++)
                        diffs.Add((pedidosCliente[i].FechaPedido - pedidosCliente[i - 1].FechaPedido).TotalDays);
                    diasEntrePedidos = Math.Round(diffs.Average(), 1);
                }

                return new
                {
                    clienteId = c.Id,
                    nombre = c.Nombre,
                    totalVentas,
                    cantidadPedidos,
                    ticketPromedio,
                    diasEntrePedidos,
                    primerPedido = pedidosCliente.FirstOrDefault()?.FechaPedido,
                    ultimoPedido = pedidosCliente.LastOrDefault()?.FechaPedido
                };
            })
            .Where(c => c.cantidadPedidos > 0)
            .OrderByDescending(c => c.totalVentas)
            .Take(top)
            .ToList();

            return Results.Ok(new { clientes = result, total = result.Count });
        });

        // ═══════════════════════════════════════════════════════
        // R16: ANALISIS ABC (Pareto)
        // ═══════════════════════════════════════════════════════
        group.MapGet("/analisis-abc", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] string tipo = "clientes") =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "analisis-abc");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            // Sólo dos tipos válidos para el análisis ABC.
            if (tipo != "clientes" && tipo != "productos")
                return Results.BadRequest(new { message = "El parámetro 'tipo' debe ser 'clientes' o 'productos'." });

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-3);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            if (tipo == "productos")
            {
                var pedidoIds = await db.Pedidos
                    .Where(p => p.TenantId == tenantId
                        && p.FechaPedido >= fechaDesde && p.FechaPedido <= fechaHasta
                        && p.Estado != EstadoPedido.Cancelado)
                    .Select(p => p.Id).ToListAsync();

                var detalles = await db.DetallePedidos
                    .Where(d => pedidoIds.Contains(d.PedidoId))
                    .GroupBy(d => new { d.ProductoId, d.Producto.Nombre })
                    .Select(g => new { id = g.Key.ProductoId, nombre = g.Key.Nombre, totalVentas = g.Sum(d => d.Total) })
                    .OrderByDescending(g => g.totalVentas)
                    .ToListAsync();

                var totalGeneral = detalles.Sum(d => d.totalVentas);
                decimal acumulado = 0;
                var items = detalles.Select(d =>
                {
                    acumulado += d.totalVentas;
                    var pctAcum = totalGeneral > 0 ? Math.Round((double)(acumulado / totalGeneral * 100), 1) : 0;
                    var clase = pctAcum <= 80 ? "A" : pctAcum <= 95 ? "B" : "C";
                    return new
                    {
                        id = d.id, nombre = d.nombre, totalVentas = d.totalVentas,
                        porcentaje = totalGeneral > 0 ? Math.Round((double)(d.totalVentas / totalGeneral * 100), 1) : 0,
                        porcentajeAcumulado = pctAcum, clase
                    };
                }).ToList();

                return Results.Ok(new
                {
                    tipo = "productos",
                    items,
                    resumen = new
                    {
                        claseA = items.Count(i => i.clase == "A"),
                        claseB = items.Count(i => i.clase == "B"),
                        claseC = items.Count(i => i.clase == "C"),
                        totalGeneral
                    }
                });
            }
            else // clientes
            {
                var pedidos = await db.Pedidos
                    .Where(p => p.TenantId == tenantId
                        && p.FechaPedido >= fechaDesde && p.FechaPedido <= fechaHasta
                        && p.Estado != EstadoPedido.Cancelado)
                    .GroupBy(p => p.ClienteId)
                    .Select(g => new { clienteId = g.Key, totalVentas = g.Sum(p => p.Total) })
                    .OrderByDescending(g => g.totalVentas)
                    .ToListAsync();

                var clienteIds = pedidos.Select(p => p.clienteId).ToList();
                var nombres = await db.Clientes
                    .Where(c => clienteIds.Contains(c.Id))
                    .Select(c => new { c.Id, c.Nombre })
                    .ToDictionaryAsync(c => c.Id, c => c.Nombre);

                var totalGeneral = pedidos.Sum(p => p.totalVentas);
                decimal acumulado = 0;
                var items = pedidos.Select(p =>
                {
                    acumulado += p.totalVentas;
                    var pctAcum = totalGeneral > 0 ? Math.Round((double)(acumulado / totalGeneral * 100), 1) : 0;
                    var clase = pctAcum <= 80 ? "A" : pctAcum <= 95 ? "B" : "C";
                    return new
                    {
                        id = p.clienteId,
                        nombre = nombres.GetValueOrDefault(p.clienteId, ""),
                        totalVentas = p.totalVentas,
                        porcentaje = totalGeneral > 0 ? Math.Round((double)(p.totalVentas / totalGeneral * 100), 1) : 0,
                        porcentajeAcumulado = pctAcum,
                        clase
                    };
                }).ToList();

                return Results.Ok(new
                {
                    tipo = "clientes",
                    items,
                    resumen = new
                    {
                        claseA = items.Count(i => i.clase == "A"),
                        claseB = items.Count(i => i.clase == "B"),
                        claseC = items.Count(i => i.clase == "C"),
                        totalGeneral
                    }
                });
            }
        });

        // ═══════════════════════════════════════════════════════
        // R17: ESTADO DE CUENTA POR CLIENTE
        // Movimientos (pedidos = cargo, cobros = abono) con saldo corrido.
        // ═══════════════════════════════════════════════════════
        group.MapGet("/estado-cuenta", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] int? clienteId,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "estado-cuenta");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-3);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            // Pedidos y cobros del tenant en el rango (para detectar actividad y armar movimientos).
            var pedidosRango = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => new { p.Id, p.ClienteId, p.NumeroPedido, p.FechaPedido, p.Total })
                .ToListAsync();

            var cobrosRango = await db.Cobros
                .Where(c => c.TenantId == tenantId
                    && c.FechaCobro >= fechaDesde
                    && c.FechaCobro <= fechaHasta)
                .Select(c => new { c.ClienteId, c.Monto, c.MetodoPago, c.FechaCobro })
                .ToListAsync();

            // Clientes con saldo > 0 o con actividad en el rango → selector.
            var clienteIdsActivos = pedidosRango.Select(p => p.ClienteId)
                .Concat(cobrosRango.Select(c => c.ClienteId))
                .ToHashSet();

            var clientesRaw = await db.Clientes
                .Where(c => c.TenantId == tenantId)
                .Select(c => new { c.Id, c.Nombre, c.RFC, c.Saldo })
                .ToListAsync();

            var clientesLista = clientesRaw
                .Where(c => c.Saldo > 0 || clienteIdsActivos.Contains(c.Id))
                .OrderBy(c => c.Nombre)
                .Select(c => new { id = c.Id, nombre = c.Nombre })
                .ToList();

            // Cliente seleccionado: el dado, o el primero de la lista.
            var clienteSel = clienteId ?? clientesLista.FirstOrDefault()?.id;

            if (clienteSel == null)
                return Results.Ok(new
                {
                    clientes = clientesLista,
                    clienteId = (int?)null,
                    clienteNombre = (string?)null,
                    clienteRfc = (string?)null,
                    movimientos = new List<object>(),
                    cargosTotal = 0m,
                    abonosTotal = 0m,
                    saldoActual = 0m
                });

            var clienteInfo = clientesRaw.FirstOrDefault(c => c.Id == clienteSel.Value);

            // Merge de movimientos: pedidos (cargo) + cobros (abono), ordenados por fecha asc.
            var movimientosBase = pedidosRango
                .Where(p => p.ClienteId == clienteSel.Value)
                .Select(p => new
                {
                    fecha = p.FechaPedido,
                    concepto = $"Pedido {(string.IsNullOrWhiteSpace(p.NumeroPedido) ? "P-" + p.Id : p.NumeroPedido)}",
                    cargo = p.Total,
                    abono = 0m
                })
                .Concat(cobrosRango
                    .Where(c => c.ClienteId == clienteSel.Value)
                    .Select(c => new
                    {
                        fecha = c.FechaCobro,
                        concepto = $"Cobro · {c.MetodoPago}",
                        cargo = 0m,
                        abono = c.Monto
                    }))
                .OrderBy(m => m.fecha)
                .ToList();

            decimal saldoCorrido = 0;
            var movimientos = movimientosBase.Select(m =>
            {
                saldoCorrido += m.cargo - m.abono;
                return new
                {
                    m.fecha,
                    m.concepto,
                    m.cargo,
                    m.abono,
                    saldo = saldoCorrido
                };
            }).ToList();

            return Results.Ok(new
            {
                clientes = clientesLista,
                clienteId = clienteSel,
                clienteNombre = clienteInfo?.Nombre,
                clienteRfc = clienteInfo?.RFC,
                movimientos,
                cargosTotal = movimientos.Sum(m => m.cargo),
                abonosTotal = movimientos.Sum(m => m.abono),
                saldoActual = saldoCorrido
            });
        });

        // ═══════════════════════════════════════════════════════
        // R18: COBRANZA DEL PERÍODO
        // Cobros en rango con cliente, vendedor y forma de pago + desglose %.
        // ═══════════════════════════════════════════════════════
        group.MapGet("/cobranza-periodo", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "cobranza-periodo");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-3);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            var cobrosRaw = await db.Cobros
                .Where(c => c.TenantId == tenantId
                    && c.FechaCobro >= fechaDesde
                    && c.FechaCobro <= fechaHasta)
                .Select(c => new { c.ClienteId, c.UsuarioId, c.Monto, c.MetodoPago, c.FechaCobro })
                .ToListAsync();

            var clientesDict = await db.Clientes
                .Where(c => c.TenantId == tenantId)
                .Select(c => new { c.Id, c.Nombre })
                .ToDictionaryAsync(c => c.Id, c => c.Nombre);

            var vendedoresDict = await db.Usuarios
                .Where(u => u.TenantId == tenantId)
                .Select(u => new { u.Id, u.Nombre })
                .ToDictionaryAsync(u => u.Id, u => u.Nombre);

            var cobros = cobrosRaw
                .OrderByDescending(c => c.FechaCobro)
                .Select(c => new
                {
                    fecha = c.FechaCobro,
                    cliente = clientesDict.GetValueOrDefault(c.ClienteId, ""),
                    vendedor = vendedoresDict.GetValueOrDefault(c.UsuarioId, ""),
                    formaPago = c.MetodoPago.ToString(),
                    monto = c.Monto
                })
                .ToList();

            var total = cobrosRaw.Sum(c => c.Monto);

            var porForma = cobrosRaw
                .GroupBy(c => c.MetodoPago)
                .Select(g => new
                {
                    forma = g.Key.ToString(),
                    monto = g.Sum(c => c.Monto),
                    porcentaje = total > 0 ? Math.Round((double)(g.Sum(c => c.Monto) / total * 100), 1) : 0
                })
                .OrderByDescending(f => f.monto)
                .ToList();

            return Results.Ok(new
            {
                cobros,
                total,
                count = cobros.Count,
                porForma
            });
        });

        // ═══════════════════════════════════════════════════════
        // R19: DOCUMENTOS POR VENCER (PRO)
        // Pedidos cuya fecha de vencimiento (FechaPedido + DiasCredito) cae
        // dentro de los proximos `dias`. DSO estimado de la cartera.
        // ═══════════════════════════════════════════════════════
        group.MapGet("/por-vencer", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] int dias = 15) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "por-vencer");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            if (dias < 0) dias = 0;

            var ahora = DateTime.UtcNow;

            // Clientes con saldo pendiente.
            var clientes = await db.Clientes
                .Where(c => c.TenantId == tenantId && c.Saldo > 0)
                .Select(c => new { c.Id, c.Nombre, c.Saldo, c.DiasCredito })
                .ToListAsync();

            var clienteIds = clientes.Select(c => c.Id).ToHashSet();
            var diasCreditoDict = clientes.ToDictionary(c => c.Id, c => c.DiasCredito);
            var nombresDict = clientes.ToDictionary(c => c.Id, c => c.Nombre);

            // Pedidos no cancelados de esos clientes (todo el historial, para calcular vencimientos).
            var pedidos = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.Estado != EstadoPedido.Cancelado
                    && clienteIds.Contains(p.ClienteId))
                .Select(p => new { p.Id, p.ClienteId, p.NumeroPedido, p.FechaPedido, p.Total })
                .ToListAsync();

            var documentos = pedidos
                .Select(p =>
                {
                    var vence = p.FechaPedido.AddDays(diasCreditoDict.GetValueOrDefault(p.ClienteId, 0));
                    var diasRestantes = (int)Math.Round((vence - ahora).TotalDays);
                    return new
                    {
                        cliente = nombresDict.GetValueOrDefault(p.ClienteId, ""),
                        folio = string.IsNullOrWhiteSpace(p.NumeroPedido) ? "P-" + p.Id : p.NumeroPedido,
                        vence,
                        dias = diasRestantes,
                        monto = p.Total
                    };
                })
                .Where(d => d.dias >= 0 && d.dias <= dias)
                .OrderBy(d => d.dias)
                .ToList();

            // DSO = (cartera total) / (ventas promedio diarias ultimos 30 dias).
            var totalCartera = clientes.Sum(c => c.Saldo);
            var desde30 = ahora.AddDays(-30);
            var ventas30 = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= desde30
                    && p.FechaPedido <= ahora
                    && p.Estado != EstadoPedido.Cancelado)
                .SumAsync(p => p.Total);

            var ventasDiarias = ventas30 / 30m;
            var dso = ventasDiarias > 0 ? (int)Math.Round((double)(totalCartera / ventasDiarias)) : 0;

            return Results.Ok(new
            {
                documentos,
                totalPorVencer = documentos.Sum(d => d.monto),
                dso,
                count = documentos.Count
            });
        });

        // ═══════════════════════════════════════════════════════
        // R20: INVENTARIO VALORIZADO (FREE)
        // Valor de inventario al costo: por producto con existencia,
        // valor = CantidadActual * Costo. Totales agregados del tenant.
        // ═══════════════════════════════════════════════════════
        group.MapGet("/inventario-valorizado", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "inv-valorizado");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var rows = await db.Inventarios
                .Where(i => i.TenantId == tenantId && i.CantidadActual > 0)
                .Select(i => new
                {
                    productoId = i.ProductoId,
                    nombre = i.Producto.Nombre,
                    existencia = i.CantidadActual,
                    costo = i.Producto.Costo
                })
                .ToListAsync();

            var productos = rows
                .Select(r => new
                {
                    r.productoId,
                    r.nombre,
                    r.existencia,
                    r.costo,
                    valor = r.existencia * r.costo
                })
                .OrderByDescending(p => p.valor)
                .ToList();

            return Results.Ok(new
            {
                productos,
                totalValorizado = productos.Sum(p => p.valor),
                totalSkus = productos.Count,
                totalUnidades = productos.Sum(p => p.existencia)
            });
        });

        // ═══════════════════════════════════════════════════════
        // R21: MARGEN POR PRODUCTO (PRO)
        // Por producto vendido en el rango: precio = promedio de
        // PrecioUnitario, costo = CostoUnitario snapshot (fallback al
        // Costo actual del producto si el snapshot es 0). Margen y utilidad.
        // ═══════════════════════════════════════════════════════
        group.MapGet("/margen", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "margen");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-3);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            var pedidoIds = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => p.Id)
                .ToListAsync();

            var detalles = await db.DetallePedidos
                .Where(d => pedidoIds.Contains(d.PedidoId) && d.Activo)
                .Select(d => new
                {
                    d.ProductoId,
                    nombre = d.Producto.Nombre,
                    precioBaseProducto = d.Producto.PrecioBase,
                    costoActualProducto = d.Producto.Costo,
                    d.PrecioUnitario,
                    d.CostoUnitario,
                    d.Cantidad
                })
                .ToListAsync();

            var productos = detalles
                .GroupBy(d => new { d.ProductoId, d.nombre })
                .Select(g =>
                {
                    var unidades = g.Sum(d => d.Cantidad);
                    // Precio = promedio ponderado de PrecioUnitario; fallback a PrecioBase del producto.
                    var precio = unidades > 0
                        ? g.Sum(d => d.PrecioUnitario * d.Cantidad) / unidades
                        : g.Select(d => d.precioBaseProducto).FirstOrDefault();
                    // Costo = CostoUnitario snapshot promedio; si 0, fallback al Costo actual del producto.
                    var costoSnapshot = unidades > 0
                        ? g.Sum(d => d.CostoUnitario * d.Cantidad) / unidades
                        : 0m;
                    var costo = costoSnapshot > 0 ? costoSnapshot : g.Select(d => d.costoActualProducto).FirstOrDefault();
                    var margenUnitario = precio - costo;
                    var margenPct = precio > 0 ? (int)Math.Round((double)((precio - costo) / precio * 100)) : 0;
                    var utilidad = (precio - costo) * unidades;

                    return new
                    {
                        nombre = g.Key.nombre,
                        precio,
                        costo,
                        margenUnitario,
                        margenPct,
                        utilidad
                    };
                })
                .OrderByDescending(p => p.utilidad)
                .ToList();

            return Results.Ok(new
            {
                productos,
                utilidadBruta = productos.Sum(p => p.utilidad),
                margenPromedio = productos.Count > 0 ? (int)Math.Round(productos.Average(p => p.margenPct)) : 0
            });
        });

        // ═══════════════════════════════════════════════════════
        // R22: ROTACIÓN DE INVENTARIO (PRO)
        // Por producto: existencia + stock mínimo del inventario, unidades
        // vendidas en el rango (DetallePedido de pedidos no cancelados).
        // Rotación aproximada = unidadesVendidas / existencia (robusta vs
        // div/0). Días de inventario y estado (Reordenar/Exceso/OK).
        // ═══════════════════════════════════════════════════════
        group.MapGet("/rotacion", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "rotacion");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-3);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            // Existencia + mínimo por producto desde inventario.
            var inventario = await db.Inventarios
                .Where(i => i.TenantId == tenantId)
                .Select(i => new
                {
                    i.ProductoId,
                    nombre = i.Producto.Nombre,
                    existencia = i.CantidadActual,
                    minimo = i.StockMinimo
                })
                .ToListAsync();

            // Unidades vendidas en el rango por producto.
            var pedidoIds = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
                    && p.FechaPedido <= fechaHasta
                    && p.Estado != EstadoPedido.Cancelado)
                .Select(p => p.Id)
                .ToListAsync();

            var ventas = await db.DetallePedidos
                .Where(d => pedidoIds.Contains(d.PedidoId) && d.Activo)
                .GroupBy(d => d.ProductoId)
                .Select(g => new { ProductoId = g.Key, Unidades = g.Sum(d => d.Cantidad) })
                .ToListAsync();

            var ventasDict = ventas.ToDictionary(v => v.ProductoId, v => v.Unidades);

            var productos = inventario
                .Select(i =>
                {
                    var unidadesVendidas = ventasDict.GetValueOrDefault(i.ProductoId, 0m);
                    // Rotación aprox. en unidades = vendidas / existencia (evita div/0).
                    var rotacion = i.existencia > 0
                        ? Math.Round((double)(unidadesVendidas / i.existencia), 1)
                        : 0d;
                    var diasInv = rotacion > 0 ? (int)Math.Round(365 / rotacion) : 0;
                    var estado = i.existencia <= i.minimo ? "Reordenar"
                               : rotacion < 1 ? "Exceso"
                               : "OK";

                    return new
                    {
                        nombre = i.nombre,
                        existencia = i.existencia,
                        minimo = i.minimo,
                        rotacion,
                        diasInv,
                        estado
                    };
                })
                .OrderByDescending(p => p.rotacion)
                .ToList();

            return Results.Ok(new { productos });
        });

        // ═══════════════════════════════════════════════════════
        // CORE CONTABLE (partida doble, on-demand) — tier "contabilidad"
        // Slugs: balanza, edo-resultados, balance-general, iva, diot.
        // ═══════════════════════════════════════════════════════

        // C1: BALANZA DE COMPROBACION
        group.MapGet("/balanza", async (
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] IContabilidadService contabilidad,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "balanza");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            var b = await contabilidad.GenerarBalanzaAsync(tenantId, fechaDesde, fechaHasta);

            return Results.Ok(new
            {
                filas = b.Filas.Select(f => new { codigo = f.Codigo, nombre = f.Nombre, debe = f.Debe, haber = f.Haber }),
                totalDebe = b.TotalDebe,
                totalHaber = b.TotalHaber,
                cuadrada = b.Cuadrada
            });
        });

        // C2: ESTADO DE RESULTADOS
        group.MapGet("/estado-resultados", async (
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] IContabilidadService contabilidad,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "edo-resultados");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            var r = await contabilidad.GenerarEstadoResultadosAsync(tenantId, fechaDesde, fechaHasta);

            return Results.Ok(new
            {
                ventasNetas = r.VentasNetas,
                costoVentas = r.CostoVentas,
                utilidadBruta = r.UtilidadBruta,
                gastos = r.Gastos.Select(g => new { categoria = g.Categoria, monto = g.Monto }),
                totalGastos = r.TotalGastos,
                utilidadOperacion = r.UtilidadOperacion,
                utilidadNeta = r.UtilidadNeta,
                vertical = new
                {
                    costoVentas = r.Vertical.CostoVentas,
                    utilidadBruta = r.Vertical.UtilidadBruta,
                    gastos = r.Vertical.Gastos,
                    utilidadOperacion = r.Vertical.UtilidadOperacion,
                    utilidadNeta = r.Vertical.UtilidadNeta
                }
            });
        });

        // C3: BALANCE GENERAL (al corte; desde = inicio de tiempo)
        group.MapGet("/balance-general", async (
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] IContabilidadService contabilidad,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "balance-general");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaHasta = hasta ?? DateTime.UtcNow;

            var bg = await contabilidad.GenerarBalanceGeneralAsync(tenantId, fechaHasta);

            return Results.Ok(new
            {
                activo = bg.Activo.Select(a => new { cuenta = a.Cuenta, nombre = a.Nombre, monto = a.Monto }),
                totalActivo = bg.TotalActivo,
                pasivo = bg.Pasivo.Select(p => new { cuenta = p.Cuenta, nombre = p.Nombre, monto = p.Monto }),
                totalPasivo = bg.TotalPasivo,
                capital = bg.Capital.Select(c => new { cuenta = c.Cuenta, nombre = c.Nombre, monto = c.Monto }),
                totalCapital = bg.TotalCapital,
                totalPasivoCapital = bg.TotalPasivoCapital,
                cuadrado = bg.Cuadrado
            });
        });

        // C4: REPORTE DE IVA
        group.MapGet("/reporte-iva", async (
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] IContabilidadService contabilidad,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "iva");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            var iva = await contabilidad.GenerarReporteIvaAsync(tenantId, fechaDesde, fechaHasta);

            return Results.Ok(new
            {
                trasladado = iva.Trasladado,
                acreditable = iva.Acreditable,
                saldo = iva.Saldo,
                aCargo = iva.ACargo,
                ventasGravadas = iva.VentasGravadas,
                comprasGravadas = iva.ComprasGravadas
            });
        });

        // C5: DIOT (Declaracion Informativa de Operaciones con Terceros)
        group.MapGet("/diot", async (
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] IContabilidadService contabilidad,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "diot");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            var diot = await contabilidad.GenerarDiotAsync(tenantId, fechaDesde, fechaHasta);

            return Results.Ok(new
            {
                proveedores = diot.Proveedores.Select(p => new
                {
                    rfc = p.Rfc,
                    nombre = p.Nombre,
                    tipoTercero = p.TipoTercero,
                    @base = p.Base,
                    ivaPagado = p.IvaPagado
                }),
                totalBase = diot.TotalBase,
                totalIva = diot.TotalIva
            });
        });

        // C6: CONTABILIDAD ELECTRONICA SAT (Anexo 24): 3 XML del periodo.
        // Catalogo de cuentas (CT), Balanza de comprobacion (BN) y Polizas (PL).
        // Estructuralmente validos: root + namespaces oficiales + datos reales del
        // rango. Reusa IContabilidadService (balanza/asientos) y CatalogoCuentas.
        group.MapGet("/contabilidad-electronica", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] IContabilidadService contabilidad,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "conta-elec");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            var rfc = await ResolverRfcEmisorAsync(db, tenantId);
            var balanza = await contabilidad.GenerarBalanzaAsync(tenantId, fechaDesde, fechaHasta);
            var asientos = await contabilidad.GenerarAsientosAsync(tenantId, fechaDesde, fechaHasta);

            var mes = fechaDesde.ToString("MM");
            var anio = fechaDesde.ToString("yyyy");
            var periodo = $"{anio}-{mes}";

            return Results.Ok(new
            {
                periodo,
                catalogoXml = ConstruirCatalogoXml(rfc, mes, anio),
                balanzaXml = ConstruirBalanzaXml(rfc, mes, anio, balanza),
                polizasXml = ConstruirPolizasXml(rfc, mes, anio, asientos)
            });
        });

        // C7: PAQUETE CONTADOR: ZIP descargable con balanza, DIOT, IVA y caratula.
        // Reusa IContabilidadService (balanza/diot/iva). ZipArchive en MemoryStream.
        group.MapGet("/paquete-contador", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IReportAccessService reportAccess,
            [FromServices] IContabilidadService contabilidad,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var access = await reportAccess.CanAccessReportAsync(tenantId, "paquete-contador");
            if (!access.Allowed)
                return Results.Json(new { error = access.Message, requiredTier = access.RequiredTier },
                    statusCode: StatusCodes.Status402PaymentRequired);

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

            var rfc = await ResolverRfcEmisorAsync(db, tenantId);
            var balanza = await contabilidad.GenerarBalanzaAsync(tenantId, fechaDesde, fechaHasta);
            var diot = await contabilidad.GenerarDiotAsync(tenantId, fechaDesde, fechaHasta);
            var iva = await contabilidad.GenerarReporteIvaAsync(tenantId, fechaDesde, fechaHasta);

            var mes = fechaDesde.ToString("MM");
            var anio = fechaDesde.ToString("yyyy");
            var periodo = $"{anio}-{mes}";

            var balanzaXml = ConstruirBalanzaXml(rfc, mes, anio, balanza);
            var diotCsv = ConstruirDiotCsv(diot);
            var ivaTxt = ConstruirIvaResumenTxt(periodo, iva);
            var leeme = ConstruirLeemeTxt(periodo);

            var bytes = ConstruirZip(new (string nombre, string contenido)[]
            {
                ("balanza.xml", balanzaXml),
                ("diot.csv", diotCsv),
                ("iva-resumen.txt", ivaTxt),
                ("LEEME.txt", leeme)
            });

            return Results.File(bytes, "application/zip", $"paquete-contador-{periodo}.zip");
        });

    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers Contabilidad Electronica / Paquete Contador
    // ─────────────────────────────────────────────────────────────────────────

    private const string RfcGenerico = "XAXX010101000";

    /// <summary>RFC del emisor desde DatosEmpresa; fallback al RFC generico SAT.</summary>
    private static async Task<string> ResolverRfcEmisorAsync(HandySuitesDbContext db, int tenantId)
    {
        var rfc = await db.DatosEmpresa
            .Where(d => d.TenantId == tenantId && d.IdentificadorFiscal != null)
            .Select(d => d.IdentificadorFiscal)
            .FirstOrDefaultAsync();
        return string.IsNullOrWhiteSpace(rfc) ? RfcGenerico : rfc!.Trim().ToUpperInvariant();
    }

    private static string Monto(decimal v) =>
        Math.Round(v, 2).ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);

    /// <summary>Catalogo de cuentas (CT) Anexo 24. Una cuenta por entrada del catalogo en codigo.</summary>
    private static string ConstruirCatalogoXml(string rfc, string mes, string anio)
    {
        System.Xml.Linq.XNamespace ct = "http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas";
        System.Xml.Linq.XNamespace xsi = "http://www.w3.org/2001/XMLSchema-instance";
        var root = new System.Xml.Linq.XElement(ct + "Catalogo",
            new System.Xml.Linq.XAttribute(System.Xml.Linq.XNamespace.Xmlns + "catalogocuentas", ct.NamespaceName),
            new System.Xml.Linq.XAttribute(System.Xml.Linq.XNamespace.Xmlns + "xsi", xsi.NamespaceName),
            new System.Xml.Linq.XAttribute(xsi + "schemaLocation", "http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas/CatalogoCuentas_1_3.xsd"),
            new System.Xml.Linq.XAttribute("Version", "1.3"),
            new System.Xml.Linq.XAttribute("RFC", rfc),
            new System.Xml.Linq.XAttribute("Mes", mes),
            new System.Xml.Linq.XAttribute("Anio", anio));

        foreach (var c in CatalogoCuentas.Cuentas)
        {
            var natur = c.Naturaleza == NaturalezaCuenta.Deudora ? "D" : "A";
            root.Add(new System.Xml.Linq.XElement(ct + "Ctas",
                new System.Xml.Linq.XAttribute("CodAgrup", c.CodigoAgrupadorSat),
                new System.Xml.Linq.XAttribute("NumCta", c.Codigo),
                new System.Xml.Linq.XAttribute("Desc", c.Nombre),
                new System.Xml.Linq.XAttribute("Nivel", "1"),
                new System.Xml.Linq.XAttribute("Natur", natur)));
        }

        return SerializarXml(root);
    }

    /// <summary>Balanza de comprobacion (BN) Anexo 24. Una cuenta por fila de la balanza del periodo.</summary>
    private static string ConstruirBalanzaXml(string rfc, string mes, string anio, BalanzaResult balanza)
    {
        System.Xml.Linq.XNamespace bce = "http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion";
        System.Xml.Linq.XNamespace xsi = "http://www.w3.org/2001/XMLSchema-instance";
        var root = new System.Xml.Linq.XElement(bce + "Balanza",
            new System.Xml.Linq.XAttribute(System.Xml.Linq.XNamespace.Xmlns + "BCE", bce.NamespaceName),
            new System.Xml.Linq.XAttribute(System.Xml.Linq.XNamespace.Xmlns + "xsi", xsi.NamespaceName),
            new System.Xml.Linq.XAttribute(xsi + "schemaLocation", "http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion/BalanzaComprobacion_1_3.xsd"),
            new System.Xml.Linq.XAttribute("Version", "1.3"),
            new System.Xml.Linq.XAttribute("RFC", rfc),
            new System.Xml.Linq.XAttribute("Mes", mes),
            new System.Xml.Linq.XAttribute("Anio", anio),
            new System.Xml.Linq.XAttribute("TipoEnvio", "N"));

        foreach (var f in balanza.Filas)
        {
            // SaldoFin segun naturaleza de la cuenta (deudora: Debe - Haber; acreedora: Haber - Debe).
            var natur = CatalogoCuentas.Naturaleza(f.Codigo);
            var saldoFin = natur == NaturalezaCuenta.Deudora ? f.Debe - f.Haber : f.Haber - f.Debe;
            root.Add(new System.Xml.Linq.XElement(bce + "Ctas",
                new System.Xml.Linq.XAttribute("NumCta", f.Codigo),
                new System.Xml.Linq.XAttribute("SaldoIni", "0"),
                new System.Xml.Linq.XAttribute("Debe", Monto(f.Debe)),
                new System.Xml.Linq.XAttribute("Haber", Monto(f.Haber)),
                new System.Xml.Linq.XAttribute("SaldoFin", Monto(saldoFin))));
        }

        return SerializarXml(root);
    }

    /// <summary>Polizas del periodo (PL) Anexo 24. Una poliza por asiento, una transaccion por linea.</summary>
    private static string ConstruirPolizasXml(string rfc, string mes, string anio, IReadOnlyList<Asiento> asientos)
    {
        System.Xml.Linq.XNamespace plz = "http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo";
        System.Xml.Linq.XNamespace xsi = "http://www.w3.org/2001/XMLSchema-instance";
        var root = new System.Xml.Linq.XElement(plz + "Polizas",
            new System.Xml.Linq.XAttribute(System.Xml.Linq.XNamespace.Xmlns + "PLZ", plz.NamespaceName),
            new System.Xml.Linq.XAttribute(System.Xml.Linq.XNamespace.Xmlns + "xsi", xsi.NamespaceName),
            new System.Xml.Linq.XAttribute(xsi + "schemaLocation", "http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo/PolizasPeriodo_1_3.xsd"),
            new System.Xml.Linq.XAttribute("Version", "1.3"),
            new System.Xml.Linq.XAttribute("RFC", rfc),
            new System.Xml.Linq.XAttribute("Mes", mes),
            new System.Xml.Linq.XAttribute("Anio", anio),
            new System.Xml.Linq.XAttribute("TipoSolicitud", "AF"));

        var numUnico = 0;
        foreach (var a in asientos)
        {
            numUnico++;
            var poliza = new System.Xml.Linq.XElement(plz + "Poliza",
                new System.Xml.Linq.XAttribute("NumUnIdenPol", numUnico.ToString()),
                new System.Xml.Linq.XAttribute("Fecha", a.Fecha.ToString("yyyy-MM-dd")),
                new System.Xml.Linq.XAttribute("Concepto", a.Concepto));

            foreach (var l in a.Lineas)
            {
                poliza.Add(new System.Xml.Linq.XElement(plz + "Transaccion",
                    new System.Xml.Linq.XAttribute("NumCta", l.Cuenta),
                    new System.Xml.Linq.XAttribute("DesCta", CatalogoCuentas.Nombre(l.Cuenta)),
                    new System.Xml.Linq.XAttribute("Concepto", a.Concepto),
                    new System.Xml.Linq.XAttribute("Debe", Monto(l.Debe)),
                    new System.Xml.Linq.XAttribute("Haber", Monto(l.Haber))));
            }

            root.Add(poliza);
        }

        return SerializarXml(root);
    }

    /// <summary>Serializa con declaracion XML UTF-8. XDocument escapa atributos correctamente.</summary>
    private static string SerializarXml(System.Xml.Linq.XElement root)
    {
        var doc = new System.Xml.Linq.XDocument(
            new System.Xml.Linq.XDeclaration("1.0", "UTF-8", null), root);
        using var sw = new System.IO.StringWriter();
        doc.Save(sw, System.Xml.Linq.SaveOptions.None);
        return sw.ToString();
    }

    /// <summary>DIOT a CSV: encabezado RFC,Proveedor,Base,IVA + una fila por proveedor.</summary>
    private static string ConstruirDiotCsv(DiotResult diot)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("RFC,Proveedor,Base,IVA");
        foreach (var p in diot.Proveedores)
            sb.AppendLine($"{CsvField(p.Rfc)},{CsvField(p.Nombre)},{Monto(p.Base)},{Monto(p.IvaPagado)}");
        return sb.ToString();
    }

    /// <summary>Escapa un campo CSV (comillas dobles si contiene coma, comilla o salto de linea).</summary>
    private static string CsvField(string? value)
    {
        var v = value ?? "";
        if (v.Contains(',') || v.Contains('"') || v.Contains('\n') || v.Contains('\r'))
            return "\"" + v.Replace("\"", "\"\"") + "\"";
        return v;
    }

    private static string ConstruirIvaResumenTxt(string periodo, ReporteIvaResult iva)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Resumen de IVA - Periodo {periodo}");
        sb.AppendLine();
        sb.AppendLine($"IVA trasladado:  {Monto(iva.Trasladado)}");
        sb.AppendLine($"IVA acreditable: {Monto(iva.Acreditable)}");
        sb.AppendLine($"Saldo de IVA:    {Monto(iva.Saldo)} ({(iva.ACargo ? "a cargo" : "a favor")})");
        return sb.ToString();
    }

    private static string ConstruirLeemeTxt(string periodo)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Paquete Contador");
        sb.AppendLine("================");
        sb.AppendLine();
        sb.AppendLine($"Periodo: {periodo}");
        sb.AppendLine();
        sb.AppendLine("Contenido:");
        sb.AppendLine("  balanza.xml      Balanza de comprobacion (Contabilidad Electronica SAT, Anexo 24)");
        sb.AppendLine("  diot.csv         Declaracion Informativa de Operaciones con Terceros (RFC,Proveedor,Base,IVA)");
        sb.AppendLine("  iva-resumen.txt  Resumen de IVA del periodo (trasladado, acreditable, saldo)");
        sb.AppendLine();
        sb.AppendLine($"Generado por Handy Sales el {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
        return sb.ToString();
    }

    /// <summary>Construye un ZIP en memoria con los archivos dados (nombre, contenido UTF-8).</summary>
    private static byte[] ConstruirZip((string nombre, string contenido)[] archivos)
    {
        using var ms = new System.IO.MemoryStream();
        using (var zip = new System.IO.Compression.ZipArchive(ms, System.IO.Compression.ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (nombre, contenido) in archivos)
            {
                var entry = zip.CreateEntry(nombre, System.IO.Compression.CompressionLevel.Optimal);
                using var es = entry.Open();
                var bytes = System.Text.Encoding.UTF8.GetBytes(contenido);
                es.Write(bytes, 0, bytes.Length);
            }
        }
        return ms.ToArray();
    }
}
