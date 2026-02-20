using HandySales.Api.Hubs;
using HandySales.Application.Notifications.DTOs;
using HandySales.Application.Notifications.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HandySales.Api.Endpoints;

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notificaciones")
            .RequireAuthorization()
            .WithTags("Notificaciones")
            .WithOpenApi();

        // Obtener mis notificaciones (paginado)
        group.MapGet("/", async (
            [AsParameters] NotificationFiltroDto filtro,
            [FromServices] INotificationService service) =>
        {
            var resultado = await service.ObtenerMisNotificacionesAsync(filtro);
            return Results.Ok(resultado);
        })
        .WithSummary("Listar mis notificaciones")
        .WithDescription("Obtiene lista paginada de notificaciones del usuario. Filtros: tipo, leídas/no leídas, fecha.")
        .Produces<NotificationPaginatedResult>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // Obtener conteo de no leídas
        group.MapGet("/no-leidas/count", async ([FromServices] INotificationService service) =>
        {
            var count = await service.ObtenerConteoNoLeidasAsync();
            return Results.Ok(new { noLeidas = count });
        })
        .WithSummary("Conteo de no leídas")
        .WithDescription("Retorna el número de notificaciones sin leer del usuario (para badge en app).")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // Marcar notificación como leída
        group.MapPost("/{id:int}/leer", async (int id, [FromServices] INotificationService service) =>
        {
            var result = await service.MarcarComoLeidaAsync(id);
            return result ? Results.Ok() : Results.NotFound();
        })
        .WithSummary("Marcar como leída")
        .WithDescription("Marca una notificación específica como leída.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status401Unauthorized);

        // Marcar todas como leídas
        group.MapPost("/leer-todas", async ([FromServices] INotificationService service) =>
        {
            var count = await service.MarcarTodasComoLeidasAsync();
            return Results.Ok(new { marcadas = count });
        })
        .WithSummary("Marcar todas como leídas")
        .WithDescription("Marca todas las notificaciones del usuario como leídas.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // Eliminar notificación
        group.MapDelete("/{id:int}", async (int id, [FromServices] INotificationService service) =>
        {
            var result = await service.EliminarNotificacionAsync(id);
            return result ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Eliminar notificación")
        .WithDescription("Elimina una notificación del historial del usuario.")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status401Unauthorized);

        // Registrar push token
        group.MapPost("/push-token", async (
            RegisterPushTokenDto dto,
            [FromServices] INotificationService service) =>
        {
            var result = await service.RegistrarPushTokenAsync(dto);
            return result ? Results.Ok() : Results.BadRequest("No se pudo registrar el token");
        })
        .WithSummary("Registrar push token")
        .WithDescription("Registra o actualiza el token de push notifications (FCM) del dispositivo.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        // ADMIN: Enviar notificación a usuario específico
        group.MapPost("/enviar", async (
            SendNotificationDto dto,
            [FromServices] INotificationService service,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var result = await service.EnviarNotificacionAsync(dto);
            if (result.Success)
            {
                // Push real-time notification to the target user
                await hubContext.Clients.Group($"user:{dto.UsuarioId}")
                    .SendAsync("ReceiveNotification", new
                    {
                        id = result.NotificationId,
                        titulo = dto.Titulo,
                        mensaje = dto.Mensaje,
                        tipo = dto.Tipo,
                    });
            }
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        })
        .WithSummary("Enviar notificación (Admin)")
        .WithDescription("Envía una notificación push a un usuario específico. Requiere permisos de admin.")
        .Produces<NotificationSendResultDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        // ADMIN: Enviar broadcast a múltiples usuarios
        group.MapPost("/broadcast", async (
            BroadcastNotificationDto dto,
            [FromServices] INotificationService service,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var result = await service.EnviarBroadcastAsync(dto);

            // Push real-time notification to all notified users (explicit list, zone, or vendedores)
            if (result.NotifiedUserIds.Count > 0)
            {
                var payload = new { titulo = dto.Titulo, mensaje = dto.Mensaje, tipo = dto.Tipo };
                foreach (var uid in result.NotifiedUserIds)
                {
                    await hubContext.Clients.Group($"user:{uid}")
                        .SendAsync("ReceiveNotification", payload);
                }
            }

            return Results.Ok(result);
        })
        .WithSummary("Broadcast de notificación (Admin)")
        .WithDescription("Envía notificación push a múltiples usuarios o a todos los vendedores de una zona.")
        .Produces<BroadcastResultDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);
    }
}
