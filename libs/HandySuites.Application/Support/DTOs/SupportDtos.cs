using HandySuites.Domain.Entities;

namespace HandySuites.Application.Support.DTOs;

public class TicketSoporteDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int CreadoPorUsuarioId { get; set; }
    public string Asunto { get; set; } = string.Empty;
    public string? Categoria { get; set; }
    public CanalTicket Canal { get; set; }
    public PrioridadTicket Prioridad { get; set; }
    public int? AsignadoAUsuarioId { get; set; }
    public EstadoTicket Estado { get; set; }
    public DateTime? SlaVenceEn { get; set; }
    public DateTime CreadoEn { get; set; }
    public DateTime? ActualizadoEn { get; set; }
}

public class MensajeTicketSoporteDto
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public int? AutorUsuarioId { get; set; }
    public bool EsOperador { get; set; }
    public bool EsInterno { get; set; }
    public string Cuerpo { get; set; } = string.Empty;
    public DateTime CreadoEn { get; set; }
}

public class TicketDetalleDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int CreadoPorUsuarioId { get; set; }
    public string Asunto { get; set; } = string.Empty;
    public string? Categoria { get; set; }
    public CanalTicket Canal { get; set; }
    public PrioridadTicket Prioridad { get; set; }
    public int? AsignadoAUsuarioId { get; set; }
    public EstadoTicket Estado { get; set; }
    public DateTime? SlaVenceEn { get; set; }
    public DateTime CreadoEn { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    public List<MensajeTicketSoporteDto> Mensajes { get; set; } = new();
}

public record CrearTicketDto(
    string Asunto,
    string? Categoria,
    CanalTicket Canal,
    PrioridadTicket Prioridad,
    string Cuerpo
);

public record ResponderTicketDto(
    string Cuerpo,
    bool? EsInterno
);

public record ActualizarTicketDto(
    int? AsignadoAUsuarioId,
    EstadoTicket? Estado,
    PrioridadTicket? Prioridad
);
