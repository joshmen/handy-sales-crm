using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("Usuarios")]
public class Usuario : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("email")]
    public string Email { get; set; } = string.Empty;
    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;
    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;
    [Column("es_admin")]
    public bool EsAdmin { get; set; } = false;
    [Column("es_super_admin")]
    public bool EsSuperAdmin { get; set; } = false;

    /// <summary>
    /// Explicit role override. When set, takes precedence over boolean-derived role.
    /// Values: SUPER_ADMIN, ADMIN, SUPERVISOR, VIEWER, VENDEDOR.
    /// NULL = derive from EsAdmin/EsSuperAdmin (backward compatible).
    /// </summary>
    [Column("rol")]
    public string? RolExplicito { get; set; }

    /// <summary>
    /// Computed role: uses RolExplicito if set, otherwise derives from boolean flags.
    /// Después del refactor de abril 2026, RolExplicito es la fuente de verdad y los
    /// booleanos quedan deprecados (se eliminan en migración subsiguiente).
    /// </summary>
    [NotMapped]
    public string Rol => RolExplicito ?? (EsSuperAdmin ? RoleNames.SuperAdmin : EsAdmin ? RoleNames.Admin : RoleNames.Vendedor);

    /// <summary>True si <see cref="Rol"/> == SUPER_ADMIN. Usar esta en vez de EsSuperAdmin.</summary>
    [NotMapped]
    public bool IsSuperAdmin => Rol == RoleNames.SuperAdmin;

    /// <summary>True si <see cref="Rol"/> es ADMIN o SUPER_ADMIN. Equivalente al booleano legacy <c>EsAdmin</c>.</summary>
    [NotMapped]
    public bool IsAdminOrAbove => Rol == RoleNames.Admin || Rol == RoleNames.SuperAdmin;

    [Column("role_id")]
    public int? RoleId { get; set; }

    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }

    [Column("CompanyId")]
    public int? CompanyId { get; set; }

    [Column("activo")]
    public new bool Activo { get; set; } = false;

    // Session management
    [Column("session_version")]
    public int SessionVersion { get; set; } = 1;

    // 2FA TOTP
    [Column("totp_secret_encrypted")]
    public string? TotpSecretEncrypted { get; set; }

    [Column("totp_enabled")]
    public bool TotpEnabled { get; set; }

    [Column("totp_enabled_at")]
    public DateTime? TotpEnabledAt { get; set; }

    // Password reset
    [Column("password_reset_token")]
    public string? PasswordResetToken { get; set; }

    [Column("password_reset_expiry")]
    public DateTime? PasswordResetExpiry { get; set; }

    // Email verification
    [Column("email_verificado")]
    public bool EmailVerificado { get; set; } = false;

    [Column("codigo_verificacion")]
    public string? CodigoVerificacion { get; set; }

    [Column("codigo_verificacion_expiry")]
    public DateTime? CodigoVerificacionExpiry { get; set; }

    // Supervisor relationship (self-referencing)
    [Column("supervisor_id")]
    public int? SupervisorId { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Role? Role { get; set; }
    public Usuario? Supervisor { get; set; }
    public ICollection<Usuario> Subordinados { get; set; } = new List<Usuario>();
}
