namespace HandySales.Shared.Email;

public static class EmailTemplates
{
    private static string Wrap(string title, string body) => $@"
<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1""></head>
<body style=""margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"">
<table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#f3f4f6;padding:40px 20px"">
<tr><td align=""center"">
<table width=""600"" cellpadding=""0"" cellspacing=""0"" style=""background:#fff;border-radius:8px;overflow:hidden"">
  <tr><td style=""background:#16A34A;padding:24px 32px"">
    <span style=""color:#fff;font-size:22px;font-weight:700"">HandySales</span>
  </td></tr>
  <tr><td style=""padding:32px"">
    <h2 style=""margin:0 0 16px;color:#111827;font-size:20px"">{title}</h2>
    {body}
  </td></tr>
  <tr><td style=""padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb"">
    <p style=""margin:0;color:#9ca3af;font-size:12px"">Este es un mensaje automático de HandySales. No responda a este correo.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>";

    public static string SubscriptionExpiringWarning(string companyName, int daysLeft, DateTime expirationDate)
        => Wrap("Su suscripción está por vencer", $@"
    <p style=""color:#374151;line-height:1.6"">Hola, equipo de <strong>{companyName}</strong>,</p>
    <p style=""color:#374151;line-height:1.6"">Su suscripción de HandySales vence en <strong>{daysLeft} día(s)</strong> ({expirationDate:dd/MM/yyyy}).</p>
    <p style=""color:#374151;line-height:1.6"">Para evitar la interrupción del servicio, por favor renueve su suscripción antes de la fecha de vencimiento.</p>
    <div style=""margin:24px 0;text-align:center"">
      <a href=""https://app.handysales.com/subscription"" style=""display:inline-block;padding:12px 32px;background:#16A34A;color:#fff;text-decoration:none;border-radius:6px;font-weight:600"">Renovar Suscripción</a>
    </div>");

    public static string SubscriptionExpired(string companyName)
        => Wrap("Su suscripción ha expirado", $@"
    <p style=""color:#374151;line-height:1.6"">Hola, equipo de <strong>{companyName}</strong>,</p>
    <p style=""color:#374151;line-height:1.6"">Su suscripción de HandySales ha expirado. Su cuenta entrará en un período de gracia durante el cual podrá seguir accediendo al sistema con funcionalidad limitada.</p>
    <p style=""color:#374151;line-height:1.6"">Si no renueva antes de que termine el período de gracia, su cuenta será desactivada.</p>
    <div style=""margin:24px 0;text-align:center"">
      <a href=""https://app.handysales.com/subscription"" style=""display:inline-block;padding:12px 32px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600"">Renovar Ahora</a>
    </div>");

    public static string TenantDeactivated(string companyName)
        => Wrap("Cuenta Desactivada", $@"
    <p style=""color:#374151;line-height:1.6"">Hola, equipo de <strong>{companyName}</strong>,</p>
    <p style=""color:#374151;line-height:1.6"">Su cuenta de HandySales ha sido desactivada. Ya no podrá acceder al sistema hasta que su cuenta sea reactivada.</p>
    <p style=""color:#374151;line-height:1.6"">Si desea reactivar su cuenta, contacte a nuestro equipo de soporte:</p>
    <p style=""color:#374151;line-height:1.6""><strong>Email:</strong> soporte@handysales.com</p>");

    public static string PaymentFailed(string companyName, string lastFour)
        => Wrap("Error en el pago", $@"
    <p style=""color:#374151;line-height:1.6"">Hola, equipo de <strong>{companyName}</strong>,</p>
    <p style=""color:#374151;line-height:1.6"">No pudimos procesar el pago de su suscripción de HandySales{(string.IsNullOrEmpty(lastFour) ? "" : $" (tarjeta terminada en {lastFour})")}.</p>
    <p style=""color:#374151;line-height:1.6"">Por favor actualice su método de pago para evitar la interrupción del servicio.</p>
    <div style=""margin:24px 0;text-align:center"">
      <a href=""https://app.handysales.com/subscription"" style=""display:inline-block;padding:12px 32px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600"">Actualizar Método de Pago</a>
    </div>");

    public static string PaymentSuccessful(string companyName, string planName, decimal amount)
        => Wrap("Pago recibido", $@"
    <p style=""color:#374151;line-height:1.6"">Hola, equipo de <strong>{companyName}</strong>,</p>
    <p style=""color:#374151;line-height:1.6"">Hemos recibido su pago de <strong>${amount:N2} MXN</strong> por el plan <strong>{planName}</strong>.</p>
    <p style=""color:#374151;line-height:1.6"">Gracias por su confianza en HandySales.</p>");

    public static string WelcomeNewTenant(string companyName, string adminName)
        => Wrap("Bienvenido a HandySales", $@"
    <p style=""color:#374151;line-height:1.6"">Hola <strong>{adminName}</strong>,</p>
    <p style=""color:#374151;line-height:1.6"">¡Bienvenido a HandySales! Su empresa <strong>{companyName}</strong> ha sido registrada exitosamente.</p>
    <p style=""color:#374151;line-height:1.6"">Puede comenzar a usar el sistema inmediatamente:</p>
    <div style=""margin:24px 0;text-align:center"">
      <a href=""https://app.handysales.com/dashboard"" style=""display:inline-block;padding:12px 32px;background:#16A34A;color:#fff;text-decoration:none;border-radius:6px;font-weight:600"">Ir al Dashboard</a>
    </div>");

    public static string PasswordReset(string userName, string resetUrl)
        => Wrap("Restablecer Contraseña", $@"
    <p style=""color:#374151;line-height:1.6"">Hola <strong>{userName}</strong>,</p>
    <p style=""color:#374151;line-height:1.6"">Recibimos una solicitud para restablecer la contraseña de su cuenta de HandySales.</p>
    <p style=""color:#374151;line-height:1.6"">Haga clic en el botón para crear una nueva contraseña. Este enlace expira en <strong>30 minutos</strong>.</p>
    <div style=""margin:24px 0;text-align:center"">
      <a href=""{resetUrl}"" style=""display:inline-block;padding:12px 32px;background:#16A34A;color:#fff;text-decoration:none;border-radius:6px;font-weight:600"">Restablecer Contraseña</a>
    </div>
    <p style=""color:#9ca3af;font-size:13px;line-height:1.6"">Si no solicitó este cambio, ignore este correo. Su contraseña no será modificada.</p>");
}
