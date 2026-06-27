using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

public enum EtapaCobranza
{
    Reintento1 = 0,
    Reintento2 = 1,
    AvisoFinal = 2,
    Suspension = 3
}

public enum EstadoCobranza
{
    Activo = 0,
    Recuperado = 1,
    Perdido = 2
}

[Table("CobranzasSuscripcion")]
public class CobranzaSuscripcion : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("monto")]
    public decimal Monto { get; set; }

    [Column("motivo")]
    public string Motivo { get; set; } = string.Empty;

    [Column("intentos")]
    public int Intentos { get; set; }

    [Column("etapa")]
    public EtapaCobranza Etapa { get; set; }

    [Column("proximo_paso_en")]
    public DateTime? ProximoPasoEn { get; set; }

    [Column("estado")]
    public EstadoCobranza Estado { get; set; }
}
