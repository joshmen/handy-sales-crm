using HandySales.Application.Pedidos.DTOs;
using HandySales.Application.Pedidos.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class PedidoEndpoints
{
    public static void MapPedidoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/pedidos")
            .RequireAuthorization()
            .WithTags("Pedidos")
            .WithOpenApi();

        // CRUD básico
        group.MapPost("/", async (
            PedidoCreateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var id = await servicio.CrearAsync(dto);
            return Results.Created($"/pedidos/{id}", new { id });
        })
        .WithSummary("Crear nuevo pedido")
        .WithDescription("Crea un nuevo pedido con sus detalles (productos). El pedido se crea en estado Borrador.")
        .Produces<object>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/", async (
            [AsParameters] PedidoFiltroDto filtro,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.ObtenerPorFiltroAsync(filtro);
            return Results.Ok(resultado);
        })
        .WithSummary("Listar pedidos con filtros")
        .WithDescription("Obtiene lista paginada de pedidos. Permite filtrar por cliente, estado, fecha y texto de búsqueda.")
        .Produces<PaginatedResult<PedidoListaDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var pedido = await servicio.ObtenerPorIdAsync(id);
            return pedido is null ? Results.NotFound() : Results.Ok(pedido);
        })
        .WithSummary("Obtener pedido por ID")
        .WithDescription("Retorna el detalle completo del pedido incluyendo sus líneas de productos.")
        .Produces<PedidoDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/numero/{numeroPedido}", async (
            string numeroPedido,
            [FromServices] PedidoService servicio) =>
        {
            var pedido = await servicio.ObtenerPorNumeroAsync(numeroPedido);
            return pedido is null ? Results.NotFound() : Results.Ok(pedido);
        })
        .WithSummary("Obtener pedido por número")
        .WithDescription("Busca un pedido por su número único (ej: PED-2026-00001).")
        .Produces<PedidoDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPut("/{id:int}", async (
            int id,
            PedidoUpdateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var actualizado = await servicio.ActualizarAsync(id, dto);
            return actualizado ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Actualizar pedido")
        .WithDescription("Actualiza los datos generales del pedido. Solo se permite en estado Borrador.")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapDelete("/{id:int}", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var eliminado = await servicio.EliminarAsync(id);
            return eliminado ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Eliminar pedido")
        .WithDescription("Elimina un pedido. Solo se permite en estado Borrador.")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status401Unauthorized);

        // Filtros específicos
        group.MapGet("/cliente/{clienteId:int}", async (
            int clienteId,
            [FromServices] PedidoService servicio) =>
        {
            var pedidos = await servicio.ObtenerPorClienteAsync(clienteId);
            return Results.Ok(pedidos);
        })
        .WithSummary("Pedidos por cliente")
        .WithDescription("Obtiene todos los pedidos de un cliente específico.")
        .Produces<List<PedidoListaDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/mis-pedidos", async (
            [FromServices] PedidoService servicio) =>
        {
            var pedidos = await servicio.ObtenerMisPedidosAsync();
            return Results.Ok(pedidos);
        })
        .WithSummary("Mis pedidos")
        .WithDescription("Obtiene los pedidos creados por el usuario autenticado (vendedor).")
        .Produces<List<PedidoListaDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/usuario/{usuarioId:int}", async (
            int usuarioId,
            [FromServices] PedidoService servicio) =>
        {
            var pedidos = await servicio.ObtenerPorUsuarioAsync(usuarioId);
            return Results.Ok(pedidos);
        })
        .WithSummary("Pedidos por vendedor")
        .WithDescription("Obtiene todos los pedidos creados por un vendedor específico (solo admin).")
        .Produces<List<PedidoListaDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // Cambios de estado
        group.MapPost("/{id:int}/enviar", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.EnviarAsync(id);
            return resultado ? Results.Ok(new { mensaje = "Pedido enviado" }) : Results.BadRequest(new { error = "No se pudo enviar el pedido" });
        })
        .WithSummary("Enviar pedido")
        .WithDescription("Cambia el estado del pedido de Borrador a Enviado. Valida que tenga al menos un producto.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/{id:int}/confirmar", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.ConfirmarAsync(id);
            return resultado ? Results.Ok(new { mensaje = "Pedido confirmado" }) : Results.BadRequest(new { error = "No se pudo confirmar el pedido" });
        })
        .WithSummary("Confirmar pedido")
        .WithDescription("Cambia el estado del pedido de Enviado a Confirmado (requiere permisos de admin).")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/{id:int}/procesar", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.IniciarProcesoAsync(id);
            return resultado ? Results.Ok(new { mensaje = "Pedido en proceso" }) : Results.BadRequest(new { error = "No se pudo iniciar el proceso" });
        })
        .WithSummary("Iniciar proceso de pedido")
        .WithDescription("Cambia el estado del pedido de Confirmado a EnProceso.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/{id:int}/en-ruta", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.EnviarARutaAsync(id);
            return resultado ? Results.Ok(new { mensaje = "Pedido en ruta" }) : Results.BadRequest(new { error = "No se pudo enviar a ruta" });
        })
        .WithSummary("Enviar a ruta")
        .WithDescription("Cambia el estado del pedido de EnProceso a EnRuta (pedido salió para entrega).")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/{id:int}/entregar", async (
            int id,
            [FromBody] PedidoEstadoDto? dto,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.EntregarAsync(id, dto?.Notas);
            return resultado ? Results.Ok(new { mensaje = "Pedido entregado" }) : Results.BadRequest(new { error = "No se pudo marcar como entregado" });
        })
        .WithSummary("Marcar como entregado")
        .WithDescription("Cambia el estado del pedido a Entregado. Opcionalmente puede incluir notas de entrega.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/{id:int}/cancelar", async (
            int id,
            [FromBody] PedidoEstadoDto? dto,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.CancelarAsync(id, dto?.Notas);
            return resultado ? Results.Ok(new { mensaje = "Pedido cancelado" }) : Results.BadRequest(new { error = "No se pudo cancelar el pedido" });
        })
        .WithSummary("Cancelar pedido")
        .WithDescription("Cancela el pedido. Requiere motivo de cancelación. No se pueden cancelar pedidos ya entregados.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        // Gestión de detalles
        group.MapPost("/{pedidoId:int}/detalles", async (
            int pedidoId,
            DetallePedidoCreateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.AgregarDetalleAsync(pedidoId, dto);
            return resultado ? Results.Created($"/pedidos/{pedidoId}/detalles", new { mensaje = "Detalle agregado" }) : Results.BadRequest(new { error = "No se pudo agregar el detalle" });
        })
        .WithSummary("Agregar producto al pedido")
        .WithDescription("Agrega una línea de producto al pedido. Solo se permite en estado Borrador.")
        .Produces<object>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPut("/{pedidoId:int}/detalles/{detalleId:int}", async (
            int pedidoId,
            int detalleId,
            DetallePedidoCreateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.ActualizarDetalleAsync(pedidoId, detalleId, dto);
            return resultado ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Actualizar línea de pedido")
        .WithDescription("Actualiza cantidad, precio o descuento de una línea del pedido. Solo en estado Borrador.")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapDelete("/{pedidoId:int}/detalles/{detalleId:int}", async (
            int pedidoId,
            int detalleId,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.EliminarDetalleAsync(pedidoId, detalleId);
            return resultado ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Eliminar línea de pedido")
        .WithDescription("Elimina una línea de producto del pedido. Solo en estado Borrador.")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status401Unauthorized);
    }
}
