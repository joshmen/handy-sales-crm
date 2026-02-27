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
}