using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Xml;
using System.Xml.Xsl;
using HandySales.Billing.Api.Models;

namespace HandySales.Billing.Api.Services;

/// <summary>
/// Signs CFDI 4.0 XML using CSD certificates (Certificado de Sello Digital).
/// Flow: XML → XSLT → cadena original → SHA256+RSA → Sello (Base64)
/// </summary>
public class CfdiSigner : ICfdiSigner
{
    private readonly ILogger<CfdiSigner> _logger;
    private readonly ITenantEncryptionService _encryptionService;
    private static XslCompiledTransform? _cachedXslt;
    private static readonly object _xsltLock = new();

    public CfdiSigner(ILogger<CfdiSigner> logger, ITenantEncryptionService encryptionService)
    {
        _logger = logger;
        _encryptionService = encryptionService;
    }

    public async Task<string> SignXmlAsync(string unsignedXml, ConfiguracionFiscal config, string tenantId)
    {
        if (string.IsNullOrEmpty(config.CertificadoSat))
            throw new InvalidOperationException("No se encontró el certificado (.cer) en la configuración fiscal");
        if (string.IsNullOrEmpty(config.LlavePrivada))
            throw new InvalidOperationException("No se encontró la llave privada (.key) en la configuración fiscal");
        if (string.IsNullOrEmpty(config.PasswordCertificado))
            throw new InvalidOperationException("No se encontró el password del certificado en la configuración fiscal");

        byte[]? keyBytes = null;
        byte[]? pwdBytes = null;
        try
        {
            var cerBytes = Convert.FromBase64String(config.CertificadoSat);

            // Decrypt private key and password using tenant-aware encryption service
            keyBytes = await _encryptionService.DecryptAsync(tenantId,
                Convert.FromBase64String(config.LlavePrivada), config.EncryptedDek, config.EncryptionVersion);
            pwdBytes = await _encryptionService.DecryptAsync(tenantId,
                Convert.FromBase64String(config.PasswordCertificado), config.EncryptedDek, config.EncryptionVersion);
            var password = Encoding.UTF8.GetString(pwdBytes);

            // 2. Extract NoCertificado from .cer
            var noCertificado = GetNoCertificado(cerBytes);

            // 3. Get certificate Base64 for XML (raw DER bytes → Base64 string)
            var certificadoBase64 = Convert.ToBase64String(cerBytes);

            // 4. Insert NoCertificado and Certificado FIRST (before generating cadena original)
            //    SAT computes cadena original from XML that already has NoCertificado filled in.
            //    Sello is left empty — it gets filled after signing.
            var xmlWithCert = InsertSignatureIntoXml(unsignedXml, "", noCertificado, certificadoBase64);

            // 5. Generate cadena original via XSLT (from XML with NoCertificado populated)
            var cadenaOriginal = GenerateCadenaOriginal(xmlWithCert);
            _logger.LogDebug("Cadena original generated ({Length} chars)", cadenaOriginal.Length);

            // 6. Sign cadena original with private key (SHA-256 + RSA PKCS#1)
            var sello = SignCadenaOriginal(cadenaOriginal, keyBytes, password);
            _logger.LogDebug("Sello digital generado ({Length} chars)", sello.Length);

            // 7. Insert Sello into the final XML
            var signedXml = InsertSignatureIntoXml(xmlWithCert, sello, noCertificado, certificadoBase64);

            return signedXml;
        }
        finally
        {
            if (keyBytes != null) Array.Clear(keyBytes);
            if (pwdBytes != null) Array.Clear(pwdBytes);
        }
    }

    public string GetNoCertificado(byte[] cerBytes)
    {
        using var cert = X509CertificateLoader.LoadCertificate(cerBytes);
        // NoCertificado: 20-digit serial number from the certificate
        // SAT certificates have hex serial numbers that must be converted
        var serial = cert.SerialNumber;

        // SAT serial numbers are stored as hex pairs — extract ASCII characters
        // Example: "3330303031303030303030343132333435363738" → "30001000000412345678"
        if (serial.Length == 40)
        {
            var sb = new StringBuilder(20);
            for (int i = 0; i < serial.Length; i += 2)
            {
                var hexPair = serial.Substring(i, 2);
                var charValue = Convert.ToInt32(hexPair, 16);
                sb.Append((char)charValue);
            }
            return sb.ToString();
        }

        return serial;
    }

    private string GenerateCadenaOriginal(string xml)
    {
        return GenerateCadenaOriginalDirect(xml);
    }

    private string SignCadenaOriginal(string cadenaOriginal, byte[] keyDerBytes, string password)
    {
        // The .key file is a PKCS#8 encrypted private key (DER format)
        using var rsa = RSA.Create();

        try
        {
            // Try decrypting as PKCS#8 encrypted key
            rsa.ImportEncryptedPkcs8PrivateKey(
                Encoding.UTF8.GetBytes(password),
                keyDerBytes,
                out _);
        }
        catch (CryptographicException)
        {
            // Fallback: try as unencrypted PKCS#8
            rsa.ImportPkcs8PrivateKey(keyDerBytes, out _);
        }

        var cadenaBytes = Encoding.UTF8.GetBytes(cadenaOriginal);
        var signatureBytes = rsa.SignData(cadenaBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

        return Convert.ToBase64String(signatureBytes);
    }

    private static string InsertSignatureIntoXml(string xml, string sello, string noCertificado, string certificado)
    {
        var doc = new XmlDocument();
        doc.PreserveWhitespace = true;
        doc.LoadXml(xml);

        var nsmgr = new XmlNamespaceManager(doc.NameTable);
        nsmgr.AddNamespace("cfdi", "http://www.sat.gob.mx/cfd/4");

        var comprobante = doc.SelectSingleNode("/cfdi:Comprobante", nsmgr);
        if (comprobante?.Attributes != null)
        {
            comprobante.Attributes["Sello"]!.Value = sello;
            comprobante.Attributes["NoCertificado"]!.Value = noCertificado;
            comprobante.Attributes["Certificado"]!.Value = certificado;
        }

        return doc.OuterXml;
    }

    private static XslCompiledTransform GetCachedXslt()
    {
        if (_cachedXslt != null) return _cachedXslt;

        lock (_xsltLock)
        {
            if (_cachedXslt != null) return _cachedXslt;

            var xslt = new XslCompiledTransform();

            // The XSLT is embedded as a string constant to avoid file-system dependencies
            // Source: SAT cadenaoriginal_4_0.xslt (official transform for CFDI 4.0)
            using var sr = new StringReader(CadenaOriginalXslt);
            using var xr = XmlReader.Create(sr);
            xslt.Load(xr);

            _cachedXslt = xslt;
            return xslt;
        }
    }

    /// <summary>
    /// Generates cadena original for CFDI 4.0 directly (no XSLT — more reliable).
    /// Format: ||value1|value2|...|valueN||
    /// Only non-empty attribute values are included, separated by pipes.
    /// </summary>
    private static string CadenaOriginalXslt => ""; // Unused — kept for interface compat

    private string GenerateCadenaOriginalDirect(string xml)
    {
        var doc = new XmlDocument();
        doc.LoadXml(xml);

        var nsmgr = new XmlNamespaceManager(doc.NameTable);
        nsmgr.AddNamespace("cfdi", "http://www.sat.gob.mx/cfd/4");

        var parts = new List<string>();

        // Comprobante attributes (order matters — follows Anexo 20)
        var comp = doc.SelectSingleNode("/cfdi:Comprobante", nsmgr);
        if (comp == null) return "||||";

        AddAttr(parts, comp, "Version");
        AddAttr(parts, comp, "Serie");
        AddAttr(parts, comp, "Folio");
        AddAttr(parts, comp, "Fecha");
        AddAttr(parts, comp, "FormaPago");
        AddAttr(parts, comp, "NoCertificado");
        AddAttr(parts, comp, "CondicionesDePago");
        AddAttr(parts, comp, "SubTotal");
        AddAttr(parts, comp, "Descuento");
        AddAttr(parts, comp, "Moneda");
        AddAttr(parts, comp, "TipoCambio");
        AddAttr(parts, comp, "Total");
        AddAttr(parts, comp, "TipoDeComprobante");
        AddAttr(parts, comp, "Exportacion");
        AddAttr(parts, comp, "MetodoPago");
        AddAttr(parts, comp, "LugarExpedicion");
        AddAttr(parts, comp, "Confirmacion");

        // Emisor
        var emisor = comp.SelectSingleNode("cfdi:Emisor", nsmgr);
        if (emisor != null)
        {
            AddAttr(parts, emisor, "Rfc");
            AddAttr(parts, emisor, "Nombre");
            AddAttr(parts, emisor, "RegimenFiscal");
            AddAttr(parts, emisor, "FacAtrAdquirente");
        }

        // Receptor
        var receptor = comp.SelectSingleNode("cfdi:Receptor", nsmgr);
        if (receptor != null)
        {
            AddAttr(parts, receptor, "Rfc");
            AddAttr(parts, receptor, "Nombre");
            AddAttr(parts, receptor, "DomicilioFiscalReceptor");
            AddAttr(parts, receptor, "ResidenciaFiscal");
            AddAttr(parts, receptor, "NumRegIdTrib");
            AddAttr(parts, receptor, "RegimenFiscalReceptor");
            AddAttr(parts, receptor, "UsoCFDI");
        }

        // Conceptos
        var conceptos = comp.SelectNodes("cfdi:Conceptos/cfdi:Concepto", nsmgr);
        if (conceptos != null)
        {
            foreach (XmlNode concepto in conceptos)
            {
                AddAttr(parts, concepto, "ClaveProdServ");
                AddAttr(parts, concepto, "NoIdentificacion");
                AddAttr(parts, concepto, "Cantidad");
                AddAttr(parts, concepto, "ClaveUnidad");
                AddAttr(parts, concepto, "Unidad");
                AddAttr(parts, concepto, "Descripcion");
                AddAttr(parts, concepto, "ValorUnitario");
                AddAttr(parts, concepto, "Importe");
                AddAttr(parts, concepto, "Descuento");
                AddAttr(parts, concepto, "ObjetoImp");

                // Per-concept traslados
                var traslados = concepto.SelectNodes("cfdi:Impuestos/cfdi:Traslados/cfdi:Traslado", nsmgr);
                if (traslados != null)
                {
                    foreach (XmlNode t in traslados)
                    {
                        AddAttr(parts, t, "Base");
                        AddAttr(parts, t, "Impuesto");
                        AddAttr(parts, t, "TipoFactor");
                        AddAttr(parts, t, "TasaOCuota");
                        AddAttr(parts, t, "Importe");
                    }
                }

                // Per-concept retenciones
                var retenciones = concepto.SelectNodes("cfdi:Impuestos/cfdi:Retenciones/cfdi:Retencion", nsmgr);
                if (retenciones != null)
                {
                    foreach (XmlNode r in retenciones)
                    {
                        AddAttr(parts, r, "Base");
                        AddAttr(parts, r, "Impuesto");
                        AddAttr(parts, r, "TipoFactor");
                        AddAttr(parts, r, "TasaOCuota");
                        AddAttr(parts, r, "Importe");
                    }
                }
            }
        }

        // Impuestos totales (Comprobante level) — ORDER MUST MATCH SAT XSLT:
        // 1. Retenciones/Retencion, 2. TotalImpuestosRetenidos,
        // 3. Traslados/Traslado, 4. TotalImpuestosTrasladados
        var impuestos = comp.SelectSingleNode("cfdi:Impuestos", nsmgr);
        if (impuestos != null)
        {
            // Retenciones totales FIRST
            var rets = impuestos.SelectNodes("cfdi:Retenciones/cfdi:Retencion", nsmgr);
            if (rets != null)
            {
                foreach (XmlNode r in rets)
                {
                    AddAttr(parts, r, "Impuesto");
                    AddAttr(parts, r, "Importe");
                }
            }

            AddAttr(parts, impuestos, "TotalImpuestosRetenidos");

            // Traslados totales
            var tras = impuestos.SelectNodes("cfdi:Traslados/cfdi:Traslado", nsmgr);
            if (tras != null)
            {
                foreach (XmlNode t in tras)
                {
                    AddAttr(parts, t, "Base");
                    AddAttr(parts, t, "Impuesto");
                    AddAttr(parts, t, "TipoFactor");
                    AddAttr(parts, t, "TasaOCuota");
                    AddAttr(parts, t, "Importe");
                }
            }

            AddAttr(parts, impuestos, "TotalImpuestosTrasladados");
        }

        return "||" + string.Join("|", parts) + "||";
    }

    private static void AddAttr(List<string> parts, XmlNode node, string attrName)
    {
        var val = node.Attributes?[attrName]?.Value;
        if (!string.IsNullOrEmpty(val))
            parts.Add(val.Trim());
    }
}
