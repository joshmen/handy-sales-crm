using HandySuites.Application.Vehiculos.DTOs;
using HandySuites.Application.Vehiculos.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Vehiculos.Repositories;

public class VehiculoRepository : IVehiculoRepository
{
    private readonly HandySuitesDbContext _db;

    public VehiculoRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<List<VehiculoDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.Vehiculos
            .AsNoTracking()
            .Where(v => v.TenantId == tenantId)
            .Select(v => new VehiculoDto
            {
                Id = v.Id,
                TenantId = v.TenantId,
                Placa = v.Placa,
                Tipo = v.Tipo,
                CapacidadUnidades = v.CapacidadUnidades,
                VendedorId = v.VendedorId,
                VendedorNombre = v.Vendedor != null ? v.Vendedor.Nombre : null,
                Kilometraje = v.Kilometraje,
                Estado = v.Estado,
                Activo = v.Activo
            })
            .ToListAsync();
    }

    public async Task<VehiculoDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.Vehiculos
            .AsNoTracking()
            .Where(v => v.Id == id && v.TenantId == tenantId)
            .Select(v => new VehiculoDto
            {
                Id = v.Id,
                TenantId = v.TenantId,
                Placa = v.Placa,
                Tipo = v.Tipo,
                CapacidadUnidades = v.CapacidadUnidades,
                VendedorId = v.VendedorId,
                VendedorNombre = v.Vendedor != null ? v.Vendedor.Nombre : null,
                Kilometraje = v.Kilometraje,
                Estado = v.Estado,
                Activo = v.Activo
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(CreateVehiculoDto dto, string creadoPor, int tenantId)
    {
        var nuevo = new Vehiculo
        {
            TenantId = tenantId,
            Placa = dto.Placa.Trim(),
            Tipo = dto.Tipo,
            CapacidadUnidades = dto.CapacidadUnidades,
            VendedorId = dto.VendedorId,
            Kilometraje = dto.Kilometraje,
            Estado = dto.Estado,
            Activo = true,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = creadoPor
        };

        _db.Vehiculos.Add(nuevo);
        await _db.SaveChangesAsync();
        return nuevo.Id;
    }

    public async Task<bool> ActualizarAsync(int id, UpdateVehiculoDto dto, string actualizadoPor, int tenantId)
    {
        var vehiculo = await _db.Vehiculos
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenantId);

        if (vehiculo == null) return false;

        vehiculo.Placa = dto.Placa.Trim();
        vehiculo.Tipo = dto.Tipo;
        vehiculo.CapacidadUnidades = dto.CapacidadUnidades;
        vehiculo.VendedorId = dto.VendedorId;
        vehiculo.Kilometraje = dto.Kilometraje;
        vehiculo.Estado = dto.Estado;
        vehiculo.Activo = dto.Activo;
        vehiculo.ActualizadoEn = DateTime.UtcNow;
        vehiculo.ActualizadoPor = actualizadoPor;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var vehiculo = await _db.Vehiculos
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenantId);

        if (vehiculo == null) return false;

        _db.Vehiculos.Remove(vehiculo);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.Vehiculos
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        return await _db.Vehiculos
            .Where(v => ids.Contains(v.Id) && v.TenantId == tenantId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.Activo, activo)
                .SetProperty(e => e.ActualizadoEn, DateTime.UtcNow));
    }

    public Task<bool> ExistePlacaEnTenantAsync(string placa, int tenantId, int? excludeId = null)
    {
        var query = _db.Vehiculos.AsNoTracking()
            .Where(v => v.TenantId == tenantId && v.Placa.ToLower() == placa.ToLower());
        if (excludeId.HasValue)
            query = query.Where(v => v.Id != excludeId.Value);
        return query.AnyAsync();
    }

    public Task<bool> EsVendedorDelTenantAsync(int vendedorId, int tenantId)
    {
        return _db.Usuarios.AsNoTracking()
            .AnyAsync(u => u.Id == vendedorId
                && u.TenantId == tenantId
                && u.RolExplicito == RoleNames.Vendedor);
    }
}
