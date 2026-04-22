namespace HandySuites.Application.Clientes.DTOs;

public class ClienteCreateDto
{
    public int TenandId { get; set; }
    // NOTA: no usar `required` aquí porque hace fallar la deserialización JSON
    // ANTES de que FluentValidation corra. El validator ya aplica NotEmpty.
    public string Nombre { get; set; } = string.Empty;
    public string? RFC { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
    public string Direccion { get; set; } = string.Empty;
    public string NumeroExterior { get; set; } = string.Empty;
    public int IdZona { get; set; }
    public int CategoriaClienteId { get; set; }

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

    // Geolocalización
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }

    // Datos fiscales (opcionales, requeridos solo si Facturable=true)
    public string? RfcFiscal { get; set; }
    public bool Facturable { get; set; }
    public string? RazonSocial { get; set; }
    public string? CodigoPostalFiscal { get; set; }
    public string? RegimenFiscal { get; set; }
    public string? UsoCFDIPredeterminado { get; set; }
}
