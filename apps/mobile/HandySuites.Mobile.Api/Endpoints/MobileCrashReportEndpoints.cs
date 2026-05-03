using System.Text.RegularExpressions;
using HandySuites.Application.CrashReporting;
using HandySuites.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileCrashReportEndpoints
{
    // Sanitiza HTML/control chars del input. Antes el endpoint persistía
    // dto.ErrorMessage/StackTrace verbatim — un atacante anónimo podía
    // inyectar payload HTML/script y un admin lo abriría desde la UI web
    // de crash-reports (XSS stored vía panel admin). Conservamos saltos
    // de línea normales para que stack traces sean legibles.
    private static readonly Regex ControlCharsRegex = new(@"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", RegexOptions.Compiled);
    private static readonly Regex HtmlTagRegex = new(@"<[^>]+>", RegexOptions.Compiled);

    private static string SanitizeText(string? input, int maxLength)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        var stripped = HtmlTagRegex.Replace(input, string.Empty);
        var clean = ControlCharsRegex.Replace(stripped, string.Empty);
        return clean.Length > maxLength ? clean[..maxLength] : clean;
    }

    private static string? SanitizeOptional(string? input, int maxLength)
    {
        if (string.IsNullOrEmpty(input)) return null;
        return SanitizeText(input, maxLength);
    }

    public static void MapMobileCrashReportEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/crash-reports", async (
            [FromBody] CrashReportCreateDto dto,
            [FromServices] ICrashReportRepository repo,
            ILogger<CrashReportCreateDto> logger,
            HttpContext context) =>
        {
            if (string.IsNullOrWhiteSpace(dto.ErrorMessage))
                return Results.BadRequest(new { message = "ErrorMessage es requerido" });

            // SECURITY (VULN-M01): NO confiar dto.TenantId/dto.UserId. El
            // endpoint es AllowAnonymous para soportar crashes pre-login,
            // pero si tomamos los IDs del body un atacante en internet puede
            // inyectar reports falsos contra cualquier tenant. Solo usamos
            // claims del JWT — si no hay JWT, los IDs quedan null (crash
            // huérfano que el equipo de soporte deberá triage manual, lo
            // cual es el comportamiento correcto para un anon report).
            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;
            var userIdClaim = context.User.FindFirst("sub")?.Value
                ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            int? tenantId = int.TryParse(tenantIdClaim, out var tid) ? tid : null;
            int? userId = int.TryParse(userIdClaim, out var uid) ? uid : null;

            var report = new CrashReport
            {
                TenantId = tenantId,
                UserId = userId,
                DeviceId = SanitizeText(dto.DeviceId, 100),
                DeviceName = SanitizeText(dto.DeviceName, 200),
                AppVersion = SanitizeText(dto.AppVersion, 20),
                OsVersion = SanitizeText(dto.OsVersion, 50),
                ErrorMessage = SanitizeText(dto.ErrorMessage, 2000),
                StackTrace = SanitizeOptional(dto.StackTrace, 10000),
                ComponentName = SanitizeOptional(dto.ComponentName, 200),
                Severity = SanitizeText(dto.Severity ?? "ERROR", 20),
                CreadoEn = DateTime.UtcNow
            };

            await repo.CreateAsync(report);

            // Log a Info (no Error) cuando es anon — un report sin auth no
            // es de tu sistema necesariamente, podría ser ruido. Loguear a
            // Error inflaba alertas y costos de Seq.
            var logLevel = userId.HasValue ? LogLevel.Error : LogLevel.Information;
            logger.Log(logLevel,
                "MOBILE_CRASH [{Severity}] {DeviceName} ({AppVersion}/{OsVersion}) anon={Anon}: {ErrorMessage}",
                report.Severity, report.DeviceName, report.AppVersion, report.OsVersion,
                !userId.HasValue, report.ErrorMessage);

            return Results.Created($"/api/crash-reports/{report.Id}", new { id = report.Id });
        })
        .AllowAnonymous()
        .RequireRateLimiting("crash-reports")
        .WithTags("CrashReports")
        .WithSummary("Reportar crash desde móvil (anonymous — crashes can happen before login)");
    }
}
