using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

public enum ResultadoVisita
{
    Pendiente = 0,
    Venta = 1,
    SinVenta = 2,
    NoEncontrado = 3,
    Reprogramada = 4,
    Cancelada = 5
}

public enum TipoVisita
{
    Rutina = 0,
    Cobranza = 1,
    Entrega = 2,
    Prospeccion = 3,
    Seguimiento = 4,
    Otro = 5
}

[Table("ClienteVisitas")]
public class ClienteVisita : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("cliente_id")]
    public int ClienteId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("pedido_id")]
    public int? PedidoId { get; set; }

    [Column("fecha_programada")]
    public DateTime? FechaProgramada { get; set; }

    [Column("fecha_hora_inicio")]
    public DateTime? FechaHoraInicio { get; set; }

    [Column("fecha_hora_fin")]
    public DateTime? FechaHoraFin { get; set; }

    [Column("tipo_visita")]
    public TipoVisita TipoVisita { get; set; } = TipoVisita.Rutina;

    [Column("resultado")]
    public ResultadoVisita Resultado { get; set; } = ResultadoVisita.Pendiente;

    [Column("latitud_inicio")]
    public double? LatitudInicio { get; set; }

    [Column("longitud_inicio")]
    public double? LongitudInicio { get; set; }

    [Column("latitud_fin")]
    public double? LatitudFin { get; set; }

    [Column("longitud_fin")]
    public double? LongitudFin { get; set; }

    [Column("distancia_cliente")]
    public double? DistanciaCliente { get; set; }

    [Column("notas")]
    public string? Notas { get; set; }

    [Column("notas_privadas")]
    public string? NotasPrivadas { get; set; }

    [Column("fotos")]
    public string? Fotos { get; set; } // JSON array of photo URLs

    [Column("duracion_minutos")]
    public int? DuracionMinutos { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Cliente Cliente { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
    public Pedido? Pedido { get; set; }
}
