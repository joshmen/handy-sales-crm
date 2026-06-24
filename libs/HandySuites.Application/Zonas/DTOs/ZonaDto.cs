public class ZonaDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool Activo { get; set; }
    public int ClientesActivos { get; set; }
    public double? CentroLatitud { get; set; }
    public double? CentroLongitud { get; set; }
    public double? RadioKm { get; set; }
    public int? VendedorId { get; set; }
    public string? VendedorNombre { get; set; }

    // Color hex del pin/zona (ej. "#0176D3").
    public string? Color { get; set; }

    // Frecuencia de visita pactada (enum como int: Semanal=0, Quincenal=1, Mensual=2).
    public int FrecuenciaVisita { get; set; }
    public string FrecuenciaNombre { get; set; } = string.Empty;

    // Stats agregadas (solo pobladas por ObtenerStatsPorTenantAsync; 0 en el listado liviano).
    public decimal VentasMes { get; set; }
    public decimal TicketPromedio { get; set; }
    public int CoberturaPct { get; set; }
}
