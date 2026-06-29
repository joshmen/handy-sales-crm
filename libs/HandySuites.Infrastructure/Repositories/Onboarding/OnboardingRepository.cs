using HandySuites.Application.Onboarding.DTOs;
using HandySuites.Application.Onboarding.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Onboarding;

public class OnboardingRepository : IOnboardingRepository
{
    private readonly HandySuitesDbContext _db;

    public OnboardingRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<CasoOnboardingResumenDto> GetResumenAsync()
    {
        var ahora = DateTime.UtcNow;
        var inicioMes = new DateTime(ahora.Year, ahora.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var rows = await _db.Set<CasoOnboarding>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(c => c.EliminadoEn == null)
            .Join(
                _db.Tenants.IgnoreQueryFilters().AsNoTracking(),
                c => c.TenantId,
                t => t.Id,
                (c, t) => new { Caso = c, Empresa = t.NombreEmpresa })
            .OrderBy(x => x.Caso.EntroEtapaEn)
            .ToListAsync();

        var items = rows
            .Select(x => MapDto(x.Caso, x.Empresa))
            .ToList();

        return new CasoOnboardingResumenDto
        {
            Items = items,
            EnProceso = rows.Count(x => x.Caso.Etapa < EtapaOnboarding.Activa),
            EsperandoDocs = rows.Count(x => x.Caso.Etapa == EtapaOnboarding.DatosFiscales),
            Listas = rows.Count(x => x.Caso.Etapa == EtapaOnboarding.PlanYPago),
            ActivadasMes = rows.Count(x =>
                x.Caso.Etapa == EtapaOnboarding.Activa &&
                x.Caso.ActualizadoEn != null &&
                x.Caso.ActualizadoEn >= inicioMes)
        };
    }

    public async Task<CasoOnboardingDto?> GetByIdAsync(int id)
    {
        var row = await _db.Set<CasoOnboarding>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(c => c.EliminadoEn == null && c.Id == id)
            .Join(
                _db.Tenants.IgnoreQueryFilters().AsNoTracking(),
                c => c.TenantId,
                t => t.Id,
                (c, t) => new { Caso = c, Empresa = t.NombreEmpresa })
            .FirstOrDefaultAsync();

        return row == null ? null : MapDto(row.Caso, row.Empresa);
    }

    public async Task<CasoOnboarding?> GetEntityByIdAsync(int id)
    {
        return await _db.Set<CasoOnboarding>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.EliminadoEn == null && c.Id == id);
    }

    public async Task<int> CreateAsync(CasoOnboarding caso)
    {
        _db.Set<CasoOnboarding>().Add(caso);
        await _db.SaveChangesAsync();
        return caso.Id;
    }

    public async Task<bool> UpdateAsync(CasoOnboarding caso)
    {
        _db.Set<CasoOnboarding>().Update(caso);
        await _db.SaveChangesAsync();
        return true;
    }

    private static CasoOnboardingDto MapDto(CasoOnboarding caso, string empresa)
    {
        return new CasoOnboardingDto
        {
            Id = caso.Id,
            TenantId = caso.TenantId,
            Empresa = empresa,
            Etapa = caso.Etapa,
            ResponsableUsuarioId = caso.ResponsableUsuarioId,
            PlanTentativo = caso.PlanTentativo,
            EntroEtapaEn = caso.EntroEtapaEn,
            DiasEnEtapa = (DateTime.UtcNow - caso.EntroEtapaEn).Days,
            Notas = caso.Notas
        };
    }
}
