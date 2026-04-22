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

    public static void MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        // RBAC: Reports expose tenant-wide aggregates (cross-vendedor ventas,
        // cartera, metas, comisiones, insights). Vendedores/Viewers no deben
        // verlos — restringir a roles de gestión.
        var group = app.MapGroup("/api/reports")
            .RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN", "SUPERVISOR"));

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
        // R1: VENTAS POR PERÍODO
        // ═══════════════════════════════════════════════════════
        group.MapGet("/ventas-periodo", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] string agrupacion = "dia") =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

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
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

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
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int top = 20) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            // Clamp top a [1, 500] para evitar DoS y resultados sin sentido.
            if (top < 1) top = 1;
            if (top > 500) top = 500;

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

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
        // R4: VENTAS POR ZONA
        // ═══════════════════════════════════════════════════════
        group.MapGet("/ventas-zona", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

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
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int? zonaId,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 50) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

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
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int? zonaId) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

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
            [FromQuery] string periodo = "mes") =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var ahora = DateTime.UtcNow;
            DateTime fechaDesde;
            DateTime fechaDesdeAnterior;
            DateTime fechaHastaAnterior;

            switch (periodo)
            {
                case "semana":
                    fechaDesde = ahora.AddDays(-7);
                    fechaDesdeAnterior = ahora.AddDays(-14);
                    fechaHastaAnterior = ahora.AddDays(-7);
                    break;
                case "trimestre":
                    fechaDesde = ahora.AddMonths(-3);
                    fechaDesdeAnterior = ahora.AddMonths(-6);
                    fechaHastaAnterior = ahora.AddMonths(-3);
                    break;
                default:
                    fechaDesde = ahora.AddMonths(-1);
                    fechaDesdeAnterior = ahora.AddMonths(-2);
                    fechaHastaAnterior = ahora.AddMonths(-1);
                    break;
            }

            var pedidosActual = await db.Pedidos
                .Where(p => p.TenantId == tenantId
                    && p.FechaPedido >= fechaDesde
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
                .Where(v => v.TenantId == tenantId && v.FechaHoraInicio >= fechaDesde)
                .Select(v => new VisitaRow(v.ClienteId, v.UsuarioId, v.FechaHoraInicio, v.Resultado))
                .ToListAsync();

            var nuevosClientes = await db.Clientes
                .Where(c => c.TenantId == tenantId && c.CreadoEn >= fechaDesde)
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
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-3);
            var fechaHasta = hasta ?? DateTime.UtcNow;

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
                .Select(p => new { p.Id, p.ClienteId, p.FechaPedido, p.Total })
                .ToListAsync();

            // Cobros in range
            var cobros = await db.Cobros
                .Where(c => c.TenantId == tenantId
                    && c.FechaCobro >= fechaDesde
                    && c.FechaCobro <= fechaHasta)
                .Select(c => new { c.ClienteId, c.Monto, c.FechaCobro })
                .ToListAsync();

            var ahora = DateTime.UtcNow;

            var detalle = clientes.Select(c =>
            {
                var pedidosCliente = pedidos.Where(p => p.ClienteId == c.Id).OrderBy(p => p.FechaPedido).ToList();
                // Age = days since oldest unpaid pedido
                var oldestPedido = pedidosCliente.FirstOrDefault();
                var diasVencido = oldestPedido != null ? (int)(ahora - oldestPedido.FechaPedido).TotalDays : 0;

                var bucket = diasVencido <= 30 ? "corriente"
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
                    ultimoPago = cobros.Where(co => co.ClienteId == c.Id).MaxBy(co => co.FechaCobro)?.FechaCobro
                };
            })
            .Where(c => c.saldo > 0)
            .OrderByDescending(c => c.diasVencido)
            .ToList();

            var buckets = new
            {
                corriente = new { count = detalle.Count(d => d.bucket == "corriente"), total = detalle.Where(d => d.bucket == "corriente").Sum(d => d.saldo) },
                d31_60 = new { count = detalle.Count(d => d.bucket == "31-60"), total = detalle.Where(d => d.bucket == "31-60").Sum(d => d.saldo) },
                d61_90 = new { count = detalle.Count(d => d.bucket == "61-90"), total = detalle.Where(d => d.bucket == "61-90").Sum(d => d.saldo) },
                d90plus = new { count = detalle.Count(d => d.bucket == "90+"), total = detalle.Where(d => d.bucket == "90+").Sum(d => d.saldo) }
            };

            return Results.Ok(new
            {
                clientes = detalle,
                buckets,
                totalCartera = detalle.Sum(d => d.saldo),
                totalClientes = detalle.Count
            });
        });

        // ═══════════════════════════════════════════════════════
        // R10: CUMPLIMIENTO DE METAS
        // ═══════════════════════════════════════════════════════
        group.MapGet("/cumplimiento-metas", async (
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int? usuarioId) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var fechaDesde = desde ?? DateTime.UtcNow.AddMonths(-1);
            var fechaHasta = hasta ?? DateTime.UtcNow;

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
            [FromQuery] DateTime periodo1Desde,
            [FromQuery] DateTime periodo1Hasta,
            [FromQuery] DateTime periodo2Desde,
            [FromQuery] DateTime periodo2Hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

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
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

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

    }
}
