namespace HandySuites.Application.Pedidos.DTOs;

/// <summary>
/// C.1 — Draft huérfano (fix prod 2026-06-03 post-incidente Rodrigo).
///
/// Un Pedido en Estado=Borrador es un draft. Si quedó así >= 30 min
/// (configurable), probablemente el vendedor lo creó offline + nunca lo
/// promovió, o sufrió pérdida de datos local. El supervisor consulta este
/// endpoint para decidir si llamar al vendedor.
/// </summary>
public record OrphanDraftDto(
    int PedidoId,
    string NumeroPedido,
    string MobileRecordId,
    int UsuarioId,
    string UsuarioNombre,
    int ClienteId,
    string ClienteNombre,
    decimal Total,
    DateTime FechaPedido,
    DateTime CreadoEn,
    /// <summary>Minutos desde CreadoEn — preformateado para el dashboard.</summary>
    int MinutesSinceCreated,
    int DetallesCount
);

public record OrphanDraftsResponseDto(
    List<OrphanDraftDto> Drafts,
    DateTime GeneratedAt,
    int MinAgeMinutes,
    int? FilterByUsuarioId
);
