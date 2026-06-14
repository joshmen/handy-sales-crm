using System.Net.Http.Headers;
using System.Text;
using System.Xml.Linq;
using HandySuites.Billing.Api.DTOs;

namespace HandySuites.Billing.Api.Services;

/// <summary>
/// Finkok Registration Web Service implementation (SOAP).
///
/// WSDL: https://[demo-]facturacion.finkok.com/servicios/soap/registration.wsdl
/// Operations envueltas: add, edit, get, assign.
///
/// Credenciales partner Finkok leídas de env vars (las MISMAS que se usan
/// para timbrado/cancelación — es la misma cuenta Finkok):
///   FINKOK_USUARIO   — username partner
///   FINKOK_PASSWORD  — password partner
///   FINKOK_AMBIENTE  — "sandbox" | "production"
///
/// Estas credenciales identifican a HandySales como partner Finkok. Cada tenant
/// de HandySales se registra bajo esta cuenta como un emisor (taxpayer_id).
/// </summary>
public class FinkokRegistrationService : IRegistrationService
{
    private const string SandboxUrl = "https://demo-facturacion.finkok.com/servicios/soap/registration";
    private const string ProductionUrl = "https://facturacion.finkok.com/servicios/soap/registration";
    private const string Namespace = "http://facturacion.finkok.com/registration";
    private const string SandboxUtilitiesUrl = "https://demo-facturacion.finkok.com/servicios/soap/utilities";
    private const string ProductionUtilitiesUrl = "https://facturacion.finkok.com/servicios/soap/utilities";
    private const string UtilitiesNamespace = "http://facturacion.finkok.com/utilities";

    private readonly HttpClient _httpClient;
    private readonly ILogger<FinkokRegistrationService> _logger;
    private readonly string? _resellerUsername;
    private readonly string? _resellerPassword;
    private readonly bool _isProduction;

    public FinkokRegistrationService(HttpClient httpClient, IConfiguration config, ILogger<FinkokRegistrationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        // Resiliente: NO tirar en el constructor si faltan env vars. Romper el DI haría
        // caer endpoints sin relación (ej. GET configuracion-fiscal). En lugar, RegisterEmitterAsync
        // devuelve un RegisterEmitterResult con success=false + Message claro.
        // Reutilizamos las mismas env vars que FacturasController usa para timbrado.
        _resellerUsername = config["FINKOK_USUARIO"];
        _resellerPassword = config["FINKOK_PASSWORD"];
        var ambiente = config["FINKOK_AMBIENTE"]?.ToLowerInvariant() ?? "sandbox";
        _isProduction = ambiente == "production";
    }

    private bool CredentialsConfigured =>
        !string.IsNullOrEmpty(_resellerUsername) && !string.IsNullOrEmpty(_resellerPassword);

    private RegisterEmitterResult MissingCredentialsResult() => new()
    {
        Success = false,
        ErrorCode = "CONFIG_MISSING",
        Message = "Credenciales Finkok no configuradas (FINKOK_USUARIO/FINKOK_PASSWORD). Contacta soporte.",
    };

    private string Url => _isProduction ? ProductionUrl : SandboxUrl;

    public async Task<RegisterEmitterResult> RegisterEmitterAsync(RegisterEmitterRequest request, CancellationToken ct = default)
    {
        if (!CredentialsConfigured)
        {
            _logger.LogError("FINKOK_USUARIO o FINKOK_PASSWORD vacíos — RegisterEmitter omitido");
            return MissingCredentialsResult();
        }
        var cerB64 = Convert.ToBase64String(request.CerBytes);
        var keyB64 = Convert.ToBase64String(request.KeyBytes);

        var soapBody = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/""
                  xmlns:apps=""{Namespace}"">
  <soapenv:Header/>
  <soapenv:Body>
    <apps:add>
      <apps:reseller_username>{EscapeXml(_resellerUsername)}</apps:reseller_username>
      <apps:reseller_password>{EscapeXml(_resellerPassword)}</apps:reseller_password>
      <apps:taxpayer_id>{EscapeXml(request.Rfc)}</apps:taxpayer_id>
      <apps:type_user>{request.TypeUser}</apps:type_user>
      <apps:coupon></apps:coupon>
      <apps:added></apps:added>
      <apps:cer>{cerB64}</apps:cer>
      <apps:key>{keyB64}</apps:key>
      <apps:passphrase>{EscapeXml(request.Passphrase)}</apps:passphrase>
    </apps:add>
  </soapenv:Body>
</soapenv:Envelope>";

        try
        {
            var response = await SendSoapRequest(soapBody, "add", ct);
            return ParseRegistrationResponse(response, operation: "add");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al registrar RFC {Rfc} en Finkok ({Ambiente})", request.Rfc, _isProduction ? "production" : "sandbox");
            return new RegisterEmitterResult
            {
                Success = false,
                ErrorCode = "PAC_ERROR",
                Message = SanitizeErrorMessage(ex.Message),
            };
        }
    }

    public async Task<RegisterEmitterResult> UpdateEmitterAsync(UpdateEmitterRequest request, CancellationToken ct = default)
    {
        if (!CredentialsConfigured) return MissingCredentialsResult();

        // Finkok es asimetrico con el status: el WS `customers`/`get` DEVUELVE la palabra
        // completa ("active"/"suspended"), pero el WS `edit` ACEPTA solo el codigo de una
        // letra ('A'=active, 'S'=suspended). Mandar la palabra completa hace que Finkok
        // responda "Invalid Status for the User" (HTTP 400 en el panel). Mapeamos aqui.
        // Ref: libreria phpcfdi/finkok, CustomerStatus (active=>'A', suspended=>'S').
        var finkokStatus = (request.Status ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "active" or "a" => "A",
            "suspended" or "s" => "S",
            _ => request.Status ?? string.Empty,
        };

        // Si vienen bytes nuevos del CSD, los pasamos; sino, vacío (Finkok mantiene el actual).
        var cerTag = request.CerBytes != null
            ? $"<apps:cer>{Convert.ToBase64String(request.CerBytes)}</apps:cer>"
            : "<apps:cer></apps:cer>";
        var keyTag = request.KeyBytes != null
            ? $"<apps:key>{Convert.ToBase64String(request.KeyBytes)}</apps:key>"
            : "<apps:key></apps:key>";
        var passTag = !string.IsNullOrEmpty(request.Passphrase)
            ? $"<apps:passphrase>{EscapeXml(request.Passphrase)}</apps:passphrase>"
            : "<apps:passphrase></apps:passphrase>";

        var soapBody = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/""
                  xmlns:apps=""{Namespace}"">
  <soapenv:Header/>
  <soapenv:Body>
    <apps:edit>
      <apps:reseller_username>{EscapeXml(_resellerUsername)}</apps:reseller_username>
      <apps:reseller_password>{EscapeXml(_resellerPassword)}</apps:reseller_password>
      <apps:taxpayer_id>{EscapeXml(request.Rfc)}</apps:taxpayer_id>
      <apps:status>{EscapeXml(finkokStatus)}</apps:status>
      {cerTag}
      {keyTag}
      {passTag}
    </apps:edit>
  </soapenv:Body>
</soapenv:Envelope>";

        try
        {
            var response = await SendSoapRequest(soapBody, "edit", ct);
            return ParseRegistrationResponse(response, operation: "edit");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al actualizar emisor {Rfc} en Finkok", request.Rfc);
            return new RegisterEmitterResult
            {
                Success = false,
                ErrorCode = "PAC_ERROR",
                Message = SanitizeErrorMessage(ex.Message),
            };
        }
    }

    public async Task<EmitterInfoResult> GetEmitterInfoAsync(string rfc, CancellationToken ct = default)
    {
        if (!CredentialsConfigured)
            return new EmitterInfoResult { Success = false, Message = "Credenciales Finkok no configuradas" };
        var soapBody = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/""
                  xmlns:apps=""{Namespace}"">
  <soapenv:Header/>
  <soapenv:Body>
    <apps:get>
      <apps:reseller_username>{EscapeXml(_resellerUsername)}</apps:reseller_username>
      <apps:reseller_password>{EscapeXml(_resellerPassword)}</apps:reseller_password>
      <apps:taxpayer_id>{EscapeXml(rfc)}</apps:taxpayer_id>
    </apps:get>
  </soapenv:Body>
</soapenv:Envelope>";

        try
        {
            var response = await SendSoapRequest(soapBody, "get", ct);
            return ParseGetResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al consultar emisor {Rfc} en Finkok", rfc);
            return new EmitterInfoResult { Success = false, Message = SanitizeErrorMessage(ex.Message) };
        }
    }

    public async Task<EmittersListResult> ListEmittersAsync(int page = 1, CancellationToken ct = default)
    {
        if (!CredentialsConfigured)
            return new EmittersListResult { Success = false, Message = "Credenciales Finkok no configuradas" };
        if (page < 1) page = 1;

        var soapBody = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/""
                  xmlns:apps=""{Namespace}"">
  <soapenv:Header/>
  <soapenv:Body>
    <apps:customers>
      <apps:username>{EscapeXml(_resellerUsername!)}</apps:username>
      <apps:password>{EscapeXml(_resellerPassword!)}</apps:password>
      <apps:page>{page}</apps:page>
    </apps:customers>
  </soapenv:Body>
</soapenv:Envelope>";

        try
        {
            var response = await SendSoapRequest(soapBody, "customers", ct);
            return ParseCustomersResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al listar emisores en Finkok (page {Page})", page);
            return new EmittersListResult { Success = false, Message = SanitizeErrorMessage(ex.Message) };
        }
    }

    public async Task<RegisterEmitterResult> SwitchTypeUserAsync(string rfc, char newTypeUser, CancellationToken ct = default)
    {
        if (!CredentialsConfigured) return MissingCredentialsResult();
        if (newTypeUser != 'P' && newTypeUser != 'O')
        {
            return new RegisterEmitterResult
            {
                Success = false,
                ErrorCode = "INVALID_TYPE",
                Message = "type_user debe ser 'P' (prepago) u 'O' (ilimitado)",
            };
        }

        var soapBody = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/""
                  xmlns:apps=""{Namespace}"">
  <soapenv:Header/>
  <soapenv:Body>
    <apps:switch>
      <apps:username>{EscapeXml(_resellerUsername!)}</apps:username>
      <apps:password>{EscapeXml(_resellerPassword!)}</apps:password>
      <apps:taxpayer_id>{EscapeXml(rfc)}</apps:taxpayer_id>
      <apps:type_user>{newTypeUser}</apps:type_user>
    </apps:switch>
  </soapenv:Body>
</soapenv:Envelope>";

        try
        {
            var response = await SendSoapRequest(soapBody, "switch", ct);
            return ParseRegistrationResponse(response, operation: "switch");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al cambiar type_user para {Rfc}", rfc);
            return new RegisterEmitterResult
            {
                Success = false,
                ErrorCode = "PAC_ERROR",
                Message = SanitizeErrorMessage(ex.Message),
            };
        }
    }

    public async Task<AssignCreditsResult> AssignCreditsAsync(string rfc, int credits, CancellationToken ct = default)
    {
        if (!CredentialsConfigured)
            return new AssignCreditsResult { Success = false, Message = "Credenciales Finkok no configuradas" };
        if (credits <= 0)
            return new AssignCreditsResult { Success = false, Message = "credits debe ser > 0" };

        var soapBody = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/""
                  xmlns:apps=""{Namespace}"">
  <soapenv:Header/>
  <soapenv:Body>
    <apps:assign>
      <apps:username>{EscapeXml(_resellerUsername)}</apps:username>
      <apps:password>{EscapeXml(_resellerPassword)}</apps:password>
      <apps:taxpayer_id>{EscapeXml(rfc)}</apps:taxpayer_id>
      <apps:credit>{credits}</apps:credit>
    </apps:assign>
  </soapenv:Body>
</soapenv:Envelope>";

        try
        {
            var response = await SendSoapRequest(soapBody, "assign", ct);
            return ParseAssignResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al asignar {Credits} créditos a {Rfc}", credits, rfc);
            return new AssignCreditsResult { Success = false, Message = SanitizeErrorMessage(ex.Message) };
        }
    }

    public async Task<CreditReportResult> GetCreditReportAsync(string rfc, CancellationToken ct = default)
    {
        if (!CredentialsConfigured)
            return new CreditReportResult { Success = false, Message = "Credenciales Finkok no configuradas" };

        var utilitiesUrl = _isProduction ? ProductionUtilitiesUrl : SandboxUtilitiesUrl;
        var soapBody = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/""
                  xmlns:uti=""{UtilitiesNamespace}"">
  <soapenv:Header/>
  <soapenv:Body>
    <uti:report_credit>
      <uti:username>{EscapeXml(_resellerUsername)}</uti:username>
      <uti:password>{EscapeXml(_resellerPassword)}</uti:password>
      <uti:taxpayer_id>{EscapeXml(rfc)}</uti:taxpayer_id>
    </uti:report_credit>
  </soapenv:Body>
</soapenv:Envelope>";

        try
        {
            var response = await SendSoapRequest(soapBody, "report_credit", ct, utilitiesUrl);
            return ParseCreditReportResponse(response, rfc);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error consultando report_credit para {Rfc}", rfc);
            return new CreditReportResult { Success = false, Message = SanitizeErrorMessage(ex.Message) };
        }
    }

    private CreditReportResult ParseCreditReportResponse(string soapResponse, string rfc)
    {
        try
        {
            if (LooksLikeHtml(soapResponse))
                return new CreditReportResult { Success = false, Message = "Servicio Finkok no disponible" };

            var doc = XDocument.Parse(soapResponse);
            var error = ExtractElementValue(doc, "error");

            // El response trae un array de ReportTotalCredit {taxpayer_id, credit, date}.
            // Tomamos el nodo cuyo taxpayer_id coincide con el RFC; si no, el primero.
            var nodes = doc.Descendants().Where(e => e.Name.LocalName == "ReportTotalCredit").ToList();
            var node = nodes.FirstOrDefault(n =>
                string.Equals(ChildValue(n, "taxpayer_id"), rfc, StringComparison.OrdinalIgnoreCase))
                ?? nodes.FirstOrDefault();

            // Fallback: algunos ambientes devuelven los campos planos sin el wrapper.
            var creditRaw = node != null ? ChildValue(node, "credit") : ExtractElementValue(doc, "credit");
            var dateRaw = node != null ? ChildValue(node, "date") : ExtractElementValue(doc, "date");

            if (string.IsNullOrWhiteSpace(creditRaw))
            {
                return new CreditReportResult
                {
                    Success = false,
                    Message = string.IsNullOrWhiteSpace(error) ? "Finkok no devolvió saldo para este RFC." : error,
                };
            }

            return new CreditReportResult
            {
                Success = true,
                Credit = int.TryParse(creditRaw, out var c) ? c : null,
                Date = dateRaw,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parseando respuesta Finkok utilities.report_credit");
            return new CreditReportResult { Success = false, Message = ex.Message };
        }
    }

    // ─── HTTP + Parsing ────────────────────────────────────────────────────────

    private async Task<string> SendSoapRequest(string soapEnvelope, string soapAction, CancellationToken ct, string? url = null)
    {
        var content = new StringContent(soapEnvelope, Encoding.UTF8, "text/xml");
        content.Headers.ContentType = new MediaTypeHeaderValue("text/xml") { CharSet = "utf-8" };

        var request = new HttpRequestMessage(HttpMethod.Post, url ?? Url);
        request.Content = content;
        request.Headers.Add("SOAPAction", soapAction);

        _logger.LogDebug("Finkok registration SOAP {Action} to {Url}", soapAction, url ?? Url);

        var response = await _httpClient.SendAsync(request, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Finkok registration returned HTTP {StatusCode} ({Length} chars) for action {Action}",
                response.StatusCode, responseBody?.Length ?? 0, soapAction);
        }

        return responseBody ?? string.Empty;
    }

    private RegisterEmitterResult ParseRegistrationResponse(string soapResponse, string operation)
    {
        try
        {
            // Sandbox a veces devuelve HTML cuando el servicio está caído
            if (LooksLikeHtml(soapResponse))
            {
                return new RegisterEmitterResult
                {
                    Success = false,
                    ErrorCode = "PAC_HTML",
                    Message = "El servicio Finkok de registro no respondió correctamente. Intente más tarde.",
                };
            }

            var doc = XDocument.Parse(soapResponse);
            var success = ExtractElementValue(doc, "success");
            var message = ExtractElementValue(doc, "message") ?? ExtractElementValue(doc, "error");

            if (success?.Equals("true", StringComparison.OrdinalIgnoreCase) == true)
            {
                _logger.LogInformation("Finkok registration.{Op} exitoso", operation);
                return new RegisterEmitterResult { Success = true, Message = message };
            }

            // Detectar "RFC already exists" (texto exacto varía según versión Finkok)
            var alreadyExists = message != null && (
                message.Contains("already", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("ya existe", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("duplicate", StringComparison.OrdinalIgnoreCase));

            _logger.LogWarning("Finkok registration.{Op} falló: {Message}", operation, message);
            return new RegisterEmitterResult
            {
                Success = false,
                AlreadyExists = alreadyExists,
                Message = message ?? "Finkok rechazó la operación sin mensaje específico",
                ErrorCode = alreadyExists ? "ALREADY_EXISTS" : "REJECTED",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parseando respuesta Finkok registration.{Op}", operation);
            return new RegisterEmitterResult
            {
                Success = false,
                ErrorCode = "PARSE_ERROR",
                Message = $"Error al procesar respuesta del PAC: {ex.Message}",
            };
        }
    }

    private EmitterInfoResult ParseGetResponse(string soapResponse)
    {
        try
        {
            if (LooksLikeHtml(soapResponse))
                return new EmitterInfoResult { Success = false, Message = "Servicio Finkok no disponible" };

            var doc = XDocument.Parse(soapResponse);

            // El response de `get` viene con un array de ResellerUser. Tomamos el primero.
            var status = NormalizeStatus(ExtractElementValue(doc, "status") ?? ExtractElementValue(doc, "Status"));
            var typeUser = ExtractElementValue(doc, "type_user") ?? ExtractElementValue(doc, "TypeUser");
            var creditsRemaining = ExtractElementValue(doc, "credit") ?? ExtractElementValue(doc, "credits");
            var consumed = ExtractElementValue(doc, "consumed") ?? ExtractElementValue(doc, "stamps_consumed");

            return new EmitterInfoResult
            {
                Success = !string.IsNullOrEmpty(status),
                Status = status,
                TypeUser = typeUser?.Length > 0 ? typeUser[0] : null,
                CreditsRemaining = int.TryParse(creditsRemaining, out var cr) ? cr : null,
                CreditsConsumedMonth = int.TryParse(consumed, out var cc) ? cc : null,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parseando respuesta Finkok registration.get");
            return new EmitterInfoResult { Success = false, Message = ex.Message };
        }
    }

    private EmittersListResult ParseCustomersResponse(string soapResponse)
    {
        try
        {
            if (LooksLikeHtml(soapResponse))
                return new EmittersListResult { Success = false, Message = "Servicio Finkok no disponible" };

            var doc = XDocument.Parse(soapResponse);

            // El response trae múltiples <ResellerUser> elements. Parseamos cada uno.
            var items = doc.Descendants()
                .Where(e => e.Name.LocalName.Equals("ResellerUser", StringComparison.OrdinalIgnoreCase))
                .Select(node =>
                {
                    var rfc = ChildValue(node, "taxpayer_id") ?? ChildValue(node, "rfc") ?? "";
                    var razonSocial = ChildValue(node, "name") ?? ChildValue(node, "razon_social");
                    var status = NormalizeStatus(ChildValue(node, "status"));
                    var typeUserStr = ChildValue(node, "type_user") ?? ChildValue(node, "TypeUser");
                    var credit = ChildValue(node, "credit") ?? ChildValue(node, "credits");
                    var registeredAtStr = ChildValue(node, "added") ?? ChildValue(node, "registered_at") ?? ChildValue(node, "created_at");

                    return new EmitterSummary(
                        Rfc: rfc,
                        RazonSocial: razonSocial,
                        Status: status,
                        TypeUser: typeUserStr?.Length > 0 ? typeUserStr[0] : (char?)null,
                        CreditsRemaining: int.TryParse(credit, out var c) ? c : null,
                        RegisteredAt: DateTime.TryParse(registeredAtStr, out var dt) ? dt : null);
                })
                .Where(e => !string.IsNullOrEmpty(e.Rfc))
                .ToList();

            return new EmittersListResult { Success = true, Items = items };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parseando respuesta Finkok registration.customers");
            return new EmittersListResult { Success = false, Message = ex.Message };
        }
    }

    private static string? ChildValue(XElement parent, string localName)
    {
        return parent.Descendants()
            .FirstOrDefault(e => e.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase))?
            .Value;
    }

    private AssignCreditsResult ParseAssignResponse(string soapResponse)
    {
        try
        {
            if (LooksLikeHtml(soapResponse))
                return new AssignCreditsResult { Success = false, Message = "Servicio Finkok no disponible" };

            var doc = XDocument.Parse(soapResponse);
            var success = ExtractElementValue(doc, "success");
            var message = ExtractElementValue(doc, "message");
            var creditTotal = ExtractElementValue(doc, "credit");

            return new AssignCreditsResult
            {
                Success = success?.Equals("true", StringComparison.OrdinalIgnoreCase) == true,
                CreditsTotal = int.TryParse(creditTotal, out var ct) ? ct : null,
                Message = message,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parseando respuesta Finkok registration.assign");
            return new AssignCreditsResult { Success = false, Message = ex.Message };
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static bool LooksLikeHtml(string response)
    {
        var trimmed = response.TrimStart();
        return trimmed.StartsWith("<html", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("<!DOCTYPE", StringComparison.OrdinalIgnoreCase);
    }

    private static string? ExtractElementValue(XDocument doc, string localName)
    {
        return doc.Descendants()
            .FirstOrDefault(e => e.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase))?
            .Value;
    }

    /// <summary>
    /// Finkok devuelve el status de forma inconsistente: a veces el codigo de una
    /// letra ('A'/'S'/'F') y a veces la palabra completa ("active"/"suspended"/"frozen").
    /// El panel web decide que accion mostrar (Suspender vs Reactivar) en base a la
    /// palabra canonica, asi que normalizamos aqui en el adaptador para que el resto
    /// del sistema SIEMPRE vea "active"/"suspended"/"frozen" sin importar como respondio
    /// Finkok. Espejo del mapeo de escritura en UpdateEmitterAsync (palabra -> codigo).
    /// </summary>
    private static string? NormalizeStatus(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return raw;
        return raw.Trim().ToUpperInvariant() switch
        {
            "A" or "ACTIVE" => "active",
            "S" or "SUSPENDED" => "suspended",
            "F" or "FROZEN" => "frozen",
            _ => raw.Trim().ToLowerInvariant(),
        };
    }

    /// <summary>
    /// Quita credenciales reseller del mensaje de error antes de propagarlo al cliente.
    /// Mismo pattern que FinkokPacService.SanitizeErrorMessage.
    /// </summary>
    private string SanitizeErrorMessage(string? message)
    {
        if (string.IsNullOrEmpty(message)) return "Error de comunicación con Finkok";
        var sanitized = message;
        if (!string.IsNullOrEmpty(_resellerUsername))
            sanitized = sanitized.Replace(_resellerUsername, "[RESELLER_USER]");
        if (!string.IsNullOrEmpty(_resellerPassword))
            sanitized = sanitized.Replace(_resellerPassword, "[REDACTED]");
        return sanitized;
    }

    private static string EscapeXml(string value)
    {
        return System.Security.SecurityElement.Escape(value) ?? value;
    }
}
