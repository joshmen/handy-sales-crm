using HandySales.Application.Roles.DTOs;
using HandySales.Application.Roles.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Roles.Repositories;

public class RoleRepository : IRoleRepository
{
    private readonly HandySalesDbContext _context;
    private readonly ICurrentTenant _currentTenant;

    public RoleRepository(HandySalesDbContext context, ICurrentTenant currentTenant)
    {
        _context = context;
        _currentTenant = currentTenant;
    }

    public async Task<List<RoleDto>> GetAllRolesAsync()
    {
        var roles = await _context.Roles
            .OrderBy(r => r.Nombre)
            .Select(r => new RoleDto
            {
                Id = r.Id,
                Nombre = r.Nombre,
                Descripcion = r.Descripcion,
                Activo = r.Activo,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                CreadoEn = r.CreadoEn,
                ActualizadoEn = r.ActualizadoEn,
                CreadoPor = r.CreadoPor,
                ActualizadoPor = r.ActualizadoPor
            })
            .ToListAsync();

        return roles;
    }

    public async Task<List<RoleDto>> GetActiveRolesAsync()
    {
        var roles = await _context.Roles
            .Where(r => r.Activo)
            .OrderBy(r => r.Nombre)
            .Select(r => new RoleDto
            {
                Id = r.Id,
                Nombre = r.Nombre,
                Descripcion = r.Descripcion,
                Activo = r.Activo,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                CreadoEn = r.CreadoEn,
                ActualizadoEn = r.ActualizadoEn,
                CreadoPor = r.CreadoPor,
                ActualizadoPor = r.ActualizadoPor
            })
            .ToListAsync();

        return roles;
    }

    public async Task<RoleDto?> GetRoleByIdAsync(int id)
    {
        var role = await _context.Roles
            .Where(r => r.Id == id)
            .Select(r => new RoleDto
            {
                Id = r.Id,
                Nombre = r.Nombre,
                Descripcion = r.Descripcion,
                Activo = r.Activo,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                CreadoEn = r.CreadoEn,
                ActualizadoEn = r.ActualizadoEn,
                CreadoPor = r.CreadoPor,
                ActualizadoPor = r.ActualizadoPor
            })
            .FirstOrDefaultAsync();

        return role;
    }

    public async Task<RoleDto> CreateRoleAsync(CreateRoleDto createRoleDto)
    {
        var role = new Role
        {
            Nombre = createRoleDto.Nombre.Trim(),
            Descripcion = createRoleDto.Descripcion?.Trim(),
            Activo = createRoleDto.Activo,
            // Campos de auditoría
            CreadoEn = DateTime.UtcNow,
            CreadoPor = _currentTenant.UserId
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        return new RoleDto
        {
            Id = role.Id,
            Nombre = role.Nombre,
            Descripcion = role.Descripcion,
            Activo = role.Activo,
            CreatedAt = role.CreatedAt,
            UpdatedAt = role.UpdatedAt,
            CreadoEn = role.CreadoEn,
            ActualizadoEn = role.ActualizadoEn,
            CreadoPor = role.CreadoPor,
            ActualizadoPor = role.ActualizadoPor
        };
    }

    public async Task<RoleDto?> UpdateRoleAsync(int id, UpdateRoleDto updateRoleDto)
    {
        var role = await _context.Roles.FindAsync(id);
        if (role == null)
        {
            return null;
        }

        role.Nombre = updateRoleDto.Nombre.Trim();
        role.Descripcion = updateRoleDto.Descripcion?.Trim();
        role.Activo = updateRoleDto.Activo;
        // Campos de auditoría para actualización
        role.ActualizadoEn = DateTime.UtcNow;
        role.ActualizadoPor = _currentTenant.UserId;

        await _context.SaveChangesAsync();

        return new RoleDto
        {
            Id = role.Id,
            Nombre = role.Nombre,
            Descripcion = role.Descripcion,
            Activo = role.Activo,
            CreatedAt = role.CreatedAt,
            UpdatedAt = role.UpdatedAt,
            CreadoEn = role.CreadoEn,
            ActualizadoEn = role.ActualizadoEn,
            CreadoPor = role.CreadoPor,
            ActualizadoPor = role.ActualizadoPor
        };
    }

    public async Task<bool> DeleteRoleAsync(int id)
    {
        var role = await _context.Roles.FindAsync(id);
        if (role == null)
        {
            return false;
        }

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RoleExistsByNameAsync(string name, int? excludeId = null)
    {
        var query = _context.Roles.Where(r => r.Nombre.ToLower() == name.ToLower());
        
        if (excludeId.HasValue)
        {
            query = query.Where(r => r.Id != excludeId.Value);
        }

        return await query.AnyAsync();
    }

    public async Task<bool> RoleHasUsersAsync(int roleId)
    {
        return await _context.Usuarios.AnyAsync(u => u.RoleId == roleId);
    }
}