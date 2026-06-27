using HandySuites.Application.SystemStatus.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.SystemStatus;

public class IncidenteRepository : IIncidenteRepository
{
    private readonly HandySuitesDbContext _db;

    public IncidenteRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<List<Incidente>> GetAllAsync()
    {
        return await _db.Incidentes
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(i => i.EliminadoEn == null)
            .Include(i => i.Actualizaciones.Where(a => a.EliminadoEn == null))
            .OrderByDescending(i => i.IniciadoEn)
            .ToListAsync();
    }

    public async Task<Incidente?> GetByIdAsync(int id)
    {
        return await _db.Incidentes
            .IgnoreQueryFilters()
            .Where(i => i.EliminadoEn == null)
            .Include(i => i.Actualizaciones.Where(a => a.EliminadoEn == null))
            .FirstOrDefaultAsync(i => i.Id == id);
    }

    public async Task<int> CreateAsync(Incidente incidente)
    {
        _db.Incidentes.Add(incidente);
        await _db.SaveChangesAsync();
        return incidente.Id;
    }

    public async Task<bool> UpdateAsync(Incidente incidente)
    {
        _db.Incidentes.Update(incidente);
        await _db.SaveChangesAsync();
        return true;
    }
}
