namespace HandySuites.Application.Subscriptions.DTOs;

public class SubscripcionDto
{
    public string Empresa { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public decimal Mrr { get; set; }
    public string Ciclo { get; set; } = string.Empty;
    public DateTime? ProximaRenovacion { get; set; }
    public string Metodo { get; set; } = "Sin datos";
    public string Estado { get; set; } = string.Empty;
}

public class SubscripcionesResumenDto
{
    public List<SubscripcionDto> Items { get; set; } = new();
    public decimal Mrr { get; set; }
    public decimal Arr { get; set; }
    public int Activas { get; set; }
    public int Renovaciones7d { get; set; }
}
