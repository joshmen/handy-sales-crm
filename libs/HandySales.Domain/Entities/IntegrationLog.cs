using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

/// <summary>
/// Audit log for integration actions. Not soft-deletable — permanent record.
/// </summary>
[Table("IntegrationLogs")]
public class IntegrationLog
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("integration_id")]
    public int IntegrationId { get; set; }

    [Column("accion")]
    public string Accion { get; set; } = string.Empty; // activated, deactivated, configured

    [Column("descripcion")]
    public string? Descripcion { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Integration Integration { get; set; } = null!;
}
