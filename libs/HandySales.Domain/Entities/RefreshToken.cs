using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

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

    public Usuario Usuario { get; set; } = null!;
}