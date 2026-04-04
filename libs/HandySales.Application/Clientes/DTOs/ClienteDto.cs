namespace HandySales.Application.Clientes.DTOs;

public class ClienteDto
{
    public int Id { get; set; }
    public required string Nombre { get; set; }
    public required string RFC { get; set; }
    public required string Correo { get; set; }
    public required string Telefono { get; set; }
    public required string Direccion { get; set; }
    public string? NumeroExterior { get; set; }
    public int IdZona { get; set; }
    public int CategoriaClienteId { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public int? VendedorId { get; set; }
    public bool Activo { get; set; }

    // Campos adicionales
    public bool EsProspecto { get; set; }
    public string? Comentarios { get; set; }
    public int? ListaPreciosId { get; set; }
    public decimal Descuento { get; set; }
    public decimal Saldo { get; set; }
    public decimal LimiteCredito { get; set; }
    public decimal VentaMinimaEfectiva { get; set; }
    public string TiposPagoPermitidos { get; set; } = "efectivo";
    public string TipoPagoPredeterminado { get; set; } = "efectivo";
    public int DiasCredito { get; set; }

    // Dirección desglosada
    public string? Ciudad { get; set; }
    public string? Colonia { get; set; }
    public string? CodigoPostal { get; set; }

    // Contacto
    public string? Encargado { get; set; }

    // Datos fiscales
    public string? RfcFiscal { get; set; }
    public bool Facturable { get; set; }
    public string? RazonSocial { get; set; }
    public string? CodigoPostalFiscal { get; set; }
    public string? RegimenFiscal { get; set; }
    public string? UsoCFDIPredeterminado { get; set; }
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
    public int? VendedorId { get; set; }
    public string? VendedorNombre { get; set; }
    public bool Activo { get; set; }
    public bool EsProspecto { get; set; }
}

public class ClienteFiltroDto
{
    public int? ZonaId { get; set; }
    public int? CategoriaClienteId { get; set; }
    public int? VendedorId { get; set; }
    public string? Busqueda { get; set; }
    public bool? Activo { get; set; }
    public bool? EsProspecto { get; set; }
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
