using HandySuites.Billing.Api.DTOs;

namespace HandySuites.Billing.Api.Services;

/// <summary>
/// Finkok Registration Web Service abstraction.
///
/// Audit BILL-1 (2026-05-26): cuando un tenant sube su CSD en /billing/settings,
/// hay que registrarlo como EMISOR bajo nuestra cuenta partner Finkok via SOAP `add`.
/// Si no se hace, el timbrado posterior falla porque Finkok no reconoce el RFC.
///
/// WSDL: https://[demo-]facturacion.finkok.com/servicios/soap/registration.wsdl
/// </summary>
public interface IRegistrationService
{
    /// <summary>
    /// Registra un nuevo RFC como emisor bajo nuestra cuenta reseller.
    /// Si Finkok responde "already exists" → result.AlreadyExists=true (caller debe llamar UpdateEmitterAsync).
    /// </summary>
    Task<RegisterEmitterResult> RegisterEmitterAsync(RegisterEmitterRequest request, CancellationToken ct = default);

    /// <summary>
    /// Actualiza un emisor existente. Permite:
    /// - Cambiar status (active/suspended/frozen) — pasar Cer/Key/Passphrase null
    /// - Renovar CSD (al caducar el viejo) — pasar bytes + passphrase
    /// </summary>
    Task<RegisterEmitterResult> UpdateEmitterAsync(UpdateEmitterRequest request, CancellationToken ct = default);

    /// <summary>
    /// Consulta info de un emisor: status, créditos restantes, type_user.
    /// Usado por sync job para mantener estado local actualizado.
    /// </summary>
    Task<EmitterInfoResult> GetEmitterInfoAsync(string rfc, CancellationToken ct = default);

    /// <summary>
    /// Asigna créditos prepago a un emisor (solo aplica si TypeUser='P').
    /// Caller debe verificar que el emisor está en modo prepago antes de llamar.
    /// </summary>
    Task<AssignCreditsResult> AssignCreditsAsync(string rfc, int credits, CancellationToken ct = default);

    /// <summary>
    /// Lista todos los emisores registrados bajo la cuenta partner (paginado).
    /// Usado por panel SuperAdmin HandySales para ver todos los tenants.
    /// </summary>
    Task<EmittersListResult> ListEmittersAsync(int page = 1, CancellationToken ct = default);

    /// <summary>
    /// Cambia la modalidad del emisor entre 'P' (prepago) y 'O' (ilimitado).
    /// Decisión comercial — solo SuperAdmin HandySales.
    /// </summary>
    Task<RegisterEmitterResult> SwitchTypeUserAsync(string rfc, char newTypeUser, CancellationToken ct = default);
}
