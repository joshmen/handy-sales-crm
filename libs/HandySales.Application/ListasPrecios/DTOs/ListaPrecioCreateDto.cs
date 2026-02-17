namespace HandySales.Application.ListasPrecios.DTOs;

public class ListaPrecioCreateDto
{
    public int TenandId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
}
