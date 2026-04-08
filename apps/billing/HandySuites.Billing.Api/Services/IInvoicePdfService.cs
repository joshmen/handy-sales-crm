using HandySuites.Billing.Api.Models;

namespace HandySuites.Billing.Api.Services;

public interface IInvoicePdfService
{
    byte[] GeneratePdf(Factura factura, ConfiguracionFiscal? config, byte[]? logoBytes = null);
}
