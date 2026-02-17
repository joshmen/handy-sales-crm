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
}
