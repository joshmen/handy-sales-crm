using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Common;

public abstract class AuditableEntity
{
    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    [Column("actualizado_en")]
    public DateTime? ActualizadoEn { get; set; }

    [Column("creado_por")]
    public string? CreadoPor { get; set; }

    [Column("actualizado_por")]
    public string? ActualizadoPor { get; set; }

    [Column("eliminado_en")]
    public DateTime? EliminadoEn { get; set; }

    [Column("eliminado_por")]
    public string? EliminadoPor { get; set; }

    /// <summary>
    /// Version for optimistic concurrency control and offline sync
    /// </summary>
    [Column("version")]
    [ConcurrencyCheck]
    public long Version { get; set; } = 1;
}
