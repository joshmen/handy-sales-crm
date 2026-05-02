namespace HandySuites.Application.TwoFactor;

/// <summary>
/// Verifica códigos TOTP y recovery codes para un usuario. Compartido entre
/// la API web (HandySuites.Api.TwoFactor.TotpService usa la implementación
/// canónica) y la API mobile (que necesita validar TOTP en login pero NO
/// genera secrets/recovery codes — esos siguen siendo solo del flow web).
///
/// Mantiene esta superficie mínima a propósito: el mobile NO debería poder
/// generar setup, regenerar recovery, o deshabilitar 2FA — todo eso vive
/// en /api/2fa/* del web.
/// </summary>
public interface ITotpVerifier
{
    Task<bool> VerifyLoginCodeAsync(int userId, string code);
    Task<bool> UseRecoveryCodeAsync(int userId, string code);
}
