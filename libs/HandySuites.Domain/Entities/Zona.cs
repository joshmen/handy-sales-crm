using HandySuites.Domain.Common;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

/// <summary>
/// Frecuencia de visita pactada para la zona. El cliente hereda la frecuencia de
/// su zona (Cliente.IdZona) para el cálculo de cobertura. Días: Semanal=7,
/// Quincenal=14, Mensual=30.
/// </summary>
public enum FrecuenciaVisita
{
    Semanal = 0,
    Quincenal = 1,
    Mensual = 2,
}

[Table("Zonas")]
public class Zona : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;
    [Column("descripcion")]
    public string? Descripcion { get; set; }

    /// <summary>Color hex de la zona (ej. "#0176D3") para el pin del mapa y los swatches del drawer.</summary>
    [Column("color")]
    public string? Color { get; set; }

    /// <summary>Frecuencia de visita pactada para los clientes de la zona. Default Semanal.</summary>
    [Column("frecuencia_visita")]
    public FrecuenciaVisita FrecuenciaVisita { get; set; } = FrecuenciaVisita.Semanal;

    [Column("centro_latitud")]
    public double? CentroLatitud { get; set; }

    [Column("centro_longitud")]
    public double? CentroLongitud { get; set; }

    [Column("radio_km")]
    public double? RadioKm { get; set; }

    /// <summary>
    /// Vendedor (Usuario rol VENDEDOR) responsable de la zona. Opcional: una zona
    /// puede quedar sin asignar. FK SET NULL al borrar el usuario. 2026-06-18.
    /// </summary>
    [Column("vendedor_id")]
    public int? VendedorId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Usuario? Vendedor { get; set; }
}
