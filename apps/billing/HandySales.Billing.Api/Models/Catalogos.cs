using System.ComponentModel.DataAnnotations;

namespace HandySales.Billing.Api.Models;

public class ConfiguracionFiscal
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string TenantId { get; set; } = default!;
    
    public int EmpresaId { get; set; }
    
    [MaxLength(100)]
    public string? RegimenFiscal { get; set; }
    
    [MaxLength(20)]
    public string? Rfc { get; set; }
    
    [MaxLength(200)]
    public string? RazonSocial { get; set; }
    
    public string? DireccionFiscal { get; set; }
    
    [MaxLength(10)]
    public string? CodigoPostal { get; set; }
    
    [MaxLength(50)]
    public string Pais { get; set; } = "México";
    
    [MaxLength(10)]
    public string Moneda { get; set; } = "MXN";
    
    [MaxLength(10)]
    public string? SerieFactura { get; set; }
    
    public int FolioActual { get; set; } = 1;
    
    public string? CertificadoSat { get; set; }
    
    public string? LlavePrivada { get; set; }
    
    [MaxLength(100)]
    public string? PasswordCertificado { get; set; }
    
    [MaxLength(500)]
    public string? LogoUrl { get; set; }
    
    public bool Activo { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class TipoComprobante
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(10)]
    public string Codigo { get; set; } = default!;
    
    [Required]
    [MaxLength(100)]
    public string Descripcion { get; set; } = default!;
    
    public bool Activo { get; set; } = true;
}

public class MetodoPago
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(10)]
    public string Codigo { get; set; } = default!;
    
    [Required]
    [MaxLength(100)]
    public string Descripcion { get; set; } = default!;
    
    public bool RequiereBanco { get; set; } = false;
    
    public bool Activo { get; set; } = true;
}

public class FormaPago
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(10)]
    public string Codigo { get; set; } = default!;
    
    [Required]
    [MaxLength(100)]
    public string Descripcion { get; set; } = default!;
    
    public bool Activo { get; set; } = true;
}

public class UsoCfdi
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(10)]
    public string Codigo { get; set; } = default!;
    
    [Required]
    [MaxLength(200)]
    public string Descripcion { get; set; } = default!;
    
    public bool AplicaPersonaFisica { get; set; } = true;
    
    public bool AplicaPersonaMoral { get; set; } = true;
    
    public bool Activo { get; set; } = true;
}

public class NumeracionDocumento
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string TenantId { get; set; } = default!;
    
    [Required]
    [MaxLength(50)]
    public string TipoDocumento { get; set; } = default!;
    
    [MaxLength(10)]
    public string? Serie { get; set; }
    
    public int FolioInicial { get; set; } = 1;
    
    public int FolioActual { get; set; }
    
    public int? FolioFinal { get; set; }
    
    public bool Activo { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class AuditoriaFacturacion
{
    [Key]
    public long Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string TenantId { get; set; } = default!;
    
    public long? FacturaId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Accion { get; set; } = default!;
    
    public string? Descripcion { get; set; }
    
    public string? DatosAnteriores { get; set; } // JSON
    
    public string? DatosNuevos { get; set; } // JSON
    
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    [MaxLength(500)]
    public string? UserAgent { get; set; }
    
    public int? UsuarioId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}