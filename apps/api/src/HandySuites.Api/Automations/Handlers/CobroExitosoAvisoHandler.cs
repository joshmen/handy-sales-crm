using System.Globalization;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

/// <summary>
/// Notifies admin when cobros are registered.
/// Runs as a Condition poll (every ~60 min) — detects cobros created in the last window
/// that haven't been notified yet, using LastExecutedAt as the watermark.
/// </summary>
public class CobroExitosoAvisoHandler : IAutomationHandler
{
    public string Slug => "cobro-exitoso-aviso";
    private const string Canal = "push";

    private static string M(string key, string lang) => AutomationMessages.Get(key, lang);

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var lang = culture.TwoLetterISOLanguageName; // "es" or "en"
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        // Use LastExecutedAt as watermark — only notify cobros since last run
        var desde = context.Automation.LastExecutedAt ?? DateTime.UtcNow.AddHours(-2);

        var cobros = await context.Db.Cobros
            .Include(c => c.Cliente)
            .Where(c => c.TenantId == context.TenantId
                     && c.Activo
                     && c.CreadoEn >= desde)
            .Select(c => new
            {
                c.Id,
                c.Monto,
                c.CreadoEn,
                ClienteNombre = c.Cliente.Nombre,
                c.UsuarioId,
            })
            .OrderByDescending(c => c.CreadoEn)
            .Take(20)
            .ToListAsync(ct);

        if (cobros.Count == 0)
            return new AutomationResult(true, M("result.sinCobrosNuevos", lang));

        var totalMonto = cobros.Sum(c => c.Monto);
        var adminId = await context.GetAdminUserIdAsync(ct);

        if (adminId.HasValue)
        {
            var mensaje = cobros.Count == 1
                ? string.Format(M("cobroExitoso.notification", lang), cobros[0].ClienteNombre, FormatMoney(cobros[0].Monto, culture))
                : lang == "en"
                    ? $"{cobros.Count} payments — {FormatMoney(totalMonto, culture)}"
                    : $"{cobros.Count} cobros — {FormatMoney(totalMonto, culture)}";

            await context.NotifyUserAsync(adminId.Value,
                M("cobroExitoso.notification.title", lang),
                mensaje,
                "General", Canal, ct,
                new Dictionary<string, string> { { "url", "/cobranza" } });
        }

        var resultMsg = lang == "en"
            ? $"{cobros.Count} payment{(cobros.Count != 1 ? "s" : "")} — {FormatMoney(totalMonto, culture)}"
            : $"{cobros.Count} cobro{(cobros.Count != 1 ? "s" : "")} — {FormatMoney(totalMonto, culture)}";
        return new AutomationResult(true, resultMsg);
    }

    private static string FormatMoney(decimal amount, System.Globalization.CultureInfo culture) => amount.ToString("C0", culture);
}
