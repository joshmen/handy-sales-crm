using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace HandySales.Infrastructure.Persistence;

/// <summary>
/// Servicio para obtener el tenant del contexto HTTP de forma segura.
/// No lanza excepción si no hay contexto (útil para migraciones, seeds, tests).
/// </summary>
public interface ITenantContextService
{
    /// <summary>
    /// Obtiene el TenantId del usuario actual, o null si no está disponible.
    /// </summary>
    int? TenantId { get; }

    /// <summary>
    /// Indica si los filtros de tenant deben aplicarse.
    /// False durante migraciones, seeds, o para super admins.
    /// </summary>
    bool ShouldApplyFilter { get; }
}

public class TenantContextService : ITenantContextService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private int? _tenantId;
    private bool _resolved;

    public TenantContextService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? TenantId
    {
        get
        {
            if (!_resolved)
            {
                ResolveTenant();
            }
            return _tenantId;
        }
    }

    public bool ShouldApplyFilter
    {
        get
        {
            // No aplicar filtro si no hay contexto HTTP (migraciones, seeds)
            if (_httpContextAccessor.HttpContext == null)
                return false;

            // No aplicar filtro si no hay usuario autenticado
            var user = _httpContextAccessor.HttpContext.User;
            if (user?.Identity?.IsAuthenticated != true)
                return false;

            // Super admins pueden ver todo (opcional - comentar si no se desea)
            // var isSuperAdmin = user.FindFirst("es_super_admin")?.Value == "True";
            // if (isSuperAdmin)
            //     return false;

            return TenantId.HasValue;
        }
    }

    private void ResolveTenant()
    {
        _resolved = true;

        try
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var tenantClaim = user?.FindFirst("tenant_id")?.Value;

            if (int.TryParse(tenantClaim, out var tenantId))
            {
                _tenantId = tenantId;
            }
        }
        catch
        {
            // Ignorar errores - _tenantId permanece null
        }
    }
}
