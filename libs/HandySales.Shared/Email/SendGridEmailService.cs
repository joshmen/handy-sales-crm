using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace HandySales.Shared.Email;

public class SendGridEmailService : IEmailService
{
    private readonly SendGridClient _client;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly ILogger<SendGridEmailService> _logger;

    public SendGridEmailService(ILogger<SendGridEmailService> logger)
    {
        _logger = logger;

        var apiKey = Environment.GetEnvironmentVariable("SENDGRID_API_KEY");
        _fromEmail = Environment.GetEnvironmentVariable("SENDGRID_FROM_EMAIL") ?? "no-reply@handysales.com";
        _fromName = Environment.GetEnvironmentVariable("SENDGRID_FROM_NAME") ?? "HandySales";

        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("SENDGRID_API_KEY not configured — emails will be logged but not sent");
            _client = new SendGridClient("placeholder");
        }
        else
        {
            _client = new SendGridClient(apiKey);
        }
    }

    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        var apiKey = Environment.GetEnvironmentVariable("SENDGRID_API_KEY");
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogInformation("EMAIL (dry run) to={To} subject={Subject}", to, subject);
            return;
        }

        var msg = new SendGridMessage
        {
            From = new EmailAddress(_fromEmail, _fromName),
            Subject = subject,
            HtmlContent = htmlBody
        };
        msg.AddTo(new EmailAddress(to));

        var response = await _client.SendEmailAsync(msg);

        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation("Email sent to {To}: {Subject}", to, subject);
        }
        else
        {
            var body = await response.Body.ReadAsStringAsync();
            _logger.LogError("SendGrid error {Status}: {Body}", response.StatusCode, body);
        }
    }

    public async Task SendBulkAsync(IEnumerable<string> recipients, string subject, string htmlBody)
    {
        foreach (var to in recipients)
        {
            await SendAsync(to, subject, htmlBody);
        }
    }
}
