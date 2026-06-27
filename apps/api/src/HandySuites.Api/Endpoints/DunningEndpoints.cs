using HandySuites.Application.Cobros.DTOs;
using HandySuites.Application.Cobros.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class DunningEndpoints
{
    public static void MapDunningEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/dunning")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .RequireCors("HandySuitesPolicy");

        group.MapGet("/", GetResumen)
            .WithName("GetDunningResumen")
            .WithSummary("Resumen de cobranza de suscripciones con KPIs (SuperAdmin)");

        group.MapGet("/{id:int}", GetById)
            .WithName("GetDunningById")
            .WithSummary("Obtiene un caso de cobranza por ID (SuperAdmin)");

        group.MapPost("/", Create)
            .WithName("CreateDunning")
            .WithSummary("Crea un caso de cobranza (SuperAdmin)");

        group.MapPost("/{id:int}/reintento", Reintento)
            .WithName("DunningReintento")
            .WithSummary("Registra un reintento y avanza la etapa (SuperAdmin)");

        group.MapPatch("/{id:int}/contactado", Contactado)
            .WithName("DunningContactado")
            .WithSummary("Marca al cliente como contactado y reprograma el próximo paso (SuperAdmin)");

        group.MapPatch("/{id:int}/recuperado", Recuperado)
            .WithName("DunningRecuperado")
            .WithSummary("Marca el caso de cobranza como recuperado (SuperAdmin)");
    }

    private static async Task<IResult> GetResumen(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ICobranzaRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var resumen = await repo.GetResumenAsync();
        return Results.Ok(resumen);
    }

    private static async Task<IResult> GetById(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ICobranzaRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var cobranza = await repo.GetByIdAsync(id);
        if (cobranza == null)
            return Results.NotFound(new { message = "Caso de cobranza no encontrado" });

        return Results.Ok(cobranza);
    }

    private static async Task<IResult> Create(
        [FromBody] CrearCobranzaDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ICobranzaRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var cobranza = new CobranzaSuscripcion
        {
            TenantId = dto.TenantId,
            Monto = dto.Monto,
            Motivo = dto.Motivo,
            Intentos = 0,
            Etapa = EtapaCobranza.Reintento1,
            Estado = EstadoCobranza.Activo
        };

        var id = await repo.CreateAsync(cobranza);
        return Results.Created($"/api/superadmin/dunning/{id}", new { id });
    }

    private static async Task<IResult> Reintento(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ICobranzaRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var cobranza = await repo.GetEntityByIdAsync(id);
        if (cobranza == null)
            return Results.NotFound(new { message = "Caso de cobranza no encontrado" });

        cobranza.Intentos++;
        if (cobranza.Etapa < EtapaCobranza.Suspension)
            cobranza.Etapa++;

        await repo.UpdateAsync(cobranza);
        return Results.Ok(new { message = "Reintento registrado" });
    }

    private static async Task<IResult> Contactado(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ICobranzaRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var cobranza = await repo.GetEntityByIdAsync(id);
        if (cobranza == null)
            return Results.NotFound(new { message = "Caso de cobranza no encontrado" });

        cobranza.ProximoPasoEn = DateTime.UtcNow.AddDays(3);

        await repo.UpdateAsync(cobranza);
        return Results.Ok(new { message = "Cliente contactado" });
    }

    private static async Task<IResult> Recuperado(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ICobranzaRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var cobranza = await repo.GetEntityByIdAsync(id);
        if (cobranza == null)
            return Results.NotFound(new { message = "Caso de cobranza no encontrado" });

        cobranza.Estado = EstadoCobranza.Recuperado;

        await repo.UpdateAsync(cobranza);
        return Results.Ok(new { message = "Caso marcado como recuperado" });
    }
}
