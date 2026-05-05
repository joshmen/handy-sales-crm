using System.ComponentModel.DataAnnotations;
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

    /// <summary>
    /// Rol explícito del usuario. Valores: SUPER_ADMIN, ADMIN, SUPERVISOR, VIEWER, VENDEDOR.
    /// Ver <see cref="RoleNames"/> para constantes.
    /// </summary>
    [Column("rol")]
    public string? RolExplicito { get; set; }

    /// <summary>Alias de <see cref="RolExplicito"/> con default. Nunca null en lectura.</summary>
    [NotMapped]
    public string Rol => RolExplicito ?? RoleNames.Vendedor;

    /// <summary>True si <see cref="Rol"/> == SUPER_ADMIN.</summary>
    [NotMapped]
    public bool IsSuperAdmin => Rol == RoleNames.SuperAdmin;

    /// <summary>True si <see cref="Rol"/> es ADMIN o SUPER_ADMIN.</summary>
    [NotMapped]
    public bool IsAdminOrAbove => Rol == RoleNames.Admin || Rol == RoleNames.SuperAdmin;

    [Column("role_id")]
    public int? RoleId { get; set; }

    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Teléfono de contacto del usuario. Formato libre — admins MX usan
    /// "+52 55..." pero permitimos cualquier país. El validador del DTO acepta
    /// dígitos + separadores comunes ("(", ")", "-", " "). Nullable para
    /// retro-compat con usuarios existentes. MaxLength 20 cubre formatos
    /// internacionales completos (E.164 max 15 + separadores).
    /// </summary>
    [Column("telefono")]
    [MaxLength(20)]
    public string? Telefono { get; set; }

    [Column("CompanyId")]
    public int? CompanyId { get; set; }

    [Column("activo")]
    public new bool Activo { get; set; } = false;

    /// <summary>
    /// True cuando el usuario debe cambiar su contraseña en el primer login.
    /// Caso típico: vendedor de campo creado por admin con password temporal
    /// (porque no tiene email corporativo). El cliente mobile/web fuerza la
    /// pantalla de "cambiar contraseña" antes de cualquier otra navegación.
    /// Se setea a false cuando el usuario completa el cambio.
    /// </summary>
    [Column("must_change_password")]
    public bool MustChangePassword { get; set; } = false;

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
