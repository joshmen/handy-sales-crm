using HandySuites.Application.Modulos.DTOs;
using HandySuites.Application.Modulos.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class ModulesEndpoints
{
    public static void MapModulesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/feature-flags")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .RequireCors("HandySuitesPolicy");

        group.MapGet("/", GetMatriz)
            .WithName("GetModulosMatriz")
            .WithSummary("Lista la matriz de módulos / feature flags (SuperAdmin)");

        group.MapGet("/{id:int}", GetById)
            .WithName("GetModuloById")
            .WithSummary("Obtiene un módulo por ID con sus overrides (SuperAdmin)");

        group.MapPost("/", Create)
            .WithName("CreateModulo")
            .WithSummary("Crea un nuevo módulo de plataforma (SuperAdmin)");

        group.MapPatch("/{id:int}", Update)
            .WithName("UpdateModulo")
            .WithSummary("Actualiza disponibilidad por tier, nombre y descripción de un módulo (SuperAdmin)");

        group.MapDelete("/{id:int}", Delete)
            .WithName("DeleteModulo")
            .WithSummary("Elimina (soft-delete) un módulo de plataforma (SuperAdmin)");

        group.MapGet("/overrides", GetOverrides)
            .WithName("GetModuloOverrides")
            .WithSummary("Lista todos los overrides de módulo por tenant (SuperAdmin)");

        group.MapPost("/overrides", CreateOverride)
            .WithName("CreateModuloOverride")
            .WithSummary("Crea un override de módulo para un tenant (SuperAdmin)");

        group.MapDelete("/overrides/{id:int}", DeleteOverride)
            .WithName("DeleteModuloOverride")
            .WithSummary("Elimina (soft-delete) un override de módulo (SuperAdmin)");
    }

    private static async Task<IResult> GetMatriz(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IModuloRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var matriz = await repo.GetMatrizAsync();
        return Results.Ok(matriz);
    }

    private static async Task<IResult> GetById(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IModuloRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var modulo = await repo.GetByIdAsync(id);
        if (modulo == null)
            return Results.NotFound(new { message = "Módulo no encontrado" });

        return Results.Ok(modulo);
    }

    private static async Task<IResult> Create(
        [FromBody] CrearModuloDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IModuloRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        if (string.IsNullOrWhiteSpace(dto.Clave))
            return Results.BadRequest(new { message = "La clave es obligatoria" });

        var existing = await repo.GetByClaveAsync(dto.Clave);
        if (existing != null)
            return Results.Conflict(new { message = $"Ya existe un módulo con la clave '{dto.Clave}'" });

        var modulo = new ModuloPlataforma
        {
            Clave = dto.Clave,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            DisponibleBasico = dto.DisponibleBasico,
            DisponiblePro = dto.DisponiblePro,
            DisponibleEnterprise = dto.DisponibleEnterprise,
            Orden = dto.Orden,
            Activo = true
        };

        var id = await repo.CreateAsync(modulo);
        return Results.Created($"/api/superadmin/feature-flags/{id}", new { id });
    }

    private static async Task<IResult> Update(
        int id,
        [FromBody] ActualizarModuloDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IModuloRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var modulo = await repo.GetEntityByIdAsync(id);
        if (modulo == null)
            return Results.NotFound(new { message = "Módulo no encontrado" });

        modulo.Nombre = dto.Nombre;
        modulo.Descripcion = dto.Descripcion;
        modulo.DisponibleBasico = dto.DisponibleBasico;
        modulo.DisponiblePro = dto.DisponiblePro;
        modulo.DisponibleEnterprise = dto.DisponibleEnterprise;

        await repo.UpdateAsync(modulo);
        return Results.Ok(new { message = "Módulo actualizado" });
    }

    private static async Task<IResult> Delete(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IModuloRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var deleted = await repo.DeleteAsync(id);
        if (!deleted)
            return Results.NotFound(new { message = "Módulo no encontrado" });

        return Results.Ok(new { message = "Módulo eliminado" });
    }

    private static async Task<IResult> GetOverrides(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IModuloRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var overrides = await repo.GetOverridesAsync();
        return Results.Ok(overrides);
    }

    private static async Task<IResult> CreateOverride(
        [FromBody] CrearOverrideDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IModuloRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var modulo = await repo.GetEntityByIdAsync(dto.ModuloPlataformaId);
        if (modulo == null)
            return Results.NotFound(new { message = "Módulo no encontrado" });

        var existing = await repo.GetOverrideByModuloTenantAsync(dto.ModuloPlataformaId, dto.TenantId);
        if (existing != null)
            return Results.Conflict(new { message = "Ya existe un override para este módulo y empresa" });

        var overrideEntity = new ModuloOverride
        {
            ModuloPlataformaId = dto.ModuloPlataformaId,
            TenantId = dto.TenantId,
            Habilitado = dto.Habilitado,
            Motivo = dto.Motivo,
            Activo = true
        };

        var id = await repo.CreateOverrideAsync(overrideEntity);
        return Results.Created($"/api/superadmin/feature-flags/overrides/{id}", new { id });
    }

    private static async Task<IResult> DeleteOverride(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IModuloRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var deleted = await repo.DeleteOverrideAsync(id);
        if (!deleted)
            return Results.NotFound(new { message = "Override no encontrado" });

        return Results.Ok(new { message = "Override eliminado" });
    }
}
