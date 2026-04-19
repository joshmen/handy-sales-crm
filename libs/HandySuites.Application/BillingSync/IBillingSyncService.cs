namespace HandySuites.Application.BillingSync;

public interface IBillingSyncService
{
    /// <summary>
    /// Replica los campos fiscales duplicados (RFC, razón social, dirección, CP)
    /// desde DatosEmpresa (handy_erp) hacia ConfiguracionFiscal (handy_billing).
    ///
    /// SEGURIDAD: forwardea el JWT del usuario (userJwt) que hizo el update original.
    /// Esto permite que Billing API aplique Row-Level Security y global query filters
    /// normalmente — el sync NO bypassa seguridad multi-tenant.
    ///
    /// No-op si BILLING_API_URL o BILLING_INTERNAL_API_KEY no están configurados.
    /// Fallos de red se loguean como WARN, no rompen el flujo principal.
    /// </summary>
    Task SyncDatosEmpresaAsync(SyncDatosEmpresaDto dto, string userJwt, CancellationToken ct = default);
}

public record SyncDatosEmpresaDto(
    int TenantId,
    string? Rfc,
    string? RazonSocial,
    string? DireccionFiscal,
    string? CodigoPostal);
