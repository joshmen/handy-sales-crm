namespace HandySuites.Billing.Api.Services;

/// <summary>
/// Reads order data from handy_erp database (cross-DB via Npgsql).
/// Used to populate factura creation from an existing order.
/// </summary>
public interface IOrderReaderService
{
    Task<OrderForInvoice?> GetOrderForInvoiceAsync(string tenantId, int pedidoId);

    /// <summary>
    /// Returns all delivered orders (estado=5) in the date range for público general
    /// (client RFC = XAXX010101000) that have not yet been invoiced.
    /// The excludedPedidoIds parameter lists pedido IDs that already have a non-cancelled factura.
    /// </summary>
    Task<List<OrderForInvoice>> GetOrdersForFacturaGlobalAsync(
        string tenantId, DateTime fechaInicio, DateTime fechaFin, List<long> excludedPedidoIds);
}

/// <summary>
/// All order data needed to create a factura, read from handy_erp.
/// </summary>
public class OrderForInvoice
{
    public int PedidoId { get; set; }
    public string NumeroPedido { get; set; } = "";
    public int Estado { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Impuestos { get; set; }
    public decimal Total { get; set; }
    public int VendedorId { get; set; }

    // Cliente (receptor)
    public int ClienteId { get; set; }
    public string ClienteNombre { get; set; } = "";
    public string ClienteRfc { get; set; } = "";
    public string? ClienteRazonSocial { get; set; }
    public string? ClienteRegimenFiscal { get; set; }
    public string? ClienteCodigoPostalFiscal { get; set; }
    public string? ClienteUsoCfdi { get; set; }
    public string? ClienteCorreo { get; set; }
    public bool ClienteFacturable { get; set; }

    public List<OrderLineForInvoice> Detalles { get; set; } = new();
}

public class OrderLineForInvoice
{
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = "";
    public string? ProductoClaveSat { get; set; }
    public string? ProductoCodigoBarra { get; set; }
    public string UnidadNombre { get; set; } = "";
    public string? UnidadAbreviatura { get; set; }
    public string? UnidadClaveSat { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }
    /// <summary>
    /// BOGO: cantidad regalada de esta línea. Cuando &gt; 0, `Descuento` ya
    /// incluye el monto equivalente (cantidadBonificada * precioUnitario)
    /// para que el CFDI invariant `Importe - Descuento >= 0` se cumpla.
    /// El builder XML usa este campo para anotar la línea con "(incluye N regalo)".
    /// </summary>
    public decimal CantidadBonificada { get; set; }
    public string? Notas { get; set; }
}
