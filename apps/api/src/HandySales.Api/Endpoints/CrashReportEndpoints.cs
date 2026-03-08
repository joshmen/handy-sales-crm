using HandySales.Application.CrashReporting;
using HandySales.Domain.Entities;
using Microsoft.AspNetCore.SignalR;
using HandySales.Api.Hubs;

namespace HandySales.Api.Endpoints;

public static class CrashReportEndpoints
{
    public static void MapCrashReportEndpoints(this IEndpointRouteBuilder app)
    {
        // POST es AllowAnonymous — el crash puede ocurrir sin token válido
        app.MapPost("/api/crash-reports", async (
            CrashReportCreateDto dto,
            ICrashReportRepository repo,
            IHubContext<NotificationHub> hubContext) =>
        {
            if (string.IsNullOrWhiteSpace(dto.ErrorMessage))
                return Results.BadRequest(new { message = "ErrorMessage es requerido" });

            var report = new CrashReport
            {
                TenantId = dto.TenantId,
                UserId = dto.UserId,
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

            // Broadcast to all connected clients (SuperAdmin will see it in real-time)
            await hubContext.Clients.All.SendAsync("CrashReportCreated", new
            {
                id = report.Id,
                severity = report.Severity,
                errorMessage = report.ErrorMessage.Length > 100
                    ? report.ErrorMessage[..100] + "..."
                    : report.ErrorMessage,
                deviceName = report.DeviceName,
                appVersion = report.AppVersion,
                componentName = report.ComponentName,
                creadoEn = report.CreadoEn
            });

            return Results.Created($"/api/crash-reports/{report.Id}", new { id = report.Id });
        })
        .RequireAuthorization()
        .WithTags("CrashReports");

        // Endpoints de lectura/gestión — solo SuperAdmin
        var group = app.MapGroup("/api/crash-reports")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .WithTags("CrashReports");

        group.MapGet("/", async (
            int page,
            int pageSize,
            string? severity,
            bool? resuelto,
            int? tenantId,
            string? appVersion,
            ICrashReportRepository repo) =>
        {
            var p = Math.Max(1, page);
            var ps = Math.Clamp(pageSize, 1, 100);

            var (items, total) = await repo.GetAllAsync(p, ps, severity, resuelto, tenantId, appVersion);

            var dtos = items.Select(c => MapToDto(c)).ToList();

            return Results.Ok(new
            {
                data = dtos,
                pagination = new
                {
                    page = p,
                    pageSize = ps,
                    total,
                    totalPages = (int)Math.Ceiling(total / (double)ps)
                }
            });
        });

        group.MapGet("/{id:int}", async (int id, ICrashReportRepository repo) =>
        {
            var report = await repo.GetByIdAsync(id);
            if (report == null)
                return Results.NotFound(new { message = "Crash report no encontrado" });

            return Results.Ok(MapToDto(report));
        });

        group.MapPatch("/{id:int}/resolver", async (
            int id,
            MarcarResueltoDto dto,
            ICrashReportRepository repo,
            IHubContext<NotificationHub> hubContext,
            HttpContext ctx) =>
        {
            var userIdClaim = ctx.User.FindFirst("userId")?.Value
                ?? ctx.User.FindFirst("sub")?.Value;
            var userId = int.TryParse(userIdClaim, out var uid) ? uid : 0;

            var ok = await repo.MarcarResueltoAsync(id, dto.Nota, userId);
            if (!ok)
                return Results.NotFound(new { message = "Crash report no encontrado" });

            // Broadcast resolution to all connected clients
            await hubContext.Clients.All.SendAsync("CrashReportResolved", new
            {
                id,
                resuelto = true,
                nota = dto.Nota,
                resueltoPor = userId
            });

            return Results.Ok(new { message = "Marcado como resuelto" });
        });

        group.MapGet("/estadisticas", async (ICrashReportRepository repo) =>
        {
            var stats = await repo.GetEstadisticasAsync();
            return Results.Ok(stats);
        });
    }

    private static CrashReportDto MapToDto(CrashReport c) => new(
        Id: c.Id,
        TenantId: c.TenantId,
        TenantNombre: c.Tenant?.NombreEmpresa,
        UserId: c.UserId,
        UserNombre: c.User?.Nombre,
        DeviceId: c.DeviceId,
        DeviceName: c.DeviceName,
        AppVersion: c.AppVersion,
        OsVersion: c.OsVersion,
        ErrorMessage: c.ErrorMessage,
        StackTrace: c.StackTrace,
        ComponentName: c.ComponentName,
        Severity: c.Severity,
        Resuelto: c.Resuelto,
        NotaResolucion: c.NotaResolucion,
        ResueltoPor: c.ResueltoPor,
        ResueltoPorNombre: c.ResueltoByUsuario?.Nombre,
        CreadoEn: c.CreadoEn
    );
}
