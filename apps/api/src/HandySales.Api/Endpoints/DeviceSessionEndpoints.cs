using HandySales.Application.DeviceSessions.DTOs;
using HandySales.Application.DeviceSessions.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class DeviceSessionEndpoints
{
    public static void MapDeviceSessionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/dispositivos").RequireAuthorization();

        // Mis dispositivos
        group.MapGet("/mis-sesiones", async (
            int? sesionActualId,
            [FromServices] DeviceSessionService servicio) =>
        {
            var sesiones = await servicio.ObtenerMisSesionesAsync(sesionActualId);
            return Results.Ok(sesiones);
        });

        group.MapGet("/mi-resumen", async (
            [FromServices] DeviceSessionService servicio) =>
        {
            var resumen = await servicio.ObtenerMiResumenAsync();
            return Results.Ok(resumen);
        });

        group.MapGet("/{id:int}", async (
            int id,
            int? sesionActualId,
            [FromServices] DeviceSessionService servicio) =>
        {
            var sesion = await servicio.ObtenerPorIdAsync(id, sesionActualId);
            return sesion is null ? Results.NotFound() : Results.Ok(sesion);
        });

        group.MapGet("/device/{deviceId}", async (
            string deviceId,
            [FromServices] DeviceSessionService servicio) =>
        {
            var sesion = await servicio.ObtenerPorDeviceIdAsync(deviceId);
            return sesion is null ? Results.NotFound() : Results.Ok(sesion);
        });

        // Actualizar push token
        group.MapPut("/{id:int}/push-token", async (
            int id,
            DeviceSessionUpdatePushTokenDto dto,
            [FromServices] DeviceSessionService servicio) =>
        {
            var resultado = await servicio.ActualizarPushTokenAsync(id, dto.PushToken);
            return resultado
                ? Results.Ok(new { mensaje = "Push token actualizado" })
                : Results.NotFound();
        });

        // Cerrar sesion remota (una de mis sesiones desde otro dispositivo)
        group.MapPost("/{id:int}/cerrar", async (
            int id,
            LogoutDeviceDto? dto,
            [FromServices] DeviceSessionService servicio) =>
        {
            var resultado = await servicio.CerrarSesionRemotaAsync(id, dto?.Reason);
            return resultado
                ? Results.Ok(new { mensaje = "Sesion cerrada exitosamente" })
                : Results.BadRequest(new { error = "No se pudo cerrar la sesion. Verifique que sea una sesion suya activa." });
        });

        // Cerrar todas mis sesiones (excepto la actual opcionalmente)
        group.MapPost("/cerrar-todas", async (
            LogoutAllDevicesDto dto,
            int? sesionActualId,
            [FromServices] DeviceSessionService servicio) =>
        {
            var exceptoId = dto.ExcluirSesionActual ? sesionActualId : null;
            var cantidad = await servicio.CerrarTodasMisSesionesAsync(exceptoId, dto.Reason);
            return Results.Ok(new { mensaje = $"Se cerraron {cantidad} sesiones", cantidad });
        });

        // ADMIN: Obtener todas las sesiones activas
        group.MapGet("/admin/activas", async (
            [FromServices] DeviceSessionService servicio) =>
        {
            var sesiones = await servicio.ObtenerTodasSesionesActivasAsync();
            return Results.Ok(sesiones);
        });

        // ADMIN: Obtener sesiones de un usuario
        group.MapGet("/admin/usuario/{usuarioId:int}", async (
            int usuarioId,
            [FromServices] DeviceSessionService servicio) =>
        {
            var sesiones = await servicio.ObtenerSesionesPorUsuarioAsync(usuarioId);
            return Results.Ok(sesiones);
        });

        // ADMIN: Revocar sesion de cualquier usuario
        group.MapPost("/admin/{id:int}/revocar", async (
            int id,
            LogoutDeviceDto? dto,
            [FromServices] DeviceSessionService servicio) =>
        {
            var resultado = await servicio.RevocarSesionAsync(id, dto?.Reason);
            return resultado
                ? Results.Ok(new { mensaje = "Sesion revocada exitosamente" })
                : Results.BadRequest(new { error = "No se pudo revocar la sesion" });
        });

        // ADMIN: Cerrar todas las sesiones de un usuario
        group.MapPost("/admin/usuario/{usuarioId:int}/cerrar-todas", async (
            int usuarioId,
            LogoutDeviceDto? dto,
            [FromServices] DeviceSessionService servicio) =>
        {
            var cantidad = await servicio.CerrarTodasSesionesUsuarioAsync(usuarioId, dto?.Reason);
            return Results.Ok(new { mensaje = $"Se cerraron {cantidad} sesiones del usuario", cantidad });
        });

        // ADMIN: Limpiar sesiones expiradas
        group.MapPost("/admin/limpiar-expiradas", async (
            int? diasInactividad,
            [FromServices] DeviceSessionService servicio) =>
        {
            var cantidad = await servicio.LimpiarSesionesExpiradasAsync(diasInactividad ?? 30);
            return Results.Ok(new { mensaje = $"Se limpiaron {cantidad} sesiones expiradas", cantidad });
        });

        // Verificar si sesion es valida
        group.MapGet("/{id:int}/valida", async (
            int id,
            [FromServices] DeviceSessionService servicio) =>
        {
            var esValida = await servicio.EsSesionValidaAsync(id);
            return Results.Ok(new { valida = esValida });
        });
    }
}
