using System.Text.Json.Serialization;
using FluentValidation;
using HandySales.Application.CompanySettings.Interfaces;
using HandySales.Application.Productos.DTOs;
using HandySales.Application.Productos.Services;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HandySales.Api.Endpoints;

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
            [FromServices] ProductoService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var id = await servicio.CrearProductoAsync(dto);
            return Results.Created($"/productos/{id}", new { id });
        }).RequireAuthorization();

        app.MapPut("/productos/{id:int}", async (
            int id,
            ProductoCreateDto dto,
            IValidator<ProductoCreateDto> validator,
            [FromServices] ProductoService servicio) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var actualizado = await servicio.ActualizarProductoAsync(id, dto);
            return actualizado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        app.MapDelete("/productos/{id:int}", async (int id, [FromServices] ProductoService servicio) =>
        {
            var eliminado = await servicio.EliminarProductoAsync(id);
            return eliminado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        app.MapPatch("/productos/{id:int}/activo", async (int id, [FromBody] CambiarActivoDto dto, [FromServices] ProductoService servicio, ILogger<ProductoService> logger) =>
        {
            logger.LogInformation("[PATCH /productos/{Id}/activo] Recibido: activo={Activo}", id, dto.Activo);
            var actualizado = await servicio.CambiarActivoAsync(id, dto.Activo);
            logger.LogInformation("[PATCH /productos/{Id}/activo] Resultado: actualizado={Actualizado}", id, actualizado);
            return actualizado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        app.MapPatch("/productos/batch-toggle", async (ProductoBatchToggleRequest request, [FromServices] ProductoService servicio) =>
        {
            if (request.Ids == null || request.Ids.Count == 0)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var actualizados = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            return Results.Ok(new { actualizados });
        }).RequireAuthorization();

        app.MapPost("/productos/{id:int}/imagen", async (
            int id,
            IFormFile file,
            [FromServices] ProductoService servicio,
            [FromServices] ICloudinaryService cloudinaryService,
            [FromServices] HandySalesDbContext dbContext,
            ClaimsPrincipal user) =>
        {
            try
            {
                var producto = await servicio.ObtenerPorIdAsync(id);
                if (producto == null)
                    return Results.NotFound();

                var tenantIdClaim = user.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !int.TryParse(tenantIdClaim, out var tenantId))
                    return Results.BadRequest("Tenant no válido");

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
            catch (Exception ex)
            {
                return Results.Problem($"Error al subir imagen: {ex.Message}");
            }
        })
        .DisableAntiforgery()
        .RequireAuthorization();

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
        }).RequireAuthorization();
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
