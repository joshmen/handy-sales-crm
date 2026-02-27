namespace HandySales.Billing.Api.Services;

public interface IBillingEmailService
{
    Task<bool> SendFacturaAsync(
        string toEmail,
        string subject,
        string htmlBody,
        byte[]? pdfBytes = null,
        string? pdfFileName = null,
        string? xmlContent = null,
        string? xmlFileName = null);
}
