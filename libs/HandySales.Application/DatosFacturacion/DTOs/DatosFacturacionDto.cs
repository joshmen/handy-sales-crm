using System.ComponentModel.DataAnnotations;

namespace HandySales.Application.DatosFacturacion.DTOs
{
    public class DatosFacturacionDto
    {
        public int Id { get; set; }
        
        // Datos del contribuyente
        public string RFC { get; set; } = string.Empty;
        public string RazonSocial { get; set; } = string.Empty;
        public string? NombreComercial { get; set; }
        
        // Domicilio fiscal
        public string Calle { get; set; } = string.Empty;
        public string? NumeroExterior { get; set; }
        public string? NumeroInterior { get; set; }
        public string Colonia { get; set; } = string.Empty;
        public string Municipio { get; set; } = string.Empty;
        public string Estado { get; set; } = string.Empty;
        public string CodigoPostal { get; set; } = string.Empty;
        public string Pais { get; set; } = "México";
        
        // Régimen fiscal
        public string RegimenFiscal { get; set; } = string.Empty;
        
        // Uso del CFDI predeterminado
        public string UsoCFDI { get; set; } = "G03";
        
        // Datos de contacto
        public string? CorreoElectronico { get; set; }
        public string? Telefono { get; set; }
        
        // Certificados (rutas o IDs de archivos)
        public string? CertificadoCSD { get; set; }
        public string? LlaveCSD { get; set; }
        public string? PasswordCSD { get; set; }
        
        // Logo para facturas
        public string? LogoFactura { get; set; }
        
        // Serie y folio inicial
        public string? Serie { get; set; }
        public int FolioInicial { get; set; } = 1;
        public int FolioActual { get; set; } = 1;
        
        // Configuraciones adicionales
        public bool FacturacionActiva { get; set; } = false;
        public string VersionCFDI { get; set; } = "4.0";
        public string? LugarExpedicion { get; set; }
        
        // Datos del PAC (Proveedor Autorizado de Certificación)
        public string? NombrePAC { get; set; }
        public string? UsuarioPAC { get; set; }
        public string? PasswordPAC { get; set; }
        public string? URLPACTimbrado { get; set; }
        public string? URLPACCancelacion { get; set; }
        
        // Configuraciones predeterminadas
        public string TipoComprobantePredeterminado { get; set; } = "I";
        public string FormaPagoPredeterminada { get; set; } = "01";
        public string MetodoPagoPredeterminado { get; set; } = "PUE";
        public string MonedaPredeterminada { get; set; } = "MXN";
        
        // Tenant
        public int TenantId { get; set; }
        
        // Campos de auditoria
        public DateTime CreatedDate { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? LastModifiedDate { get; set; }
        public int? LastModifiedBy { get; set; }
    }
}