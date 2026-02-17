using System.ComponentModel.DataAnnotations;

namespace HandySales.Billing.Api.DTOs;

public class FacturaListDto
{
    public long Id { get; set; }
    public string? Uuid { get; set; }
    public string? Serie { get; set; }
    public int Folio { get; set; }
    public DateTime FechaEmision { get; set; }
    public string ReceptorRfc { get; set; } = default!;
    public string ReceptorNombre { get; set; } = default!;
    public decimal Total { get; set; }
    public string Estado { get; set; } = default!;
    public string TipoComprobante { get; set; } = default!;
}

public class FacturaDto
{
    public long Id { get; set; }
    public string? Uuid { get; set; }
    public string? Serie { get; set; }
    public int Folio { get; set; }
    public DateTime FechaEmision { get; set; }
    public DateTime? FechaTimbrado { get; set; }
    public string TipoComprobante { get; set; } = default!;
    public string? MetodoPago { get; set; }
    public string? FormaPago { get; set; }
    public string? UsoCfdi { get; set; }
    
    public string EmisorRfc { get; set; } = default!;
    public string EmisorNombre { get; set; } = default!;
    public string? EmisorRegimenFiscal { get; set; }
    
    public string ReceptorRfc { get; set; } = default!;
    public string ReceptorNombre { get; set; } = default!;
    public string? ReceptorUsoCfdi { get; set; }
    
    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal TotalImpuestosTrasladados { get; set; }
    public decimal TotalImpuestosRetenidos { get; set; }
    public decimal Total { get; set; }
    public string Moneda { get; set; } = "MXN";
    public decimal TipoCambio { get; set; } = 1;
    
    public string Estado { get; set; } = default!;
    
    public List<DetalleFacturaDto>? Detalles { get; set; }
}

public class DetalleFacturaDto
{
    public long Id { get; set; }
    public int NumeroLinea { get; set; }
    public string ClaveProdServ { get; set; } = default!;
    public string? NoIdentificacion { get; set; }
    public string Descripcion { get; set; } = default!;
    public string? Unidad { get; set; }
    public string? ClaveUnidad { get; set; }
    public decimal Cantidad { get; set; }
    public decimal ValorUnitario { get; set; }
    public decimal Importe { get; set; }
    public decimal Descuento { get; set; }
}

public class CreateFacturaRequest
{
    [Required]
    public string TipoComprobante { get; set; } = "I"; // Ingreso por defecto
    
    public string? Serie { get; set; }
    public DateTime? FechaEmision { get; set; }
    public string? MetodoPago { get; set; } = "PUE";
    public string? FormaPago { get; set; } = "01";
    public string? UsoCfdi { get; set; } = "G03";
    
    [Required]
    public string EmisorRfc { get; set; } = default!;
    
    [Required]
    public string EmisorNombre { get; set; } = default!;
    
    public string? EmisorRegimenFiscal { get; set; }
    
    [Required]
    public string ReceptorRfc { get; set; } = default!;
    
    [Required]
    public string ReceptorNombre { get; set; } = default!;
    
    public string? ReceptorUsoCfdi { get; set; }
    public string? ReceptorDomicilioFiscal { get; set; }
    
    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Subtotal { get; set; }
    
    public decimal Descuento { get; set; } = 0;
    public decimal TotalImpuestosTrasladados { get; set; } = 0;
    public decimal TotalImpuestosRetenidos { get; set; } = 0;
    
    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Total { get; set; }
    
    public string? Moneda { get; set; }
    public decimal? TipoCambio { get; set; }
    
    public int? ClienteId { get; set; }
    public int? VendedorId { get; set; }
    public long? PedidoId { get; set; }
    
    public string? Observaciones { get; set; }
    
    public List<CreateDetalleFacturaRequest>? Detalles { get; set; }
}

public class CreateDetalleFacturaRequest
{
    public int NumeroLinea { get; set; }
    
    [Required]
    public string ClaveProdServ { get; set; } = default!;
    
    public string? NoIdentificacion { get; set; }
    
    [Required]
    public string Descripcion { get; set; } = default!;
    
    public string? Unidad { get; set; }
    public string? ClaveUnidad { get; set; }
    
    [Required]
    [Range(0.000001, double.MaxValue)]
    public decimal Cantidad { get; set; }
    
    [Required]
    [Range(0.000001, double.MaxValue)]
    public decimal ValorUnitario { get; set; }
    
    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Importe { get; set; }
    
    public decimal Descuento { get; set; } = 0;
    
    public int? ProductoId { get; set; }
}

public class CancelarFacturaRequest
{
    [Required]
    public string MotivoCancelacion { get; set; } = default!;
    
    public string? FolioSustitucion { get; set; }
}

public class EnviarFacturaRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = default!;
    
    public string? Mensaje { get; set; }
    public bool IncluirPdf { get; set; } = true;
    public bool IncluirXml { get; set; } = true;
}