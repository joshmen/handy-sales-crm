using HandySuites.Application.Metas.DTOs;
using HandySuites.Application.Metas.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Metas;

public class MetaVendedorRepository : IMetaVendedorRepository
{
    private readonly HandySuitesDbContext _db;

    public MetaVendedorRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<List<MetaVendedorDto>> GetAllAsync(int tenantId, int? usuarioId = null)
    {
        return await _db.MetasVendedor
            .AsNoTracking()
            .Where(m => m.TenantId == tenantId && (!usuarioId.HasValue || m.UsuarioId == usuarioId))
            .Select(m => new MetaVendedorDto
            {
                Id = m.Id,
                TenantId = m.TenantId,
                UsuarioId = m.UsuarioId,
                UsuarioNombre = m.Usuario.Nombre ?? "Sin nombre",
                Tipo = m.Tipo,
                Periodo = m.Periodo,
                Monto = m.Monto,
                FechaInicio = m.FechaInicio,
                FechaFin = m.FechaFin,
                Activo = m.Activo,
                CreadoEn = m.CreadoEn,
                AutoRenovar = m.AutoRenovar,
            })
            .OrderByDescending(m => m.FechaInicio)
            .ToListAsync();
    }

    public async Task<MetaVendedorDto?> GetByIdAsync(int id, int tenantId)
    {
        return await _db.MetasVendedor
            .AsNoTracking()
            .Where(m => m.Id == id && m.TenantId == tenantId)
            .Select(m => new MetaVendedorDto
            {
                Id = m.Id,
                TenantId = m.TenantId,
                UsuarioId = m.UsuarioId,
                UsuarioNombre = m.Usuario.Nombre ?? "Sin nombre",
                Tipo = m.Tipo,
                Periodo = m.Periodo,
                Monto = m.Monto,
                FechaInicio = m.FechaInicio,
                FechaFin = m.FechaFin,
                Activo = m.Activo,
                CreadoEn = m.CreadoEn,
                AutoRenovar = m.AutoRenovar,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CreateAsync(CreateMetaVendedorDto dto, string creadoPor, int tenantId)
    {
        var meta = new MetaVendedor
        {
            TenantId = tenantId,
            UsuarioId = dto.UsuarioId,
            Tipo = dto.Tipo,
            Periodo = dto.Periodo,
            Monto = dto.Monto,
            FechaInicio = dto.FechaInicio,
            FechaFin = dto.FechaFin,
            Activo = true,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = creadoPor,
            AutoRenovar = dto.AutoRenovar,
        };

        _db.MetasVendedor.Add(meta);
        await _db.SaveChangesAsync();
        return meta.Id;
    }

    public async Task<bool> UpdateAsync(int id, UpdateMetaVendedorDto dto, string actualizadoPor, int tenantId)
    {
        var meta = await _db.MetasVendedor
            .FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId);

        if (meta == null) return false;

        meta.Tipo = dto.Tipo;
        meta.Periodo = dto.Periodo;
        meta.Monto = dto.Monto;
        meta.FechaInicio = dto.FechaInicio;
        meta.FechaFin = dto.FechaFin;
        meta.Activo = dto.Activo;
        meta.AutoRenovar = dto.AutoRenovar;
        meta.ActualizadoEn = DateTime.UtcNow;
        meta.ActualizadoPor = actualizadoPor;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id, int tenantId)
    {
        var meta = await _db.MetasVendedor
            .FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId);

        if (meta == null) return false;

        _db.MetasVendedor.Remove(meta);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var meta = await _db.MetasVendedor
            .FirstOrDefaultAsync(m => m.Id == id && m.TenantId == tenantId);

        if (meta == null) return false;

        meta.Activo = activo;
        meta.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var metas = await _db.MetasVendedor
            .Where(m => ids.Contains(m.Id) && m.TenantId == tenantId)
            .ToListAsync();

        foreach (var meta in metas)
        {
            meta.Activo = activo;
            meta.ActualizadoEn = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return metas.Count;
    }

    public async Task<List<MetaVendedorDto>> GetActivasParaPeriodoAsync(DateTime fecha, int tenantId)
    {
        return await _db.MetasVendedor
            .AsNoTracking()
            .Where(m => m.TenantId == tenantId
                     && m.Activo
                     && m.FechaInicio <= fecha
                     && m.FechaFin >= fecha)
            .Select(m => new MetaVendedorDto
            {
                Id = m.Id,
                TenantId = m.TenantId,
                UsuarioId = m.UsuarioId,
                UsuarioNombre = m.Usuario.Nombre ?? "Sin nombre",
                Tipo = m.Tipo,
                Periodo = m.Periodo,
                Monto = m.Monto,
                FechaInicio = m.FechaInicio,
                FechaFin = m.FechaFin,
                Activo = m.Activo,
                CreadoEn = m.CreadoEn,
                AutoRenovar = m.AutoRenovar,
            })
            .ToListAsync();
    }
}
