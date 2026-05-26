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
      <apps:status>{EscapeXml(request.Status)}</apps:status>
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

    // ─── HTTP + Parsing ────────────────────────────────────────────────────────

    private async Task<string> SendSoapRequest(string soapEnvelope, string soapAction, CancellationToken ct)
    {
        var content = new StringContent(soapEnvelope, Encoding.UTF8, "text/xml");
        content.Headers.ContentType = new MediaTypeHeaderValue("text/xml") { CharSet = "utf-8" };

        var request = new HttpRequestMessage(HttpMethod.Post, Url);
        request.Content = content;
        request.Headers.Add("SOAPAction", soapAction);

        _logger.LogDebug("Finkok registration SOAP {Action} to {Url}", soapAction, Url);

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
            var status = ExtractElementValue(doc, "status") ?? ExtractElementValue(doc, "Status");
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
                    var status = ChildValue(node, "status");
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
