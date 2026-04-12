using System.Text;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class BienvenidaClienteHandler : IAutomationHandler
{
    public string Slug => "bienvenida-cliente";
    private const string Canal = "push";

    private static string M(string key, string lang) => AutomationMessages.Get(key, lang);

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var lang = culture.TwoLetterISOLanguageName; // "es" or "en"
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var diasSeguimiento = context.GetParam("dias_seguimiento", 3);
        var since = context.Automation.LastExecutedAt ?? DateTime.UtcNow.AddMinutes(-5);

        var newClients = await context.Db.Clientes
            .Where(c => c.TenantId == context.TenantId && c.CreadoEn >= since && c.Activo)
            .Select(c => new { c.Id, c.Nombre, c.VendedorId, c.Telefono, Correo = c.Correo })
            .ToListAsync(ct);

        if (newClients.Count == 0)
            return new AutomationResult(true, M("result.sinClientesNuevos", lang));

        // ── Push: ONE aggregated notification per vendedor ──
        var notified = 0;
        var porVendedor = newClients.GroupBy(c => c.VendedorId ?? 0);

        foreach (var grupo in porVendedor)
        {
            var recipients = grupo.Key == 0
                ? new List<int>()
                : await context.ResolvePerClientRecipientsAsync(grupo.Key, ct);

            var nombres = string.Join(", ", grupo.Take(3).Select(c => c.Nombre));
            var mas = grupo.Count() > 3 ? $" y {grupo.Count() - 3} más" : "";
            var mensaje = grupo.Count() == 1
                ? $"{M("bienvenida.notification", lang)}: {grupo.First().Nombre}"
                : $"{grupo.Count()} {M("bienvenida.kpi.nuevos", lang).ToLower()}: {nombres}{mas}";

            foreach (var userId in recipients)
            {
                await context.NotifyUserAsync(userId,
                    M("bienvenida.notification", lang),
                    mensaje, "General", Canal, ct,
                    new Dictionary<string, string> { { "url", "/clients" } });
                notified++;
            }
        }

        // Single summary push to admin
        if (context.Destinatario is "admin" or "ambos")
        {
            var adminId = await context.GetAdminUserIdAsync(ct);
            if (adminId.HasValue)
            {
                await context.NotifyUserAsync(adminId.Value,
                    M("bienvenida.subject", lang),
                    $"{newClients.Count} {M("bienvenida.kpi.nuevos", lang).ToLower()}",
                    "General", Canal, ct);
                notified++;
            }
        }

        // ── Rich email report to admin ──
        var vendedorIds = newClients.Where(c => c.VendedorId.HasValue).Select(c => c.VendedorId!.Value).Distinct().ToList();
        var vendedores = await context.Db.Usuarios
            .Where(u => vendedorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Nombre })
            .ToListAsync(ct);
        var vendedorDict = vendedores.ToDictionary(v => v.Id, v => v.Nombre ?? "Sin asignar");

        var conZona = newClients.Count(c => c.VendedorId.HasValue);

        var content = new StringBuilder();
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz, lang));
        content.Append(EmailTemplateBuilder.KpiRow(
            (M("bienvenida.kpi.nuevos", lang), newClients.Count.ToString(), "🎉"),
            (M("bienvenida.kpi.conZona", lang), conZona.ToString(), "📍")
        ));
        content.Append(EmailTemplateBuilder.Callout(
            newClients.Count == 1
                ? M("bienvenida.callout.single", lang)
                : string.Format(M("bienvenida.callout.multi", lang), newClients.Count),
            "success"));

        var rows = newClients.Select(c =>
        {
            var vendedor = c.VendedorId.HasValue
                ? System.Net.WebUtility.HtmlEncode(vendedorDict.GetValueOrDefault(c.VendedorId.Value, "Sin asignar"))
                : "<span style=\"color:#9ca3af;\">Sin asignar</span>";
            var contacto = !string.IsNullOrEmpty(c.Telefono)
                ? System.Net.WebUtility.HtmlEncode(c.Telefono)
                : (!string.IsNullOrEmpty(c.Correo) ? System.Net.WebUtility.HtmlEncode(c.Correo) : "<span style=\"color:#9ca3af;\">—</span>");
            return new[] { System.Net.WebUtility.HtmlEncode(c.Nombre), contacto, vendedor };
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading(M("bienvenida.heading", lang)));
        content.Append(EmailTemplateBuilder.Table(
            new[] { M("table.cliente", lang), M("table.telefono", lang), M("table.vendedor", lang) }, rows));

        await context.SendAdminEmailAsync(
            M("bienvenida.subject", lang),
            content.ToString(),
            ct,
            $"{newClients.Count} {M("bienvenida.kpi.nuevos", lang).ToLower()}",
            language: lang);

        return new AutomationResult(true, lang == "en"
            ? $"Welcome sent for {newClients.Count} new clients ({notified} notifications)"
            : $"Bienvenida enviada para {newClients.Count} clientes nuevos ({notified} notificaciones)");
    }
}
