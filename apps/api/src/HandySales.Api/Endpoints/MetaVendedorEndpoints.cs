using HandySales.Application.Metas.DTOs;
using HandySales.Application.Metas.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class MetaVendedorEndpoints
{
    public static void MapMetaVendedorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/metas").RequireAuthorization();

        group.MapGet("/", async ([FromServices] MetaVendedorService servicio, [FromQuery] int? usuarioId) =>
        {
            var metas = await servicio.GetAllAsync(usuarioId);
            return Results.Ok(metas);
        });

        group.MapGet("/{id:int}", async (int id, [FromServices] MetaVendedorService servicio) =>
        {
            var meta = await servicio.GetByIdAsync(id);
            return meta is null ? Results.NotFound() : Results.Ok(meta);
        });

        group.MapPost("/", async (
            CreateMetaVendedorDto dto,
            [FromServices] MetaVendedorService servicio,
            HttpContext context) =>
        {
            // Admin only
            var role = context.User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;
            if (role is not ("ADMIN" or "SUPER_ADMIN"))
                return Results.Forbid();

            if (string.IsNullOrWhiteSpace(dto.Tipo) || !new[] { "ventas", "visitas", "pedidos" }.Contains(dto.Tipo))
                return Results.BadRequest(new { error = "Tipo debe ser: ventas, visitas o pedidos" });

            if (string.IsNullOrWhiteSpace(dto.Periodo) || !new[] { "semanal", "mensual" }.Contains(dto.Periodo))
                return Results.BadRequest(new { error = "Periodo debe ser: semanal o mensual" });

            if (dto.Monto <= 0)
                return Results.BadRequest(new { error = "La meta debe ser mayor a 0" });

            if (dto.FechaFin <= dto.FechaInicio)
                return Results.BadRequest(new { error = "La fecha de fin debe ser posterior a la de inicio" });

            var usuario = context.User.Identity?.Name ?? "sistema";
            var id = await servicio.CreateAsync(dto, usuario);
            return Results.Created($"/api/metas/{id}", new { id });
        });

        group.MapPut("/{id:int}", async (
            int id,
            UpdateMetaVendedorDto dto,
            [FromServices] MetaVendedorService servicio,
            HttpContext context) =>
        {
            var role = context.User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;
            if (role is not ("ADMIN" or "SUPER_ADMIN"))
                return Results.Forbid();

            var usuario = context.User.Identity?.Name ?? "sistema";
            var actualizado = await servicio.UpdateAsync(id, dto, usuario);
            return actualizado ? Results.NoContent() : Results.NotFound();
        });

        group.MapDelete("/{id:int}", async (
            int id,
            [FromServices] MetaVendedorService servicio,
            HttpContext context) =>
        {
            var role = context.User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;
            if (role is not ("ADMIN" or "SUPER_ADMIN"))
                return Results.Forbid();

            var deleted = await servicio.DeleteAsync(id);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapPatch("/{id:int}/activo", async (
            int id,
            [FromBody] MetaCambiarActivoDto dto,
            [FromServices] MetaVendedorService servicio,
            HttpContext context) =>
        {
            var role = context.User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;
            if (role is not ("ADMIN" or "SUPER_ADMIN"))
                return Results.Forbid();

            var actualizado = await servicio.CambiarActivoAsync(id, dto.Activo);
            return actualizado ? Results.Ok(new { actualizado = true }) : Results.NotFound();
        });

        group.MapPatch("/batch-toggle", async (
            MetaBatchToggleRequest request,
            [FromServices] MetaVendedorService servicio,
            HttpContext context) =>
        {
            var role = context.User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;
            if (role is not ("ADMIN" or "SUPER_ADMIN"))
                return Results.Forbid();

            if (request.Ids == null || request.Ids.Count == 0)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var count = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            return Results.Ok(new { actualizados = count });
        });
    }
}

public record MetaCambiarActivoDto(bool Activo);
public record MetaBatchToggleRequest(List<int> Ids, bool Activo);
