using HandySales.Billing.Api.Models;

namespace HandySales.Billing.Api.Services;

public interface ICfdiSigner
{
    /// <summary>
    /// Signs a CFDI XML by:
    /// 1. Generating the cadena original via XSLT transform
    /// 2. Signing with SHA-256 + RSA using the CSD private key
    /// 3. Inserting Sello, NoCertificado, and Certificado into the XML
    /// Returns the signed XML ready to send to the PAC.
    /// </summary>
    string SignXml(string unsignedXml, ConfiguracionFiscal config);

    /// <summary>
    /// Extracts the NoCertificado (20-digit certificate serial number) from a .cer file.
    /// </summary>
    string GetNoCertificado(byte[] cerBytes);
}
