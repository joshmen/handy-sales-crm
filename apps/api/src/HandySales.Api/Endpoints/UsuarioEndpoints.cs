using HandySales.Application.Auth.DTOs;
using HandySales.Application.Usuarios.Services;
using HandySales.Application.Usuarios.DTOs;
using Microsoft.AspNetCore.Authorization;
using HandySales.Application.Common.DTOs;

namespace HandySales.Api.Endpoints;

public static class UsuarioEndpoints
{
    public static void MapUsuarioEndpoints(this WebApplication app)
    {
        var usuarios = app.MapGroup("/api/usuarios")
            .RequireAuthorization()
            .WithTags("Usuarios");

        usuarios.MapGet("/", GetUsuarios)
            .WithName("GetUsuarios")
            .WithSummary("Obtener todos los usuarios del tenant");


        usuarios.MapGet("/{id}", GetUsuarioById)
            .WithName("GetUsuarioById")
            .WithSummary("Obtener usuario por ID");

        usuarios.MapPost("/search", SearchUsuarios)
            .WithName("SearchUsuarios")
            .WithSummary("Buscar usuarios con filtros avanzados");

        usuarios.MapPost("/", CreateUsuario)
            .WithName("CreateUsuario")
            .WithSummary("Crear nuevo usuario");

        usuarios.MapPut("/{id}", UpdateUsuario)
            .WithName("UpdateUsuario")
            .WithSummary("Actualizar usuario");

        usuarios.MapDelete("/{id}", DeleteUsuario)
            .WithName("DeleteUsuario")
            .WithSummary("Eliminar usuario");

        usuarios.MapPatch("/{id}/activate", ActivateUsuario)
            .WithName("ActivateUsuario")
            .WithSummary("Activar usuario");

        usuarios.MapPatch("/{id}/deactivate", DeactivateUsuario)
            .WithName("DeactivateUsuario")
            .WithSummary("Desactivar usuario");

        usuarios.MapPatch("/{id}/assign-role/{roleId}", AssignRoleToUsuario)
            .WithName("AssignRoleToUsuario")
            .WithSummary("Asignar rol a usuario");

        usuarios.MapPost("/{id}/avatar", UploadAvatar)
            .WithName("UploadUserAvatar")
            .WithSummary("Subir avatar de usuario")
            .DisableAntiforgery();

        usuarios.MapDelete("/{id}/avatar", DeleteAvatar)
            .WithName("DeleteUserAvatar")
            .WithSummary("Eliminar avatar de usuario");

        usuarios.MapPatch("/batch-toggle", BatchToggleUsuarios)
            .WithName("BatchToggleUsuarios")
            .WithSummary("Activar/desactivar múltiples usuarios");
    }

    private static async Task<IResult> GetUsuarios(
        UsuarioService service,
        int? page = null,
        int? pageSize = null)
    {
        try
        {
            // Si no se proporcionan parámetros de paginación, devolver todos los usuarios
            if (page == null || pageSize == null)
            {
                var usuarios = await service.ObtenerUsuariosDeMiTenant();
                return Results.Ok(usuarios);
            }

            // Si se proporcionan parámetros de paginación, usar el método paginado
            var pagination = new PaginationRequest { Page = page.Value, PageSize = pageSize.Value };
            var result = await service.ObtenerUsuariosPaginados(pagination);
            return Results.Ok(result);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al obtener usuarios: {ex.Message}");
        }
    }


    private static async Task<IResult> GetUsuarioById(int id, UsuarioService service)
    {
        try
        {
            var usuario = await service.ObtenerUsuarioPorIdAsync(id);
            if (usuario == null)
                return Results.NotFound($"Usuario con ID {id} no encontrado");

            return Results.Ok(usuario);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al obtener usuario: {ex.Message}");
        }
    }

    private static async Task<IResult> SearchUsuarios(UsuarioSearchDto searchDto, UsuarioService service)
    {
        try
        {
            var result = await service.BuscarUsuariosAsync(searchDto);
            return Results.Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al buscar usuarios: {ex.Message}");
        }
    }

    private static async Task<IResult> CreateUsuario(UsuarioRegisterDto dto, UsuarioService service)
    {
        try
        {
            if (await service.EmailDisponibleAsync(dto.Email) == false)
                return Results.BadRequest("El email ya está en uso");

            var usuarioId = await service.RegistrarUsuarioAsync(dto);
            return Results.Created($"/api/usuarios/{usuarioId}", new { id = usuarioId });
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al crear usuario: {ex.Message}");
        }
    }

    private static async Task<IResult> UpdateUsuario(int id, UsuarioUpdateDto dto, UsuarioService service)
    {
        try
        {
            var success = await service.ActualizarUsuarioAsync(id, dto);
            if (!success)
                return Results.NotFound($"Usuario con ID {id} no encontrado");

            return Results.Ok();
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al actualizar usuario: {ex.Message}");
        }
    }

    private static async Task<IResult> DeleteUsuario(int id, UsuarioService service)
    {
        try
        {
            var success = await service.EliminarUsuarioAsync(id);
            if (!success)
                return Results.NotFound($"Usuario con ID {id} no encontrado");

            return Results.Ok();
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al eliminar usuario: {ex.Message}");
        }
    }

    private static async Task<IResult> ActivateUsuario(int id, UsuarioService service)
    {
        try
        {
            var success = await service.ActivarUsuarioAsync(id);
            if (!success)
                return Results.NotFound($"Usuario con ID {id} no encontrado");

            return Results.Ok(new { message = "Usuario activado correctamente" });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al activar usuario: {ex.Message}");
        }
    }

    private static async Task<IResult> DeactivateUsuario(int id, UsuarioService service)
    {
        try
        {
            var success = await service.DesactivarUsuarioAsync(id);
            if (!success)
                return Results.NotFound($"Usuario con ID {id} no encontrado");

            return Results.Ok(new { message = "Usuario desactivado correctamente" });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al desactivar usuario: {ex.Message}");
        }
    }

    private static async Task<IResult> AssignRoleToUsuario(int id, int roleId, UsuarioService service)
    {
        try
        {
            var success = await service.AsignarRolAsync(id, roleId);
            if (!success)
                return Results.NotFound($"Usuario con ID {id} no encontrado");

            return Results.Ok(new { message = "Rol asignado correctamente" });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al asignar rol: {ex.Message}");
        }
    }

    private static async Task<IResult> UploadAvatar(int id, HttpRequest request, UsuarioService service)
    {
        try
        {
            if (!request.HasFormContentType)
                return Results.BadRequest("Content-Type debe ser multipart/form-data");

            var form = await request.ReadFormAsync();
            var file = form.Files.FirstOrDefault();

            if (file == null || file.Length == 0)
                return Results.BadRequest("No se ha proporcionado ningún archivo");

            var avatarUrl = await service.UploadAvatarAsync(id, file);
            if (avatarUrl == null)
                return Results.BadRequest("Error al subir el avatar");

            return Results.Ok(new { avatarUrl });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al subir avatar: {ex.Message}");
        }
    }

    private static async Task<IResult> DeleteAvatar(int id, UsuarioService service)
    {
        try
        {
            var success = await service.DeleteAvatarAsync(id);
            if (!success)
                return Results.NotFound($"Usuario con ID {id} no encontrado");

            return Results.Ok(new { message = "Avatar eliminado correctamente" });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al eliminar avatar: {ex.Message}");
        }
    }

    private static async Task<IResult> BatchToggleUsuarios(UsuarioBatchToggleRequest request, UsuarioService service)
    {
        try
        {
            if (request.Ids == null || request.Ids.Count == 0)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var actualizados = await service.BatchToggleActivoAsync(request.Ids, request.Activo);
            return Results.Ok(new { actualizados });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error al cambiar estado de usuarios: {ex.Message}");
        }
    }

}

public record UsuarioBatchToggleRequest(List<int> Ids, bool Activo);
