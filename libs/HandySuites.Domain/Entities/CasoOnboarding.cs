using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

public enum EtapaOnboarding
{
    Solicitud = 0,
    DatosFiscales = 1,
    CsdFinkok = 2,
    PlanYPago = 3,
    Activa = 4
}

[Table("CasosOnboarding")]
public class CasoOnboarding : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("etapa")]
    public EtapaOnboarding Etapa { get; set; }

    [Column("responsable_usuario_id")]
    public int? ResponsableUsuarioId { get; set; }

    [Column("plan_tentativo")]
    public string? PlanTentativo { get; set; }

    [Column("entro_etapa_en")]
    public DateTime EntroEtapaEn { get; set; }

    [Column("notas")]
    public string? Notas { get; set; }
}
