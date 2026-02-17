using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Endpoints;

public static class ReportEndpoints
{
    // Lightweight projections to avoid loading columns that may not exist in DB (e.g. Version)
    private record PedidoRow(int Id, int ClienteId, int UsuarioId, DateTime FechaPedido, decimal Total, EstadoPedido Estado);
    private record VisitaRow(int ClienteId, int UsuarioId, DateTime? FechaHoraInicio, ResultadoVisita Resultado);
    private record DetalleRow(int PedidoId, int ProductoId, string ProductoNombre, decimal Cantidad, decimal Total);

    public static void MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reports").RequireAuthorization();

        // ═══════════════════════════════════════════════════════
        // R1: VENTAS POR PERÍODO
        // ═══════════════════════════════════════════════════════
        group.MapGet("/ventas-periodo", async (
            [FromServices] HandySalesDbContext db,
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
            [FromServices] HandySalesDbContext db,
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
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta,
            [FromQuery] int top = 20) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

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
            [FromServices] HandySalesDbContext db,
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
            [FromServices] HandySalesDbContext db,
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
            [FromServices] HandySalesDbContext db,
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
            [FromServices] HandySalesDbContext db,
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
            [FromServices] HandySalesDbContext db,
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
                topVendedor = topVendedor != null ? new { nombre = topVendedorNombre, topVendedor.totalVentas } : null,
                topProducto,
                alertas = new
                {
                    inventarioBajo = alertasInventario
                }
            });
        });
    }
}
