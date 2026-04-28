using System.Security.Claims;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Http;

namespace HandySuites.Infrastructure.Repositories;

public class CurrentTenant : ICurrentTenant
{
    private readonly IHttpContextAccessor _accessor;
    private int? _tenantId;
    private string? _userId;
    private string? _role;

    public CurrentTenant(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    public int TenantId
    {
        get
        {
            if (!_tenantId.HasValue)
            {
                var user = _accessor.HttpContext?.User;
                var tenantClaim = user?.FindFirst("tenant_id")?.Value;
                if (!int.TryParse(tenantClaim, out var tenantId))
                    throw new UnauthorizedAccessException("Missing tenant ID");
                _tenantId = tenantId;
            }
            return _tenantId.Value;
        }
    }

    public string UserId
    {
        get
        {
            if (_userId == null)
            {
                var user = _accessor.HttpContext?.User;
                _userId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? user?.FindFirst("sub")?.Value
                         ?? user?.FindFirst("userId")?.Value
                         ?? throw new UnauthorizedAccessException("Missing user ID");
            }
            return _userId;
        }
    }

    public string Role
    {
        get
        {
            if (_role == null)
            {
                var user = _accessor.HttpContext?.User;
                // Single source of truth: claim "role" emitido por JwtTokenGenerator.
                // El cliente JWT puede mapear `role` a ClaimTypes.Role o no — probamos ambos.
                _role = user?.FindFirst("role")?.Value
                        ?? user?.FindFirst(ClaimTypes.Role)?.Value
                        ?? "VENDEDOR";
            }
            return _role;
        }
    }

    public bool IsAdmin => Role is "ADMIN" or "SUPER_ADMIN" or "SUPERVISOR";

    public bool IsSuperAdmin => Role == "SUPER_ADMIN";

    public bool IsSupervisor => Role == "SUPERVISOR";
}
