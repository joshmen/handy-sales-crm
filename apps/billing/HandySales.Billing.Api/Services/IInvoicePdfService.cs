using HandySales.Billing.Api.Models;

namespace HandySales.Billing.Api.Services;

public interface IInvoicePdfService
{
    byte[] GeneratePdf(Factura factura, ConfiguracionFiscal? config, byte[]? logoBytes = null);
}
