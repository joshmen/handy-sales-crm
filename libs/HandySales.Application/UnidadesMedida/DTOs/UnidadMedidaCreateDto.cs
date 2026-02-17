namespace HandySales.Application.UnidadesMedida.DTOs;

public class UnidadMedidaCreateDto
{
    public int TenandId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Abreviatura { get; set; }
}
