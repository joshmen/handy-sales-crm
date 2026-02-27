using HandySales.Application.SubscriptionPlans.DTOs;
using HandySales.Application.SubscriptionPlans.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class SubscriptionPlanAdminEndpoints
{
    public static void MapSubscriptionPlanAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/subscription-plans")
            .RequireAuthorization()
            .RequireCors("HandySalesPolicy");

        group.MapGet("/", GetAll)
            .WithName("GetAllSubscriptionPlans")
            .WithSummary("Lista todos los planes de suscripción (SuperAdmin)");

        group.MapGet("/{id:int}", GetById)
            .WithName("GetSubscriptionPlanById")
            .WithSummary("Obtiene un plan por ID (SuperAdmin)");

        group.MapPost("/", Create)
            .WithName("CreateSubscriptionPlan")
            .WithSummary("Crea un nuevo plan de suscripción (SuperAdmin)");

        group.MapPut("/{id:int}", Update)
            .WithName("UpdateSubscriptionPlan")
            .WithSummary("Actualiza un plan de suscripción (SuperAdmin)");

        group.MapPatch("/{id:int}/toggle", Toggle)
            .WithName("ToggleSubscriptionPlan")
            .WithSummary("Activa/desactiva un plan de suscripción (SuperAdmin)");
    }

    private static async Task<IResult> GetAll(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISubscriptionPlanRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var plans = await repo.GetAllAsync(includeInactive: true);
        return Results.Ok(plans);
    }

    private static async Task<IResult> GetById(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISubscriptionPlanRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var plan = await repo.GetByIdAsync(id);
        if (plan == null)
            return Results.NotFound(new { message = "Plan no encontrado" });

        return Results.Ok(plan);
    }

    private static async Task<IResult> Create(
        [FromBody] SubscriptionPlanCreateDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISubscriptionPlanRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var existing = await repo.GetByCodigoAsync(dto.Codigo);
        if (existing != null)
            return Results.Conflict(new { message = $"Ya existe un plan con el código '{dto.Codigo}'" });

        var plan = new SubscriptionPlan
        {
            Nombre = dto.Nombre,
            Codigo = dto.Codigo.ToUpperInvariant(),
            PrecioMensual = dto.PrecioMensual,
            PrecioAnual = dto.PrecioAnual,
            MaxUsuarios = dto.MaxUsuarios,
            MaxProductos = dto.MaxProductos,
            MaxClientesPorMes = dto.MaxClientesPorMes,
            IncluyeReportes = dto.IncluyeReportes,
            IncluyeSoportePrioritario = dto.IncluyeSoportePrioritario,
            Caracteristicas = dto.Caracteristicas ?? new List<string>(),
            Activo = true,
            Orden = dto.Orden
        };

        var id = await repo.CreateAsync(plan);
        return Results.Created($"/api/superadmin/subscription-plans/{id}", new { id });
    }

    private static async Task<IResult> Update(
        int id,
        [FromBody] SubscriptionPlanUpdateDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISubscriptionPlanRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var plan = await repo.GetByIdAsync(id);
        if (plan == null)
            return Results.NotFound(new { message = "Plan no encontrado" });

        plan.Nombre = dto.Nombre;
        plan.PrecioMensual = dto.PrecioMensual;
        plan.PrecioAnual = dto.PrecioAnual;
        plan.MaxUsuarios = dto.MaxUsuarios;
        plan.MaxProductos = dto.MaxProductos;
        plan.MaxClientesPorMes = dto.MaxClientesPorMes;
        plan.IncluyeReportes = dto.IncluyeReportes;
        plan.IncluyeSoportePrioritario = dto.IncluyeSoportePrioritario;
        plan.Caracteristicas = dto.Caracteristicas ?? new List<string>();
        plan.Activo = dto.Activo;
        plan.Orden = dto.Orden;

        await repo.UpdateAsync(plan);
        return Results.Ok(new { message = "Plan actualizado" });
    }

    private static async Task<IResult> Toggle(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISubscriptionPlanRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var plan = await repo.GetByIdAsync(id);
        if (plan == null)
            return Results.NotFound(new { message = "Plan no encontrado" });

        if (plan.Activo)
        {
            var tenantCount = await repo.GetTenantCountByPlanAsync(plan.Codigo);
            if (tenantCount > 0)
                return Results.BadRequest(new { message = $"No se puede desactivar: {tenantCount} empresa(s) usan este plan" });
        }

        await repo.ToggleActivoAsync(id);
        return Results.Ok(new { message = plan.Activo ? "Plan desactivado" : "Plan activado" });
    }
}
