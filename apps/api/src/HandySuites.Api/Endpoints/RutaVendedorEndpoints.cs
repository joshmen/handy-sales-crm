using System.Net.Http.Json;
using FluentValidation;
using HandySuites.Application.Rutas.DTOs;
using HandySuites.Application.Rutas.Services;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class RutaVendedorEndpoints
{
    // Marker para ILogger genérico
    private sealed class RutaVendedorEndpointsLog { }

    /// <summary>
    /// Fire-and-forget push al vendedor cuando admin cancela su ruta activa.
    /// Reportado 2026-04-27 — sin esto, el vendedor seguiría viendo la ruta como
    /// activa hasta el próximo sync manual y podría intentar visitar paradas
    /// que ya no aplican.
    /// </summary>
    private static void NotifyMobileRouteCancelled(
        IHttpClientFactory factory,
        int tenantId,
        int vendedorId,
        int rutaId,
        string? motivo,
        ILogger logger)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                var client = factory.CreateClient("MobileApi");
                var resp = await client.PostAsJsonAsync("/api/internal/push-notify", new
                {
                    tenantId,
                    userIds = new[] { vendedorId },
                    title = "Ruta cancelada",
                    body = string.IsNullOrWhiteSpace(motivo)
                        ? "Tu ruta de hoy fue cancelada por el administrador."
                        : $"Tu ruta de hoy fue cancelada: {motivo}",
                    data = new Dictionary<string, string>
                    {
                        ["type"] = "route.cancelled",
                        ["rutaId"] = rutaId.ToString(),
                    }
                });
                if (!resp.IsSuccessStatusCode)
                    logger.LogWarning("Mobile API push-notify (route cancelled) returned {Status} for ruta {RutaId}", resp.StatusCode, rutaId);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to notify Mobile API of route cancellation ruta {RutaId}", rutaId);
            }
        });
    }

    /// <summary>
    /// Fire-and-forget push notification al vendedor cuando se le asignan items
    /// a una ruta YA ACTIVA (CargaAceptada o EnProgreso). Antes el admin podía
    /// asignar pedidos a una ruta corriendo y el vendedor no se enteraba hasta
    /// el siguiente sync manual. Reportado 2026-04-27.
    /// </summary>
    private static void NotifyMobileRouteAssignment(
        IHttpClientFactory factory,
        int tenantId,
        int vendedorId,
        int rutaId,
        int pedidoId,
        ILogger logger)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                var client = factory.CreateClient("MobileApi");
                var resp = await client.PostAsJsonAsync("/api/internal/push-notify", new
                {
                    tenantId,
                    userIds = new[] { vendedorId },
                    title = "Nuevo pedido asignado a tu ruta",
                    body = $"Se agregó un pedido a tu ruta en curso. Sincroniza para verlo.",
                    data = new Dictionary<string, string>
                    {
                        ["type"] = "route.pedido_assigned",
                        ["rutaId"] = rutaId.ToString(),
                        ["pedidoId"] = pedidoId.ToString(),
                    }
                });
                if (!resp.IsSuccessStatusCode)
                    logger.LogWarning("Mobile API push-notify returned {Status} for ruta {RutaId} pedido {PedidoId}", resp.StatusCode, rutaId, pedidoId);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to notify Mobile API of route assignment ruta {RutaId} pedido {PedidoId}", rutaId, pedidoId);
            }
        });
    }

    public static void MapRutaVendedorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/rutas").RequireAuthorization();

        // === Templates (MUST be before /{id:int} to avoid route conflicts) ===

        group.MapGet("/templates", async (
            [FromServices] RutaVendedorService servicio) =>
        {
            var templates = await servicio.ObtenerTemplatesAsync();
            return Results.Ok(templates);
        });

        group.MapPost("/templates", async (
            RutaVendedorCreateDto dto,
            IValidator<RutaVendedorCreateDto> validator,
            [FromServices] RutaVendedorService servicio) =>
        {
            // Fuerza EsTemplate=true ANTES del validator: cualquier POST a /templates
            // es un template (el cliente puede omitir el flag), y el validator no debe
            // exigir UsuarioId para templates.
            dto.EsTemplate = true;

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var id = await servicio.CrearAsync(dto);
            return Results.Created($"/rutas/templates/{id}", new { id });
        });

        group.MapPut("/templates/{id:int}", async (
            int id,
            RutaVendedorUpdateDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var actualizado = await servicio.ActualizarAsync(id, dto);
            return actualizado ? Results.NoContent() : Results.NotFound();
        });

        group.MapDelete("/templates/{id:int}", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            var eliminado = await servicio.EliminarAsync(id);
            return eliminado ? Results.NoContent() : Results.NotFound();
        });

        group.MapPost("/templates/{id:int}/duplicar", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            try
            {
                var copiaId = await servicio.DuplicarTemplateAsync(id);
                return Results.Created($"/rutas/templates/{copiaId}", new { id = copiaId });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPost("/templates/{id:int}/instanciar", async (
            int id,
            InstanciarTemplateDto dto,
            [FromServices] RutaVendedorService servicio,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] ICurrentTenant tenantContext,
            [FromServices] HandySuites.Infrastructure.Notifications.Services.NotificationSettingsService notifSettings) =>
        {
            try
            {
                var rutaId = await servicio.InstanciarTemplateAsync(id, dto);

                // Push notification to assigned vendedor (same pattern as route creation)
                if (dto.UsuarioId > 0)
                {
                    try
                    {
                        var isEnabled = await notifSettings.IsEnabledAsync(tenantContext.TenantId, "route.published");
                        if (isEnabled)
                        {
                            var client = httpClientFactory.CreateClient("MobileApi");
                            await client.PostAsJsonAsync("/api/internal/push-notify", new
                            {
                                tenantId = tenantContext.TenantId,
                                userIds = new[] { dto.UsuarioId },
                                title = "Nueva ruta asignada",
                                body = "Se te asignó una ruta desde plantilla",
                                data = new Dictionary<string, string>
                                {
                                    ["type"] = "route.published",
                                    ["entityId"] = rutaId.ToString()
                                }
                            });
                        }
                    }
                    catch { /* push failure should not block template instantiation */ }
                }

                return Results.Created($"/rutas/{rutaId}", new { id = rutaId });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // CRUD básico
        group.MapPost("/", async (
            RutaVendedorCreateDto dto,
            IValidator<RutaVendedorCreateDto> validator,
            [FromServices] RutaVendedorService servicio,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] ICurrentTenant tenantContext,
            [FromServices] HandySuites.Infrastructure.Notifications.Services.NotificationSettingsService notifSettings) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var id = await servicio.CrearAsync(dto);

            // Push notification to assigned vendedor
            // Send push notification directly (not fire-and-forget — avoids scope disposal issues)
            if (dto.UsuarioId > 0)
            {
                try
                {
                    var isEnabled = await notifSettings.IsEnabledAsync(tenantContext.TenantId, "route.published");
                    if (isEnabled)
                    {
                        var client = httpClientFactory.CreateClient("MobileApi");
                        await client.PostAsJsonAsync("/api/internal/push-notify", new
                        {
                            tenantId = tenantContext.TenantId,
                            userIds = new[] { dto.UsuarioId },
                            title = "Nueva ruta asignada",
                            body = $"Se te asigno la ruta: {dto.Nombre}",
                            data = new Dictionary<string, string>
                            {
                                ["type"] = "route.published",
                                ["entityId"] = id.ToString()
                            }
                        });
                    }
                }
                catch { /* push failure should not block route creation */ }
            }

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
            [FromServices] RutaVendedorService servicio,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] ICurrentTenant tenantContext,
            [FromServices] HandySuites.Infrastructure.Notifications.Services.NotificationSettingsService notifSettings) =>
        {
            var rutaAntes = await servicio.ObtenerPorIdAsync(id);
            var actualizado = await servicio.ActualizarAsync(id, dto);
            if (!actualizado) return Results.NotFound();

            // Push notification to vendedor (contextual message based on route estado)
            var nuevoUsuarioId = dto.UsuarioId ?? rutaAntes?.UsuarioId ?? 0;
            var tenantId = tenantContext.TenantId;
            var rutaNombre = dto.Nombre ?? rutaAntes?.Nombre ?? "Ruta";
            var rutaDespues = await servicio.ObtenerPorIdAsync(id);
            if (nuevoUsuarioId > 0 && await notifSettings.IsEnabledAsync(tenantId, "route.published"))
            {
                try
                {
                    // Contextual title/body based on estado
                    var isPendienteAceptar = rutaDespues?.Estado == HandySuites.Domain.Entities.EstadoRuta.PendienteAceptar;
                    var title = isPendienteAceptar ? "Ruta pendiente de aceptar" : "Ruta actualizada";
                    var body = isPendienteAceptar
                        ? $"Tienes una ruta asignada: {rutaNombre}. Acéptala para comenzar."
                        : $"Tu ruta fue actualizada: {rutaNombre}";

                    var client = httpClientFactory.CreateClient("MobileApi");
                    await client.PostAsJsonAsync("/api/internal/push-notify", new
                    {
                        tenantId,
                        userIds = new[] { nuevoUsuarioId },
                        title,
                        body,
                        data = new Dictionary<string, string>
                        {
                            ["type"] = "route.published",
                            ["entityId"] = id.ToString()
                        }
                    });
                }
                catch { /* push failure should not block route update */ }
            }

            return Results.NoContent();
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
            HttpContext context,
            [FromServices] RutaVendedorService servicio,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] ILogger<RutaVendedorEndpointsLog> logger) =>
        {
            var (ok, estadoPrevio, vendedorId) = await servicio.CancelarRutaDetalladoAsync(id, dto?.Motivo);
            if (!ok)
                return Results.BadRequest(new { error = "No se pudo cancelar la ruta. Verifica que no esté completada o ya cancelada." });

            // Push al vendedor si la ruta estaba activa — sin esto el vendedor seguiría
            // viendo la ruta como activa hasta el próximo sync manual.
            if ((estadoPrevio == EstadoRuta.CargaAceptada || estadoPrevio == EstadoRuta.EnProgreso)
                && vendedorId.HasValue
                && int.TryParse(context.User.FindFirst("tenant_id")?.Value, out var tenantId))
            {
                NotifyMobileRouteCancelled(httpClientFactory, tenantId, vendedorId.Value, id, dto?.Motivo, logger);
            }

            return Results.Ok(new { mensaje = "Ruta cancelada" });
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

        // Toggle activo — sólo gestión puede activar/desactivar rutas
        group.MapPatch("/{id:int}/activo", async (
            int id,
            RutaCambiarActivoDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            var result = await servicio.CambiarActivoAsync(id, dto.Activo);
            return result ? Results.Ok() : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN", "SUPERVISOR"));

        group.MapPatch("/batch-toggle", async (
            RutaBatchToggleRequest request,
            [FromServices] RutaVendedorService servicio) =>
        {
            if (request.Ids == null || request.Ids.Count == 0 || request.Ids.Count > 1000)
                return Results.BadRequest(new { error = "Lista de IDs inválida (máx. 1000)" });

            var count = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            return Results.Ok(new { affected = count });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN", "SUPERVISOR"));

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
            HttpContext context,
            [FromServices] RutaVendedorService servicio,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] ILogger<RutaVendedorEndpointsLog> logger) =>
        {
            var (estado, vendedorId) = await servicio.AsignarPedidoAsync(id, dto.PedidoId);

            // Si la ruta ya está activa (vendedor la aceptó o ya empezó) y tenemos
            // tenantId + vendedor: dispara push fire-and-forget para que el mobile
            // sepa que tiene un pedido nuevo sin esperar al pull manual.
            if ((estado == EstadoRuta.CargaAceptada || estado == EstadoRuta.EnProgreso)
                && vendedorId.HasValue
                && int.TryParse(context.User.FindFirst("tenant_id")?.Value, out var tenantId))
            {
                NotifyMobileRouteAssignment(httpClientFactory, tenantId, vendedorId.Value, id, dto.PedidoId, logger);
            }

            return Results.Ok(new { mensaje = "Pedido asignado" });
        });

        // Batch: asigna múltiples pedidos en un solo round-trip. Tolerante a fallos
        // parciales: cada pedido se procesa individualmente y se reporta cuáles
        // tuvieron éxito y cuáles fallaron (ej: pedido ya asignado a otra ruta).
        group.MapPost("/{id:int}/carga/pedidos/batch", async (
            int id,
            AsignarPedidosBatchRequest dto,
            HttpContext context,
            [FromServices] RutaVendedorService servicio,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] ILogger<RutaVendedorEndpointsLog> logger) =>
        {
            if (dto.PedidoIds == null || dto.PedidoIds.Count == 0)
                return Results.BadRequest(new { mensaje = "Debe enviar al menos un pedidoId" });

            var (resultado, estado, vendedorId) = await servicio.AsignarPedidosBatchAsync(id, dto.PedidoIds);

            // Push solo por los pedidos que se asignaron exitosamente y solo si
            // la ruta está activa. Mismo patrón que el endpoint single.
            if ((estado == EstadoRuta.CargaAceptada || estado == EstadoRuta.EnProgreso)
                && vendedorId.HasValue
                && resultado.Asignados.Count > 0
                && int.TryParse(context.User.FindFirst("tenant_id")?.Value, out var tenantId))
            {
                foreach (var pedidoIdAsignado in resultado.Asignados)
                {
                    NotifyMobileRouteAssignment(httpClientFactory, tenantId, vendedorId.Value, id, pedidoIdAsignado, logger);
                }
            }

            return Results.Ok(resultado);
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

        group.MapGet("/{id:int}/cierre/resumen-ai", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            var resumen = await servicio.GenerarResumenDiarioAsync(id);
            return resumen != null
                ? Results.Ok(new { resumen })
                : Results.Ok(new { resumen = (string?)null, mensaje = "AI no disponible o sin créditos" });
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
