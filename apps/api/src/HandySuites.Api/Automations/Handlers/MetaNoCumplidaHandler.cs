using System.Globalization;
using System.Text;
using HandySuites.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class MetaNoCumplidaHandler : IAutomationHandler
{
    public string Slug => "meta-no-cumplida";
    private const string CanalVendedor = "push";
    private const string CanalAdmin = "push";

    private static string M(string key, string lang) => AutomationMessages.Get(key, lang);

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var lang = culture.TwoLetterISOLanguageName; // "es" or "en"
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var porcentajeAlerta = context.GetParam("porcentaje_alerta", 80);
        var tz = TimeZoneInfo.FindSystemTimeZoneById(tenantTz ?? "America/Mexico_City");
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);

        // Pull metas active during the current period
        var metas = await context.Db.Set<MetaVendedor>()
            .Where(m => m.TenantId == context.TenantId
                     && m.Activo
                     && m.FechaInicio <= now
                     && m.FechaFin >= now.AddDays(-7)) // include metas ending this week
            .Select(m => new
            {
                m.Id,
                m.UsuarioId,
                m.Tipo,
                m.Periodo,
                m.Monto,
                m.FechaInicio,
                m.FechaFin,
                UsuarioNombre = m.Usuario.Nombre ?? "Sin nombre",
            })
            .ToListAsync(ct);

        if (metas.Count == 0)
            return new AutomationResult(true, "Sin metas configuradas para el período actual");

        var alertas = new List<(string VendedorNombre, int VendedorId, string Tipo, decimal Meta, decimal Real, int Pct)>();

        foreach (var meta in metas)
        {
            decimal realizado = meta.Tipo switch
            {
                "ventas" => await context.Db.Pedidos
                    .Where(p => p.TenantId == context.TenantId
                             && p.UsuarioId == meta.UsuarioId
                             && p.Activo
                             && p.Estado != EstadoPedido.Cancelado
                             && p.FechaPedido >= meta.FechaInicio
                             && p.FechaPedido <= now)
                    .SumAsync(p => p.Total, ct),

                "pedidos" => await context.Db.Pedidos
                    .Where(p => p.TenantId == context.TenantId
                             && p.UsuarioId == meta.UsuarioId
                             && p.Activo
                             && p.Estado != EstadoPedido.Cancelado
                             && p.FechaPedido >= meta.FechaInicio
                             && p.FechaPedido <= now)
                    .CountAsync(ct),

                "visitas" => await context.Db.ClienteVisitas
                    .Where(v => v.TenantId == context.TenantId
                             && v.UsuarioId == meta.UsuarioId
                             && v.FechaHoraInicio >= meta.FechaInicio
                             && v.FechaHoraInicio <= now)
                    .CountAsync(ct),

                _ => 0m,
            };

            var pct = meta.Monto > 0 ? (int)(realizado / meta.Monto * 100) : 100;

            if (pct < porcentajeAlerta)
            {
                alertas.Add((meta.UsuarioNombre, meta.UsuarioId, meta.Tipo, meta.Monto, realizado, pct));
            }
        }

        if (alertas.Count == 0)
            return new AutomationResult(true, $"Todos los vendedores están al ≥{porcentajeAlerta}% de su meta");

        // ── Push to each vendedor ──
        foreach (var (nombre, vendedorId, tipo, metaMonto, real, pct) in alertas)
        {
            var tipoLabel = tipo switch { "ventas" => M("table.ventas", lang).ToLower(), "pedidos" => M("table.pedidos", lang).ToLower(), "visitas" => "visitas", _ => tipo };
            var metaStr = tipo == "ventas" ? FormatMoney(metaMonto, culture) : $"{metaMonto:N0}";
            var realStr = tipo == "ventas" ? FormatMoney(real, culture) : $"{real:N0}";

            await context.NotifyUserAsync(vendedorId,
                $"{M("table.meta", lang)} {tipoLabel} — {pct}%",
                $"{realStr} / {metaStr} ({pct}%)",
                "Alert", CanalVendedor, ct);
        }

        // ── Rich email + push to admin ──
        var adminId = await context.GetAdminUserIdAsync(ct);
        if (adminId.HasValue)
        {
            var resumen = alertas.Count == 1
                ? $"{alertas[0].VendedorNombre} — {alertas[0].Pct}%"
                : $"{alertas.Count} {M("metaNoCumplida.heading", lang).ToLower()}";

            await context.NotifyUserAsync(adminId.Value,
                M("metaNoCumplida.subject", lang),
                resumen,
                "Alert", CanalAdmin, ct);

            // Rich email
            var content = new StringBuilder();
            content.Append(EmailTemplateBuilder.DateStamp(now, tenantTz, lang));
            content.Append(EmailTemplateBuilder.KpiRow(
                (M("metaNoCumplida.heading", lang), alertas.Count.ToString(), "⚠️"),
                ($"{M("table.cumplimiento", lang)} <", $"{porcentajeAlerta}%", "🎯"),
                (M("table.meta", lang), metas.Count.ToString(), "📊")
            ));
            content.Append(EmailTemplateBuilder.Callout(
                $"<strong>{alertas.Count}</strong> vendedor{(alertas.Count != 1 ? "es" : "")} " +
                $"< <strong>{porcentajeAlerta}%</strong>.",
                alertas.Any(a => a.Pct < 50) ? "error" : "warning"));

            var rows = alertas
                .OrderBy(a => a.Pct)
                .Select(a =>
                {
                    var tipoLabel = a.Tipo switch { "ventas" => $"💰 {M("table.ventas", lang)}", "pedidos" => $"📦 {M("table.pedidos", lang)}", "visitas" => "📍 Visitas", _ => a.Tipo };
                    var metaStr = a.Tipo == "ventas" ? FormatMoney(a.Meta, culture) : $"{a.Meta:N0}";
                    var realStr = a.Tipo == "ventas" ? FormatMoney(a.Real, culture) : $"{a.Real:N0}";
                    var pctColor = a.Pct < 50 ? "#dc2626" : a.Pct < 70 ? "#d97706" : "#2563eb";
                    return new[]
                    {
                        System.Net.WebUtility.HtmlEncode(a.VendedorNombre),
                        tipoLabel,
                        metaStr,
                        realStr,
                        $"<span style=\"color:{pctColor};font-weight:700;\">{a.Pct}%</span>",
                    };
                }).ToList();

            content.Append(EmailTemplateBuilder.SectionHeading(M("metaNoCumplida.heading", lang)));
            content.Append(EmailTemplateBuilder.Table(
                new[] { M("table.vendedor", lang), M("table.tipo", lang), M("table.meta", lang), M("table.actual", lang), M("table.cumplimiento", lang) }, rows));

            await context.SendAdminEmailAsync(
                M("metaNoCumplida.subject", lang),
                content.ToString(),
                ct,
                $"{alertas.Count} vendedores < {porcentajeAlerta}%",
                language: lang);
        }

        return new AutomationResult(true,
            $"Alertas enviadas: {alertas.Count} vendedor{(alertas.Count != 1 ? "es" : "")} bajo el {porcentajeAlerta}%");
    }

    private static string FormatMoney(decimal amount, System.Globalization.CultureInfo culture) => amount.ToString("C0", culture);
}
