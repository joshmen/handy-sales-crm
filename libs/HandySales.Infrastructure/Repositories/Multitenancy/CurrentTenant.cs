using System.Security.Claims;
using HandySales.Shared.Multitenancy;
using Microsoft.AspNetCore.Http;

namespace HandySales.Infrastructure.Repositories;

public class CurrentTenant : ICurrentTenant
{
    private readonly IHttpContextAccessor _accessor;
    private int? _tenantId;
    private string? _userId;
    private bool? _isAdmin;
    private bool? _isSuperAdmin;

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

    public bool IsAdmin
    {
        get
        {
            if (!_isAdmin.HasValue)
            {
                var user = _accessor.HttpContext?.User;
                _isAdmin = user?.FindFirst("es_admin")?.Value == "True" || user?.HasClaim(ClaimTypes.Role, "Admin") == true;
            }
            return _isAdmin.Value;
        }
    }

    public bool IsSuperAdmin
    {
        get
        {
            if (!_isSuperAdmin.HasValue)
            {
                var user = _accessor.HttpContext?.User;
                _isSuperAdmin = user?.FindFirst("es_super_admin")?.Value == "True" || user?.HasClaim(ClaimTypes.Role, "SuperAdmin") == true;
            }
            return _isSuperAdmin.Value;
        }
    }
}
