using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

public enum EstadoRuta
{
    Planificada = 0,
    EnProgreso = 1,
    Completada = 2,
    Cancelada = 3,
    PendienteAceptar = 4,
    CargaAceptada = 5,
    Cerrada = 6
}

public enum EstadoPedidoRuta
{
    Asignado = 0,
    Entregado = 1,
    Devuelto = 2
}

[Table("RutasVendedor")]
public class RutaVendedor : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("zona_id")]
    public int? ZonaId { get; set; }

    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [Column("descripcion")]
    public string? Descripcion { get; set; }

    [Column("fecha")]
    public DateTime Fecha { get; set; }

    [Column("hora_inicio_estimada")]
    public TimeSpan? HoraInicioEstimada { get; set; }

    [Column("hora_fin_estimada")]
    public TimeSpan? HoraFinEstimada { get; set; }

    [Column("hora_inicio_real")]
    public DateTime? HoraInicioReal { get; set; }

    [Column("hora_fin_real")]
    public DateTime? HoraFinReal { get; set; }

    [Column("estado")]
    public EstadoRuta Estado { get; set; } = EstadoRuta.Planificada;

    [Column("kilometros_estimados")]
    public double? KilometrosEstimados { get; set; }

    [Column("kilometros_reales")]
    public double? KilometrosReales { get; set; }

    [Column("notas")]
    public string? Notas { get; set; }

    [Column("efectivo_inicial")]
    public double? EfectivoInicial { get; set; }

    [Column("comentarios_carga")]
    public string? ComentariosCarga { get; set; }

    [Column("monto_recibido")]
    public double? MontoRecibido { get; set; }

    [Column("cerrado_en")]
    public DateTime? CerradoEn { get; set; }

    [Column("cerrado_por")]
    public string? CerradoPor { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
    public Zona? Zona { get; set; }
    public List<RutaDetalle> Detalles { get; set; } = new();
    public List<RutaCarga> Cargas { get; set; } = new();
    public List<RutaPedido> PedidosAsignados { get; set; } = new();
    public List<RutaRetornoInventario> RetornoInventario { get; set; } = new();
}
