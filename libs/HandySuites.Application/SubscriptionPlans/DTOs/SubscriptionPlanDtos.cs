namespace HandySuites.Application.SubscriptionPlans.DTOs;

public class SubscriptionPlanAdminDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
    public decimal PrecioMensual { get; set; }
    public decimal PrecioAnual { get; set; }
    public int MaxUsuarios { get; set; }
    public int MaxProductos { get; set; }
    public int MaxClientesPorMes { get; set; }
    public bool IncluyeReportes { get; set; }
    public bool IncluyeSoportePrioritario { get; set; }
    public List<string> Caracteristicas { get; set; } = new();
    public bool Activo { get; set; }
    public int Orden { get; set; }
    public int TenantCount { get; set; }
}

public record SubscriptionPlanCreateDto(
    string Nombre,
    string Codigo,
    decimal PrecioMensual,
    decimal PrecioAnual,
    int MaxUsuarios,
    int MaxProductos,
    int MaxClientesPorMes,
    bool IncluyeReportes,
    bool IncluyeSoportePrioritario,
    List<string> Caracteristicas,
    int Orden
);

public record SubscriptionPlanUpdateDto(
    string Nombre,
    decimal PrecioMensual,
    decimal PrecioAnual,
    int MaxUsuarios,
    int MaxProductos,
    int MaxClientesPorMes,
    bool IncluyeReportes,
    bool IncluyeSoportePrioritario,
    List<string> Caracteristicas,
    bool Activo,
    int Orden
);
