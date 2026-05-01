using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

/// <summary>
/// Ping GPS del vendedor disparado por una acción (venta/cobro/visita/ruta)
/// o por el checkpoint heartbeat cada 15 minutos. Persistido offline en
/// WatermelonDB y sincronizado al backend en batch para minimizar llamadas
/// y soportar cortes de red prolongados.
///
/// `CapturadoEn` viene del device (timestamp del momento del GPS), NO del
/// servidor — para que un batch enviado tras 2h offline preserve el orden
/// real de los pings.
///
/// `DiaServicio` se calcula al insertar (date de CapturadoEn en zona del
/// tenant) para indexar queries del recorrido del día sin scan de timestamp.
/// </summary>
[Table("UbicacionesVendedor")]
public class UbicacionVendedor : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("latitud", TypeName = "numeric(9,6)")]
    public decimal Latitud { get; set; }

    [Column("longitud", TypeName = "numeric(9,6)")]
    public decimal Longitud { get; set; }

    /// <summary>Precision del GPS en metros (accuracy reportada por el device).</summary>
    [Column("precision_metros")]
    public decimal? PrecisionMetros { get; set; }

    [Column("tipo")]
    public TipoPingUbicacion Tipo { get; set; }

    /// <summary>
    /// Timestamp del momento real del fix GPS en el device (NO el momento del sync).
    /// Crítico para preservar orden cronológico cuando el batch sube tras horas offline.
    /// </summary>
    [Column("capturado_en")]
    public DateTime CapturadoEn { get; set; }

    /// <summary>
    /// FK opcional al pedido/visita/ruta que disparó el ping. Permite navegar
    /// desde el mapa: "click marker → ver el pedido". NULL para Checkpoint.
    /// </summary>
    [Column("referencia_id")]
    public int? ReferenciaId { get; set; }

    /// <summary>
    /// Día del fix (date sin hora, en zona del tenant). Index para query
    /// "recorrido del día" sin escanear el rango de timestamp.
    /// </summary>
    [Column("dia_servicio")]
    public DateOnly DiaServicio { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
}
