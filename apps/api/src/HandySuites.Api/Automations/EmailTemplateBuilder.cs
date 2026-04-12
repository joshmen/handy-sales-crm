using System.Text;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations;

/// <summary>
/// Builds professional branded HTML email templates using company data.
/// Uses HTML tables for maximum email client compatibility (Outlook, Gmail, Yahoo, Apple Mail).
/// </summary>
public class EmailTemplateBuilder
{
    private readonly string _logoUrl;
    private readonly string _companyName;
    private readonly string _primaryColor;
    private readonly string _address;
    private readonly string _phone;
    private readonly string _email;
    private readonly string _website;

    private EmailTemplateBuilder(string logoUrl, string companyName, string primaryColor,
        string address, string phone, string email, string website)
    {
        _logoUrl = logoUrl;
        _companyName = companyName;
        _primaryColor = primaryColor;
        _address = address;
        _phone = phone;
        _email = email;
        _website = website;
    }

    /// <summary>
    /// Create a builder from tenant data. Fetches DatosEmpresa + CompanySetting.
    /// </summary>
    public static async Task<EmailTemplateBuilder> CreateAsync(HandySuitesDbContext db, int tenantId, CancellationToken ct)
    {
        var settings = await db.Set<CompanySetting>()
            .Where(cs => cs.TenantId == tenantId)
            .Select(cs => new { cs.LogoUrl, cs.PrimaryColor, cs.CompanyName })
            .FirstOrDefaultAsync(ct);

        var datos = await db.DatosEmpresa
            .Where(de => de.TenantId == tenantId)
            .Select(de => new { de.RazonSocial, de.Direccion, de.Ciudad, de.Estado, de.CodigoPostal, de.Telefono, de.Email, de.SitioWeb })
            .FirstOrDefaultAsync(ct);

        var companyName = settings?.CompanyName ?? datos?.RazonSocial ?? "Mi Empresa";
        var primaryColor = settings?.PrimaryColor ?? "#16a34a";
        var logoUrl = settings?.LogoUrl ?? "";

        var addressParts = new List<string>();
        if (!string.IsNullOrEmpty(datos?.Direccion)) addressParts.Add(datos.Direccion);
        if (!string.IsNullOrEmpty(datos?.Ciudad)) addressParts.Add(datos.Ciudad);
        if (!string.IsNullOrEmpty(datos?.Estado)) addressParts.Add(datos.Estado);
        if (!string.IsNullOrEmpty(datos?.CodigoPostal)) addressParts.Add($"C.P. {datos.CodigoPostal}");

        return new EmailTemplateBuilder(
            logoUrl,
            companyName,
            primaryColor,
            string.Join(", ", addressParts),
            datos?.Telefono ?? "",
            datos?.Email ?? "",
            datos?.SitioWeb ?? ""
        );
    }

    /// <summary>
    /// Wrap content HTML in a professional branded email layout.
    /// </summary>
    public string Build(string titulo, string contentHtml, string? preheaderText = null, string language = "es")
    {
        var preheader = preheaderText ?? titulo;
        var lighterBg = "#f8faf9";

        return $"""
        <!DOCTYPE html>
        <html lang="{language}">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
            <title>{Escape(titulo)}</title>
            <!-- MSO fallback font handled via inline styles -->
        </head>
        <body style="margin:0;padding:0;background-color:{lighterBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
            <!-- Preheader (hidden preview text) -->
            <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{Escape(preheader)}</div>

            <!-- Outer wrapper -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:{lighterBg};">
                <tr>
                    <td align="center" style="padding:24px 16px;">

                        <!-- Email container: 600px max -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

                            {BuildHeader(titulo)}

                            <!-- Content -->
                            <tr>
                                <td style="padding:28px 32px 16px 32px;">
                                    {contentHtml}
                                </td>
                            </tr>

                            {BuildFooter()}

                        </table>

                        <!-- Sub-footer -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
                            <tr>
                                <td align="center" style="padding:16px 32px;">
                                    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
                                        {AutomationMessages.Get("email.footer1", language)}<br/>
                                        {AutomationMessages.Get("email.footer2", language)}
                                    </p>
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>
            </table>
        </body>
        </html>
        """;
    }

    private string BuildHeader(string titulo)
    {
        var logoHtml = "";
        if (!string.IsNullOrEmpty(_logoUrl))
        {
            // Apply Cloudinary transformation to pre-crop/resize the image server-side.
            // object-fit:cover is ignored by email clients; we must resize via URL.
            var transformedUrl = ApplyCloudinaryTransform(_logoUrl, "c_pad,w_96,h_96,b_white");
            logoHtml = $"""
                <td width="48" style="padding-right:16px;">
                    <img src="{Escape(transformedUrl)}" alt="{Escape(_companyName)}" width="48" height="48"
                         border="0" style="display:block;border-radius:8px;" />
                </td>
            """;
        }

        return $"""
            <!-- Header with logo + company name -->
            <tr>
                <td style="background-color:{_primaryColor};padding:20px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            {logoHtml}
                            <td style="vertical-align:middle;">
                                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.85);font-weight:500;letter-spacing:0.5px;">{Escape(_companyName)}</p>
                                <h1 style="margin:4px 0 0 0;font-size:20px;color:#ffffff;font-weight:700;line-height:1.3;">{Escape(titulo)}</h1>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        """;
    }

    private string BuildFooter()
    {
        var contactItems = new List<string>();
        if (!string.IsNullOrEmpty(_phone))
            contactItems.Add($"&#128222; {Escape(_phone)}");
        if (!string.IsNullOrEmpty(_email))
            contactItems.Add($"&#9993; {Escape(_email)}");
        if (!string.IsNullOrEmpty(_website))
            contactItems.Add($"&#127760; <a href=\"{Escape(_website)}\" style=\"color:{_primaryColor};text-decoration:none;\">{Escape(_website)}</a>");

        var contactHtml = contactItems.Count > 0
            ? $"<p style=\"margin:0 0 6px 0;font-size:12px;color:#6b7280;line-height:1.8;\">{string.Join("&nbsp;&nbsp;&bull;&nbsp;&nbsp;", contactItems)}</p>"
            : "";

        var addressHtml = !string.IsNullOrEmpty(_address)
            ? $"<p style=\"margin:0;font-size:12px;color:#9ca3af;\">{Escape(_address)}</p>"
            : "";

        return $"""
            <!-- Divider -->
            <tr>
                <td style="padding:0 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr><td style="border-top:1px solid #e5e7eb;height:1px;font-size:0;">&nbsp;</td></tr>
                    </table>
                </td>
            </tr>

            <!-- Footer with company info -->
            <tr>
                <td style="padding:16px 32px 24px 32px;text-align:center;">
                    {contactHtml}
                    {addressHtml}
                </td>
            </tr>
        """;
    }

    // ── Static helpers for building content sections ──

    /// <summary>
    /// Build a row of KPI metric cards (2-4 per row).
    /// </summary>
    public static string KpiRow(params (string Label, string Value, string? Icon)[] kpis)
    {
        var cellWidth = 100 / Math.Max(kpis.Length, 1);
        var sb = new StringBuilder();
        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"margin-bottom:20px;\"><tr>");

        foreach (var (label, value, icon) in kpis)
        {
            var iconHtml = !string.IsNullOrEmpty(icon) ? $"<span style=\"font-size:20px;\">{icon}</span><br/>" : "";
            sb.Append($"""
                <td width="{cellWidth}%" align="center" style="padding:4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                           style="background:#f3f4f6;border-radius:10px;border:1px solid #e5e7eb;">
                        <tr><td style="padding:16px 12px;text-align:center;">
                            {iconHtml}
                            <p style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.2;">{Escape(value)}</p>
                            <p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">{Escape(label)}</p>
                        </td></tr>
                    </table>
                </td>
            """);
        }

        sb.Append("</tr></table>");
        return sb.ToString();
    }

    /// <summary>
    /// Build a data table with headers and rows.
    /// </summary>
    public static string Table(string[] headers, List<string[]> rows, string? primaryColor = null)
    {
        var color = primaryColor ?? "#16a34a";
        var sb = new StringBuilder();
        sb.Append($"""
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                   style="border-collapse:collapse;margin-bottom:20px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
                <tr>
        """);

        foreach (var header in headers)
        {
            sb.Append($"""
                <th style="background:{color};color:#ffffff;padding:10px 14px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">{Escape(header)}</th>
            """);
        }
        sb.Append("</tr>");

        for (var i = 0; i < rows.Count; i++)
        {
            var bgColor = i % 2 == 0 ? "#ffffff" : "#f9fafb";
            sb.Append($"<tr style=\"background:{bgColor};\">");
            foreach (var cell in rows[i])
            {
                sb.Append($"""
                    <td style="padding:10px 14px;font-size:13px;color:#374151;border-top:1px solid #e5e7eb;">{cell}</td>
                """);
            }
            sb.Append("</tr>");
        }

        sb.Append("</table>");
        return sb.ToString();
    }

    /// <summary>
    /// Build a section heading within content.
    /// </summary>
    public static string SectionHeading(string text)
    {
        return $"""
            <h2 style="margin:24px 0 12px 0;font-size:15px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">{Escape(text)}</h2>
        """;
    }

    /// <summary>
    /// Build an alert/callout box.
    /// </summary>
    public static string Callout(string message, string type = "info")
    {
        var (bg, border, icon) = type switch
        {
            "success" => ("#f0fdf4", "#86efac", "&#9989;"),
            "warning" => ("#fffbeb", "#fcd34d", "&#9888;&#65039;"),
            "error" => ("#fef2f2", "#fca5a5", "&#10060;"),
            _ => ("#eff6ff", "#93c5fd", "&#8505;&#65039;"),
        };

        return $"""
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;">
                <tr><td style="background:{bg};border-left:4px solid {border};border-radius:0 8px 8px 0;padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">{icon}&nbsp;&nbsp;{message}</p>
                </td></tr>
            </table>
        """;
    }

    /// <summary>
    /// Date/time stamp line.
    /// </summary>
    public static string DateStamp(DateTime date, string? timezone = "America/Mexico_City", string? language = "es")
    {
        DateTime local;
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timezone ?? "America/Mexico_City");
            local = TimeZoneInfo.ConvertTimeFromUtc(date, tz);
        }
        catch
        {
            local = date;
        }

        var culture = language switch {
                "en" => new System.Globalization.CultureInfo("en-US"),
                "pt" => new System.Globalization.CultureInfo("pt-BR"),
                _ => new System.Globalization.CultureInfo("es-MX"),
            };
            var formatted = local.ToString("dddd, dd 'de' MMMM yyyy", culture);
        return $"""
            <p style="margin:0 0 20px 0;font-size:13px;color:#6b7280;">&#128197;&nbsp;&nbsp;{formatted}</p>
        """;
    }

    /// <summary>
    /// Simple paragraph text.
    /// </summary>
    public static string Text(string text)
    {
        return $"<p style=\"margin:0 0 12px 0;font-size:14px;color:#374151;line-height:1.6;\">{text}</p>";
    }

    /// <summary>
    /// Insert a Cloudinary transformation into a Cloudinary URL.
    /// e.g. /upload/v123/file.jpg → /upload/c_fill,w_96,h_96/v123/file.jpg
    /// Non-Cloudinary URLs are returned unchanged.
    /// </summary>
    private static string ApplyCloudinaryTransform(string url, string transform)
    {
        const string marker = "/upload/";
        var idx = url.IndexOf(marker, StringComparison.Ordinal);
        if (idx < 0) return url;
        return url.Insert(idx + marker.Length, transform + "/");
    }

    private static string Escape(string s) => System.Net.WebUtility.HtmlEncode(s);
}
