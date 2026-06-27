using HandySuites.Application.Changelog.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Changelog;

public class NovedadRepository : INovedadRepository
{
    private readonly HandySuitesDbContext _db;

    public NovedadRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<List<Novedad>> GetAllAsync()
    {
        return await _db.Novedades
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(e => e.EliminadoEn == null)
            .OrderByDescending(e => e.Fecha)
            .ToListAsync();
    }

    public async Task<Novedad?> GetByIdAsync(int id)
    {
        return await _db.Novedades
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Id == id && e.EliminadoEn == null);
    }

    public async Task<int> CreateAsync(Novedad novedad)
    {
        _db.Novedades.Add(novedad);
        await _db.SaveChangesAsync();
        return novedad.Id;
    }

    public async Task<bool> UpdateAsync(Novedad novedad)
    {
        _db.Novedades.Update(novedad);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveAsync(int id)
    {
        var novedad = await _db.Novedades
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Id == id && e.EliminadoEn == null);
        if (novedad == null) return false;

        _db.Novedades.Remove(novedad);
        await _db.SaveChangesAsync();
        return true;
    }
}
