using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

[Table("AnnouncementDismissals")]
public class AnnouncementDismissal
{
    [Column("id")]
    public int Id { get; set; }

    [Column("announcement_id")]
    public int AnnouncementId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("dismissed_at")]
    public DateTime DismissedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Announcement? Announcement { get; set; }
    public Usuario? Usuario { get; set; }
}
