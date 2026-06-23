namespace HandySuites.Application.Metas.DTOs;

public class MetaVendedorDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Periodo { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public bool Activo { get; set; }
    public DateTime CreadoEn { get; set; }
    public bool AutoRenovar { get; set; }

    /// <summary>
    /// Avance LOGRADO en el período por el vendedor según el tipo de meta:
    /// ventas = Σ Pedido.Total, pedidos = nº de pedidos, visitas = nº de visitas realizadas.
    /// Computado on-the-fly en la proyección (sin migración). 2026-06-19.
    /// </summary>
    public decimal Avance { get; set; }

    /// <summary>% de avance (Avance / Monto). Sin truncar; el front clampa la barra a 100.</summary>
    public double ProgresoPct => Monto > 0 ? (double)(Avance / Monto) * 100 : 0;
}

public record CreateMetaVendedorDto(
    int UsuarioId,
    string Tipo,
    string Periodo,
    decimal Monto,
    DateTime FechaInicio,
    DateTime FechaFin,
    bool AutoRenovar = false
);

public record UpdateMetaVendedorDto(
    string Tipo,
    string Periodo,
    decimal Monto,
    DateTime FechaInicio,
    DateTime FechaFin,
    bool Activo,
    bool AutoRenovar = false
);
