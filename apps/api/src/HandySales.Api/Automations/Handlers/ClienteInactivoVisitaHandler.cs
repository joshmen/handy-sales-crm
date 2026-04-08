using System.Text;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class ClienteInactivoVisitaHandler : IAutomationHandler
{
    public string Slug => "cliente-inactivo-visita";
    private const string Canal = "push";

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var diasInactividad = context.GetParam("dias_inactividad", 30);
        var cutoff = DateTime.UtcNow.AddDays(-diasInactividad);

        // Clients with a visit after cutoff (active)
        var clientesConVisitaReciente = await context.Db.ClienteVisitas
            .Where(v => v.TenantId == context.TenantId && v.FechaHoraInicio >= cutoff)
            .Select(v => v.ClienteId)
            .Distinct()
            .ToListAsync(ct);

        // Last visit per client for context
        var ultimasVisitas = await context.Db.ClienteVisitas
            .Where(v => v.TenantId == context.TenantId)
            .GroupBy(v => v.ClienteId)
            .Select(g => new { ClienteId = g.Key, Ultima = g.Max(v => v.FechaHoraInicio) })
            .ToListAsync(ct);
        var ultimaVisitaDict = ultimasVisitas.ToDictionary(x => x.ClienteId, x => x.Ultima);

        var clientesInactivos = await context.Db.Clientes
            .Where(c => c.TenantId == context.TenantId
                     && c.Activo
                     && !c.EsProspecto
                     && !clientesConVisitaReciente.Contains(c.Id))
            .Select(c => new { c.Id, c.Nombre, c.VendedorId })
            .Take(20)
            .ToListAsync(ct);

        if (clientesInactivos.Count == 0)
            return new AutomationResult(true, "Todos los clientes tienen visitas recientes");

        // ── Push: ONE aggregated notification per vendedor ──
        var notified = 0;
        var porVendedor = clientesInactivos.GroupBy(c => c.VendedorId ?? 0);

        foreach (var grupo in porVendedor)
        {
            var recipients = grupo.Key == 0
                ? new List<int>()
                : await context.ResolvePerClientRecipientsAsync(grupo.Key, ct);

            var nombres = string.Join(", ", grupo.Take(3).Select(c => c.Nombre));
            var mas = grupo.Count() > 3 ? $" y {grupo.Count() - 3} más" : "";
            var mensaje = grupo.Count() == 1
                ? $"{grupo.First().Nombre} no ha sido visitado en {diasInactividad} días."
                : $"{grupo.Count()} clientes sin visitar: {nombres}{mas}";

            foreach (var userId in recipients)
            {
                await context.NotifyUserAsync(userId,
                    $"{grupo.Count()} cliente{(grupo.Count() != 1 ? "s" : "")} sin visitar",
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
                    $"{clientesInactivos.Count} clientes sin visitar",
                    $"Te hemos enviado un correo con los detalles.",
                    "General", Canal, ct);
                notified++;
            }
        }

        // ── Rich email report to admin ──
        var vendedorIds = clientesInactivos.Where(c => c.VendedorId.HasValue).Select(c => c.VendedorId!.Value).Distinct().ToList();
        var vendedores = await context.Db.Usuarios
            .Where(u => vendedorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Nombre })
            .ToListAsync(ct);
        var vendedorDict = vendedores.ToDictionary(v => v.Id, v => v.Nombre ?? "Sin asignar");

        var content = new StringBuilder();
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz));
        content.Append(EmailTemplateBuilder.KpiRow(
            ("Clientes sin visitar", clientesInactivos.Count.ToString(), "👥"),
            ("Días de corte", diasInactividad.ToString(), "📅")
        ));
        content.Append(EmailTemplateBuilder.Callout(
            $"<strong>{clientesInactivos.Count}</strong> cliente{(clientesInactivos.Count != 1 ? "s" : "")} no han recibido visita en los últimos <strong>{diasInactividad} días</strong>. " +
            "Agenda seguimientos para mantener la relación comercial activa.",
            "info"));

        var rows = clientesInactivos.Select(c =>
        {
            var ultimaVisita = ultimaVisitaDict.TryGetValue(c.Id, out var uv) && uv.HasValue
                ? $"{(int)(DateTime.UtcNow - uv.Value).TotalDays}d atrás"
                : "<span style=\"color:#9ca3af;\">Sin visitas</span>";
            var vendedor = c.VendedorId.HasValue
                ? System.Net.WebUtility.HtmlEncode(vendedorDict.GetValueOrDefault(c.VendedorId.Value, "Sin asignar"))
                : "<span style=\"color:#9ca3af;\">Sin asignar</span>";
            return new[] { System.Net.WebUtility.HtmlEncode(c.Nombre), ultimaVisita, vendedor };
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading("Clientes sin visitar"));
        content.Append(EmailTemplateBuilder.Table(
            new[] { "Cliente", "Última Visita", "Vendedor" }, rows));

        await context.SendAdminEmailAsync(
            "Reporte de Clientes Inactivos",
            content.ToString(),
            ct,
            $"{clientesInactivos.Count} clientes sin visitar en {diasInactividad} días");

        return new AutomationResult(true, $"Notificación enviada para {clientesInactivos.Count} clientes inactivos ({notified} notificaciones)");
    }
}
