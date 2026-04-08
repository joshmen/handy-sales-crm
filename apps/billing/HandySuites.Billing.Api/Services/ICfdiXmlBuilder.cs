using HandySuites.Billing.Api.Models;

namespace HandySuites.Billing.Api.Services;

public interface ICfdiXmlBuilder
{
    /// <summary>
    /// Generates a CFDI 4.0 XML string from a Factura entity.
    /// The XML will have empty Sello, NoCertificado, and Certificado attributes
    /// that CfdiSigner must fill before sending to the PAC.
    /// </summary>
    string BuildXml(Factura factura, ConfiguracionFiscal config);
}
