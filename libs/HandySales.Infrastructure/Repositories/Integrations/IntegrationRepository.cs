using HandySales.Application.Integrations.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Repositories.Integrations;

public class IntegrationRepository : IIntegrationRepository
{
    private readonly HandySalesDbContext _db;

    public IntegrationRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<Integration>> GetAllCatalogAsync()
    {
        return await _db.Integrations
            .AsNoTracking()
            .OrderBy(i => i.Categoria)
            .ThenBy(i => i.Nombre)
            .ToListAsync();
    }

    public async Task<Integration?> GetBySlugAsync(string slug)
    {
        return await _db.Integrations
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Slug == slug);
    }

    public async Task<List<TenantIntegration>> GetTenantIntegrationsAsync(int tenantId)
    {
        return await _db.TenantIntegrations
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(ti => ti.Integration)
            .Where(ti => ti.TenantId == tenantId && ti.EliminadoEn == null)
            .ToListAsync();
    }

    public async Task<TenantIntegration?> GetTenantIntegrationAsync(int tenantId, int integrationId)
    {
        return await _db.TenantIntegrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ti => ti.TenantId == tenantId
                && ti.IntegrationId == integrationId
                && ti.EliminadoEn == null
                && ti.Estado == "ACTIVA");
    }

    public async Task<TenantIntegration> ActivateAsync(int tenantId, int integrationId, int userId, string? configuracion)
    {
        var ti = new TenantIntegration
        {
            TenantId = tenantId,
            IntegrationId = integrationId,
            Estado = "ACTIVA",
            FechaActivacion = DateTime.UtcNow,
            ActivadoPorUsuarioId = userId,
            Configuracion = configuracion,
        };

        _db.TenantIntegrations.Add(ti);
        await _db.SaveChangesAsync();
        return ti;
    }

    public async Task DeactivateAsync(TenantIntegration tenantIntegration, int userId)
    {
        tenantIntegration.Estado = "CANCELADA";
        tenantIntegration.ActualizadoEn = DateTime.UtcNow;
        tenantIntegration.ActualizadoPor = userId.ToString();
        await _db.SaveChangesAsync();
    }

    public async Task LogActionAsync(int tenantId, int integrationId, int userId, string accion, string? descripcion)
    {
        _db.IntegrationLogs.Add(new IntegrationLog
        {
            TenantId = tenantId,
            IntegrationId = integrationId,
            UsuarioId = userId,
            Accion = accion,
            Descripcion = descripcion,
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
    }
}
