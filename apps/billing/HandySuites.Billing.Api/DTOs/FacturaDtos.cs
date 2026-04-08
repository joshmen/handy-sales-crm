using System.ComponentModel.DataAnnotations;

namespace HandySuites.Billing.Api.DTOs;

public class FacturaListDto
{
    public long Id { get; set; }
    public string? Uuid { get; set; }
    public string? Serie { get; set; }
    public int Folio { get; set; }
    public DateTime FechaEmision { get; set; }
    public string EmisorRfc { get; set; } = default!;
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

/// <summary>
/// Request to create a factura from an existing order (pedido).
/// Only requires the order ID — all data is read from handy_erp automatically.
/// </summary>
public class CreateFacturaFromOrderRequest
{
    [Required]
    public int PedidoId { get; set; }

    public string? MetodoPago { get; set; }
    public string? FormaPago { get; set; }
    public string? UsoCfdi { get; set; }
    public string? Observaciones { get; set; }
    public bool TimbrarInmediatamente { get; set; } = false;

    /// <summary>
    /// Optional overrides for fiscal codes per line (from pre-factura review).
    /// Key = ProductoId, Value = overridden fiscal codes.
    /// </summary>
    public List<FiscalCodeOverride>? Overrides { get; set; }
}

public class FiscalCodeOverride
{
    public int ProductoId { get; set; }
    public string? ClaveProdServ { get; set; }
    public string? ClaveUnidad { get; set; }
}

// ─── Pre-Factura (Preview) DTOs ────────────────────────────────────────

public class PreFacturaDto
{
    public string EmisorRfc { get; set; } = default!;
    public string EmisorNombre { get; set; } = default!;
    public string? EmisorRegimenFiscal { get; set; }

    public string ReceptorRfc { get; set; } = default!;
    public string ReceptorNombre { get; set; } = default!;
    public string? ReceptorUsoCfdi { get; set; }
    public string? ReceptorDomicilioFiscal { get; set; }
    public string? ReceptorRegimenFiscal { get; set; }

    public string? MetodoPago { get; set; }
    public string? FormaPago { get; set; }

    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Impuestos { get; set; }
    public decimal Total { get; set; }

    public int PedidoId { get; set; }
    public string NumeroPedido { get; set; } = default!;

    public bool HasUnmappedProducts { get; set; }
    public int UnmappedCount { get; set; }

    public List<PreFacturaLineDto> Detalles { get; set; } = new();
}

public class PreFacturaLineDto
{
    public int NumeroLinea { get; set; }
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = default!;
    public string? CodigoBarra { get; set; }
    public string ClaveProdServ { get; set; } = default!;
    public string? ClaveUnidad { get; set; }
    public string? Unidad { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Total { get; set; }

    /// <summary>true if resolved from MapeoFiscalProducto table</summary>
    public bool IsMapped { get; set; }

    /// <summary>"mapping" | "producto" | "default" | "fallback"</summary>
    public string MappingSource { get; set; } = "fallback";
}

// ─── Public Invoice Portal DTO ────────────────────────────────────────

/// <summary>
/// Public-facing factura data — no auth required.
/// Only exposes non-sensitive fields for the invoice download portal.
/// </summary>
public class FacturaPublicDto
{
    public string? Uuid { get; set; }
    public string? Serie { get; set; }
    public int Folio { get; set; }
    public DateTime FechaEmision { get; set; }
    public DateTime? FechaTimbrado { get; set; }

    public string EmisorRfc { get; set; } = default!;
    public string EmisorNombre { get; set; } = default!;

    public string ReceptorRfc { get; set; } = default!;
    public string ReceptorNombre { get; set; } = default!;

    public decimal Total { get; set; }
    public string Moneda { get; set; } = "MXN";
    public string Estado { get; set; } = default!;

    /// <summary>Presigned URL for PDF download (null if not yet generated).</summary>
    public string? PdfUrl { get; set; }

    /// <summary>Presigned URL for XML download (null if not yet generated).</summary>
    public string? XmlUrl { get; set; }
}

/// <summary>
/// Request to generate a Factura Global (CFDI 4.0 InformacionGlobal).
/// Aggregates all delivered orders in a date range for público general (RFC XAXX010101000)
/// that have not yet been invoiced.
/// </summary>
public class FacturaGlobalRequest
{
    public int TenantId { get; set; }

    [Required]
    public DateTime FechaInicio { get; set; }

    [Required]
    public DateTime FechaFin { get; set; }

    /// <summary>
    /// SAT Periodicidad: 01=Diario, 02=Semanal, 03=Quincenal, 04=Mensual, 05=Bimestral
    /// </summary>
    [MaxLength(2)]
    public string Periodicidad { get; set; } = "04";
}