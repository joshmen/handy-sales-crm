using System.Text;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

public class BienvenidaClienteHandler : IAutomationHandler
{
    public string Slug => "bienvenida-cliente";
    private const string Canal = "push";

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var diasSeguimiento = context.GetParam("dias_seguimiento", 3);
        var since = context.Automation.LastExecutedAt ?? DateTime.UtcNow.AddMinutes(-5);

        var newClients = await context.Db.Clientes
            .Where(c => c.TenantId == context.TenantId && c.CreadoEn >= since && c.Activo)
            .Select(c => new { c.Id, c.Nombre, c.VendedorId, c.Telefono, Correo = c.Correo })
            .ToListAsync(ct);

        if (newClients.Count == 0)
            return new AutomationResult(true, "Sin clientes nuevos");

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
                ? $"Se registró {grupo.First().Nombre}. Agenda visita en los próximos {diasSeguimiento} días."
                : $"{grupo.Count()} nuevos clientes: {nombres}{mas}";

            foreach (var userId in recipients)
            {
                await context.NotifyUserAsync(userId,
                    $"{grupo.Count()} cliente{(grupo.Count() != 1 ? "s" : "")} nuevo{(grupo.Count() != 1 ? "s" : "")}",
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
                    $"{newClients.Count} cliente{(newClients.Count != 1 ? "s" : "")} nuevo{(newClients.Count != 1 ? "s" : "")}",
                    "Te hemos enviado un correo con los detalles.",
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

        var content = new StringBuilder();
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz));
        content.Append(EmailTemplateBuilder.KpiRow(
            ("Nuevos clientes", newClients.Count.ToString(), "🎉"),
            ("Días para seguimiento", diasSeguimiento.ToString(), "📅")
        ));
        content.Append(EmailTemplateBuilder.Callout(
            newClients.Count == 1
                ? $"Se registró <strong>1 nuevo cliente</strong>. Se notificó al vendedor para que agende una visita en los próximos {diasSeguimiento} días."
                : $"Se registraron <strong>{newClients.Count} nuevos clientes</strong>. Los vendedores asignados fueron notificados para agendar visitas de seguimiento.",
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

        content.Append(EmailTemplateBuilder.SectionHeading("Nuevos clientes registrados"));
        content.Append(EmailTemplateBuilder.Table(
            new[] { "Cliente", "Contacto", "Vendedor Asignado" }, rows));

        await context.SendAdminEmailAsync(
            "Nuevos Clientes Registrados",
            content.ToString(),
            ct,
            $"{newClients.Count} cliente{(newClients.Count != 1 ? "s" : "")} nuevo{(newClients.Count != 1 ? "s" : "")} hoy");

        return new AutomationResult(true, $"Bienvenida enviada para {newClients.Count} clientes nuevos ({notified} notificaciones)");
    }
}
