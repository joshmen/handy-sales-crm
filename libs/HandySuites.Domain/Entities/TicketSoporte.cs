using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

public enum CanalTicket
{
    Web = 0,
    Mail = 1
}

public enum PrioridadTicket
{
    Baja = 0,
    Media = 1,
    Alta = 2,
    Urgente = 3
}

public enum EstadoTicket
{
    Abierto = 0,
    Pendiente = 1,
    Resuelto = 2,
    Cerrado = 3
}

[Table("TicketsSoporte")]
public class TicketSoporte : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("creado_por_usuario_id")]
    public int CreadoPorUsuarioId { get; set; }

    [Column("asunto")]
    public string Asunto { get; set; } = string.Empty;

    [Column("categoria")]
    public string? Categoria { get; set; }

    [Column("canal")]
    public CanalTicket Canal { get; set; }

    [Column("prioridad")]
    public PrioridadTicket Prioridad { get; set; }

    [Column("asignado_a_usuario_id")]
    public int? AsignadoAUsuarioId { get; set; }

    [Column("estado")]
    public EstadoTicket Estado { get; set; }

    [Column("sla_vence_en")]
    public DateTime? SlaVenceEn { get; set; }

    public ICollection<MensajeTicketSoporte> Mensajes { get; set; } = new List<MensajeTicketSoporte>();
}
