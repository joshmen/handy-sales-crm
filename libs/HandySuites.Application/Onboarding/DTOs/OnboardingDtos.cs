using HandySuites.Domain.Entities;

namespace HandySuites.Application.Onboarding.DTOs;

public class CasoOnboardingDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Empresa { get; set; } = string.Empty;
    public EtapaOnboarding Etapa { get; set; }
    public int? ResponsableUsuarioId { get; set; }
    public string? PlanTentativo { get; set; }
    public DateTime EntroEtapaEn { get; set; }
    public int DiasEnEtapa { get; set; }
    public string? Notas { get; set; }
}

public class CasoOnboardingResumenDto
{
    public List<CasoOnboardingDto> Items { get; set; } = new();
    public int EnProceso { get; set; }
    public int EsperandoDocs { get; set; }
    public int Listas { get; set; }
    public int ActivadasMes { get; set; }
}

public record CrearCasoDto(
    int TenantId,
    string? PlanTentativo
);

public record ActualizarEtapaDto(
    EtapaOnboarding Etapa
);

public record AsignarResponsableDto(
    int ResponsableUsuarioId
);
