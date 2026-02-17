using HandySales.Application.Rutas.DTOs;
using HandySales.Application.Rutas.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class RutaVendedorEndpoints
{
    public static void MapRutaVendedorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/rutas").RequireAuthorization();

        // CRUD básico
        group.MapPost("/", async (
            RutaVendedorCreateDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var id = await servicio.CrearAsync(dto);
            return Results.Created($"/rutas/{id}", new { id });
        });

        group.MapGet("/", async (
            [AsParameters] RutaFiltroDto filtro,
            [FromServices] RutaVendedorService servicio) =>
        {
            var resultado = await servicio.ObtenerPorFiltroAsync(filtro);
            return Results.Ok(new { items = resultado.Items, totalCount = resultado.TotalCount });
        });

        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            var ruta = await servicio.ObtenerPorIdAsync(id);
            return ruta is null ? Results.NotFound() : Results.Ok(ruta);
        });

        group.MapPut("/{id:int}", async (
            int id,
            RutaVendedorUpdateDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var actualizado = await servicio.ActualizarAsync(id, dto);
            return actualizado ? Results.NoContent() : Results.NotFound();
        });

        group.MapDelete("/{id:int}", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            var eliminado = await servicio.EliminarAsync(id);
            return eliminado ? Results.NoContent() : Results.NotFound();
        });

        // Rutas del vendedor actual
        group.MapGet("/mi-ruta-hoy", async (
            DateTime? fecha,
            [FromServices] RutaVendedorService servicio) =>
        {
            var ruta = await servicio.ObtenerMiRutaDelDiaAsync(fecha);
            return ruta is null ? Results.NotFound(new { mensaje = "No hay ruta asignada para hoy" }) : Results.Ok(ruta);
        });

        group.MapGet("/mis-rutas-pendientes", async (
            [FromServices] RutaVendedorService servicio) =>
        {
            var rutas = await servicio.ObtenerMisRutasPendientesAsync();
            return Results.Ok(rutas);
        });

        group.MapGet("/usuario/{usuarioId:int}", async (
            int usuarioId,
            [FromServices] RutaVendedorService servicio) =>
        {
            var rutas = await servicio.ObtenerRutasPorUsuarioAsync(usuarioId);
            return Results.Ok(rutas);
        });

        // Gestión de estado de ruta
        group.MapPost("/{id:int}/iniciar", async (
            int id,
            [FromBody] IniciarRutaDto? dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var resultado = await servicio.IniciarRutaAsync(id, dto);
            return resultado
                ? Results.Ok(new { mensaje = "Ruta iniciada" })
                : Results.BadRequest(new { error = "No se pudo iniciar la ruta" });
        });

        group.MapPost("/{id:int}/completar", async (
            int id,
            double? kilometrosReales,
            [FromServices] RutaVendedorService servicio) =>
        {
            var resultado = await servicio.CompletarRutaAsync(id, kilometrosReales);
            return resultado
                ? Results.Ok(new { mensaje = "Ruta completada" })
                : Results.BadRequest(new { error = "No se pudo completar la ruta" });
        });

        group.MapPost("/{id:int}/cancelar", async (
            int id,
            [FromBody] CancelarRutaDto? dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var resultado = await servicio.CancelarRutaAsync(id, dto?.Motivo);
            return resultado
                ? Results.Ok(new { mensaje = "Ruta cancelada" })
                : Results.BadRequest(new { error = "No se pudo cancelar la ruta" });
        });

        // Gestión de paradas
        group.MapPost("/{rutaId:int}/paradas", async (
            int rutaId,
            RutaDetalleCreateDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var detalleId = await servicio.AgregarParadaAsync(rutaId, dto);
            return Results.Created($"/rutas/{rutaId}/paradas/{detalleId}", new { id = detalleId });
        });

        group.MapDelete("/{rutaId:int}/paradas/{detalleId:int}", async (
            int rutaId,
            int detalleId,
            [FromServices] RutaVendedorService servicio) =>
        {
            var eliminado = await servicio.EliminarParadaAsync(rutaId, detalleId);
            return eliminado ? Results.NoContent() : Results.NotFound();
        });

        group.MapPost("/{rutaId:int}/paradas/reordenar", async (
            int rutaId,
            ReordenarParadasDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var resultado = await servicio.ReordenarParadasAsync(rutaId, dto);
            return resultado
                ? Results.Ok(new { mensaje = "Paradas reordenadas" })
                : Results.BadRequest(new { error = "No se pudieron reordenar las paradas" });
        });

        // Acciones de parada individual
        group.MapPost("/paradas/{detalleId:int}/llegar", async (
            int detalleId,
            LlegarParadaDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var resultado = await servicio.LlegarAParadaAsync(detalleId, dto);
            return resultado
                ? Results.Ok(new { mensaje = "Llegada registrada" })
                : Results.BadRequest(new { error = "No se pudo registrar la llegada" });
        });

        group.MapPost("/paradas/{detalleId:int}/salir", async (
            int detalleId,
            SalirParadaDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var resultado = await servicio.SalirDeParadaAsync(detalleId, dto);
            return resultado
                ? Results.Ok(new { mensaje = "Salida registrada" })
                : Results.BadRequest(new { error = "No se pudo registrar la salida" });
        });

        group.MapPost("/paradas/{detalleId:int}/omitir", async (
            int detalleId,
            OmitirParadaDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var resultado = await servicio.OmitirParadaAsync(detalleId, dto);
            return resultado
                ? Results.Ok(new { mensaje = "Parada omitida" })
                : Results.BadRequest(new { error = "No se pudo omitir la parada" });
        });

        // Toggle activo
        group.MapPatch("/{id:int}/activo", async (
            int id,
            RutaCambiarActivoDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var result = await servicio.CambiarActivoAsync(id, dto.Activo);
            return result ? Results.Ok() : Results.NotFound();
        });

        group.MapPatch("/batch-toggle", async (
            RutaBatchToggleRequest request,
            [FromServices] RutaVendedorService servicio) =>
        {
            var count = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            return Results.Ok(new { affected = count });
        });

        // === Carga de inventario ===
        group.MapGet("/{id:int}/carga", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            var carga = await servicio.ObtenerCargaAsync(id);
            return Results.Ok(carga);
        });

        group.MapPost("/{id:int}/carga/productos", async (
            int id,
            AsignarProductoVentaRequest dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            await servicio.AsignarProductoVentaAsync(id, dto);
            return Results.Ok(new { mensaje = "Producto asignado" });
        });

        group.MapDelete("/{id:int}/carga/productos/{productoId:int}", async (
            int id,
            int productoId,
            [FromServices] RutaVendedorService servicio) =>
        {
            await servicio.RemoverProductoCargaAsync(id, productoId);
            return Results.NoContent();
        });

        group.MapGet("/{id:int}/carga/pedidos", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            var pedidos = await servicio.ObtenerPedidosAsignadosAsync(id);
            return Results.Ok(pedidos);
        });

        group.MapPost("/{id:int}/carga/pedidos", async (
            int id,
            AsignarPedidoRequest dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            await servicio.AsignarPedidoAsync(id, dto.PedidoId);
            return Results.Ok(new { mensaje = "Pedido asignado" });
        });

        group.MapDelete("/{id:int}/carga/pedidos/{pedidoId:int}", async (
            int id,
            int pedidoId,
            [FromServices] RutaVendedorService servicio) =>
        {
            await servicio.RemoverPedidoAsync(id, pedidoId);
            return Results.NoContent();
        });

        group.MapPatch("/{id:int}/carga/efectivo", async (
            int id,
            ActualizarEfectivoRequest dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            await servicio.ActualizarEfectivoInicialAsync(id, dto);
            return Results.Ok(new { mensaje = "Efectivo actualizado" });
        });

        group.MapPost("/{id:int}/carga/enviar", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            await servicio.EnviarACargaAsync(id);
            return Results.Ok(new { mensaje = "Ruta enviada a carga" });
        });

        // === Cierre de ruta ===
        group.MapGet("/{id:int}/cierre/resumen", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            var resumen = await servicio.ObtenerResumenCierreAsync(id);
            return Results.Ok(resumen);
        });

        group.MapGet("/{id:int}/cierre/retorno", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            var retorno = await servicio.ObtenerRetornoInventarioAsync(id);
            return Results.Ok(retorno);
        });

        group.MapPatch("/{id:int}/cierre/retorno/{productoId:int}", async (
            int id,
            int productoId,
            ActualizarRetornoRequest dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            await servicio.ActualizarRetornoAsync(id, productoId, dto);
            return Results.Ok(new { mensaje = "Retorno actualizado" });
        });

        group.MapPost("/{id:int}/cierre/cerrar", async (
            int id,
            CerrarRutaRequest dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            await servicio.CerrarRutaAsync(id, dto);
            return Results.Ok(new { mensaje = "Ruta cerrada exitosamente" });
        });

        // Consulta de parada actual y siguiente
        group.MapGet("/{rutaId:int}/parada-actual", async (
            int rutaId,
            [FromServices] RutaVendedorService servicio) =>
        {
            var parada = await servicio.ObtenerParadaActualAsync(rutaId);
            return parada is null
                ? Results.NotFound(new { mensaje = "No hay parada actual" })
                : Results.Ok(parada);
        });

        group.MapGet("/{rutaId:int}/siguiente-parada", async (
            int rutaId,
            [FromServices] RutaVendedorService servicio) =>
        {
            var parada = await servicio.ObtenerSiguienteParadaAsync(rutaId);
            return parada is null
                ? Results.NotFound(new { mensaje = "No hay siguiente parada" })
                : Results.Ok(parada);
        });
    }
}

public class CancelarRutaDto
{
    public string? Motivo { get; set; }
}
