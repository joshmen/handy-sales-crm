namespace HandySales.Application.ListasPrecios.DTOs;

public class ListaPrecioDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public DateTime CreadoEn { get; set; }
    public DateTime? ActualizadoEn { get; set; }
}

public record ListaPrecioCambiarActivoDto(bool Activo);
public record ListaPrecioBatchToggleRequest(List<int> Ids, bool Activo);
