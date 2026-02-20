using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

[Table("TwoFactorRecoveryCodes")]
public class TwoFactorRecoveryCode
{
    [Column("id")]
    public int Id { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("code_hash")]
    public string CodeHash { get; set; } = string.Empty;

    [Column("used_at")]
    public DateTime? UsedAt { get; set; }

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    // Navigation
    public Usuario Usuario { get; set; } = null!;
}
