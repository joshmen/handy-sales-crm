using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

public class ResumenDiarioHandler : IAutomationHandler
{
    public string Slug => "resumen-diario";
    private const string Canal = "email";
    // Culture is now resolved dynamically via context.GetTenantCultureAsync(ct)

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var db = context.Db;
        var today = DateTime.UtcNow.Date;

        // ── Core KPIs ──
        var ventasHoy = await db.Pedidos
            .Where(p => p.TenantId == context.TenantId && p.Activo && p.FechaPedido.Date == today)
            .GroupBy(_ => 1)
            .Select(g => new { Total = g.Sum(p => p.Total), Count = g.Count() })
            .FirstOrDefaultAsync(ct);

        var cobrosHoy = await db.Cobros
            .Where(c => c.TenantId == context.TenantId && c.Activo && c.FechaCobro.Date == today)
            .GroupBy(_ => 1)
            .Select(g => new { Total = g.Sum(c => c.Monto), Count = g.Count() })
            .FirstOrDefaultAsync(ct);

        var visitasHoy = await db.ClienteVisitas
            .Where(v => v.TenantId == context.TenantId && v.FechaHoraInicio != null && v.FechaHoraInicio.Value.Date == today)
            .CountAsync(ct);

        var clientesNuevos = await db.Clientes
            .Where(c => c.TenantId == context.TenantId && c.Activo && c.CreadoEn.Date == today)
            .CountAsync(ct);

        var ventasCount = ventasHoy?.Count ?? 0;
        var ventasTotal = ventasHoy?.Total ?? 0;
        var cobrosCount = cobrosHoy?.Count ?? 0;
        var cobrosTotal = cobrosHoy?.Total ?? 0;

        // ── Top vendedores (by sales amount) ──
        var topVendedores = await db.Pedidos
            .Where(p => p.TenantId == context.TenantId && p.Activo && p.FechaPedido.Date == today)
            .GroupBy(p => new { p.UsuarioId, p.Usuario.Nombre })
            .Select(g => new { Nombre = g.Key.Nombre ?? "Sin nombre", Pedidos = g.Count(), Total = g.Sum(p => p.Total) })
            .OrderByDescending(x => x.Total)
            .Take(5)
            .ToListAsync(ct);

        // ── Top clientes (by order amount) ──
        var topClientes = await db.Pedidos
            .Where(p => p.TenantId == context.TenantId && p.Activo && p.FechaPedido.Date == today)
            .GroupBy(p => new { p.ClienteId, p.Cliente.Nombre })
            .Select(g => new { Nombre = g.Key.Nombre ?? "Sin nombre", Pedidos = g.Count(), Total = g.Sum(p => p.Total) })
            .OrderByDescending(x => x.Total)
            .Take(5)
            .ToListAsync(ct);

        // ── Build rich email content ──
        var content = new StringBuilder();

        // Date stamp
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz));

        // KPI cards row
        content.Append(EmailTemplateBuilder.KpiRow(
            ("Ventas", FormatMoney(ventasTotal, culture), "\ud83d\udcb0"),
            ("Cobros", FormatMoney(cobrosTotal, culture), "\ud83d\udcb3"),
            ("Pedidos", ventasCount.ToString(), "\ud83d\udce6"),
            ("Visitas", visitasHoy.ToString(), "\ud83d\udccd")
        ));

        // Secondary KPIs
        if (cobrosCount > 0 || clientesNuevos > 0)
        {
            content.Append(EmailTemplateBuilder.KpiRow(
                ("Cobros realizados", cobrosCount.ToString(), null),
                ("Clientes nuevos", clientesNuevos.ToString(), null)
            ));
        }

        // Summary callout
        if (ventasCount == 0 && cobrosCount == 0 && visitasHoy == 0)
        {
            content.Append(EmailTemplateBuilder.Callout(
                "No se registr\u00f3 actividad comercial hoy. \u00bfHay algo que se pueda mejorar para ma\u00f1ana?",
                "warning"));
        }
        else if (ventasTotal > 0)
        {
            content.Append(EmailTemplateBuilder.Callout(
                $"Se facturaron <strong>{FormatMoney(ventasTotal, culture)}</strong> en {ventasCount} pedido{(ventasCount != 1 ? "s" : "")} y se cobraron <strong>{FormatMoney(cobrosTotal, culture)}</strong> hoy.",
                "success"));
        }

        // Top vendedores table
        if (topVendedores.Count > 0)
        {
            content.Append(EmailTemplateBuilder.SectionHeading("Top Vendedores del D\u00eda"));
            var vendRows = topVendedores.Select((v, i) => new[]
            {
                $"<strong>{i + 1}.</strong> {System.Net.WebUtility.HtmlEncode(v.Nombre)}",
                v.Pedidos.ToString(),
                $"<strong>{FormatMoney(v.Total, culture)}</strong>"
            }).ToList();
            content.Append(EmailTemplateBuilder.Table(
                new[] { "Vendedor", "Pedidos", "Monto" }, vendRows));
        }

        // Top clientes table
        if (topClientes.Count > 0)
        {
            content.Append(EmailTemplateBuilder.SectionHeading("Top Clientes del D\u00eda"));
            var clientRows = topClientes.Select((c, i) => new[]
            {
                $"<strong>{i + 1}.</strong> {System.Net.WebUtility.HtmlEncode(c.Nombre)}",
                c.Pedidos.ToString(),
                $"<strong>{FormatMoney(c.Total, culture)}</strong>"
            }).ToList();
            content.Append(EmailTemplateBuilder.Table(
                new[] { "Cliente", "Pedidos", "Monto" }, clientRows));
        }

        // Push notification (plain text summary for mobile)
        var pushMessage = $"Ventas: {ventasCount} pedidos por {FormatMoney(ventasTotal, culture)} | " +
            $"Cobros: {cobrosCount} por {FormatMoney(cobrosTotal, culture)} | " +
            $"Visitas: {visitasHoy}";

        // Send push + email separately (push gets plain text, email gets rich HTML)
        var userIds = await context.ResolveDestinatarioIdsAsync(ct);
        foreach (var userId in userIds)
        {
            await context.NotifyUserAsync(userId, "Resumen del d\u00eda",
                "Tu resumen del d\u00eda est\u00e1 listo. Te lo enviamos por correo.",
                "General", "push", ct);
        }

        // Rich email via branded template
        await context.SendRichEmailAsync(
            "Resumen del D\u00eda",
            content.ToString(),
            ct,
            $"Ventas: {FormatMoney(ventasTotal, culture)} | Cobros: {FormatMoney(cobrosTotal, culture)} | {visitasHoy} visitas");

        return new AutomationResult(true,
            $"Resumen enviado: {ventasCount} ventas, {cobrosCount} cobros, {visitasHoy} visitas");
    }

    private static string FormatMoney(decimal amount, System.Globalization.CultureInfo culture)
        => amount.ToString("C0", culture);
}
