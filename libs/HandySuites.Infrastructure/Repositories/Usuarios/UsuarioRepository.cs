using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using HandySuites.Application.Usuarios.DTOs;
using HandySuites.Application.Usuarios.Interfaces;
using System.Linq.Expressions;

namespace HandySuites.Infrastructure.Repositories;

public class UsuarioRepository : IUsuarioRepository
{
    private readonly HandySuitesDbContext _db;

    public UsuarioRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<bool> ExisteEmailAsync(string email)
    {
        return await _db.Usuarios.AsNoTracking().AnyAsync(u => u.Email == email);
    }

    public async Task<Usuario?> ObtenerPorEmailAsync(string email)
    {
        return await _db.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<Usuario> RegistrarAsync(Usuario usuario)
    {
        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();
        return usuario;
    }

    public async Task<List<Usuario>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.Usuarios
            .AsNoTracking()
            .Where(u => u.TenantId == tenantId && u.Activo)
            .ToListAsync();
    }

    public async Task<List<Usuario>> ObtenerPorTenantSinFiltroAsync(int tenantId)
    {
        return await _db.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.TenantId == tenantId && u.Activo)
            .ToListAsync();
    }

    public async Task<List<Usuario>> ObtenerTodosAsync()
    {
        return await _db.Usuarios
            .AsNoTracking()
            .Where(u => u.Activo)
            .ToListAsync();
    }

    public async Task<Usuario?> ObtenerPorIdAsync(int id)
    {
        return await _db.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id && u.Activo);
    }

    public async Task<Usuario> ActualizarAsync(Usuario usuario)
    {
        _db.Usuarios.Update(usuario);
        await _db.SaveChangesAsync();
        return usuario;
    }

    public async Task<bool> EliminarAsync(int id)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Id == id);
        if (usuario == null)
            return false;

        // Soft delete via SaveChangesAsync override (sets EliminadoEn + EliminadoPor)
        _db.Usuarios.Remove(usuario);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<(List<Usuario> usuarios, int totalCount)> BuscarUsuariosAsync(UsuarioSearchDto searchDto)
    {
        var query = _db.Usuarios
            .Include(u => u.Role)
            .AsNoTracking()
            .AsQueryable();

        // Filter by search term (nombre or email)
        if (!string.IsNullOrWhiteSpace(searchDto.Search))
        {
            var search = searchDto.Search.ToLower();
            query = query.Where(u => u.Nombre.ToLower().Contains(search) || 
                                   u.Email.ToLower().Contains(search));
        }

        // Filter by exact rol (SUPER_ADMIN, ADMIN, SUPERVISOR, VIEWER, VENDEDOR)
        if (!string.IsNullOrEmpty(searchDto.Rol))
        {
            query = query.Where(u => u.RolExplicito == searchDto.Rol);
        }

        // Filter by active status
        if (searchDto.Activo.HasValue)
        {
            query = query.Where(u => u.Activo == searchDto.Activo.Value);
        }

        // Filter by role
        if (searchDto.RoleId.HasValue)
        {
            query = query.Where(u => u.RoleId == searchDto.RoleId.Value);
        }

        // Filter by tenant
        if (searchDto.TenantId.HasValue)
        {
            query = query.Where(u => u.TenantId == searchDto.TenantId.Value);
        }

        // Filter by creation date
        if (searchDto.CreatedAfter.HasValue)
        {
            query = query.Where(u => u.CreadoEn >= searchDto.CreatedAfter.Value);
        }

        if (searchDto.CreatedBefore.HasValue)
        {
            query = query.Where(u => u.CreadoEn <= searchDto.CreatedBefore.Value);
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync();

        // Apply sorting
        query = ApplySorting(query, searchDto.SortBy, searchDto.SortDirection);

        // Apply pagination
        var usuarios = await query
            .Skip((searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .ToListAsync();

        return (usuarios, totalCount);
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.Usuarios
            .Where(u => ids.Contains(u.Id) && u.TenantId == tenantId)
            .ToListAsync();

        foreach (var entity in entities)
        {
            entity.Activo = activo;
            entity.ActualizadoEn = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return entities.Count;
    }

    public async Task<Role?> ObtenerRolPorNombreAsync(string nombre)
    {
        return await _db.Roles
            .AsNoTracking()
            .Where(r => r.Nombre.ToUpper() == nombre.ToUpper())
            .Select(r => new Role { Id = r.Id, Nombre = r.Nombre })
            .FirstOrDefaultAsync();
    }

    public async Task<List<UsuarioUbicacionDto>> ObtenerUbicacionesAsync(int tenantId)
    {
        // Get the most recent visit with GPS data for each user
        var ubicaciones = await _db.ClienteVisitas
            .AsNoTracking()
            .Include(v => v.Cliente)
            .Where(v => v.TenantId == tenantId
                && v.LatitudInicio != null
                && v.LongitudInicio != null)
            .GroupBy(v => v.UsuarioId)
            .Select(g => g.OrderByDescending(v => v.FechaHoraInicio).First())
            .ToListAsync();

        if (ubicaciones.Count == 0)
            return new List<UsuarioUbicacionDto>();

        var userIds = ubicaciones.Select(u => u.UsuarioId).ToList();
        var usuarios = await _db.Usuarios
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id) && u.Activo)
            .Select(u => new { u.Id, u.Nombre, u.AvatarUrl })
            .ToListAsync();

        var userMap = usuarios.ToDictionary(u => u.Id);

        return ubicaciones
            .Where(u => userMap.ContainsKey(u.UsuarioId))
            .Select(u => new UsuarioUbicacionDto
            {
                UsuarioId = u.UsuarioId,
                Nombre = userMap[u.UsuarioId].Nombre,
                AvatarUrl = userMap[u.UsuarioId].AvatarUrl,
                Latitud = u.LatitudInicio!.Value,
                Longitud = u.LongitudInicio!.Value,
                FechaUbicacion = u.FechaHoraInicio,
                ClienteNombre = u.Cliente?.Nombre
            })
            .ToList();
    }

    public async Task<List<int>> ObtenerSubordinadoIdsAsync(int supervisorId, int tenantId)
    {
        return await _db.Usuarios
            .AsNoTracking()
            .Where(u => u.SupervisorId == supervisorId
                     && u.TenantId == tenantId
                     && u.EliminadoEn == null)
            .Select(u => u.Id)
            .ToListAsync();
    }

    private static IQueryable<Usuario> ApplySorting(IQueryable<Usuario> query, string? sortBy, string? sortDirection)
    {
        if (string.IsNullOrWhiteSpace(sortBy))
            return query.OrderBy(u => u.Nombre);

        var isDescending = !string.IsNullOrWhiteSpace(sortDirection) &&
                          sortDirection.ToLower() == "desc";

        return sortBy.ToLower() switch
        {
            "nombre" => isDescending ? query.OrderByDescending(u => u.Nombre) : query.OrderBy(u => u.Nombre),
            "email" => isDescending ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
            "createdat" => isDescending ? query.OrderByDescending(u => u.CreadoEn) : query.OrderBy(u => u.CreadoEn),
            "updatedat" => isDescending ? query.OrderByDescending(u => u.ActualizadoEn) : query.OrderBy(u => u.ActualizadoEn),
            "activo" => isDescending ? query.OrderByDescending(u => u.Activo) : query.OrderBy(u => u.Activo),
            _ => query.OrderBy(u => u.Nombre)
        };
    }

    public async Task<int> ContarPedidosActivosPorUsuarioAsync(int usuarioId, int tenantId)
    {
        return await _db.Pedidos
            .Where(p => p.UsuarioId == usuarioId && p.TenantId == tenantId
                && p.Estado != Domain.Entities.EstadoPedido.Entregado
                && p.Estado != Domain.Entities.EstadoPedido.Cancelado)
            .CountAsync();
    }
}
