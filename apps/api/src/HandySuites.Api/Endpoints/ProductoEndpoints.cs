using System.Text.Json.Serialization;
using FluentValidation;
using HandySuites.Api.Hubs;
using HandySuites.Application.Ai.Interfaces;
using HandySuites.Application.CompanySettings.Interfaces;
using HandySuites.Application.Productos.DTOs;
using HandySuites.Application.Productos.Services;
using HandySuites.Application.SubscriptionPlans.Interfaces;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ITransactionManager = HandySuites.Application.Common.Interfaces.ITransactionManager;

namespace HandySuites.Api.Endpoints;

internal record TxProductoResult(IResult Response, int CreatedId);

public static class ProductoEndpoints
{
    public static void MapProductoEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/productos", async ([AsParameters] ProductoFiltroDto filtro, [FromServices] ProductoService servicio) =>
        {
            var resultado = await servicio.ObtenerPorFiltroAsync(filtro);
            return Results.Ok(resultado);
        }).RequireAuthorization();

        app.MapGet("/productos/{id:int}", async (int id, [FromServices] ProductoService servicio) =>
        {
            var producto = await servicio.ObtenerPorIdAsync(id);
            return producto is null ? Results.NotFound() : Results.Ok(producto);
        }).RequireAuthorization();

        app.MapPost("/productos", async (
            ProductoCreateDto dto,
            IValidator<ProductoCreateDto> validator,
            [FromServices] ProductoService servicio,
            [FromServices] ISubscriptionEnforcementService enforcement,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IAiEmbeddingService embeddingService,
            [FromServices] ITransactionManager transactions,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            // BR-020: limit check + INSERT under single transaction so the per-tenant
            // advisory lock covers both operations.
            var txResult = await transactions.ExecuteInTransactionAsync<TxProductoResult>(async () =>
            {
                var check = await enforcement.CanCreateProductoAsync(currentTenant.TenantId);
                if (!check.Allowed)
                {
                    return new TxProductoResult(Results.Json(new { error = check.Message, current = check.Current, limit = check.Limit }, statusCode: 402), 0);
                }

                var id = await servicio.CrearProductoAsync(dto);
                return new TxProductoResult(Results.Created($"/productos/{id}", new { id }), id);
            });

            if (txResult.CreatedId > 0)
            {
                var embeddingText = $"{dto.Nombre}: {dto.Descripcion}";
                _ = embeddingService.SafeUpsertAsync(currentTenant.TenantId, "Producto", txResult.CreatedId, embeddingText);
                await NotifyProductosActualizados(hubContext, currentTenant.TenantId);
            }

            return txResult.Response;
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPut("/productos/{id:int}", async (
            int id,
            ProductoCreateDto dto,
            IValidator<ProductoCreateDto> validator,
            [FromServices] ProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IAiEmbeddingService embeddingService,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var actualizado = await servicio.ActualizarProductoAsync(id, dto);
            if (actualizado)
            {
                var embeddingText = $"{dto.Nombre}: {dto.Descripcion}";
                _ = embeddingService.SafeUpsertAsync(currentTenant.TenantId, "Producto", id, embeddingText);
                await NotifyProductosActualizados(hubContext, currentTenant.TenantId);
            }
            return actualizado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapDelete("/productos/{id:int}", async (
            int id,
            bool? forzar,
            [FromServices] ProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var result = await servicio.EliminarProductoAsync(id, forzar ?? false);
            if (result.Success)
            {
                await NotifyProductosActualizados(hubContext, currentTenant.TenantId);
                return Results.NoContent();
            }
            if (result.PedidosActivos > 0)
                return Results.Conflict(new { error = result.Error, pedidosActivos = result.PedidosActivos });
            return Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPatch("/productos/{id:int}/activo", async (
            int id,
            [FromBody] CambiarActivoDto dto,
            [FromServices] ProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext,
            ILogger<ProductoService> logger) =>
        {
            logger.LogInformation("[PATCH /productos/{Id}/activo] Recibido: activo={Activo}", id, dto.Activo);
            var actualizado = await servicio.CambiarActivoAsync(id, dto.Activo);
            logger.LogInformation("[PATCH /productos/{Id}/activo] Resultado: actualizado={Actualizado}", id, actualizado);
            if (actualizado)
                await NotifyProductosActualizados(hubContext, currentTenant.TenantId);
            return actualizado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPatch("/productos/batch-toggle", async (
            ProductoBatchToggleRequest request,
            [FromServices] ProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (request.Ids == null || request.Ids.Count == 0 || request.Ids.Count > 1000)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var actualizados = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            if (actualizados > 0)
                await NotifyProductosActualizados(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizados });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPost("/productos/{id:int}/imagen", async (
            int id,
            IFormFile file,
            [FromServices] ProductoService servicio,
            [FromServices] ICloudinaryService cloudinaryService,
            [FromServices] HandySuitesDbContext dbContext,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            try
            {
                // Defensa en profundidad: ObtenerPorIdAsync ya filtra por tenant via
                // el service, pero el folder Cloudinary debe usar el ICurrentTenant
                // (no el JWT claim raw) para respetar impersonation/contexto actual.
                var producto = await servicio.ObtenerPorIdAsync(id);
                if (producto == null)
                    return Results.NotFound();

                var tenantId = currentTenant.TenantId;
                var tenant = await dbContext.Tenants.FindAsync(tenantId);
                var tenantFolder = cloudinaryService.GenerateTenantFolder(tenantId, tenant?.NombreEmpresa ?? "default");
                var productFolder = $"{tenantFolder}/products";

                var result = await cloudinaryService.UploadImageAsync(file, productFolder);

                if (!result.IsSuccess)
                    return Results.BadRequest(result.ErrorMessage);

                // Delete old image if exists
                if (!string.IsNullOrEmpty(producto.ImagenUrl))
                {
                    var oldPublicId = ExtractPublicIdFromUrl(producto.ImagenUrl);
                    if (!string.IsNullOrEmpty(oldPublicId))
                        await cloudinaryService.DeleteImageAsync(oldPublicId);
                }

                await servicio.ActualizarImagenAsync(id, result.SecureUrl);

                return Results.Ok(new { imageUrl = result.SecureUrl });
            }
            catch (Exception)
            {
                return Results.Problem("Error al subir imagen");
            }
        })
        .DisableAntiforgery()
        .RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapDelete("/productos/{id:int}/imagen", async (
            int id,
            [FromServices] ProductoService servicio,
            [FromServices] ICloudinaryService cloudinaryService) =>
        {
            var producto = await servicio.ObtenerPorIdAsync(id);
            if (producto == null)
                return Results.NotFound();

            if (!string.IsNullOrEmpty(producto.ImagenUrl))
            {
                var publicId = ExtractPublicIdFromUrl(producto.ImagenUrl);
                if (!string.IsNullOrEmpty(publicId))
                    await cloudinaryService.DeleteImageAsync(publicId);
            }

            await servicio.ActualizarImagenAsync(id, null);
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));
    }

    internal static async Task NotifyProductosActualizados(IHubContext<NotificationHub> hubContext, int tenantId)
    {
        try
        {
            await hubContext.Clients.Group($"tenant:{tenantId}").SendAsync("ProductosActualizados");
        }
        catch (Exception ex)
        {
            Serilog.Log.Warning(ex, "SignalR emit {Event} falló para tenant {TenantId}", "ProductosActualizados", tenantId);
        }
    }

    private static string? ExtractPublicIdFromUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            var path = uri.AbsolutePath;
            var uploadIndex = path.IndexOf("/upload/");
            if (uploadIndex == -1) return null;
            var afterUpload = path[(uploadIndex + 8)..];
            // Skip version segment (v1234567890/)
            var slashIndex = afterUpload.IndexOf('/');
            if (slashIndex == -1) return null;
            var publicIdWithExt = afterUpload[(slashIndex + 1)..];
            // Remove file extension
            var lastDot = publicIdWithExt.LastIndexOf('.');
            return lastDot == -1 ? publicIdWithExt : publicIdWithExt[..lastDot];
        }
        catch
        {
            return null;
        }
    }
}

public record CambiarActivoDto([property: JsonPropertyName("activo")] bool Activo);
public record ProductoBatchToggleRequest(List<int> Ids, bool Activo);
