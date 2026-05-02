public class UsuarioLoginDto
{
    public string email { get; set; } = string.Empty;
    public string password { get; set; } = string.Empty;
    public string? recaptchaToken { get; set; }
    /// <summary>
    /// Código TOTP (6 dígitos) o recovery code (XXXX-XXXX) — solo requerido
    /// cuando el usuario tiene 2FA habilitado. El cliente lo manda en el
    /// segundo intento tras recibir TOTP_REQUIRED en el primer login.
    /// </summary>
    public string? totpCode { get; set; }
}
