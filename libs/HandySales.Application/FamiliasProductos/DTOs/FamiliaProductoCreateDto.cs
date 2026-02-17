namespace HandySales.Application.FamiliasProductos.DTOs;

public class FamiliaProductoCreateDto
{
    public int TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
}
