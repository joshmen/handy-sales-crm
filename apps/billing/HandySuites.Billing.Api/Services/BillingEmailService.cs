using SendGrid;
using SendGrid.Helpers.Mail;

namespace HandySuites.Billing.Api.Services;

public class BillingEmailService : IBillingEmailService
{
    private readonly ILogger<BillingEmailService> _logger;
    private readonly string? _apiKey;
    private readonly string _fromEmail;
    private readonly string _fromName;

    public BillingEmailService(IConfiguration configuration, ILogger<BillingEmailService> logger)
    {
        _logger = logger;
        _apiKey = configuration["SENDGRID_API_KEY"];
        var fromEmail = configuration["SENDGRID_FROM_EMAIL"];
        _fromName = configuration["SENDGRID_FROM_NAME"] ?? "Handy Suites";

        if (!string.IsNullOrEmpty(_apiKey) && string.IsNullOrEmpty(fromEmail))
        {
            throw new InvalidOperationException(
                "SENDGRID_FROM_EMAIL must be configured when SENDGRID_API_KEY is set.");
        }

        _fromEmail = fromEmail ?? "dry-run@localhost";
    }

    public async Task<bool> SendFacturaAsync(
        string toEmail,
        string subject,
        string htmlBody,
        byte[]? pdfBytes = null,
        string? pdfFileName = null,
        string? xmlContent = null,
        string? xmlFileName = null)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning(
                "SENDGRID_API_KEY not configured. Dry run — email to {Email} with subject '{Subject}' would be sent. " +
                "PDF attached: {HasPdf}, XML attached: {HasXml}",
                toEmail, subject, pdfBytes != null, xmlContent != null);
            return true;
        }

        try
        {
            var client = new SendGridClient(_apiKey);
            var from = new EmailAddress(_fromEmail, _fromName);
            var to = new EmailAddress(toEmail);
            var msg = MailHelper.CreateSingleEmail(from, to, subject, null, htmlBody);

            // Attach PDF
            if (pdfBytes is { Length: > 0 } && !string.IsNullOrEmpty(pdfFileName))
            {
                msg.AddAttachment(pdfFileName, Convert.ToBase64String(pdfBytes), "application/pdf");
            }

            // Attach XML
            if (!string.IsNullOrEmpty(xmlContent) && !string.IsNullOrEmpty(xmlFileName))
            {
                var xmlBytes = System.Text.Encoding.UTF8.GetBytes(xmlContent);
                msg.AddAttachment(xmlFileName, Convert.ToBase64String(xmlBytes), "application/xml");
            }

            var response = await client.SendEmailAsync(msg);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Email sent to {Email}: {Subject}", toEmail, subject);
                return true;
            }

            var body = await response.Body.ReadAsStringAsync();
            _logger.LogError("SendGrid error {StatusCode}: {Body}", response.StatusCode, body);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            return false;
        }
    }
}
