namespace HandySales.Shared.Email;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlBody);
    Task SendBulkAsync(IEnumerable<string> recipients, string subject, string htmlBody);
}
