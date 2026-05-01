using HandySuites.Domain.Common;

namespace HandySuites.Application.Tracking.DTOs;

/// <summary>
/// Ping individual enviado por mobile en batch.
/// `CapturadoEn` viene del device para preservar orden tras offline.
/// `LocalId` permite deduplicar si un mismo ping se reenvía (ej: retry).
/// </summary>
public class UbicacionPingDto
{
    public string? LocalId { get; set; }
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
    public decimal? PrecisionMetros { get; set; }
    public TipoPingUbicacion Tipo { get; set; }
    public DateTime CapturadoEn { get; set; }
    public int? ReferenciaId { get; set; }
}

/// <summary>Batch sent by mobile to /api/mobile/tracking/batch.</summary>
public class UbicacionBatchRequestDto
{
    public List<UbicacionPingDto> Pings { get; set; } = new();
}

public class UbicacionBatchResultDto
{
    public int Aceptados { get; set; }
    public int Duplicados { get; set; }
}

/// <summary>Punto del recorrido del día de un vendedor.</summary>
public class UbicacionVendedorDto
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
    public decimal? PrecisionMetros { get; set; }
    public TipoPingUbicacion Tipo { get; set; }
    public DateTime CapturadoEn { get; set; }
    public int? ReferenciaId { get; set; }
}

/// <summary>Última ubicación conocida por vendedor (vista resumen para tabla).</summary>
public class UltimaUbicacionDto
{
    public int UsuarioId { get; set; }
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
    public TipoPingUbicacion Tipo { get; set; }
    public DateTime CapturadoEn { get; set; }
}
