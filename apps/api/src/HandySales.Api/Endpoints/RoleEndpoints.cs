using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HandySales.Application.Roles.Services;
using HandySales.Application.Roles.DTOs;
using HandySales.Shared.Multitenancy;

namespace HandySales.Api.Endpoints;

public static class RoleEndpoints
{
    public static void MapRoleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/roles")
            .RequireAuthorization()
            .RequireCors("HandySalesPolicy");

        // GET /api/roles - Obtener todos los roles (Solo Admin/SuperAdmin)
        group.MapGet("/", GetAllRoles)
            .WithName("GetAllRoles")
            .WithSummary("Obtiene todos los roles del sistema")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "SuperAdmin"));

        // GET /api/roles/active - Obtener solo roles activos (Para selects)
        group.MapGet("/active", GetActiveRoles)
            .WithName("GetActiveRoles")
            .WithSummary("Obtiene solo los roles activos");

        // GET /api/roles/{id} - Obtener rol por ID
        group.MapGet("/{id:int}", GetRoleById)
            .WithName("GetRoleById")
            .WithSummary("Obtiene un rol por su ID")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "SuperAdmin"));

        // POST /api/roles - Crear nuevo rol
        group.MapPost("/", CreateRole)
            .WithName("CreateRole")
            .WithSummary("Crea un nuevo rol")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "SuperAdmin"));

        // PUT /api/roles/{id} - Actualizar rol
        group.MapPut("/{id:int}", UpdateRole)
            .WithName("UpdateRole")
            .WithSummary("Actualiza un rol existente")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "SuperAdmin"));

        // DELETE /api/roles/{id} - Eliminar rol
        group.MapDelete("/{id:int}", DeleteRole)
            .WithName("DeleteRole")
            .WithSummary("Elimina un rol")
            .RequireAuthorization(policy => policy.RequireRole("SuperAdmin")); // Solo SuperAdmin
    }

    private static async Task<IResult> GetAllRoles(
        [FromServices] RoleService roleService)
    {
        try
        {
            var roles = await roleService.GetAllRolesAsync();
            return Results.Ok(roles);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error obteniendo roles: {ex.Message}");
        }
    }

    private static async Task<IResult> GetActiveRoles(
        [FromServices] RoleService roleService)
    {
        try
        {
            var roles = await roleService.GetActiveRolesAsync();
            return Results.Ok(roles);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error obteniendo roles activos: {ex.Message}");
        }
    }

    private static async Task<IResult> GetRoleById(
        [FromServices] RoleService roleService,
        int id)
    {
        try
        {
            var role = await roleService.GetRoleByIdAsync(id);
            if (role == null)
            {
                return Results.NotFound($"No se encontró el rol con ID {id}");
            }
            return Results.Ok(role);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error obteniendo rol: {ex.Message}");
        }
    }

    private static async Task<IResult> CreateRole(
        [FromServices] RoleService roleService,
        [FromBody] CreateRoleDto createRoleDto)
    {
        try
        {
            var role = await roleService.CreateRoleAsync(createRoleDto);
            return Results.Created($"/api/roles/{role.Id}", role);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error creando rol: {ex.Message}");
        }
    }

    private static async Task<IResult> UpdateRole(
        [FromServices] RoleService roleService,
        int id,
        [FromBody] UpdateRoleDto updateRoleDto)
    {
        try
        {
            var role = await roleService.UpdateRoleAsync(id, updateRoleDto);
            if (role == null)
            {
                return Results.NotFound($"No se encontró el rol con ID {id}");
            }
            return Results.Ok(role);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error actualizando rol: {ex.Message}");
        }
    }

    private static async Task<IResult> DeleteRole(
        [FromServices] RoleService roleService,
        int id)
    {
        try
        {
            var deleted = await roleService.DeleteRoleAsync(id);
            if (!deleted)
            {
                return Results.NotFound($"No se encontró el rol con ID {id}");
            }
            return Results.NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error eliminando rol: {ex.Message}");
        }
    }
}