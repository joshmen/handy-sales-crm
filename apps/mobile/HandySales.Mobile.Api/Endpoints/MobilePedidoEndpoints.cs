using HandySales.Application.Pedidos.DTOs;
using HandySales.Application.Pedidos.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobilePedidoEndpoints
{
    public static void MapMobilePedidoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/pedidos")
            .RequireAuthorization()
            .WithTags("Pedidos")
            .WithOpenApi();

        // === CRUD BÁSICO ===

        group.MapPost("/", async (
            PedidoCreateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var id = await servicio.CrearAsync(dto);
            return Results.Created($"/api/mobile/pedidos/{id}", new { success = true, data = new { id } });
        })
        .WithSummary("Crear pedido")
        .WithDescription("Crea un nuevo pedido con productos. Se crea en estado Borrador.")
        .Produces<object>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapGet("/mis-pedidos", async (
            [FromServices] PedidoService servicio) =>
        {
            var pedidos = await servicio.ObtenerMisPedidosAsync();
            return Results.Ok(new { success = true, data = pedidos, count = pedidos.Count });
        })
        .WithSummary("Mis pedidos")
        .WithDescription("Lista todos los pedidos creados por el vendedor autenticado.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var pedido = await servicio.ObtenerPorIdAsync(id);
            if (pedido is null)
                return Results.NotFound(new { success = false, message = "Pedido no encontrado" });

            return Results.Ok(new { success = true, data = pedido });
        })
        .WithSummary("Detalle de pedido")
        .WithDescription("Obtiene el detalle completo de un pedido incluyendo líneas de productos.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/cliente/{clienteId:int}", async (
            int clienteId,
            [FromServices] PedidoService servicio) =>
        {
            var pedidos = await servicio.ObtenerPorClienteAsync(clienteId);
            return Results.Ok(new { success = true, data = pedidos, count = pedidos.Count });
        })
        .WithSummary("Pedidos por cliente")
        .WithDescription("Lista todos los pedidos de un cliente específico.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapPut("/{id:int}", async (
            int id,
            PedidoUpdateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var actualizado = await servicio.ActualizarAsync(id, dto);
            if (!actualizado)
                return Results.NotFound(new { success = false, message = "Pedido no encontrado o no editable" });

            return Results.Ok(new { success = true, message = "Pedido actualizado" });
        })
        .WithSummary("Actualizar pedido")
        .WithDescription("Actualiza datos del pedido. Solo permitido en estado Borrador.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:int}", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var eliminado = await servicio.EliminarAsync(id);
            if (!eliminado)
                return Results.NotFound(new { success = false, message = "Pedido no encontrado o no eliminable" });

            return Results.Ok(new { success = true, message = "Pedido eliminado" });
        })
        .WithSummary("Eliminar pedido")
        .WithDescription("Elimina un pedido. Solo permitido en estado Borrador.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        // === CAMBIOS DE ESTADO ===

        group.MapPost("/{id:int}/enviar", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.EnviarAsync(id);
            if (!resultado)
                return Results.BadRequest(new { success = false, message = "No se pudo enviar el pedido" });

            return Results.Ok(new { success = true, message = "Pedido enviado" });
        })
        .WithSummary("Enviar pedido")
        .WithDescription("Cambia el estado de Borrador a Enviado. Valida que tenga productos.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/{id:int}/cancelar", async (
            int id,
            [FromBody] CancelarPedidoDto? dto,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.CancelarAsync(id, dto?.Motivo);
            if (!resultado)
                return Results.BadRequest(new { success = false, message = "No se pudo cancelar el pedido" });

            return Results.Ok(new { success = true, message = "Pedido cancelado" });
        })
        .WithSummary("Cancelar pedido")
        .WithDescription("Cancela el pedido. Se requiere motivo de cancelación.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        // === GESTIÓN DE DETALLES ===

        group.MapPost("/{pedidoId:int}/productos", async (
            int pedidoId,
            DetallePedidoCreateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.AgregarDetalleAsync(pedidoId, dto);
            if (!resultado)
                return Results.BadRequest(new { success = false, message = "No se pudo agregar el producto" });

            return Results.Ok(new { success = true, message = "Producto agregado al pedido" });
        })
        .WithSummary("Agregar producto al pedido")
        .WithDescription("Agrega una línea de producto. Solo permitido en estado Borrador.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPut("/{pedidoId:int}/productos/{detalleId:int}", async (
            int pedidoId,
            int detalleId,
            DetallePedidoCreateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.ActualizarDetalleAsync(pedidoId, detalleId, dto);
            if (!resultado)
                return Results.NotFound(new { success = false, message = "Detalle no encontrado" });

            return Results.Ok(new { success = true, message = "Producto actualizado" });
        })
        .WithSummary("Actualizar producto del pedido")
        .WithDescription("Actualiza cantidad, precio o descuento de una línea.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{pedidoId:int}/productos/{detalleId:int}", async (
            int pedidoId,
            int detalleId,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.EliminarDetalleAsync(pedidoId, detalleId);
            if (!resultado)
                return Results.NotFound(new { success = false, message = "Detalle no encontrado" });

            return Results.Ok(new { success = true, message = "Producto eliminado del pedido" });
        })
        .WithSummary("Eliminar producto del pedido")
        .WithDescription("Elimina una línea de producto del pedido.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);
    }
}

public record CancelarPedidoDto(string? Motivo);
