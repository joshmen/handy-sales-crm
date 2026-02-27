namespace HandySales.Billing.Api.Services;

public static class BillingEmailTemplates
{
    public static string FacturaEmail(
        string serie,
        int folio,
        string receptorNombre,
        string emisorNombre,
        decimal total,
        string moneda,
        DateTime fechaEmision,
        bool incluyePdf,
        bool incluyeXml)
    {
        var attachmentsList = new List<string>();
        if (incluyePdf) attachmentsList.Add("PDF de la factura");
        if (incluyeXml) attachmentsList.Add("XML (CFDI)");

        var attachmentsHtml = attachmentsList.Count > 0
            ? $"<p style=\"color:#666;font-size:13px;\">Archivos adjuntos: {string.Join(", ", attachmentsList)}</p>"
            : "";

        return $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f4f4f7;padding:24px 0;"">
    <tr>
      <td align=""center"">
        <table width=""580"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#ffffff;border-radius:8px;overflow:hidden;"">
          <!-- Header -->
          <tr>
            <td style=""background: linear-gradient(135deg, #4F46E5, #7C3AED); padding:24px 32px;"">
              <h1 style=""margin:0;color:#ffffff;font-size:20px;font-weight:600;"">Handy Suites</h1>
              <p style=""margin:4px 0 0;color:#E0E7FF;font-size:13px;"">Facturación Electrónica</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style=""padding:32px;"">
              <p style=""margin:0 0 16px;font-size:15px;color:#333;"">
                Estimado/a <strong>{receptorNombre}</strong>,
              </p>
              <p style=""margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;"">
                Le hacemos llegar la factura <strong>{serie}-{folio}</strong> emitida
                el {fechaEmision:dd/MM/yyyy} por <strong>{emisorNombre}</strong>.
              </p>

              <!-- Invoice Summary -->
              <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;margin-bottom:24px;"">
                <tr>
                  <td style=""padding:16px;"">
                    <table width=""100%"" cellpadding=""4"" cellspacing=""0"">
                      <tr>
                        <td style=""color:#64748B;font-size:12px;"">Serie-Folio</td>
                        <td style=""text-align:right;font-weight:600;font-size:14px;"">{serie}-{folio}</td>
                      </tr>
                      <tr>
                        <td style=""color:#64748B;font-size:12px;"">Fecha de emisión</td>
                        <td style=""text-align:right;font-size:13px;"">{fechaEmision:dd/MM/yyyy}</td>
                      </tr>
                      <tr>
                        <td style=""color:#64748B;font-size:12px;"">Total</td>
                        <td style=""text-align:right;font-weight:700;font-size:18px;color:#4F46E5;"">${total:N2} {moneda}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              {attachmentsHtml}

              <p style=""margin:24px 0 0;font-size:13px;color:#888;line-height:1.5;"">
                Si tiene alguna duda sobre esta factura, por favor contacte directamente a {emisorNombre}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style=""padding:16px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;"">
              <p style=""margin:0;font-size:11px;color:#94A3B8;text-align:center;"">
                Este correo fue enviado automáticamente por Handy Suites &mdash; handysuites.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }
}
