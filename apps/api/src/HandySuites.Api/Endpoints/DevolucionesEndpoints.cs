using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

/// <summary>
/// Endpoints admin de Devoluciones de pedidos. Solo lista + anular para v1.0.8.
/// La creacion de devoluciones es exclusiva del mobile (vendedor en ruta); admin solo audita.
/// Mirror estructural exacto de GastosEndpoints.cs (PR #134) — mismo patron de paginacion,
/// KPI inline, invalidar por supervisor con revert de side-effects.
/// </summary>
public static class DevolucionesEndpoints
{
    public static void MapDevolucionesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/devoluciones")
            .RequireAuthorization()
            .WithTags("Devoluciones");

        // GET /devoluciones — lista paginada con filtros + detalles embebidos
        group.MapGet("/", async (
            HandySuitesDbContext db,
            [FromQuery] int pagina = 1,
            [FromQuery] int tamanoPagina = 25,
            [FromQuery] int? usuarioId = null,
            [FromQuery] int? rutaId = null,
            [FromQuery] int? clienteId = null,
            [FromQuery] int? motivo = null,
            [FromQuery] int? tipoReembolso = null,
            [FromQuery] DateTime? fechaDesde = null,
            [FromQuery] DateTime? fechaHasta = null,
            [FromQuery] bool soloActivas = true) =>
        {
            var query = db.DevolucionesPedido.AsNoTracking().AsQueryable();
            if (usuarioId.HasValue) query = query.Where(d => d.UsuarioId == usuarioId.Value);
            if (rutaId.HasValue) query = query.Where(d => d.RutaId == rutaId.Value);
            if (clienteId.HasValue) query = query.Where(d => d.ClienteId == clienteId.Value);
            if (motivo.HasValue) query = query.Where(d => (int)d.Motivo == motivo.Value);
            if (tipoReembolso.HasValue) query = query.Where(d => (int)d.TipoReembolso == tipoReembolso.Value);
            if (fechaDesde.HasValue) query = query.Where(d => d.FechaDevolucion >= fechaDesde.Value);
            if (fechaHasta.HasValue) query = query.Where(d => d.FechaDevolucion < fechaHasta.Value.AddDays(1));
            if (soloActivas) query = query.Where(d => d.Estado == EstadoDevolucion.Activa);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(d => d.FechaDevolucion)
                .Skip((pagina - 1) * tamanoPagina)
                .Take(tamanoPagina)
                .Select(d => new
                {
                    d.Id,
                    d.UsuarioId,
                    UsuarioNombre = d.Usuario.Nombre,
                    d.RutaId,
                    RutaCodigo = d.Ruta != null ? d.Ruta.Codigo : null,
                    d.PedidoId,
                    PedidoNumero = d.Pedido.NumeroPedido,
                    d.ClienteId,
                    ClienteNombre = d.Cliente.Nombre,
                    d.FechaDevolucion,
                    Motivo = (int)d.Motivo,
                    d.Notas,
                    TipoReembolso = (int)d.TipoReembolso,
                    d.MontoTotal,
                    d.FotoEvidenciaUrl,
                    Estado = (int)d.Estado,
                    d.AnuladaPor,
                    d.AnuladaEn,
                    d.MotivoAnulacion,
                    d.CreadoEn,
                    Detalles = d.Detalles.Where(dt => dt.Activo).Select(dt => new
                    {
                        dt.Id,
                        dt.ProductoId,
                        ProductoNombre = dt.Producto.Nombre,
                        dt.Cantidad,
                        dt.PrecioUnitario,
                        dt.Subtotal,
                        dt.Impuesto,
                        dt.Total,
                    }).ToList(),
                })
                .ToListAsync();

            // KPI totals (filtered scope, separando por tipo de reembolso)
            var totalSaldoFavor = await query.Where(d => d.Estado == EstadoDevolucion.Activa && d.TipoReembolso == TipoReembolso.SaldoFavor)
                .SumAsync(d => (double?)d.MontoTotal) ?? 0;
            var totalEfectivo = await query.Where(d => d.Estado == EstadoDevolucion.Activa && d.TipoReembolso == TipoReembolso.Efectivo)
                .SumAsync(d => (double?)d.MontoTotal) ?? 0;

            return Results.Ok(new
            {
                items,
                totalCount = total,
                pagina,
                tamanoPagina,
                kpi = new
                {
                    totalSaldoFavor,
                    totalEfectivo,
                    totalGeneral = totalSaldoFavor + totalEfectivo,
                    countActivas = items.Count(i => i.Estado == 0),
                    countAnuladas = items.Count(i => i.Estado == 1),
                }
            });
        })
        .WithName("ListDevoluciones")
        .WithOpenApi();

        // POST /devoluciones/{id}/anular — supervisor marca devolucion como anulada
        // y revierte side-effects (cliente.Saldo si TipoReembolso=SaldoFavor).
        // Mirror exacto del patron en SyncRepository.UpsertDevolucionAsync (delete branch).
        //
        // Sprint pre-prod #12.5 (security review 2026-06-06): role check agregado.
        // Antes cualquier VENDEDOR del tenant podia anular CUALQUIER devolucion del
        // mismo tenant — escalamiento horizontal de privilegios. El global query
        // filter ya bloqueaba cross-tenant pero faltaba el role gate.
        group.MapPost("/{id:int}/anular", async (
            HandySuitesDbContext db,
            int id,
            [FromBody] AnularDevolucionRequest req,
            HttpContext httpContext,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            if (!currentTenant.IsStrictAdmin && !currentTenant.IsSupervisor)
                return Results.Forbid();

            var userId = currentTenant.UserId;
            var devolucion = await db.DevolucionesPedido.FirstOrDefaultAsync(d => d.Id == id);
            if (devolucion == null) return Results.NotFound(new { error = "Devolucion no encontrada" });
            if (devolucion.Estado == EstadoDevolucion.Anulada)
                return Results.BadRequest(new { error = "La devolucion ya esta anulada" });

            devolucion.Estado = EstadoDevolucion.Anulada;
            devolucion.AnuladaPor = userId;
            devolucion.AnuladaEn = DateTime.UtcNow;
            devolucion.MotivoAnulacion = req.Motivo;
            devolucion.ActualizadoEn = DateTime.UtcNow;
            devolucion.ActualizadoPor = userId;
            devolucion.Version++;

            // Revertir side-effect SaldoFavor: regresa el monto al cliente
            if (devolucion.TipoReembolso == TipoReembolso.SaldoFavor && devolucion.MontoTotal > 0)
            {
                var cliente = await db.Clientes.FirstOrDefaultAsync(c => c.Id == devolucion.ClienteId);
                if (cliente != null) cliente.Saldo += devolucion.MontoTotal;
            }
            // Revertir side-effects de inventario para ReposicionProducto:
            // restar CantidadVendida que se sumo al crear + restar Mermas del retorno.
            // Math.Max(0, ...) protege contra ediciones manuales del admin.
            if (devolucion.TipoReembolso == TipoReembolso.ReposicionProducto && devolucion.RutaId.HasValue)
            {
                var detalles = await db.DetalleDevoluciones
                    .Where(dd => dd.DevolucionId == devolucion.Id && dd.Activo)
                    .ToListAsync();
                var rutaId = devolucion.RutaId.Value;
                foreach (var det in detalles)
                {
                    int cantidad = (int)det.Cantidad;
                    if (cantidad <= 0) continue;
                    var carga = await db.RutasCarga.FirstOrDefaultAsync(c =>
                        c.RutaId == rutaId && c.ProductoId == det.ProductoId && c.Activo);
                    if (carga != null)
                    {
                        carga.CantidadVendida = Math.Max(0, carga.CantidadVendida - cantidad);
                        carga.ActualizadoEn = DateTime.UtcNow;
                    }
                    var retorno = await db.RutasRetornoInventario.FirstOrDefaultAsync(r =>
                        r.RutaId == rutaId && r.ProductoId == det.ProductoId && r.Activo);
                    if (retorno != null)
                    {
                        retorno.Mermas = Math.Max(0, retorno.Mermas - cantidad);
                        int vendidos = carga?.CantidadVendida ?? retorno.Vendidos;
                        int entregados = carga?.CantidadEntregada ?? retorno.Entregados;
                        retorno.Diferencia = retorno.CantidadInicial + retorno.RecargaExterna
                                           - vendidos - entregados - retorno.Devueltos
                                           - retorno.Mermas - retorno.RecAlmacen - retorno.CargaVehiculo;
                        retorno.ActualizadoEn = DateTime.UtcNow;
                    }
                }
            }
            // Para TipoReembolso=Efectivo, el cierre recomputa aRecibir dinamicamente
            // filtrando d.Estado == Activa, asi que basta con marcar Anulada.

            await db.SaveChangesAsync();

            return Results.Ok(new { devolucion.Id, Estado = (int)devolucion.Estado });
        })
        .WithName("AnularDevolucion")
        .WithOpenApi();
    }
}

public record AnularDevolucionRequest(string? Motivo);
