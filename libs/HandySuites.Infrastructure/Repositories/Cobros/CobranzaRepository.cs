using HandySuites.Application.Cobros.DTOs;
using HandySuites.Application.Cobros.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Cobros;

public class CobranzaRepository : ICobranzaRepository
{
    private readonly HandySuitesDbContext _db;

    public CobranzaRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<CobranzaResumenDto> GetResumenAsync()
    {
        var items = await BaseQuery()
            .OrderByDescending(c => c.CreadoEn)
            .Select(c => new CobranzaDto
            {
                Id = c.Id,
                TenantId = c.TenantId,
                Empresa = _db.Tenants
                    .IgnoreQueryFilters()
                    .Where(t => t.Id == c.TenantId)
                    .Select(t => t.NombreEmpresa)
                    .FirstOrDefault() ?? string.Empty,
                Monto = c.Monto,
                Motivo = c.Motivo,
                Intentos = c.Intentos,
                Etapa = c.Etapa,
                ProximoPasoEn = c.ProximoPasoEn,
                Estado = c.Estado,
                CreadoEn = c.CreadoEn,
                ActualizadoEn = c.ActualizadoEn
            })
            .ToListAsync();

        var now = DateTime.UtcNow;
        var inicioMes = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var fallidos = await BaseQuery()
            .CountAsync(c => c.Estado == EstadoCobranza.Activo);

        var montoEnRiesgo = await BaseQuery()
            .Where(c => c.Estado == EstadoCobranza.Activo)
            .SumAsync(c => (decimal?)c.Monto) ?? 0m;

        var recuperadoMes = await BaseQuery()
            .Where(c => c.Estado == EstadoCobranza.Recuperado
                && c.ActualizadoEn != null
                && c.ActualizadoEn >= inicioMes)
            .SumAsync(c => (decimal?)c.Monto) ?? 0m;

        var recuperados = await BaseQuery()
            .CountAsync(c => c.Estado == EstadoCobranza.Recuperado);

        var perdidos = await BaseQuery()
            .CountAsync(c => c.Estado == EstadoCobranza.Perdido);

        var denominador = recuperados + perdidos;
        var tasa = denominador > 0 ? (decimal)recuperados / denominador : 0m;

        return new CobranzaResumenDto
        {
            Items = items,
            Fallidos = fallidos,
            MontoEnRiesgo = montoEnRiesgo,
            RecuperadoMes = recuperadoMes,
            Tasa = tasa
        };
    }

    public async Task<CobranzaDto?> GetByIdAsync(int id)
    {
        return await BaseQuery()
            .Where(c => c.Id == id)
            .Select(c => new CobranzaDto
            {
                Id = c.Id,
                TenantId = c.TenantId,
                Empresa = _db.Tenants
                    .IgnoreQueryFilters()
                    .Where(t => t.Id == c.TenantId)
                    .Select(t => t.NombreEmpresa)
                    .FirstOrDefault() ?? string.Empty,
                Monto = c.Monto,
                Motivo = c.Motivo,
                Intentos = c.Intentos,
                Etapa = c.Etapa,
                ProximoPasoEn = c.ProximoPasoEn,
                Estado = c.Estado,
                CreadoEn = c.CreadoEn,
                ActualizadoEn = c.ActualizadoEn
            })
            .FirstOrDefaultAsync();
    }

    public async Task<CobranzaSuscripcion?> GetEntityByIdAsync(int id)
    {
        return await _db.CobranzasSuscripcion
            .IgnoreQueryFilters()
            .Where(c => c.EliminadoEn == null)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<int> CreateAsync(CobranzaSuscripcion cobranza)
    {
        _db.CobranzasSuscripcion.Add(cobranza);
        await _db.SaveChangesAsync();
        return cobranza.Id;
    }

    public async Task<bool> UpdateAsync(CobranzaSuscripcion cobranza)
    {
        _db.CobranzasSuscripcion.Update(cobranza);
        await _db.SaveChangesAsync();
        return true;
    }

    private IQueryable<CobranzaSuscripcion> BaseQuery()
    {
        return _db.CobranzasSuscripcion
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(c => c.EliminadoEn == null);
    }
}
