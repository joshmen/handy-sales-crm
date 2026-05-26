namespace HandySuites.Billing.Api.Services;

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

    /// <summary>
    /// Notifica al admin del tenant que su RFC quedó registrado en Finkok y ya puede facturar.
    /// BILL-1 (2026-05-26).
    /// </summary>
    Task<bool> SendFinkokRegistrationSuccessAsync(string toEmail, string rfc, string? razonSocial, char typeUser, string lang = "es");

    /// <summary>
    /// Notifica al admin del tenant que Finkok rechazó el registro del RFC con el mensaje específico.
    /// BILL-1 (2026-05-26).
    /// </summary>
    Task<bool> SendFinkokRegistrationFailureAsync(string toEmail, string rfc, string finkokErrorMessage, string lang = "es");
}
