using System.Text;
using HandySuites.Domain.Entities;
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

        // ── Auto-schedule visits for next business day ──
        var nextBusinessDay = GetNextBusinessDay(DateTime.UtcNow);
        var visitasCreadas = 0;

        foreach (var cliente in clientesInactivos)
        {
            var vendedorId = cliente.VendedorId;
            if (!vendedorId.HasValue) continue;

            // Skip if a visit is already scheduled for this client in the future
            var yaAgendada = await context.Db.ClienteVisitas
                .AnyAsync(v => v.TenantId == context.TenantId
                    && v.ClienteId == cliente.Id
                    && v.FechaProgramada >= DateTime.UtcNow.Date
                    && v.Resultado == ResultadoVisita.Pendiente, ct);

            if (yaAgendada) continue;

            var visita = new ClienteVisita
            {
                TenantId = context.TenantId,
                ClienteId = cliente.Id,
                UsuarioId = vendedorId.Value,
                FechaProgramada = nextBusinessDay,
                TipoVisita = TipoVisita.Seguimiento,
                Resultado = ResultadoVisita.Pendiente,
                Notas = $"Visita agendada automáticamente — cliente sin visitar en {diasInactividad}+ días",
            };
            context.Db.ClienteVisitas.Add(visita);
            visitasCreadas++;
        }

        if (visitasCreadas > 0)
            await context.Db.SaveChangesAsync(ct);

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
            ("Visitas agendadas", visitasCreadas.ToString(), "📋"),
            ("Días de corte", diasInactividad.ToString(), "📅")
        ));
        var calloutMessage = visitasCreadas > 0
            ? $"<strong>{clientesInactivos.Count}</strong> cliente{(clientesInactivos.Count != 1 ? "s" : "")} no han recibido visita en los últimos <strong>{diasInactividad} días</strong>. " +
              $"Se agendaron <strong>{visitasCreadas}</strong> visita{(visitasCreadas != 1 ? "s" : "")} de seguimiento para el <strong>{nextBusinessDay:dd/MM/yyyy}</strong>."
            : $"<strong>{clientesInactivos.Count}</strong> cliente{(clientesInactivos.Count != 1 ? "s" : "")} no han recibido visita en los últimos <strong>{diasInactividad} días</strong>. " +
              "No se pudieron agendar visitas porque los clientes no tienen vendedor asignado.";
        content.Append(EmailTemplateBuilder.Callout(calloutMessage, visitasCreadas > 0 ? "info" : "warning"));

        var rows = clientesInactivos.Select(c =>
        {
            var ultimaVisita = ultimaVisitaDict.TryGetValue(c.Id, out var uv) && uv.HasValue
                ? $"{(int)(DateTime.UtcNow - uv.Value).TotalDays}d atrás"
                : "<span style=\"color:#9ca3af;\">Sin visitas</span>";
            var vendedor = c.VendedorId.HasValue
                ? System.Net.WebUtility.HtmlEncode(vendedorDict.GetValueOrDefault(c.VendedorId.Value, "Sin asignar"))
                : "<span style=\"color:#9ca3af;\">Sin asignar</span>";
            var agendada = c.VendedorId.HasValue
                ? $"<span style=\"color:#16a34a;font-weight:600;\">{nextBusinessDay:dd/MM/yyyy}</span>"
                : "<span style=\"color:#9ca3af;\">Sin vendedor</span>";
            return new[] { System.Net.WebUtility.HtmlEncode(c.Nombre), ultimaVisita, vendedor, agendada };
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading("Clientes sin visitar"));
        content.Append(EmailTemplateBuilder.Table(
            new[] { "Cliente", "Última Visita", "Vendedor", "Visita Agendada" }, rows));

        await context.SendAdminEmailAsync(
            "Reporte de Clientes Inactivos",
            content.ToString(),
            ct,
            $"{clientesInactivos.Count} clientes sin visitar en {diasInactividad} días");

        return new AutomationResult(true,
            $"Clientes inactivos: {clientesInactivos.Count}, visitas agendadas: {visitasCreadas}, notificaciones: {notified}");
    }

    /// <summary>
    /// Returns the next business day (Monday–Friday), skipping weekends.
    /// Sets time to 9:00 AM UTC as a reasonable default.
    /// </summary>
    private static DateTime GetNextBusinessDay(DateTime from)
    {
        var next = from.Date.AddDays(1);
        while (next.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            next = next.AddDays(1);
        return next.AddHours(9); // 9 AM UTC ≈ 3 AM CST, will display in tenant TZ
    }
}
