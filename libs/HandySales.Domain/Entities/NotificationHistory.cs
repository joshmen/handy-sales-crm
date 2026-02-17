using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

public enum NotificationType
{
    General = 0,
    Order = 1,
    Route = 2,
    Visit = 3,
    Alert = 4,
    System = 5
}

public enum NotificationStatus
{
    Pending = 0,
    Sent = 1,
    Failed = 2,
    Delivered = 3,
    Read = 4
}

[Table("NotificationHistory")]
public class NotificationHistory : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("usuario_id")]
    public int? UsuarioId { get; set; }

    [Column("device_session_id")]
    public int? DeviceSessionId { get; set; }

    [Column("titulo")]
    public string Titulo { get; set; } = null!;

    [Column("mensaje")]
    public string Mensaje { get; set; } = null!;

    [Column("tipo")]
    public NotificationType Tipo { get; set; } = NotificationType.General;

    [Column("status")]
    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;

    [Column("data_json")]
    public string? DataJson { get; set; }

    [Column("fcm_message_id")]
    public string? FcmMessageId { get; set; }

    [Column("error_message")]
    public string? ErrorMessage { get; set; }

    [Column("enviado_en")]
    public DateTime? EnviadoEn { get; set; }

    [Column("leido_en")]
    public DateTime? LeidoEn { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Usuario? Usuario { get; set; }
    public DeviceSession? DeviceSession { get; set; }
}
