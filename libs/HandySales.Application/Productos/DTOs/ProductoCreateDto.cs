namespace HandySales.Application.Productos.DTOs;

public class ProductoCreateDto
{
    public required string Nombre { get; set; }
    public required string CodigoBarra { get; set; }
    public required string Descripcion { get; set; }
    public int FamiliaId { get; set; }
    public int CategoraId { get; set; }
    public int UnidadMedidaId { get; set; }
    public decimal PrecioBase { get; set; }
}
