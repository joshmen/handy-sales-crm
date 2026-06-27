using HandySuites.Domain.Entities;

namespace HandySuites.Application.Cobros.DTOs;

public class CobranzaDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public int Intentos { get; set; }
    public EtapaCobranza Etapa { get; set; }
    public DateTime? ProximoPasoEn { get; set; }
    public EstadoCobranza Estado { get; set; }
    public DateTime CreadoEn { get; set; }
    public DateTime? ActualizadoEn { get; set; }
}

public record CrearCobranzaDto(
    int TenantId,
    decimal Monto,
    string Motivo
);

public class CobranzaResumenDto
{
    public List<CobranzaDto> Items { get; set; } = new();
    public int Fallidos { get; set; }
    public decimal MontoEnRiesgo { get; set; }
    public decimal RecuperadoMes { get; set; }
    public decimal Tasa { get; set; }
}
