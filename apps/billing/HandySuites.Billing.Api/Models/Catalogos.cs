using System.ComponentModel.DataAnnotations;

namespace HandySuites.Billing.Api.Models;

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
    
    [MaxLength(500)]
    public string? PasswordCertificado { get; set; }
    
    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    // PAC Finkok credentials (encrypted)
    [MaxLength(200)]
    public string? PacUsuario { get; set; }

    [MaxLength(200)]
    public string? PacPassword { get; set; }

    [MaxLength(20)]
    public string PacAmbiente { get; set; } = "sandbox"; // sandbox | production

    /// <summary>KMS-encrypted Data Encryption Key for this tenant (Base64). Null = legacy encryption.</summary>
    public string? EncryptedDek { get; set; }

    /// <summary>1 = legacy PBKDF2/AES-GCM, 2 = KMS envelope encryption</summary>
    public short EncryptionVersion { get; set; } = 1;

    public bool Activo { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ─── Finkok registration tracking (BILL-1, 2026-05-26) ────────────────────
    // Cuando el tenant sube CSD, además de guardarlo localmente lo registramos
    // en Finkok via registration.add. Estas columnas reflejan el resultado.

    /// <summary>True si registration.add a Finkok fue exitoso. Si false → timbrado
    /// fallará porque Finkok no reconoce el RFC bajo nuestra cuenta partner.</summary>
    public bool FinkokEmisorRegistrado { get; set; }

    public DateTime? FinkokRegistradoEn { get; set; }

    /// <summary>"active" | "suspended" | "frozen" según Finkok. Null si nunca se registró.</summary>
    [MaxLength(20)]
    public string? FinkokStatus { get; set; }

    /// <summary>'P' = prepago (créditos asignados via assign), 'O' = ilimitado (tarifa mensual).</summary>
    public char? FinkokTypeUser { get; set; }

    /// <summary>Créditos prepago restantes. Sincronizado periódicamente via FinkokStatusSyncJob.
    /// Null si TypeUser=O (ilimitado) o nunca se consultó.</summary>
    public int? FinkokCreditosRestantes { get; set; }
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