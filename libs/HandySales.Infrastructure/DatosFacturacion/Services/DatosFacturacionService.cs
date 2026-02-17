using HandySales.Application.DatosFacturacion.DTOs;
using HandySales.Application.DatosFacturacion.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.DatosFacturacion.Services
{
    public class DatosFacturacionService : IDatosFacturacionService
    {
        private readonly HandySalesDbContext _context;

        public DatosFacturacionService(HandySalesDbContext context)
        {
            _context = context;
        }

        public async Task<DatosFacturacionDto?> GetByTenantAsync(int tenantId)
        {
            var datosFacturacion = await _context.DatosFacturacion
                .FirstOrDefaultAsync(df => df.TenantId == tenantId);

            return datosFacturacion != null ? MapToDto(datosFacturacion) : null;
        }

        public async Task<DatosFacturacionDto?> CreateAsync(int tenantId, int userId, CreateDatosFacturacionRequest request)
        {
            var existingDatos = await _context.DatosFacturacion
                .FirstOrDefaultAsync(df => df.TenantId == tenantId);

            if (existingDatos != null)
            {
                return null; // Ya existe configuración de facturación para este tenant
            }

            var datosFacturacion = new Domain.Entities.DatosFacturacion
            {
                TenantId = tenantId,
                RFC = request.RFC ?? string.Empty,
                RazonSocial = request.RazonSocial ?? string.Empty,
                NombreComercial = request.NombreComercial ?? string.Empty,
                Calle = request.Calle ?? string.Empty,
                NumeroExterior = request.NumeroExterior ?? string.Empty,
                NumeroInterior = request.NumeroInterior ?? string.Empty,
                Colonia = request.Colonia ?? string.Empty,
                Municipio = request.Municipio ?? string.Empty,
                Estado = request.Estado ?? string.Empty,
                CodigoPostal = request.CodigoPostal ?? string.Empty,
                Pais = request.Pais ?? "México",
                RegimenFiscal = request.RegimenFiscal ?? string.Empty,
                UsoCFDI = request.UsoCFDI ?? "G03",
                CorreoElectronico = request.CorreoElectronico ?? string.Empty,
                Telefono = request.Telefono ?? string.Empty,
                CertificadoCSD = request.CertificadoCSD ?? string.Empty,
                LlaveCSD = request.LlaveCSD ?? string.Empty,
                PasswordCSD = request.PasswordCSD ?? string.Empty,
                LogoFactura = request.LogoFactura ?? string.Empty,
                Serie = request.Serie ?? string.Empty,
                FolioInicial = request.FolioInicial,
                FolioActual = request.FolioActual,
                FacturacionActiva = request.FacturacionActiva,
                VersionCFDI = request.VersionCFDI ?? "4.0",
                LugarExpedicion = request.LugarExpedicion ?? string.Empty,
                NombrePAC = request.NombrePAC ?? string.Empty,
                UsuarioPAC = request.UsuarioPAC ?? string.Empty,
                PasswordPAC = request.PasswordPAC ?? string.Empty,
                URLPACTimbrado = request.URLPACTimbrado ?? string.Empty,
                URLPACCancelacion = request.URLPACCancelacion ?? string.Empty,
                TipoComprobantePredeterminado = request.TipoComprobantePredeterminado ?? "I",
                FormaPagoPredeterminada = request.FormaPagoPredeterminada ?? "01",
                MetodoPagoPredeterminado = request.MetodoPagoPredeterminado ?? "PUE",
                MonedaPredeterminada = request.MonedaPredeterminada ?? "MXN",
                CreadoEn = DateTime.UtcNow,
                CreadoPor = userId.ToString()
            };

            _context.DatosFacturacion.Add(datosFacturacion);
            await _context.SaveChangesAsync();

            return MapToDto(datosFacturacion);
        }

        public async Task<DatosFacturacionDto?> UpdateAsync(int tenantId, int userId, UpdateDatosFacturacionRequest request)
        {
            var datosFacturacion = await _context.DatosFacturacion
                .FirstOrDefaultAsync(df => df.TenantId == tenantId && df.Id == request.Id);

            if (datosFacturacion == null)
            {
                return null;
            }

            datosFacturacion.RFC = request.RFC ?? datosFacturacion.RFC;
            datosFacturacion.RazonSocial = request.RazonSocial ?? datosFacturacion.RazonSocial;
            datosFacturacion.NombreComercial = request.NombreComercial ?? datosFacturacion.NombreComercial;
            datosFacturacion.Calle = request.Calle ?? datosFacturacion.Calle;
            datosFacturacion.NumeroExterior = request.NumeroExterior ?? datosFacturacion.NumeroExterior;
            datosFacturacion.NumeroInterior = request.NumeroInterior ?? datosFacturacion.NumeroInterior;
            datosFacturacion.Colonia = request.Colonia ?? datosFacturacion.Colonia;
            datosFacturacion.Municipio = request.Municipio ?? datosFacturacion.Municipio;
            datosFacturacion.Estado = request.Estado ?? datosFacturacion.Estado;
            datosFacturacion.CodigoPostal = request.CodigoPostal ?? datosFacturacion.CodigoPostal;
            datosFacturacion.Pais = request.Pais ?? datosFacturacion.Pais;
            datosFacturacion.RegimenFiscal = request.RegimenFiscal ?? datosFacturacion.RegimenFiscal;
            datosFacturacion.UsoCFDI = request.UsoCFDI ?? datosFacturacion.UsoCFDI;
            datosFacturacion.CorreoElectronico = request.CorreoElectronico ?? datosFacturacion.CorreoElectronico;
            datosFacturacion.Telefono = request.Telefono ?? datosFacturacion.Telefono;
            datosFacturacion.CertificadoCSD = request.CertificadoCSD ?? datosFacturacion.CertificadoCSD;
            datosFacturacion.LlaveCSD = request.LlaveCSD ?? datosFacturacion.LlaveCSD;
            datosFacturacion.PasswordCSD = request.PasswordCSD ?? datosFacturacion.PasswordCSD;
            datosFacturacion.LogoFactura = request.LogoFactura ?? datosFacturacion.LogoFactura;
            datosFacturacion.Serie = request.Serie ?? datosFacturacion.Serie;
            datosFacturacion.FolioInicial = request.FolioInicial;
            datosFacturacion.FolioActual = request.FolioActual;
            datosFacturacion.FacturacionActiva = request.FacturacionActiva;
            datosFacturacion.VersionCFDI = request.VersionCFDI ?? datosFacturacion.VersionCFDI;
            datosFacturacion.LugarExpedicion = request.LugarExpedicion ?? datosFacturacion.LugarExpedicion;
            datosFacturacion.NombrePAC = request.NombrePAC ?? datosFacturacion.NombrePAC;
            datosFacturacion.UsuarioPAC = request.UsuarioPAC ?? datosFacturacion.UsuarioPAC;
            datosFacturacion.PasswordPAC = request.PasswordPAC ?? datosFacturacion.PasswordPAC;
            datosFacturacion.URLPACTimbrado = request.URLPACTimbrado ?? datosFacturacion.URLPACTimbrado;
            datosFacturacion.URLPACCancelacion = request.URLPACCancelacion ?? datosFacturacion.URLPACCancelacion;
            datosFacturacion.TipoComprobantePredeterminado = request.TipoComprobantePredeterminado ?? datosFacturacion.TipoComprobantePredeterminado;
            datosFacturacion.FormaPagoPredeterminada = request.FormaPagoPredeterminada ?? datosFacturacion.FormaPagoPredeterminada;
            datosFacturacion.MetodoPagoPredeterminado = request.MetodoPagoPredeterminado ?? datosFacturacion.MetodoPagoPredeterminado;
            datosFacturacion.MonedaPredeterminada = request.MonedaPredeterminada ?? datosFacturacion.MonedaPredeterminada;
            datosFacturacion.ActualizadoEn = DateTime.UtcNow;
            datosFacturacion.ActualizadoPor = userId.ToString();

            await _context.SaveChangesAsync();

            return MapToDto(datosFacturacion);
        }

        public async Task<bool> DeleteAsync(int tenantId, int userId)
        {
            var datosFacturacion = await _context.DatosFacturacion
                .FirstOrDefaultAsync(df => df.TenantId == tenantId);

            if (datosFacturacion == null)
            {
                return false;
            }

            _context.DatosFacturacion.Remove(datosFacturacion);
            await _context.SaveChangesAsync();

            return true;
        }

        private static DatosFacturacionDto MapToDto(Domain.Entities.DatosFacturacion entity)
        {
            return new DatosFacturacionDto
            {
                Id = entity.Id,
                RFC = entity.RFC,
                RazonSocial = entity.RazonSocial,
                NombreComercial = entity.NombreComercial,
                Calle = entity.Calle,
                NumeroExterior = entity.NumeroExterior,
                NumeroInterior = entity.NumeroInterior,
                Colonia = entity.Colonia,
                Municipio = entity.Municipio,
                Estado = entity.Estado,
                CodigoPostal = entity.CodigoPostal,
                Pais = entity.Pais,
                RegimenFiscal = entity.RegimenFiscal,
                UsoCFDI = entity.UsoCFDI,
                CorreoElectronico = entity.CorreoElectronico,
                Telefono = entity.Telefono,
                CertificadoCSD = entity.CertificadoCSD,
                LlaveCSD = entity.LlaveCSD,
                PasswordCSD = entity.PasswordCSD,
                LogoFactura = entity.LogoFactura,
                Serie = entity.Serie,
                FolioInicial = entity.FolioInicial,
                FolioActual = entity.FolioActual,
                FacturacionActiva = entity.FacturacionActiva,
                VersionCFDI = entity.VersionCFDI,
                LugarExpedicion = entity.LugarExpedicion,
                NombrePAC = entity.NombrePAC,
                UsuarioPAC = entity.UsuarioPAC,
                PasswordPAC = entity.PasswordPAC,
                URLPACTimbrado = entity.URLPACTimbrado,
                URLPACCancelacion = entity.URLPACCancelacion,
                TipoComprobantePredeterminado = entity.TipoComprobantePredeterminado,
                FormaPagoPredeterminada = entity.FormaPagoPredeterminada,
                MetodoPagoPredeterminado = entity.MetodoPagoPredeterminado,
                MonedaPredeterminada = entity.MonedaPredeterminada,
                TenantId = entity.TenantId,
                CreatedDate = entity.CreadoEn,
                CreatedBy = int.TryParse(entity.CreadoPor, out var createdBy) ? createdBy : 0,
                LastModifiedDate = entity.ActualizadoEn,
                LastModifiedBy = int.TryParse(entity.ActualizadoPor, out var lastModifiedBy) ? lastModifiedBy : null
            };
        }
    }
}