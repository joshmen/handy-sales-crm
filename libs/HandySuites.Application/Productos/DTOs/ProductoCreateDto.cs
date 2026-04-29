namespace HandySuites.Application.Productos.DTOs;

public class ProductoCreateDto
{
    // NOTA: sin `required` para que el deserializador no falle con cuerpo incompleto.
    // FluentValidation (ProductoCreateDtoValidator) se encarga de NotEmpty.
    public string Nombre { get; set; } = string.Empty;
    public string CodigoBarra { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public int FamiliaId { get; set; }
    public int CategoraId { get; set; }
    public int UnidadMedidaId { get; set; }
    public decimal PrecioBase { get; set; }
    /// <summary>
    /// Si true (default), PrecioBase es el precio final con IVA incluido. Si false,
    /// PrecioBase es base sin impuesto y el sistema agrega la tasa al cobrar.
    /// </summary>
    public bool? PrecioIncluyeIva { get; set; }
    /// <summary>FK al catálogo TasasImpuesto. Si null, usa la tasa default del tenant.</summary>
    public int? TasaImpuestoId { get; set; }
}
