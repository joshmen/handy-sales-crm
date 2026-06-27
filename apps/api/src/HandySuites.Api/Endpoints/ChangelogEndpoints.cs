using HandySuites.Application.Changelog.DTOs;
using HandySuites.Application.Changelog.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class ChangelogEndpoints
{
    public static void MapChangelogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/changelog")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .RequireCors("HandySuitesPolicy");

        group.MapGet("/", GetAll)
            .WithName("GetAllNovedades")
            .WithSummary("Lista todas las novedades del changelog (SuperAdmin)");

        group.MapGet("/{id:int}", GetById)
            .WithName("GetNovedadById")
            .WithSummary("Obtiene una novedad por ID (SuperAdmin)");

        group.MapPost("/", Create)
            .WithName("CreateNovedad")
            .WithSummary("Crea una nueva novedad (SuperAdmin)");

        group.MapPatch("/{id:int}", Update)
            .WithName("UpdateNovedad")
            .WithSummary("Actualiza una novedad (SuperAdmin)");

        group.MapPatch("/{id:int}/publicar", Publicar)
            .WithName("PublicarNovedad")
            .WithSummary("Publica una novedad (SuperAdmin)");

        group.MapDelete("/{id:int}", Delete)
            .WithName("DeleteNovedad")
            .WithSummary("Elimina una novedad (SuperAdmin)");
    }

    private static async Task<IResult> GetAll(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] INovedadRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var novedades = await repo.GetAllAsync();
        return Results.Ok(novedades.Select(ToDto).ToList());
    }

    private static async Task<IResult> GetById(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] INovedadRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var novedad = await repo.GetByIdAsync(id);
        if (novedad == null)
            return Results.NotFound(new { message = "Novedad no encontrada" });

        return Results.Ok(ToDto(novedad));
    }

    private static async Task<IResult> Create(
        [FromBody] CrearNovedadDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] INovedadRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var novedad = new Novedad
        {
            VersionEtiqueta = dto.VersionEtiqueta,
            Tipo = dto.Tipo,
            Fecha = dto.Fecha,
            Titulo = dto.Titulo,
            Descripcion = dto.Descripcion,
            Audiencia = dto.Audiencia,
            Estado = dto.Estado,
            Activo = true
        };

        var id = await repo.CreateAsync(novedad);
        return Results.Created($"/api/superadmin/changelog/{id}", new { id });
    }

    private static async Task<IResult> Update(
        int id,
        [FromBody] ActualizarNovedadDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] INovedadRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var novedad = await repo.GetByIdAsync(id);
        if (novedad == null)
            return Results.NotFound(new { message = "Novedad no encontrada" });

        novedad.VersionEtiqueta = dto.VersionEtiqueta;
        novedad.Tipo = dto.Tipo;
        novedad.Fecha = dto.Fecha;
        novedad.Titulo = dto.Titulo;
        novedad.Descripcion = dto.Descripcion;
        novedad.Audiencia = dto.Audiencia;
        novedad.Estado = dto.Estado;

        await repo.UpdateAsync(novedad);
        return Results.Ok(new { message = "Novedad actualizada" });
    }

    private static async Task<IResult> Publicar(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] INovedadRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var novedad = await repo.GetByIdAsync(id);
        if (novedad == null)
            return Results.NotFound(new { message = "Novedad no encontrada" });

        novedad.Estado = EstadoNovedad.Publicado;
        await repo.UpdateAsync(novedad);
        return Results.Ok(new { message = "Novedad publicada" });
    }

    private static async Task<IResult> Delete(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] INovedadRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var deleted = await repo.RemoveAsync(id);
        if (!deleted)
            return Results.NotFound(new { message = "Novedad no encontrada" });

        return Results.Ok(new { message = "Novedad eliminada" });
    }

    private static NovedadDto ToDto(Novedad n) => new()
    {
        Id = n.Id,
        VersionEtiqueta = n.VersionEtiqueta,
        Tipo = n.Tipo,
        Fecha = n.Fecha,
        Titulo = n.Titulo,
        Descripcion = n.Descripcion,
        Audiencia = n.Audiencia,
        Estado = n.Estado,
        Activo = n.Activo,
        CreadoEn = n.CreadoEn,
        ActualizadoEn = n.ActualizadoEn
    };
}
