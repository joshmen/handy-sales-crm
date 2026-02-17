using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

/// <summary>
/// Registro inmutable de sesiones de impersonación.
/// Cumple con políticas de auditoría y transparencia.
/// Los registros NO pueden ser editados ni eliminados.
/// </summary>
[Table("ImpersonationSessions")]
public class ImpersonationSession
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// ID del SUPER_ADMIN que realiza la impersonación
    /// </summary>
    [Column("super_admin_id")]
    [Required]
    public int SuperAdminId { get; set; }

    /// <summary>
    /// Email del SUPER_ADMIN (desnormalizado para auditoría)
    /// </summary>
    [Column("super_admin_email")]
    [Required]
    [MaxLength(255)]
    public string SuperAdminEmail { get; set; } = string.Empty;

    /// <summary>
    /// Nombre del SUPER_ADMIN (desnormalizado para auditoría)
    /// </summary>
    [Column("super_admin_name")]
    [Required]
    [MaxLength(255)]
    public string SuperAdminName { get; set; } = string.Empty;

    /// <summary>
    /// ID del tenant siendo impersonado
    /// </summary>
    [Column("target_tenant_id")]
    [Required]
    public int TargetTenantId { get; set; }

    /// <summary>
    /// Nombre del tenant (desnormalizado para auditoría)
    /// </summary>
    [Column("target_tenant_name")]
    [Required]
    [MaxLength(255)]
    public string TargetTenantName { get; set; } = string.Empty;

    /// <summary>
    /// Razón/justificación de la impersonación (obligatorio)
    /// </summary>
    [Column("reason")]
    [Required]
    [MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// Número de ticket de soporte (opcional pero recomendado)
    /// </summary>
    [Column("ticket_number")]
    [MaxLength(100)]
    public string? TicketNumber { get; set; }

    /// <summary>
    /// Nivel de acceso: READ_ONLY o READ_WRITE
    /// </summary>
    [Column("access_level")]
    [Required]
    [MaxLength(20)]
    public string AccessLevel { get; set; } = "READ_ONLY";

    /// <summary>
    /// Inicio de la sesión (UTC)
    /// </summary>
    [Column("started_at")]
    [Required]
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Fin de la sesión (UTC). Null si la sesión está activa.
    /// </summary>
    [Column("ended_at")]
    public DateTime? EndedAt { get; set; }

    /// <summary>
    /// Tiempo máximo de la sesión (UTC)
    /// </summary>
    [Column("expires_at")]
    [Required]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// IP del SUPER_ADMIN
    /// </summary>
    [Column("ip_address")]
    [Required]
    [MaxLength(45)]
    public string IpAddress { get; set; } = string.Empty;

    /// <summary>
    /// User Agent del navegador
    /// </summary>
    [Column("user_agent")]
    [MaxLength(500)]
    public string? UserAgent { get; set; }

    /// <summary>
    /// Estado de la sesión: ACTIVE, ENDED, EXPIRED
    /// </summary>
    [Column("status")]
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "ACTIVE";

    /// <summary>
    /// Lista de acciones realizadas (JSON array)
    /// </summary>
    [Column("actions_performed", TypeName = "json")]
    public string ActionsPerformed { get; set; } = "[]";

    /// <summary>
    /// Lista de páginas visitadas (JSON array)
    /// </summary>
    [Column("pages_visited", TypeName = "json")]
    public string PagesVisited { get; set; } = "[]";

    /// <summary>
    /// ¿Se envió notificación al tenant?
    /// </summary>
    [Column("notification_sent")]
    public bool NotificationSent { get; set; } = false;

    /// <summary>
    /// Fecha de envío de notificación
    /// </summary>
    [Column("notification_sent_at")]
    public DateTime? NotificationSentAt { get; set; }

    // Navegación (solo lectura, no se permite modificar)
    [ForeignKey("SuperAdminId")]
    public Usuario? SuperAdmin { get; set; }

    [ForeignKey("TargetTenantId")]
    public Tenant? TargetTenant { get; set; }
}

/// <summary>
/// Niveles de acceso para impersonación
/// </summary>
public static class ImpersonationAccessLevel
{
    public const string ReadOnly = "READ_ONLY";
    public const string ReadWrite = "READ_WRITE";
}

/// <summary>
/// Estados de sesión de impersonación
/// </summary>
public static class ImpersonationStatus
{
    public const string Active = "ACTIVE";
    public const string Ended = "ENDED";
    public const string Expired = "EXPIRED";
}
