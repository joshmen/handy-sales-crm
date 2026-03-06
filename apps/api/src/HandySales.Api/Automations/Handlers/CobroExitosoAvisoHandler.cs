using System.Globalization;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

/// <summary>
/// Notifies admin when cobros are registered.
/// Runs as a Condition poll (every ~60 min) — detects cobros created in the last window
/// that haven't been notified yet, using LastExecutedAt as the watermark.
/// </summary>
public class CobroExitosoAvisoHandler : IAutomationHandler
{
    public string Slug => "cobro-exitoso-aviso";
    private const string Canal = "push";
    // Culture is now resolved dynamically via context.GetTenantCultureAsync(ct)

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
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
            return new AutomationResult(true, "Sin cobros nuevos desde la última ejecución");

        var totalMonto = cobros.Sum(c => c.Monto);
        var adminId = await context.GetAdminUserIdAsync(ct);

        if (adminId.HasValue)
        {
            var mensaje = cobros.Count == 1
                ? $"Cobro registrado: {cobros[0].ClienteNombre} — {FormatMoney(cobros[0].Monto, culture)}"
                : $"{cobros.Count} cobros registrados — {FormatMoney(totalMonto, culture)} en total";

            await context.NotifyUserAsync(adminId.Value,
                "Cobro registrado exitosamente",
                mensaje,
                "General", Canal, ct,
                new Dictionary<string, string> { { "url", "/cobranza" } });
        }

        return new AutomationResult(true,
            $"Aviso enviado: {cobros.Count} cobro{(cobros.Count != 1 ? "s" : "")} por {FormatMoney(totalMonto, culture)}");
    }

    private static string FormatMoney(decimal amount, System.Globalization.CultureInfo culture) => amount.ToString("C0", culture);
}
