using System.Globalization;
using System.Text.Json;
using HandySales.Application.Notifications.DTOs;
using HandySales.Application.Notifications.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Email;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations;

public interface IAutomationHandler
{
    string Slug { get; }
    Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct);
}

public record AutomationContext(
    TenantAutomation Automation,
    HandySalesDbContext Db,
    INotificationService Notifications,
    IEmailService? EmailService
)
{
    public int TenantId => Automation.TenantId;

    /// <summary>
    /// Configurable recipient from ParamsJson: "admin", "vendedores", or "ambos".
    /// </summary>
    public string Destinatario => GetParam("destinatario", "admin");

    /// <summary>
    /// Parse a typed param from the automation's JSON config, falling back to a default value.
    /// </summary>
    public T GetParam<T>(string key, T defaultValue)
    {
        if (string.IsNullOrEmpty(Automation.ParamsJson))
            return defaultValue;

        try
        {
            var doc = JsonSerializer.Deserialize<JsonElement>(Automation.ParamsJson);
            if (doc.TryGetProperty(key, out var prop))
            {
                if (typeof(T) == typeof(int) && prop.TryGetInt32(out var intVal))
                    return (T)(object)intVal;
                if (typeof(T) == typeof(bool) && prop.ValueKind is JsonValueKind.True or JsonValueKind.False)
                    return (T)(object)prop.GetBoolean();
                if (typeof(T) == typeof(string))
                    return (T)(object)(prop.GetString() ?? defaultValue?.ToString() ?? "");
            }
        }
        catch { /* use default */ }

        return defaultValue;
    }

    /// <summary>
    /// Get the tenant's configured timezone (from CompanySetting) or fall back to Mexico City.
    /// </summary>
    public async Task<string> GetTenantTimezoneAsync(CancellationToken ct)
    {
        return await Db.CompanySettings
            .Where(cs => cs.TenantId == TenantId)
            .Select(cs => cs.Timezone)
            .FirstOrDefaultAsync(ct) ?? "America/Mexico_City";
    }

    /// <summary>
    /// Get the tenant's configured culture based on language setting.
    /// </summary>
    public async Task<CultureInfo> GetTenantCultureAsync(CancellationToken ct)
    {
        var lang = await Db.CompanySettings
            .Where(cs => cs.TenantId == TenantId)
            .Select(cs => cs.Language)
            .FirstOrDefaultAsync(ct) ?? "es";
        return lang switch
        {
            "en" => new CultureInfo("en-US"),
            "pt" => new CultureInfo("pt-BR"),
            _ => new CultureInfo("es-MX"),
        };
    }

    /// <summary>
    /// Resolve user IDs based on the configured destinatario param.
    /// NOTE: Must use mapped DB columns (EsAdmin, EsSuperAdmin, RolExplicito) — NOT the
    /// [NotMapped] computed Rol property, which EF Core cannot translate to SQL.
    /// </summary>
    public async Task<List<int>> ResolveDestinatarioIdsAsync(CancellationToken ct)
    {
        var ids = new List<int>();

        if (Destinatario is "admin" or "ambos")
        {
            var adminId = await GetAdminUserIdAsync(ct);
            if (adminId.HasValue) ids.Add(adminId.Value);
        }

        if (Destinatario is "vendedores" or "ambos")
        {
            // Vendedor = RolExplicito == "VENDEDOR" OR (RolExplicito is null AND not admin/superadmin)
            var vendIds = await Db.Usuarios
                .Where(u => u.TenantId == TenantId && u.Activo
                    && (u.RolExplicito == "VENDEDOR"
                        || (u.RolExplicito == null && !u.EsAdmin && !u.EsSuperAdmin)))
                .Select(u => u.Id)
                .ToListAsync(ct);
            ids.AddRange(vendIds);
        }

        return ids.Distinct().ToList();
    }

    /// <summary>
    /// Unified notification delivery using configured destinatario. Canal is fixed per handler.
    /// canal: "push" = SignalR+FCM+DB, "email" = SendGrid, "push+email" = both
    /// </summary>
    public async Task NotifyAsync(string titulo, string mensaje, string tipo, string canal, CancellationToken ct,
        string? actionUrl = null)
    {
        var data = actionUrl != null ? new Dictionary<string, string> { { "url", actionUrl } } : null;
        var userIds = await ResolveDestinatarioIdsAsync(ct);
        foreach (var userId in userIds)
            await NotifyUserAsync(userId, titulo, mensaje, tipo, canal, ct, data);
    }

    /// <summary>
    /// Send notification to a specific user via the given canal.
    /// Respects user's NotificationPreferences (push, email). Defaults to enabled if no prefs saved.
    /// For email: uses branded template with company logo, address, and colors.
    /// </summary>
    public async Task NotifyUserAsync(int userId, string titulo, string mensaje, string tipo, string canal, CancellationToken ct,
        Dictionary<string, string>? data = null)
    {
        var prefs = await Db.NotificationPreferences
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.TenantId == TenantId)
            .FirstOrDefaultAsync(ct);

        if (canal.Contains("push") && (prefs?.PushNotifications ?? true))
        {
            await Notifications.EnviarNotificacionAsync(new SendNotificationDto
            {
                UsuarioId = userId,
                Titulo = titulo,
                Mensaje = mensaje,
                Tipo = tipo,
                Data = data,
            });
        }

        if (canal.Contains("email") && EmailService != null && (prefs?.EmailNotifications ?? true))
        {
            var email = await Db.Usuarios
                .Where(u => u.Id == userId)
                .Select(u => u.Email)
                .FirstOrDefaultAsync(ct);

            if (!string.IsNullOrEmpty(email))
            {
                var template = await EmailTemplateBuilder.CreateAsync(Db, TenantId, ct);
                var contentHtml = EmailTemplateBuilder.Text(mensaje.Replace("\n", "<br/>"));
                var html = template.Build(titulo, contentHtml);
                await EmailService.SendAsync(email, $"HandySales: {titulo}", html);
            }
        }
    }

    /// <summary>
    /// Send a rich HTML email with custom content sections (KPIs, tables, callouts).
    /// Handlers build their own content using EmailTemplateBuilder static helpers,
    /// then pass it here for branded wrapping + delivery.
    /// </summary>
    public async Task SendRichEmailAsync(string titulo, string contentHtml, CancellationToken ct, string? preheader = null)
    {
        if (EmailService == null) return;

        var template = await EmailTemplateBuilder.CreateAsync(Db, TenantId, ct);
        var html = template.Build(titulo, contentHtml, preheader);

        var userIds = await ResolveDestinatarioIdsAsync(ct);
        foreach (var userId in userIds)
        {
            var emailPrefs = await Db.NotificationPreferences
                .AsNoTracking()
                .Where(p => p.UserId == userId && p.TenantId == TenantId)
                .FirstOrDefaultAsync(ct);
            if (!(emailPrefs?.EmailNotifications ?? true)) continue;

            var email = await Db.Usuarios
                .Where(u => u.Id == userId)
                .Select(u => u.Email)
                .FirstOrDefaultAsync(ct);

            if (!string.IsNullOrEmpty(email))
                await EmailService.SendAsync(email, $"HandySales: {titulo}", html);
        }
    }

    /// <summary>
    /// Send a rich HTML email to the ADMIN only, regardless of the destinatario setting.
    /// Used for operational report emails (stock, cobros, clientes inactivos, etc.).
    /// </summary>
    public async Task SendAdminEmailAsync(string titulo, string contentHtml, CancellationToken ct, string? preheader = null)
    {
        if (EmailService == null) return;

        var adminId = await GetAdminUserIdAsync(ct);
        if (!adminId.HasValue) return;

        var adminPrefs = await Db.NotificationPreferences
            .AsNoTracking()
            .Where(p => p.UserId == adminId.Value && p.TenantId == TenantId)
            .FirstOrDefaultAsync(ct);
        if (!(adminPrefs?.EmailNotifications ?? true)) return;

        var email = await Db.Usuarios
            .Where(u => u.Id == adminId.Value)
            .Select(u => u.Email)
            .FirstOrDefaultAsync(ct);

        if (string.IsNullOrEmpty(email)) return;

        var template = await EmailTemplateBuilder.CreateAsync(Db, TenantId, ct);
        var html = template.Build(titulo, contentHtml, preheader);
        await EmailService.SendAsync(email, $"HandySales: {titulo}", html);
    }

    /// <summary>
    /// Resolve recipients for per-client handlers where vendedor is assigned to the client.
    /// destinatario "vendedores" = assigned vendedor, "admin" = admin only, "ambos" = both.
    /// </summary>
    public async Task<List<int>> ResolvePerClientRecipientsAsync(int? vendedorId, CancellationToken ct)
    {
        var ids = new List<int>();

        if (Destinatario is "vendedores" or "ambos")
        {
            if (vendedorId.HasValue) ids.Add(vendedorId.Value);
        }

        if (Destinatario is "admin" or "ambos")
        {
            var adminId = await GetAdminUserIdAsync(ct);
            if (adminId.HasValue) ids.Add(adminId.Value);
        }

        // Fallback: if no vendedor assigned and destinatario=vendedores, notify admin
        if (ids.Count == 0)
        {
            var adminId = await GetAdminUserIdAsync(ct);
            if (adminId.HasValue) ids.Add(adminId.Value);
        }

        return ids.Distinct().ToList();
    }

    /// <summary>
    /// Find the first active ADMIN user for this tenant.
    /// NOTE: Must use mapped DB columns — Rol is [NotMapped] and can't be used in LINQ-to-SQL.
    /// </summary>
    public async Task<int?> GetAdminUserIdAsync(CancellationToken ct)
    {
        // Admin = RolExplicito == "ADMIN" OR (RolExplicito is null AND EsAdmin AND not SuperAdmin)
        return await Db.Usuarios
            .Where(u => u.TenantId == TenantId && u.Activo
                && (u.RolExplicito == "ADMIN"
                    || (u.RolExplicito == null && u.EsAdmin && !u.EsSuperAdmin)))
            .Select(u => (int?)u.Id)
            .FirstOrDefaultAsync(ct);
    }
}

public record AutomationResult(bool Success, string ActionTaken, string? Error = null);
