using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

/// <summary>
/// Log de crashes reportados desde la app móvil.
/// NO hereda AuditableEntity — es log puro, no necesita soft-delete ni versioning.
/// </summary>
[Table("CrashReports")]
public class CrashReport
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int? TenantId { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("device_id")]
    [MaxLength(100)]
    public string DeviceId { get; set; } = string.Empty;

    [Column("device_name")]
    [MaxLength(200)]
    public string DeviceName { get; set; } = string.Empty;

    [Column("app_version")]
    [MaxLength(20)]
    public string AppVersion { get; set; } = string.Empty;

    [Column("os_version")]
    [MaxLength(50)]
    public string OsVersion { get; set; } = string.Empty;

    [Column("error_message")]
    [MaxLength(2000)]
    public string ErrorMessage { get; set; } = string.Empty;

    [Column("stack_trace")]
    public string? StackTrace { get; set; }

    [Column("component_name")]
    [MaxLength(200)]
    public string? ComponentName { get; set; }

    [Column("severity")]
    [MaxLength(20)]
    public string Severity { get; set; } = "ERROR";

    [Column("resuelto")]
    public bool Resuelto { get; set; }

    [Column("nota_resolucion")]
    [MaxLength(500)]
    public string? NotaResolucion { get; set; }

    [Column("resuelto_por")]
    public int? ResueltoPor { get; set; }

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    // Navigation
    public Tenant? Tenant { get; set; }
    public Usuario? User { get; set; }
    public Usuario? ResueltoByUsuario { get; set; }
}
