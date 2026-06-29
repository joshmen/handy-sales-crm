namespace HandySuites.Application.Analytics.DTOs;

public class AnaliticaDto
{
    public decimal Mrr { get; set; }
    public decimal Arr { get; set; }
    public decimal Churn { get; set; }
    public decimal Conversion { get; set; }
    public EmbudoDto Embudo { get; set; } = new();
    public List<ChurnPorPlanDto> ChurnPorPlan { get; set; } = new();
    public List<CohorteDto> Cohortes { get; set; } = new();
    public decimal? Ltv { get; set; }
    public decimal? Cac { get; set; }
    public MovimientoMrrDto MovimientoMrr { get; set; } = new();
}

public class EmbudoDto
{
    public int Pruebas { get; set; }
    public int Activaron { get; set; }
    public int Pago { get; set; }
    public int Retenidas { get; set; }
}

public class ChurnPorPlanDto
{
    public string Plan { get; set; } = string.Empty;
    public decimal Churn { get; set; }
}

public class CohorteDto
{
    public string Mes { get; set; } = string.Empty;
    public int TotalInicial { get; set; }
    public decimal PorcentajeActivo { get; set; }
}

public class MovimientoMrrDto
{
    public int Nuevas { get; set; }
    public decimal? Expansion { get; set; }
    public decimal? Contraccion { get; set; }
    public decimal Churn { get; set; }
    public decimal Final { get; set; }
}
