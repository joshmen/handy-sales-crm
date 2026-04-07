using System.Net.Http.Headers;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using HandySales.Billing.Api.Models;

namespace HandySales.Billing.Api.Services;

/// <summary>
/// Finkok PAC integration via SOAP web services.
/// Sandbox: demo-facturacion.finkok.com
/// Production: facturacion.finkok.com
/// </summary>
public class FinkokPacService : IPacService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<FinkokPacService> _logger;

    private const string SandboxStampUrl = "https://demo-facturacion.finkok.com/servicios/soap/stamp";
    private const string ProductionStampUrl = "https://facturacion.finkok.com/servicios/soap/stamp";
    private const string SandboxCancelUrl = "https://demo-facturacion.finkok.com/servicios/soap/cancel";
    private const string ProductionCancelUrl = "https://facturacion.finkok.com/servicios/soap/cancel";

    public FinkokPacService(HttpClient httpClient, ILogger<FinkokPacService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<TimbradoResult> TimbrarAsync(string xmlPreFirmado, ConfiguracionFiscal config)
    {
        var url = GetStampUrl(config.PacAmbiente);

        var soapBody = BuildStampSoapEnvelope(xmlPreFirmado, config.PacUsuario!, config.PacPassword!);

        try
        {
            var response = await SendSoapRequest(url, soapBody, "stamp");
            return ParseTimbradoResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al timbrar con Finkok ({Ambiente})", config.PacAmbiente);
            return new TimbradoResult
            {
                Success = false,
                ErrorCode = "PAC_ERROR",
                ErrorMessage = SanitizeErrorMessage(ex.Message, config.PacUsuario, config.PacPassword)
            };
        }
    }

    public async Task<CancelacionResult> CancelarAsync(string uuid, string rfcEmisor, string motivo,
        string? folioSustitucion, ConfiguracionFiscal config)
    {
        var url = GetCancelUrl(config.PacAmbiente);

        var soapBody = BuildCancelSoapEnvelope(
            uuid, rfcEmisor, motivo, folioSustitucion,
            config.PacUsuario!, config.PacPassword!);

        try
        {
            var response = await SendSoapRequest(url, soapBody, "sign_cancel");
            return ParseCancelacionResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al cancelar UUID {Uuid} con Finkok", uuid);
            return new CancelacionResult
            {
                Success = false,
                ErrorCode = "PAC_ERROR",
                ErrorMessage = SanitizeErrorMessage(ex.Message, config.PacUsuario, config.PacPassword)
            };
        }
    }

    public async Task<ConsultaResult> ConsultarEstatusAsync(string uuid, string rfcEmisor, ConfiguracionFiscal config)
    {
        var url = GetCancelUrl(config.PacAmbiente);

        var soapBody = BuildQueryStatusSoapEnvelope(uuid, rfcEmisor, config.PacUsuario!, config.PacPassword!);

        try
        {
            var response = await SendSoapRequest(url, soapBody, "query_pending");
            return ParseConsultaResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al consultar estatus de UUID {Uuid}", uuid);
            return new ConsultaResult
            {
                Success = false,
                ErrorMessage = SanitizeErrorMessage(ex.Message, config.PacUsuario, config.PacPassword)
            };
        }
    }

    private async Task<string> SendSoapRequest(string url, string soapEnvelope, string soapAction)
    {
        var content = new StringContent(soapEnvelope, Encoding.UTF8, "text/xml");
        content.Headers.ContentType = new MediaTypeHeaderValue("text/xml") { CharSet = "utf-8" };

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = content;
        request.Headers.Add("SOAPAction", soapAction);

        _logger.LogDebug("Finkok SOAP request to {Url} (action: {Action})", url, soapAction);

        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Finkok returned HTTP {StatusCode} ({Length} chars)", response.StatusCode, responseBody?.Length ?? 0);
            _logger.LogDebug("Finkok error response body: {Body}", responseBody);
        }

        return responseBody;
    }

    private TimbradoResult ParseTimbradoResponse(string soapResponse)
    {
        try
        {
            var doc = XDocument.Parse(soapResponse);
            var ns = doc.Root?.GetDefaultNamespace();

            // Finkok returns the timbrado result in the stampResult element
            // The XML with TFD is inside the xml element
            var xmlTimbrado = ExtractElementValue(doc, "xml");
            var uuid = ExtractElementValue(doc, "UUID");
            var fechaTimbrado = ExtractElementValue(doc, "Fecha");
            var satSeal = ExtractElementValue(doc, "SatSeal");
            var noCertificadoSat = ExtractElementValue(doc, "NoCertificadoSAT");
            var incidencias = ExtractElementValue(doc, "CodigoError");
            var mensajeIncidencia = ExtractElementValue(doc, "MensajeIncidencia");

            // Check for error codes
            if (!string.IsNullOrEmpty(incidencias) && incidencias != "0")
            {
                _logger.LogWarning("Finkok timbrado error: {Code} - {Message}", incidencias, mensajeIncidencia);
                return new TimbradoResult
                {
                    Success = false,
                    ErrorCode = incidencias,
                    ErrorMessage = mensajeIncidencia ?? $"Error de timbrado (código {incidencias})"
                };
            }

            if (string.IsNullOrEmpty(uuid))
            {
                // Try alternative parsing — Finkok response structure varies
                uuid = ExtractFromTfd(xmlTimbrado);
            }

            if (string.IsNullOrEmpty(uuid))
            {
                return new TimbradoResult
                {
                    Success = false,
                    ErrorCode = "NO_UUID",
                    ErrorMessage = "No se recibió UUID del PAC. Respuesta inesperada."
                };
            }

            _logger.LogInformation("Timbrado exitoso: UUID={Uuid}", uuid);

            return new TimbradoResult
            {
                Success = true,
                Uuid = uuid,
                XmlTimbrado = xmlTimbrado,
                SelloSat = satSeal,
                NoCertificadoSat = noCertificadoSat,
                FechaTimbrado = DateTime.TryParse(fechaTimbrado, out var ft) ? ft : DateTime.UtcNow,
                CadenaOriginalSat = BuildCadenaOriginalSat(uuid, fechaTimbrado, satSeal, noCertificadoSat)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing Finkok timbrado response");
            return new TimbradoResult
            {
                Success = false,
                ErrorCode = "PARSE_ERROR",
                ErrorMessage = $"Error al procesar respuesta del PAC: {ex.Message}"
            };
        }
    }

    private CancelacionResult ParseCancelacionResponse(string soapResponse)
    {
        try
        {
            // Finkok sandbox sometimes returns HTML instead of SOAP XML
            if (soapResponse.TrimStart().StartsWith("<html", StringComparison.OrdinalIgnoreCase)
                || soapResponse.TrimStart().StartsWith("<!DOCTYPE", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Finkok cancelación returned HTML instead of SOAP — sandbox may not support cancellation");
                return new CancelacionResult
                {
                    Success = false,
                    ErrorCode = "PAC_HTML",
                    ErrorMessage = "El servicio de cancelación del PAC no está disponible en este momento. Intente más tarde o verifique la configuración del ambiente (sandbox/producción)."
                };
            }

            var doc = XDocument.Parse(soapResponse);

            var estatusUuid = ExtractElementValue(doc, "EstatusUUID");
            var estatusCancelacion = ExtractElementValue(doc, "EstatusCancelacion")
                ?? ExtractElementValue(doc, "Estatus");
            var acuse = ExtractElementValue(doc, "Acuse");
            var codigoError = ExtractElementValue(doc, "CodigoError")
                ?? ExtractElementValue(doc, "CodEstatus");

            // Status codes: 201=success, 202=already cancelled, 205=not found, etc.
            var isCancelled = estatusUuid == "201" || estatusUuid == "202"
                || estatusCancelacion?.Contains("Cancelado") == true;
            var isPending = estatusCancelacion?.Contains("Proceso") == true
                || estatusCancelacion?.Contains("Plazo") == true;

            _logger.LogInformation("Finkok cancelación: EstatusUUID={EstatusUUID}, EstatusCancelacion={EstatusCancelacion}, CodigoError={CodigoError}",
                estatusUuid, estatusCancelacion, codigoError);

            string mappedStatus;
            if (isCancelled) mappedStatus = "CANCELADA";
            else if (isPending) mappedStatus = "EN_PROCESO";
            else mappedStatus = "RECHAZADA";

            return new CancelacionResult
            {
                Success = isCancelled || isPending,
                EstadoCancelacion = mappedStatus,
                AcuseXml = acuse,
                ErrorCode = codigoError,
                ErrorMessage = !isCancelled && !isPending ? estatusCancelacion : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing Finkok cancelación response");
            return new CancelacionResult
            {
                Success = false,
                ErrorCode = "PARSE_ERROR",
                ErrorMessage = $"Error al procesar respuesta de cancelación: {ex.Message}"
            };
        }
    }

    private ConsultaResult ParseConsultaResponse(string soapResponse)
    {
        try
        {
            var doc = XDocument.Parse(soapResponse);

            return new ConsultaResult
            {
                Success = true,
                Estado = ExtractElementValue(doc, "Estado") ?? ExtractElementValue(doc, "CodigoEstatus"),
                EsCancelable = ExtractElementValue(doc, "EsCancelable"),
                EstatusCancelacion = ExtractElementValue(doc, "EstatusCancelacion")
            };
        }
        catch (Exception ex)
        {
            return new ConsultaResult
            {
                Success = false,
                ErrorMessage = $"Error al consultar estatus: {ex.Message}"
            };
        }
    }

    // --- SOAP envelope builders ---

    private static string BuildStampSoapEnvelope(string xml, string usuario, string password)
    {
        // Finkok stamp expects the XML as a Base64-encoded string inside the SOAP body
        var xmlBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(xml));

        return $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/""
                  xmlns:stamp=""http://facturacion.finkok.com/stamp"">
  <soapenv:Header/>
  <soapenv:Body>
    <stamp:stamp>
      <stamp:xml>{xmlBase64}</stamp:xml>
      <stamp:username>{EscapeXml(usuario)}</stamp:username>
      <stamp:password>{EscapeXml(password)}</stamp:password>
    </stamp:stamp>
  </soapenv:Body>
</soapenv:Envelope>";
    }

    private static string BuildCancelSoapEnvelope(string uuid, string rfcEmisor, string motivo,
        string? folioSustitucion, string usuario, string password)
    {
        var folioTag = !string.IsNullOrEmpty(folioSustitucion)
            ? $"<cancel:FolioSustitucion>{EscapeXml(folioSustitucion)}</cancel:FolioSustitucion>"
            : "";

        // Use sign_cancel method — CSD must be pre-loaded in Finkok panel
        // This avoids the DES3 re-encryption requirement of the cancel method
        return $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/""
                  xmlns:cancel=""http://facturacion.finkok.com/cancel"">
  <soapenv:Header/>
  <soapenv:Body>
    <cancel:sign_cancel>
      <cancel:UUIDS>
        <cancel:uuids>
          <cancel:UUID>{EscapeXml(uuid)}</cancel:UUID>
          <cancel:Motivo>{EscapeXml(motivo)}</cancel:Motivo>
          {folioTag}
        </cancel:uuids>
      </cancel:UUIDS>
      <cancel:username>{EscapeXml(usuario)}</cancel:username>
      <cancel:password>{EscapeXml(password)}</cancel:password>
      <cancel:taxpayer_id>{EscapeXml(rfcEmisor)}</cancel:taxpayer_id>
      <cancel:store_pending>true</cancel:store_pending>
    </cancel:sign_cancel>
  </soapenv:Body>
</soapenv:Envelope>";
    }

    private static string BuildQueryStatusSoapEnvelope(string uuid, string rfcEmisor,
        string usuario, string password)
    {
        return $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/""
                  xmlns:cancel=""http://facturacion.finkok.com/cancel"">
  <soapenv:Header/>
  <soapenv:Body>
    <cancel:query_pending>
      <cancel:username>{EscapeXml(usuario)}</cancel:username>
      <cancel:password>{EscapeXml(password)}</cancel:password>
      <cancel:uuid>{EscapeXml(uuid)}</cancel:uuid>
      <cancel:taxpayer_id>{EscapeXml(rfcEmisor)}</cancel:taxpayer_id>
    </cancel:query_pending>
  </soapenv:Body>
</soapenv:Envelope>";
    }

    // --- Helpers ---

    private static string GetStampUrl(string ambiente)
    {
        return ambiente?.ToLowerInvariant() == "production"
            ? ProductionStampUrl
            : SandboxStampUrl;
    }

    private static string GetCancelUrl(string ambiente)
    {
        return ambiente?.ToLowerInvariant() == "production"
            ? ProductionCancelUrl
            : SandboxCancelUrl;
    }

    private static string? ExtractElementValue(XDocument doc, string localName)
    {
        return doc.Descendants()
            .FirstOrDefault(e => e.Name.LocalName == localName)?
            .Value;
    }

    private static string? ExtractFromTfd(string? xmlTimbrado)
    {
        if (string.IsNullOrEmpty(xmlTimbrado)) return null;

        try
        {
            var doc = XDocument.Parse(xmlTimbrado);
            return doc.Descendants()
                .FirstOrDefault(e => e.Name.LocalName == "TimbreFiscalDigital")?
                .Attribute("UUID")?.Value;
        }
        catch
        {
            return null;
        }
    }

    private static string? BuildCadenaOriginalSat(string? uuid, string? fechaTimbrado,
        string? selloSat, string? noCertificadoSat)
    {
        if (string.IsNullOrEmpty(uuid)) return null;
        return $"||1.1|{uuid}|{fechaTimbrado}|{selloSat}|{noCertificadoSat}||";
    }

    /// <summary>
    /// Strips PAC credentials (username, password) from error messages before returning to clients.
    /// </summary>
    internal static string SanitizeErrorMessage(string? message, string? pacUsuario, string? pacPassword)
    {
        if (string.IsNullOrEmpty(message)) return "Error de comunicación con el PAC";

        var sanitized = message;
        if (!string.IsNullOrEmpty(pacUsuario))
            sanitized = sanitized.Replace(pacUsuario, "[PAC_USER]");
        if (!string.IsNullOrEmpty(pacPassword))
            sanitized = sanitized.Replace(pacPassword, "[REDACTED]");

        return sanitized;
    }

    private static string EscapeXml(string value)
    {
        return System.Security.SecurityElement.Escape(value) ?? value;
    }
}
