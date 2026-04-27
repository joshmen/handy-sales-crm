using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

/// <summary>
/// Junction M:N entre RutaVendedor y Zona. Permite que una ruta cubra múltiples
/// zonas geográficas — alineado con Handy.la, Salesforce Field Service, SAP Sales
/// Cloud y Onfleet (todos modelan ruta como N zonas, no 1).
///
/// Reportado 2026-04-27: el dropdown "Add stop" filtraba estricto por la única
/// zona de la ruta (1 cliente visible) cuando admin esperaba ver todos.
///
/// El campo legacy `RutaVendedor.ZonaId` se mantiene durante la transición y se
/// backfilea con la primera zona de cada ruta. Se depreca en sweep posterior.
/// </summary>
[Table("RutasZonas")]
public class RutaZona
{
    [Column("id")]
    public int Id { get; set; }

    [Column("ruta_id")]
    public int RutaId { get; set; }

    [Column("zona_id")]
    public int ZonaId { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public RutaVendedor Ruta { get; set; } = null!;
    public Zona Zona { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}
