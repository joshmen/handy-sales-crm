using HandySuites.Application.Modulos.DTOs;
using HandySuites.Application.Modulos.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Modulos;

public class ModuloRepository : IModuloRepository
{
    private readonly HandySuitesDbContext _db;

    public ModuloRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<List<ModuloMatrizDto>> GetMatrizAsync()
    {
        return await _db.Set<ModuloPlataforma>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(m => m.EliminadoEn == null)
            .OrderBy(m => m.Orden)
            .Select(m => new ModuloMatrizDto
            {
                Id = m.Id,
                Clave = m.Clave,
                Nombre = m.Nombre,
                Descripcion = m.Descripcion,
                DisponibleBasico = m.DisponibleBasico,
                DisponiblePro = m.DisponiblePro,
                DisponibleEnterprise = m.DisponibleEnterprise,
                Orden = m.Orden,
                Activo = m.Activo,
                OverridesCount = _db.Set<ModuloOverride>()
                    .IgnoreQueryFilters()
                    .Count(o => o.ModuloPlataformaId == m.Id && o.EliminadoEn == null)
            })
            .ToListAsync();
    }

    public async Task<ModuloDto?> GetByIdAsync(int id)
    {
        var modulo = await _db.Set<ModuloPlataforma>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(m => m.Id == id && m.EliminadoEn == null)
            .FirstOrDefaultAsync();

        if (modulo == null)
            return null;

        var overrides = await _db.Set<ModuloOverride>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(o => o.ModuloPlataformaId == id && o.EliminadoEn == null)
            .Select(o => new ModuloOverrideDto
            {
                Id = o.Id,
                ModuloPlataformaId = o.ModuloPlataformaId,
                TenantId = o.TenantId,
                Habilitado = o.Habilitado,
                Motivo = o.Motivo
            })
            .ToListAsync();

        return new ModuloDto
        {
            Id = modulo.Id,
            Clave = modulo.Clave,
            Nombre = modulo.Nombre,
            Descripcion = modulo.Descripcion,
            DisponibleBasico = modulo.DisponibleBasico,
            DisponiblePro = modulo.DisponiblePro,
            DisponibleEnterprise = modulo.DisponibleEnterprise,
            Orden = modulo.Orden,
            Activo = modulo.Activo,
            Overrides = overrides
        };
    }

    public async Task<ModuloPlataforma?> GetEntityByIdAsync(int id)
    {
        return await _db.Set<ModuloPlataforma>()
            .IgnoreQueryFilters()
            .Where(m => m.Id == id && m.EliminadoEn == null)
            .FirstOrDefaultAsync();
    }

    public async Task<ModuloPlataforma?> GetByClaveAsync(string clave)
    {
        return await _db.Set<ModuloPlataforma>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(m => m.Clave == clave && m.EliminadoEn == null)
            .FirstOrDefaultAsync();
    }

    public async Task<int> CreateAsync(ModuloPlataforma modulo)
    {
        _db.Set<ModuloPlataforma>().Add(modulo);
        await _db.SaveChangesAsync();
        return modulo.Id;
    }

    public async Task<bool> UpdateAsync(ModuloPlataforma modulo)
    {
        _db.Set<ModuloPlataforma>().Update(modulo);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var modulo = await _db.Set<ModuloPlataforma>()
            .IgnoreQueryFilters()
            .Where(m => m.Id == id && m.EliminadoEn == null)
            .FirstOrDefaultAsync();

        if (modulo == null)
            return false;

        _db.Set<ModuloPlataforma>().Remove(modulo);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<ModuloOverrideDto>> GetOverridesAsync()
    {
        return await _db.Set<ModuloOverride>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(o => o.EliminadoEn == null)
            .OrderBy(o => o.ModuloPlataformaId)
            .ThenBy(o => o.TenantId)
            .Select(o => new ModuloOverrideDto
            {
                Id = o.Id,
                ModuloPlataformaId = o.ModuloPlataformaId,
                TenantId = o.TenantId,
                Habilitado = o.Habilitado,
                Motivo = o.Motivo
            })
            .ToListAsync();
    }

    public async Task<ModuloOverride?> GetOverrideEntityByIdAsync(int id)
    {
        return await _db.Set<ModuloOverride>()
            .IgnoreQueryFilters()
            .Where(o => o.Id == id && o.EliminadoEn == null)
            .FirstOrDefaultAsync();
    }

    public async Task<ModuloOverride?> GetOverrideByModuloTenantAsync(int moduloPlataformaId, int tenantId)
    {
        return await _db.Set<ModuloOverride>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(o => o.ModuloPlataformaId == moduloPlataformaId
                && o.TenantId == tenantId
                && o.EliminadoEn == null)
            .FirstOrDefaultAsync();
    }

    public async Task<int> CreateOverrideAsync(ModuloOverride overrideEntity)
    {
        _db.Set<ModuloOverride>().Add(overrideEntity);
        await _db.SaveChangesAsync();
        return overrideEntity.Id;
    }

    public async Task<bool> DeleteOverrideAsync(int id)
    {
        var overrideEntity = await _db.Set<ModuloOverride>()
            .IgnoreQueryFilters()
            .Where(o => o.Id == id && o.EliminadoEn == null)
            .FirstOrDefaultAsync();

        if (overrideEntity == null)
            return false;

        _db.Set<ModuloOverride>().Remove(overrideEntity);
        await _db.SaveChangesAsync();
        return true;
    }
}
