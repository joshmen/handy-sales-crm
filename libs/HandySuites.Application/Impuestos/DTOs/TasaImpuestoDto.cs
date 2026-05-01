namespace HandySuites.Application.Impuestos.DTOs;

public class TasaImpuestoDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    /// <summary>Decimal — 0.16 = 16%, 0.08 = 8%, 0.00 = exento.</summary>
    public decimal Tasa { get; set; }
    public bool EsDefault { get; set; }
    public bool Activo { get; set; }
    /// <summary>Cantidad de productos que referencian esta tasa (read-only).</summary>
    public int ProductosCount { get; set; }
}

public class TasaImpuestoCreateDto
{
    public string Nombre { get; set; } = string.Empty;
    public decimal Tasa { get; set; }
    public bool EsDefault { get; set; }
}

public class TasaImpuestoUpdateDto
{
    public string? Nombre { get; set; }
    public decimal? Tasa { get; set; }
    public bool? EsDefault { get; set; }
    public bool? Activo { get; set; }
}
