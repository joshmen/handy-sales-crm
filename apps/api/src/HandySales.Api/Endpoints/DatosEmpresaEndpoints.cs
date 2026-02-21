using HandySales.Application.DatosEmpresa.DTOs;
using HandySales.Application.DatosEmpresa.Interfaces;
using HandySales.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class DatosEmpresaEndpoints
{
    public static void MapDatosEmpresaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/datos-empresa")
            .RequireAuthorization()
            .WithTags("Datos de Empresa");

        // GET /api/datos-empresa
        group.MapGet("/", async (
            HttpContext context,
            [FromServices] IDatosEmpresaService service,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                return Results.Forbid();

            var result = await service.GetAsync();
            return result != null
                ? Results.Ok(result)
                : Results.NotFound("Datos de empresa no encontrados");
        })
        .WithName("GetDatosEmpresa")
        .WithSummary("Obtener datos de empresa del tenant actual")
        .Produces<DatosEmpresaDto>();

        // PUT /api/datos-empresa
        group.MapPut("/", async (
            DatosEmpresaUpdateDto request,
            HttpContext context,
            [FromServices] IDatosEmpresaService service,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                return Results.Forbid();

            var userIdClaim = context.User.FindFirst("userId")?.Value
                             ?? context.User.FindFirst("sub")?.Value
                             ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (!int.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            var result = await service.UpdateAsync(request, userId.ToString());
            return Results.Ok(result);
        })
        .WithName("UpdateDatosEmpresa")
        .WithSummary("Actualizar datos de empresa")
        .Accepts<DatosEmpresaUpdateDto>("application/json")
        .Produces<DatosEmpresaDto>();
    }
}
