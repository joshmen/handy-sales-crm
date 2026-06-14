using System.Net.Mail;
using Microsoft.Extensions.Logging;

namespace HandySuites.Shared.Email;

/// <summary>
/// SMTP email service para desarrollo/test: envía a un servidor SMTP local
/// (ej. Mailpit en mailpit:1025) que captura los correos para inspección via API.
/// Se activa cuando la env var SMTP_HOST está configurada (ver ServiceRegistrationExtensions).
/// Permite E2E reales de verificación de email sin SendGrid ni una bandeja real.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly string _host;
    private readonly int _port;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(ILogger<SmtpEmailService> logger)
    {
        _logger = logger;
        _host = Environment.GetEnvironmentVariable("SMTP_HOST") ?? "localhost";
        _port = int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT"), out var p) ? p : 1025;
        _fromEmail = Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL") ?? "no-reply@handysuites.local";
        _fromName = Environment.GetEnvironmentVariable("SENDGRID_FROM_NAME") ?? "HandySuites";
    }

    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        using var client = new SmtpClient(_host, _port) { EnableSsl = false };
        using var msg = new MailMessage
        {
            From = new MailAddress(_fromEmail, _fromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
        };
        msg.To.Add(to);
        await client.SendMailAsync(msg);
        _logger.LogInformation("SMTP email a {To} via {Host}:{Port} — {Subject}", to, _host, _port, subject);
    }

    public async Task SendBulkAsync(IEnumerable<string> recipients, string subject, string htmlBody)
    {
        foreach (var to in recipients)
        {
            await SendAsync(to, subject, htmlBody);
        }
    }
}
