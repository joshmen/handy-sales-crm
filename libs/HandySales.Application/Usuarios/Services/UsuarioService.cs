using HandySales.Domain.Entities;
using HandySales.Shared.Multitenancy;
using HandySales.Shared.Security;
using BCrypt.Net;
using HandySales.Application.Common.DTOs;
using HandySales.Application.CompanySettings.Interfaces;
using HandySales.Application.Usuarios.DTOs;
using HandySales.Application.Usuarios.Interfaces;
using Microsoft.AspNetCore.Http;

namespace HandySales.Application.Usuarios.Services;

public class UsuarioService
{
    private readonly IUsuarioRepository _repo;
    private readonly ICurrentTenant _tenant;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ICloudinaryFolderService _folderService;
    private readonly ICompanySettingsRepository _companyRepository;
    private readonly PwnedPasswordService? _pwnedPasswords;

    public UsuarioService(
        IUsuarioRepository repo,
        ICurrentTenant tenant,
        ICloudinaryService cloudinaryService,
        ICloudinaryFolderService folderService,
        ICompanySettingsRepository companyRepository,
        PwnedPasswordService? pwnedPasswords = null)
    {
        _repo = repo;
        _tenant = tenant;
        _cloudinaryService = cloudinaryService;
        _folderService = folderService;
        _companyRepository = companyRepository;
        _pwnedPasswords = pwnedPasswords;
    }

    public async Task<bool> EmailDisponibleAsync(string email)
    {
        return !await _repo.ExisteEmailAsync(email);
    }

    public async Task<int> RegistrarUsuarioAsync(UsuarioRegisterDto dto)
    {
        // Block disposable email domains
        if (DisposableEmailService.IsDisposable(dto.Email))
            throw new InvalidOperationException("No se permiten correos electrónicos temporales o desechables.");

        // Check password against known breaches
        if (_pwnedPasswords != null && await _pwnedPasswords.IsCompromisedAsync(dto.Password))
            throw new InvalidOperationException("Esta contraseña fue encontrada en filtraciones de datos. Por favor elige una contraseña diferente.");

        var usuario = new Usuario
        {
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Nombre = dto.Nombre,
            TenantId = _tenant.TenantId
        };

        var creado = await _repo.RegistrarAsync(usuario);
        return creado.Id;
    }

    public async Task<Usuario?> ObtenerPorEmailAsync(string email)
    {
        return await _repo.ObtenerPorEmailAsync(email);
    }

    public async Task<List<UsuarioDto>> ObtenerUsuariosDeMiTenant()
    {
        List<Usuario> usuarios;

        // Super Admin puede ver TODOS los usuarios
        if (_tenant.IsSuperAdmin)
        {
            usuarios = await _repo.ObtenerTodosAsync();
        }
        // Admin normal solo ve usuarios VENDEDOR de su tenant (no otros admins)
        else if (_tenant.IsAdmin)
        {
            var todosUsuarios = await _repo.ObtenerPorTenantAsync(_tenant.TenantId);
            usuarios = todosUsuarios.Where(u => !u.EsAdmin && !u.EsSuperAdmin).ToList();
        }
        // Usuarios normales no pueden ver otros usuarios
        else
        {
            throw new UnauthorizedAccessException("No tienes permisos para ver usuarios");
        }

        return usuarios.Select(u => new UsuarioDto
        {
            Id = u.Id,
            Email = u.Email,
            TenantId = u.TenantId,
            Nombre = u.Nombre,
            EsAdmin = u.EsAdmin,
            EsSuperAdmin = u.EsSuperAdmin,
            AvatarUrl = u.AvatarUrl
        }).ToList();
    }

    public async Task<PaginatedResult<UsuarioDto>> ObtenerUsuariosPaginados(PaginationRequest pagination)
    {
        List<Usuario> usuarios;
        int totalCount;

        // Super Admin puede ver TODOS los usuarios
        if (_tenant.IsSuperAdmin)
        {
            usuarios = await _repo.ObtenerTodosAsync();
        }
        // Admin normal solo ve usuarios VENDEDOR de su tenant (no otros admins)
        else if (_tenant.IsAdmin)
        {
            var todosUsuarios = await _repo.ObtenerPorTenantAsync(_tenant.TenantId);
            usuarios = todosUsuarios.Where(u => !u.EsAdmin && !u.EsSuperAdmin).ToList();
        }
        // Usuarios normales no pueden ver otros usuarios
        else
        {
            throw new UnauthorizedAccessException("No tienes permisos para ver usuarios");
        }

        totalCount = usuarios.Count;
        
        // Aplicar paginación
        var paginatedUsers = usuarios
            .Skip(pagination.Skip)
            .Take(pagination.Take)
            .Select(u => new UsuarioDto
            {
                Id = u.Id,
                Email = u.Email,
                TenantId = u.TenantId,
                Nombre = u.Nombre,
                EsAdmin = u.EsAdmin,
                EsSuperAdmin = u.EsSuperAdmin,
                AvatarUrl = u.AvatarUrl
            })
            .ToList();

        return new PaginatedResult<UsuarioDto>(paginatedUsers, totalCount, pagination.Page, pagination.PageSize);
    }

    public async Task<UsuarioDto?> ObtenerUsuarioPorIdAsync(int id)
    {
        var usuario = await _repo.ObtenerPorIdAsync(id);
        if (usuario == null)
            return null;

        // Verificar permisos
        if (!_tenant.IsSuperAdmin && (!_tenant.IsAdmin || usuario.TenantId != _tenant.TenantId))
        {
            throw new UnauthorizedAccessException("No tienes permisos para ver este usuario");
        }

        return new UsuarioDto
        {
            Id = usuario.Id,
            Email = usuario.Email,
            Nombre = usuario.Nombre,
            TenantId = usuario.TenantId,
            EsAdmin = usuario.EsAdmin,
            EsSuperAdmin = usuario.EsSuperAdmin,
            AvatarUrl = usuario.AvatarUrl
        };
    }

    public async Task<bool> ActualizarUsuarioAsync(int id, UsuarioUpdateDto dto)
    {
        var usuario = await _repo.ObtenerPorIdAsync(id);
        if (usuario == null)
            return false;

        // Verificar permisos
        if (!_tenant.IsSuperAdmin && (!_tenant.IsAdmin || usuario.TenantId != _tenant.TenantId))
        {
            throw new UnauthorizedAccessException("No tienes permisos para actualizar este usuario");
        }

        usuario.Email = dto.Email;
        usuario.Nombre = dto.Nombre;
        
        if (!string.IsNullOrEmpty(dto.Password))
        {
            // Check password against known breaches
            if (_pwnedPasswords != null && await _pwnedPasswords.IsCompromisedAsync(dto.Password))
                throw new InvalidOperationException("Esta contraseña fue encontrada en filtraciones de datos. Por favor elige una contraseña diferente.");

            usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        }

        await _repo.ActualizarAsync(usuario);
        return true;
    }

    public async Task<bool> EliminarUsuarioAsync(int id)
    {
        // Obtener el usuario a eliminar para validar permisos
        var usuario = await _repo.ObtenerPorIdAsync(id);
        if (usuario == null)
            return false;

        // Super Admin puede eliminar cualquier usuario
        if (_tenant.IsSuperAdmin)
        {
            return await _repo.EliminarAsync(id);
        }
        // Admin normal solo puede eliminar usuarios de su tenant
        else if (_tenant.IsAdmin && usuario.TenantId == _tenant.TenantId)
        {
            return await _repo.EliminarAsync(id);
        }
        // No tiene permisos
        else
        {
            throw new UnauthorizedAccessException("No tienes permisos para eliminar este usuario");
        }
    }

    public async Task<string?> UploadAvatarAsync(int usuarioId, IFormFile file)
    {
        try
        {
            // Obtener el usuario
            var usuario = await _repo.ObtenerPorIdAsync(usuarioId);
            if (usuario == null)
                return null;

            // Verificar permisos - usuario solo puede cambiar su propio avatar
            if (_tenant.UserId != usuarioId.ToString() && !_tenant.IsAdmin && !_tenant.IsSuperAdmin)
            {
                throw new UnauthorizedAccessException("Solo puedes cambiar tu propio avatar");
            }

            // Obtener configuración de la empresa para usar la carpeta correcta
            var companySettings = await _companyRepository.GetByTenantIdAsync(_tenant.TenantId);
            var companyName = companySettings?.CompanyName ?? "Handy Suites";
            var companyFolder = _folderService.GenerateCompanyFolderName(_tenant.TenantId, companyName);
            var avatarsFolder = _folderService.GetUsersFolder(companyFolder);

            // Eliminar avatar anterior si existe
            if (!string.IsNullOrEmpty(usuario.AvatarUrl))
            {
                await _cloudinaryService.DeleteImageAsync(usuario.AvatarUrl);
            }

            // Subir nuevo avatar
            var uploadResult = await _cloudinaryService.UploadImageAsync(file, $"{avatarsFolder}/avatar-{usuarioId}");
            if (!uploadResult.IsSuccess)
                return null;

            // Actualizar usuario con nueva URL
            usuario.AvatarUrl = uploadResult.SecureUrl;
            await _repo.ActualizarAsync(usuario);

            return uploadResult.SecureUrl;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error al subir avatar: {ex.Message}");
            return null;
        }
    }

    public async Task<bool> DeleteAvatarAsync(int usuarioId)
    {
        try
        {
            // Obtener el usuario
            var usuario = await _repo.ObtenerPorIdAsync(usuarioId);
            if (usuario == null)
                return false;

            // Verificar permisos
            if (_tenant.UserId != usuarioId.ToString() && !_tenant.IsAdmin && !_tenant.IsSuperAdmin)
            {
                throw new UnauthorizedAccessException("Solo puedes eliminar tu propio avatar");
            }

            // Eliminar de Cloudinary si existe
            if (!string.IsNullOrEmpty(usuario.AvatarUrl))
            {
                await _cloudinaryService.DeleteImageAsync(usuario.AvatarUrl);
            }

            // Limpiar URL del usuario
            usuario.AvatarUrl = null;
            await _repo.ActualizarAsync(usuario);

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error al eliminar avatar: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> ActivarUsuarioAsync(int id)
    {
        var usuario = await _repo.ObtenerPorIdAsync(id);
        if (usuario == null)
            return false;

        // Verificar permisos
        if (!_tenant.IsSuperAdmin && (!_tenant.IsAdmin || usuario.TenantId != _tenant.TenantId))
        {
            throw new UnauthorizedAccessException("No tienes permisos para activar este usuario");
        }

        usuario.Activo = true;
        await _repo.ActualizarAsync(usuario);
        return true;
    }

    public async Task<bool> DesactivarUsuarioAsync(int id)
    {
        var usuario = await _repo.ObtenerPorIdAsync(id);
        if (usuario == null)
            return false;

        // Verificar permisos
        if (!_tenant.IsSuperAdmin && (!_tenant.IsAdmin || usuario.TenantId != _tenant.TenantId))
        {
            throw new UnauthorizedAccessException("No tienes permisos para desactivar este usuario");
        }

        // No permitir que se desactive a sí mismo
        if (usuario.Id.ToString() == _tenant.UserId)
        {
            throw new InvalidOperationException("No puedes desactivar tu propia cuenta");
        }

        usuario.Activo = false;
        await _repo.ActualizarAsync(usuario);
        return true;
    }

    public async Task<bool> AsignarRolAsync(int usuarioId, int roleId)
    {
        var usuario = await _repo.ObtenerPorIdAsync(usuarioId);
        if (usuario == null)
            return false;

        // Solo SuperAdmin puede asignar roles
        if (!_tenant.IsSuperAdmin)
        {
            throw new UnauthorizedAccessException("Solo el SuperAdmin puede asignar roles");
        }

        usuario.RoleId = roleId;
        await _repo.ActualizarAsync(usuario);
        return true;
    }

    public async Task<UsuarioProfileDto?> ObtenerMiPerfilAsync()
    {
        var usuarioId = int.Parse(_tenant.UserId);
        var usuario = await _repo.ObtenerPorIdAsync(usuarioId);
        
        if (usuario == null)
            return null;

        return new UsuarioProfileDto
        {
            Id = usuario.Id,
            Email = usuario.Email,
            Nombre = usuario.Nombre,
            TenantId = usuario.TenantId,
            EsAdmin = usuario.EsAdmin,
            EsSuperAdmin = usuario.EsSuperAdmin,
            AvatarUrl = usuario.AvatarUrl,
            RoleId = usuario.RoleId,
            RoleName = usuario.Role?.Nombre,
            CreatedAt = usuario.CreadoEn,
            UpdatedAt = usuario.ActualizadoEn
        };
    }

    public async Task<bool> ActualizarMiPerfilAsync(UsuarioProfileUpdateDto dto)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        var usuario = await _repo.ObtenerPorIdAsync(usuarioId);
        
        if (usuario == null)
            return false;

        // Actualizar nombre
        usuario.Nombre = dto.Nombre;

        // Cambio de contraseña si se proporciona
        if (!string.IsNullOrWhiteSpace(dto.CurrentPassword) && !string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            // Verificar contraseña actual
            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, usuario.PasswordHash))
            {
                throw new InvalidOperationException("La contraseña actual es incorrecta");
            }

            // Check password against known breaches
            if (_pwnedPasswords != null && await _pwnedPasswords.IsCompromisedAsync(dto.NewPassword))
                throw new InvalidOperationException("Esta contraseña fue encontrada en filtraciones de datos. Por favor elige una contraseña diferente.");

            // Actualizar con nueva contraseña
            usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        }

        await _repo.ActualizarAsync(usuario);
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
    {
        if (!_tenant.IsSuperAdmin && !_tenant.IsAdmin)
        {
            throw new UnauthorizedAccessException("No tienes permisos para cambiar estado de usuarios");
        }

        return await _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
    }

    public async Task<PaginatedResult<UsuarioDto>> BuscarUsuariosAsync(UsuarioSearchDto searchDto)
    {
        // Apply tenant-based security filtering
        if (!_tenant.IsSuperAdmin)
        {
            if (!_tenant.IsAdmin)
            {
                throw new UnauthorizedAccessException("No tienes permisos para buscar usuarios");
            }
            // Admin normal solo ve usuarios de su tenant
            searchDto.TenantId = _tenant.TenantId;
        }

        var (usuarios, totalCount) = await _repo.BuscarUsuariosAsync(searchDto);

        var usuariosDto = usuarios.Select(u => new UsuarioDto
        {
            Id = u.Id,
            Email = u.Email,
            TenantId = u.TenantId,
            Nombre = u.Nombre,
            EsAdmin = u.EsAdmin,
            EsSuperAdmin = u.EsSuperAdmin,
            AvatarUrl = u.AvatarUrl
        }).ToList();

        return new PaginatedResult<UsuarioDto>(usuariosDto, totalCount, searchDto.Page, searchDto.PageSize);
    }

}
