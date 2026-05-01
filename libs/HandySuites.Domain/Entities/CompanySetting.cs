using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("company_settings")]
public class CompanySetting : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    
    [Column("tenant_id")]
    public int TenantId { get; set; }
    
    [Column("company_id")]
    public int? CompanyId { get; set; }
    
    [Column("company_name")]
    public string CompanyName { get; set; } = string.Empty;
    
    [Column("primary_color")]
    public string PrimaryColor { get; set; } = "#007bff";
    
    [Column("secondary_color")]
    public string SecondaryColor { get; set; } = "#6c757d";
    
    [Column("logo_url")]
    public string? LogoUrl { get; set; }
    
    [Column("logo_public_id")]
    public string? LogoPublicId { get; set; } // Para almacenar el ID de Cloudinary
    
    [Column("cloudinary_folder")]
    public string? CloudinaryFolder { get; set; }

    [Column("timezone")]
    [MaxLength(50)]
    public string Timezone { get; set; } = "America/Mexico_City";

    [Column("language")]
    [MaxLength(10)]
    public string Language { get; set; } = "es";

    [Column("currency")]
    [MaxLength(10)]
    public string Currency { get; set; } = "MXN";

    [Column("theme")]
    [MaxLength(10)]
    public string Theme { get; set; } = "light";

    [Column("country")]
    [MaxLength(2)]
    public string Country { get; set; } = "MX";

    /// <summary>
    /// JSON config for which notification types are enabled at tenant level.
    /// Keys match automation handler slugs and order event types.
    /// Default: all enabled.
    /// </summary>
    [Column("notification_config", TypeName = "jsonb")]
    public string? NotificationConfig { get; set; }

    /// <summary>
    /// When true, delivered orders to clients WITH an RFC are automatically invoiced.
    /// </summary>
    [Column("auto_facturar_con_rfc")]
    public bool AutoFacturarConRfc { get; set; }

    /// <summary>
    /// Hora de inicio de jornada laboral (ej: 08:00). Si null, vendedor controla
    /// manualmente cuándo arranca su jornada (botón "Iniciar jornada" en mobile).
    /// </summary>
    [Column("hora_inicio_jornada")]
    public TimeOnly? HoraInicioJornada { get; set; }

    /// <summary>
    /// Hora de fin de jornada laboral (ej: 18:00). Si está set y la jornada del
    /// vendedor sigue activa al pasar esta hora, mobile dispara `StopAutomatico`.
    /// </summary>
    [Column("hora_fin_jornada")]
    public TimeOnly? HoraFinJornada { get; set; }

    /// <summary>
    /// CSV con los días laborables (1=Lun..7=Dom). Ej: "1,2,3,4,5" para L–V.
    /// Si null o vacío = todos los días son laborables.
    /// </summary>
    [Column("dias_laborables")]
    [MaxLength(20)]
    public string? DiasLaborables { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Company? Company { get; set; }
}