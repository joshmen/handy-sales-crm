using HandySales.Domain.Common;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

[Table("MetasVendedor")]
public class MetaVendedor : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    /// <summary>ventas | visitas | pedidos</summary>
    [Column("tipo")]
    public string Tipo { get; set; } = "ventas";

    /// <summary>semanal | mensual</summary>
    [Column("periodo")]
    public string Periodo { get; set; } = "mensual";

    /// <summary>
    /// Target value: pesos for "ventas", count for "visitas"/"pedidos"
    /// </summary>
    [Column("monto", TypeName = "decimal(18,2)")]
    public decimal Monto { get; set; }

    [Column("fecha_inicio")]
    public DateTime FechaInicio { get; set; }

    [Column("fecha_fin")]
    public DateTime FechaFin { get; set; }

    [Column("auto_renovar")]
    public bool AutoRenovar { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
}
