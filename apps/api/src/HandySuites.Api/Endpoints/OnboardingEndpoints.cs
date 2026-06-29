using HandySuites.Application.Onboarding.DTOs;
using HandySuites.Application.Onboarding.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class OnboardingEndpoints
{
    public static void MapOnboardingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/onboarding")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .RequireCors("HandySuitesPolicy");

        group.MapGet("/", GetResumen)
            .WithName("GetOnboardingResumen")
            .WithSummary("Resumen de casos de onboarding con KPIs (SuperAdmin)");

        group.MapGet("/{id:int}", GetById)
            .WithName("GetOnboardingCasoById")
            .WithSummary("Obtiene un caso de onboarding por ID (SuperAdmin)");

        group.MapPost("/", Create)
            .WithName("CreateOnboardingCaso")
            .WithSummary("Crea un caso de onboarding para un tenant (SuperAdmin)");

        group.MapPatch("/{id:int}/etapa", CambiarEtapa)
            .WithName("CambiarEtapaOnboarding")
            .WithSummary("Cambia la etapa de un caso de onboarding (SuperAdmin)");

        group.MapPatch("/{id:int}/responsable", AsignarResponsable)
            .WithName("AsignarResponsableOnboarding")
            .WithSummary("Asigna un responsable a un caso de onboarding (SuperAdmin)");
    }

    private static async Task<IResult> GetResumen(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IOnboardingRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var resumen = await repo.GetResumenAsync();
        return Results.Ok(resumen);
    }

    private static async Task<IResult> GetById(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IOnboardingRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var caso = await repo.GetByIdAsync(id);
        if (caso == null)
            return Results.NotFound(new { message = "Caso de onboarding no encontrado" });

        return Results.Ok(caso);
    }

    private static async Task<IResult> Create(
        [FromBody] CrearCasoDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IOnboardingRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var caso = new CasoOnboarding
        {
            TenantId = dto.TenantId,
            Etapa = EtapaOnboarding.Solicitud,
            PlanTentativo = dto.PlanTentativo,
            EntroEtapaEn = DateTime.UtcNow
        };

        var id = await repo.CreateAsync(caso);
        return Results.Created($"/api/superadmin/onboarding/{id}", new { id });
    }

    private static async Task<IResult> CambiarEtapa(
        int id,
        [FromBody] ActualizarEtapaDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IOnboardingRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var caso = await repo.GetEntityByIdAsync(id);
        if (caso == null)
            return Results.NotFound(new { message = "Caso de onboarding no encontrado" });

        caso.Etapa = dto.Etapa;
        caso.EntroEtapaEn = DateTime.UtcNow;

        await repo.UpdateAsync(caso);
        return Results.Ok(new { message = "Etapa actualizada" });
    }

    private static async Task<IResult> AsignarResponsable(
        int id,
        [FromBody] AsignarResponsableDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IOnboardingRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var caso = await repo.GetEntityByIdAsync(id);
        if (caso == null)
            return Results.NotFound(new { message = "Caso de onboarding no encontrado" });

        caso.ResponsableUsuarioId = dto.ResponsableUsuarioId;

        await repo.UpdateAsync(caso);
        return Results.Ok(new { message = "Responsable asignado" });
    }
}
