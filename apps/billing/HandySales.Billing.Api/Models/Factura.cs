using System.ComponentModel.DataAnnotations;

namespace HandySales.Billing.Api.Models;

public class Factura
{
    [Key]
    public long Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string TenantId { get; set; } = default!;
    
    [MaxLength(50)]
    public string? Uuid { get; set; }
    
    [MaxLength(10)]
    public string? Serie { get; set; }
    
    public int Folio { get; set; }
    
    public DateTime FechaEmision { get; set; }
    
    public DateTime? FechaTimbrado { get; set; }
    
    [Required]
    [MaxLength(10)]
    public string TipoComprobante { get; set; } = default!;
    
    [MaxLength(10)]
    public string? MetodoPago { get; set; }
    
    [MaxLength(10)]
    public string? FormaPago { get; set; }
    
    [MaxLength(10)]
    public string? UsoCfdi { get; set; }
    
    // Datos del emisor
    [Required]
    [MaxLength(20)]
    public string EmisorRfc { get; set; } = default!;
    
    [Required]
    [MaxLength(200)]
    public string EmisorNombre { get; set; } = default!;
    
    [MaxLength(100)]
    public string? EmisorRegimenFiscal { get; set; }
    
    // Datos del receptor
    [Required]
    [MaxLength(20)]
    public string ReceptorRfc { get; set; } = default!;
    
    [Required]
    [MaxLength(200)]
    public string ReceptorNombre { get; set; } = default!;
    
    [MaxLength(10)]
    public string? ReceptorUsoCfdi { get; set; }
    
    [MaxLength(10)]
    public string? ReceptorDomicilioFiscal { get; set; }
    
    [MaxLength(100)]
    public string? ReceptorRegimenFiscal { get; set; }
    
    // Montos
    public decimal Subtotal { get; set; }
    
    public decimal Descuento { get; set; } = 0;
    
    public decimal TotalImpuestosTrasladados { get; set; } = 0;
    
    public decimal TotalImpuestosRetenidos { get; set; } = 0;
    
    public decimal Total { get; set; }
    
    [MaxLength(10)]
    public string Moneda { get; set; } = "MXN";
    
    public decimal TipoCambio { get; set; } = 1;
    
    // Datos del timbrado
    public string? SelloCfdi { get; set; }
    
    public string? SelloSat { get; set; }
    
    public string? CadenaOriginalSat { get; set; }
    
    [MaxLength(50)]
    public string? CertificadoSat { get; set; }
    
    public DateTime? FechaCertificacion { get; set; }
    
    // Estado y referencias
    [MaxLength(50)]
    public string Estado { get; set; } = "PENDIENTE";
    
    [MaxLength(50)]
    public string? EstadoCancelacion { get; set; }
    
    public DateTime? FechaCancelacion { get; set; }
    
    [MaxLength(500)]
    public string? MotivoCancelacion { get; set; }
    
    [MaxLength(50)]
    public string? FolioSustitucion { get; set; }
    
    // Referencias al sistema principal
    public int? ClienteId { get; set; }
    
    public int? VendedorId { get; set; }
    
    public long? PedidoId { get; set; }
    
    // Auditoría
    public string? Observaciones { get; set; }
    
    public string? XmlContent { get; set; }
    
    [MaxLength(500)]
    public string? PdfUrl { get; set; }
    
    public int? CreatedBy { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navegación
    public virtual ICollection<DetalleFactura> Detalles { get; set; } = new List<DetalleFactura>();
    public virtual ICollection<ImpuestoFactura> Impuestos { get; set; } = new List<ImpuestoFactura>();
    public virtual ICollection<ComplementoPago> ComplementosPago { get; set; } = new List<ComplementoPago>();
    public virtual ICollection<DocumentoRelacionado> DocumentosRelacionados { get; set; } = new List<DocumentoRelacionado>();
}

public class DetalleFactura
{
    [Key]
    public long Id { get; set; }
    
    public long FacturaId { get; set; }
    
    public int NumeroLinea { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string ClaveProdServ { get; set; } = default!;
    
    [MaxLength(100)]
    public string? NoIdentificacion { get; set; }
    
    [Required]
    public string Descripcion { get; set; } = default!;
    
    [MaxLength(50)]
    public string? Unidad { get; set; }
    
    [MaxLength(10)]
    public string? ClaveUnidad { get; set; }
    
    public decimal Cantidad { get; set; }
    
    public decimal ValorUnitario { get; set; }
    
    public decimal Importe { get; set; }
    
    public decimal Descuento { get; set; } = 0;
    
    [MaxLength(10)]
    public string ObjetoImp { get; set; } = "02";
    
    public int? ProductoId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navegación
    public virtual Factura Factura { get; set; } = default!;
    public virtual ICollection<ImpuestoFactura> Impuestos { get; set; } = new List<ImpuestoFactura>();
}

public class ImpuestoFactura
{
    [Key]
    public long Id { get; set; }
    
    public long FacturaId { get; set; }
    
    public long? DetalleFacturaId { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string Tipo { get; set; } = default!; // TRASLADO, RETENCION
    
    [Required]
    [MaxLength(10)]
    public string Impuesto { get; set; } = default!; // 001=ISR, 002=IVA, 003=IEPS
    
    [Required]
    [MaxLength(20)]
    public string TipoFactor { get; set; } = default!; // Tasa, Cuota, Exento
    
    public decimal? TasaOCuota { get; set; }
    
    public decimal Base { get; set; }
    
    public decimal? Importe { get; set; }
    
    // Navegación
    public virtual Factura Factura { get; set; } = default!;
    public virtual DetalleFactura? DetalleFactura { get; set; }
}

public class ComplementoPago
{
    [Key]
    public long Id { get; set; }
    
    public long FacturaId { get; set; }
    
    public DateTime FechaPago { get; set; }
    
    [Required]
    [MaxLength(10)]
    public string FormaPago { get; set; } = default!;
    
    [MaxLength(10)]
    public string Moneda { get; set; } = "MXN";
    
    public decimal TipoCambio { get; set; } = 1;
    
    public decimal Monto { get; set; }
    
    [MaxLength(100)]
    public string? NumOperacion { get; set; }
    
    [MaxLength(20)]
    public string? RfcEmisorCuentaOrd { get; set; }
    
    [MaxLength(50)]
    public string? CuentaOrdenante { get; set; }
    
    [MaxLength(20)]
    public string? RfcEmisorCuentaBen { get; set; }
    
    [MaxLength(50)]
    public string? CuentaBeneficiario { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navegación
    public virtual Factura Factura { get; set; } = default!;
}

public class DocumentoRelacionado
{
    [Key]
    public long Id { get; set; }
    
    public long FacturaId { get; set; }
    
    public long? FacturaRelacionadaId { get; set; }
    
    [MaxLength(50)]
    public string? UuidRelacionado { get; set; }
    
    [Required]
    [MaxLength(10)]
    public string TipoRelacion { get; set; } = default!;
    
    // Navegación
    public virtual Factura Factura { get; set; } = default!;
    public virtual Factura? FacturaRelacionada { get; set; }
}