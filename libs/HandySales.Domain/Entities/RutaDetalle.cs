using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

public enum EstadoParada
{
    Pendiente = 0,
    EnCamino = 1,
    Visitado = 2,
    Omitido = 3
}

[Table("RutasDetalle")]
public class RutaDetalle : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("ruta_id")]
    public int RutaId { get; set; }

    [Column("cliente_id")]
    public int ClienteId { get; set; }

    [Column("orden_visita")]
    public int OrdenVisita { get; set; }

    [Column("hora_estimada_llegada")]
    public TimeSpan? HoraEstimadaLlegada { get; set; }

    [Column("duracion_estimada_minutos")]
    public int? DuracionEstimadaMinutos { get; set; }

    [Column("hora_llegada_real")]
    public DateTime? HoraLlegadaReal { get; set; }

    [Column("hora_salida_real")]
    public DateTime? HoraSalidaReal { get; set; }

    [Column("estado")]
    public EstadoParada Estado { get; set; } = EstadoParada.Pendiente;

    [Column("visita_id")]
    public int? VisitaId { get; set; }

    [Column("pedido_id")]
    public int? PedidoId { get; set; }

    [Column("notas")]
    public string? Notas { get; set; }

    [Column("razon_omision")]
    public string? RazonOmision { get; set; }

    [Column("latitud")]
    public double? Latitud { get; set; }

    [Column("longitud")]
    public double? Longitud { get; set; }

    [Column("distancia_desde_anterior")]
    public double? DistanciaDesdeAnterior { get; set; }

    // Navigation properties
    public RutaVendedor Ruta { get; set; } = null!;
    public Cliente Cliente { get; set; } = null!;
    public ClienteVisita? Visita { get; set; }
    public Pedido? Pedido { get; set; }
}
