using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace HandySuites.Infrastructure.Persistence;

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

    /// <summary>
    /// Email del usuario actual, o null si no está disponible.
    /// </summary>
    string? CurrentUserEmail { get; }
}

public class TenantContextService : ITenantContextService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantContextService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? TenantId
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User?.FindFirst("tenant_id")?.Value;
            return int.TryParse(claim, out var id) ? id : null;
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

            return TenantId.HasValue;
        }
    }

    public string? CurrentUserEmail
    {
        get
        {
            try
            {
                var user = _httpContextAccessor.HttpContext?.User;
                return user?.FindFirst(ClaimTypes.Email)?.Value
                    ?? user?.FindFirst("email")?.Value
                    ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            }
            catch
            {
                return null;
            }
        }
    }
}
