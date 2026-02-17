namespace HandySales.Application.Clientes.DTOs;

public class ClienteDto
{
    public int Id { get; set; }
    public required string Nombre { get; set; }
    public required string RFC { get; set; }
    public required string Correo { get; set; }
    public required string Telefono { get; set; }
    public required string Direccion { get; set; }
    public int IdZona { get; set; }
    public int CategoriaClienteId { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public bool Activo { get; set; }
}

public class ClienteListaDto
{
    public int Id { get; set; }
    public required string Nombre { get; set; }
    public required string RFC { get; set; }
    public required string Correo { get; set; }
    public required string Telefono { get; set; }
    public string? ZonaNombre { get; set; }
    public string? CategoriaNombre { get; set; }
    public bool Activo { get; set; }
}

public class ClienteFiltroDto
{
    public int? ZonaId { get; set; }
    public int? CategoriaClienteId { get; set; }
    public string? Busqueda { get; set; }
    public bool? Activo { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 20;
}

public class ClientePaginatedResult
{
    public List<ClienteListaDto> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public int TotalPaginas => (int)Math.Ceiling((double)TotalItems / TamanoPagina);
}
