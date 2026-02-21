using HandySales.Application.Usuarios.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Repositories;

/// <summary>
/// Repositorio para gestión de Tenants.
/// Usado principalmente por SUPER_ADMIN para administración de plataforma.
/// </summary>
public class TenantRepository : ITenantRepository
{
    private readonly HandySalesDbContext _context;

    public TenantRepository(HandySalesDbContext context)
    {
        _context = context;
    }

    public async Task<Tenant> CrearAsync(Tenant tenant)
    {
        _context.Tenants.Add(tenant);
        await _context.SaveChangesAsync();
        return tenant;
    }

    public async Task<Tenant?> GetByIdAsync(int tenantId)
    {
        return await _context.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);
    }

    public async Task<List<Tenant>> GetAllAsync()
    {
        return await _context.Tenants
            .AsNoTracking()
            .OrderBy(t => t.NombreEmpresa)
            .ToListAsync();
    }

    public async Task<Tenant?> UpdateAsync(Tenant tenant)
    {
        var existing = await _context.Tenants.FindAsync(tenant.Id);
        if (existing == null) return null;

        existing.NombreEmpresa = tenant.NombreEmpresa;
        existing.CloudinaryFolder = tenant.CloudinaryFolder;
        existing.PlanTipo = tenant.PlanTipo;
        existing.MaxUsuarios = tenant.MaxUsuarios;
        existing.FechaSuscripcion = tenant.FechaSuscripcion;
        existing.FechaExpiracion = tenant.FechaExpiracion;
        existing.ActualizadoEn = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo)
    {
        var tenant = await _context.Tenants.FindAsync(id);
        if (tenant == null) return false;

        tenant.Activo = activo;
        tenant.ActualizadoEn = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> GetUsuarioCountAsync(int tenantId)
    {
        return await _context.Usuarios
            .AsNoTracking()
            .CountAsync(u => u.TenantId == tenantId && u.Activo);
    }
}
