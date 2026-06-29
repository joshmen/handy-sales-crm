using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("MensajesTicketSoporte")]
public class MensajeTicketSoporte : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("ticket_id")]
    public int TicketId { get; set; }

    [Column("autor_usuario_id")]
    public int? AutorUsuarioId { get; set; }

    [Column("es_operador")]
    public bool EsOperador { get; set; }

    [Column("es_interno")]
    public bool EsInterno { get; set; }

    [Column("cuerpo")]
    public string Cuerpo { get; set; } = string.Empty;
}
