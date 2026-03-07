using HandySales.Application.DatosEmpresa.DTOs;
using HandySales.Application.DatosEmpresa.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HandySales.Infrastructure.Repositories;

public class DatosEmpresaRepository : IDatosEmpresaRepository
{
    private readonly HandySalesDbContext _db;

    public DatosEmpresaRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<DatosEmpresaDto?> GetByTenantIdAsync(int tenantId)
    {
        var entity = await _db.DatosEmpresa
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.TenantId == tenantId);

        if (entity == null) return null;

        return new DatosEmpresaDto(
            entity.Id,
            entity.TenantId,
            entity.RazonSocial,
            entity.IdentificadorFiscal,
            entity.TipoIdentificadorFiscal,
            entity.Telefono,
            entity.Email,
            entity.Contacto,
            entity.Direccion,
            entity.Ciudad,
            entity.Estado,
            entity.CodigoPostal,
            entity.SitioWeb,
            entity.Descripcion);
    }

    public async Task<DatosEmpresaDto> CreateOrUpdateAsync(int tenantId, DatosEmpresaUpdateDto dto, string actualizadoPor)
    {
        var entity = await _db.DatosEmpresa
            .FirstOrDefaultAsync(d => d.TenantId == tenantId);

        if (entity == null)
        {
            entity = new Domain.Entities.DatosEmpresa
            {
                TenantId = tenantId,
                CreadoPor = actualizadoPor
            };
            _db.DatosEmpresa.Add(entity);
        }

        if (dto.RazonSocial != null) entity.RazonSocial = dto.RazonSocial;
        if (dto.IdentificadorFiscal != null) entity.IdentificadorFiscal = dto.IdentificadorFiscal;
        if (dto.TipoIdentificadorFiscal != null) entity.TipoIdentificadorFiscal = dto.TipoIdentificadorFiscal;
        if (dto.Telefono != null) entity.Telefono = dto.Telefono;
        if (dto.Email != null) entity.Email = dto.Email;
        if (dto.Contacto != null) entity.Contacto = dto.Contacto;
        if (dto.Direccion != null) entity.Direccion = dto.Direccion;
        if (dto.Ciudad != null) entity.Ciudad = dto.Ciudad;
        if (dto.Estado != null) entity.Estado = dto.Estado;
        if (dto.CodigoPostal != null) entity.CodigoPostal = dto.CodigoPostal;
        if (dto.SitioWeb != null) entity.SitioWeb = dto.SitioWeb;
        if (dto.Descripcion != null) entity.Descripcion = dto.Descripcion;

        entity.ActualizadoPor = actualizadoPor;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23505"
            && pgEx.Message.Contains("identificador_fiscal"))
        {
            throw new InvalidOperationException("Este identificador fiscal ya tiene una cuenta registrada.");
        }

        return new DatosEmpresaDto(
            entity.Id,
            entity.TenantId,
            entity.RazonSocial,
            entity.IdentificadorFiscal,
            entity.TipoIdentificadorFiscal,
            entity.Telefono,
            entity.Email,
            entity.Contacto,
            entity.Direccion,
            entity.Ciudad,
            entity.Estado,
            entity.CodigoPostal,
            entity.SitioWeb,
            entity.Descripcion);
    }
}
