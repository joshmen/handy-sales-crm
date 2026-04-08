using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

public enum TipoCupon
{
    MesesGratis = 0,
    UpgradePlan = 1,
    DescuentoPorcentaje = 2,
    PlanGratisPermanente = 3
}

[Table("Cupones")]
public class Cupon : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("codigo")]
    public string Codigo { get; set; } = Guid.NewGuid().ToString("N").ToUpper();

    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [Column("tipo")]
    public TipoCupon Tipo { get; set; }

    [Column("meses_gratis")]
    public int? MesesGratis { get; set; }

    [Column("plan_objetivo")]
    public string? PlanObjetivo { get; set; }

    [Column("meses_upgrade")]
    public int? MesesUpgrade { get; set; }

    [Column("descuento_porcentaje")]
    public decimal? DescuentoPorcentaje { get; set; }

    [Column("max_usos")]
    public int MaxUsos { get; set; } = 1;

    [Column("usos_actuales")]
    public int UsosActuales { get; set; }

    [Column("fecha_expiracion")]
    public DateTime? FechaExpiracion { get; set; }

    public ICollection<CuponRedencion> Redenciones { get; set; } = new List<CuponRedencion>();
}
