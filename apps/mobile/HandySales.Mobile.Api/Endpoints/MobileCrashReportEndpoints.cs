using HandySales.Application.CrashReporting;
using HandySales.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileCrashReportEndpoints
{
    public static void MapMobileCrashReportEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/crash-reports", async (
            [FromBody] CrashReportCreateDto dto,
            [FromServices] ICrashReportRepository repo,
            HttpContext context) =>
        {
            if (string.IsNullOrWhiteSpace(dto.ErrorMessage))
                return Results.BadRequest(new { message = "ErrorMessage es requerido" });

            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;
            var userIdClaim = context.User.FindFirst("sub")?.Value
                ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            var tenantId = int.TryParse(tenantIdClaim, out var tid) ? tid : dto.TenantId;
            var userId = int.TryParse(userIdClaim, out var uid) ? uid : dto.UserId;

            var report = new CrashReport
            {
                TenantId = tenantId,
                UserId = userId,
                DeviceId = dto.DeviceId ?? string.Empty,
                DeviceName = dto.DeviceName ?? string.Empty,
                AppVersion = dto.AppVersion ?? string.Empty,
                OsVersion = dto.OsVersion ?? string.Empty,
                ErrorMessage = dto.ErrorMessage.Length > 2000
                    ? dto.ErrorMessage[..2000]
                    : dto.ErrorMessage,
                StackTrace = dto.StackTrace,
                ComponentName = dto.ComponentName,
                Severity = dto.Severity ?? "ERROR",
                CreadoEn = DateTime.UtcNow
            };

            await repo.CreateAsync(report);
            return Results.Created($"/api/crash-reports/{report.Id}", new { id = report.Id });
        })
        .RequireAuthorization()
        .WithTags("CrashReports")
        .WithSummary("Reportar crash desde móvil");
    }
}
