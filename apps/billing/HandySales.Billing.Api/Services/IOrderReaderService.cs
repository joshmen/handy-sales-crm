namespace HandySales.Billing.Api.Services;

/// <summary>
/// Reads order data from handy_erp database (cross-DB via Npgsql).
/// Used to populate factura creation from an existing order.
/// </summary>
public interface IOrderReaderService
{
    Task<OrderForInvoice?> GetOrderForInvoiceAsync(string tenantId, int pedidoId);
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
}
