using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

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

    [Column("role_id")]
    public int? RoleId { get; set; }

    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }

    [Column("CompanyId")]
    public int? CompanyId { get; set; }

    [Column("activo")]
    public new bool Activo { get; set; } = false;

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Role? Role { get; set; }
}
