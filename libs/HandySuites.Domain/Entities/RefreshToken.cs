using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

[Table("RefreshTokens")]
public class RefreshToken
{
    [Column("Id")]
    public int Id { get; set; }
    
    [Column("Token")]
    public string Token { get; set; } = string.Empty;
    
    [Column("UserId")]
    public int UserId { get; set; }
    
    [Column("ExpiresAt")]
    public DateTime ExpiresAt { get; set; }
    
    [Column("IsRevoked")]
    public bool IsRevoked { get; set; } = false;
    
    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Column("RevokedAt")]
    public DateTime? RevokedAt { get; set; }
    
    [Column("ReplacedByToken")]
    public string? ReplacedByToken { get; set; }

    [Column("SessionVersionAtCreation")]
    public int? SessionVersionAtCreation { get; set; }

    /// <summary>
    /// FK a DeviceSession 1:1 — cada refresh token pertenece a UNA session.
    /// Permite que logout en device A revoque solo SUS tokens (no del user
    /// completo). Nullable durante migration window; NOT NULL después de
    /// backfill (Phase 3 del rediseño 2026-05-18).
    /// </summary>
    [Column("DeviceSessionId")]
    public int? DeviceSessionId { get; set; }

    public Usuario Usuario { get; set; } = null!;
    public DeviceSession? DeviceSession { get; set; }
}