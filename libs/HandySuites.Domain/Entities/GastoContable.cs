using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

/// <summary>
/// Gasto contable del tenant — insumo para el CORE contable (partida doble).
///
/// NOTA: distinto de <see cref="Gasto"/> (gasto de campo del vendedor, ligado a
/// ruta y con comprobante foto). Esta entidad modela el gasto de operacion del
/// negocio para fines contables/fiscales: base + IVA acreditable, proveedor (RFC)
/// para DIOT, y categoria de operacion. Genera el asiento:
///   DEBE 6100 Gastos de operacion = Base
///   DEBE 1180 IVA acreditable     = Iva
///   HABER 1110 Bancos             = Total (Base + Iva)
/// </summary>
[Table("GastosContables")]
public class GastoContable : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("fecha")]
    public DateTime Fecha { get; set; } = DateTime.UtcNow;

    /// <summary>Categoria de operacion: "Sueldos" | "Comisiones" | "Combustible" | "Renta" | "Servicios" | "Otros".</summary>
    [Column("categoria")]
    public string Categoria { get; set; } = "Otros";

    [Column("descripcion")]
    public string Descripcion { get; set; } = string.Empty;

    /// <summary>Monto sin IVA (subtotal).</summary>
    [Column("base")]
    public decimal Base { get; set; }

    /// <summary>IVA acreditable del gasto.</summary>
    [Column("iva")]
    public decimal Iva { get; set; }

    /// <summary>Total = Base + Iva.</summary>
    [Column("total")]
    public decimal Total { get; set; }

    /// <summary>RFC del proveedor (para DIOT). Null si no aplica.</summary>
    [Column("proveedor_rfc")]
    public string? ProveedorRfc { get; set; }

    /// <summary>Razon social / nombre del proveedor (para DIOT).</summary>
    [Column("proveedor_nombre")]
    public string? ProveedorNombre { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
}
