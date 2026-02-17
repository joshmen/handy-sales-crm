using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

public enum DeviceType
{
    Unknown = 0,
    Web = 1,
    Android = 2,
    iOS = 3,
    Desktop = 4
}

public enum SessionStatus
{
    Active = 0,
    LoggedOut = 1,
    Expired = 2,
    RevokedByAdmin = 3,
    RevokedByUser = 4
}

[Table("DeviceSessions")]
public class DeviceSession : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("device_id")]
    public string DeviceId { get; set; } = null!;

    [Column("device_name")]
    public string? DeviceName { get; set; }

    [Column("device_type")]
    public DeviceType DeviceType { get; set; } = DeviceType.Unknown;

    [Column("device_model")]
    public string? DeviceModel { get; set; }

    [Column("os_version")]
    public string? OsVersion { get; set; }

    [Column("app_version")]
    public string? AppVersion { get; set; }

    [Column("push_token")]
    public string? PushToken { get; set; }

    [Column("refresh_token_id")]
    public int? RefreshTokenId { get; set; }

    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [Column("status")]
    public SessionStatus Status { get; set; } = SessionStatus.Active;

    [Column("last_activity")]
    public DateTime LastActivity { get; set; } = DateTime.UtcNow;

    [Column("logged_in_at")]
    public DateTime LoggedInAt { get; set; } = DateTime.UtcNow;

    [Column("logged_out_at")]
    public DateTime? LoggedOutAt { get; set; }

    [Column("logout_reason")]
    public string? LogoutReason { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
    public RefreshToken? RefreshToken { get; set; }
}
