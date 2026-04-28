using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace HandySuites.Billing.Api.Services;

/// <summary>
/// EF Core command interceptor for billing DB — sets app.tenant_id (text) + app.is_super_admin for RLS.
/// Billing uses string tenant_id (varchar), not int like the main DB.
///
/// Context sources (same semantics as TenantRlsInterceptor):
///   1. HttpContext with JWT → tenant_id + es_super_admin claims.
///   2. No HttpContext (scheduled PAC jobs, internal sync endpoint without JWT) →
///      system context: is_super_admin='true', tenant_id=''.
/// </summary>
public class BillingTenantRlsInterceptor : DbCommandInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public BillingTenantRlsInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override InterceptionResult<DbDataReader> ReaderExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result)
    {
        SetTenantId(command);
        return base.ReaderExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        SetTenantId(command);
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> NonQueryExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<int> result)
    {
        SetTenantId(command);
        return base.NonQueryExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        SetTenantId(command);
        return base.NonQueryExecutingAsync(command, eventData, result, cancellationToken);
    }

    private void SetTenantId(DbCommand command)
    {
        if (command.CommandText.StartsWith("SET app.")) return;

        string tenantId;
        string isSuperAdmin;

        var httpContext = _httpContextAccessor.HttpContext;
        var tenantClaim = httpContext?.User?.FindFirst("tenant_id");
        var roleClaim = httpContext?.User?.FindFirst("role")
                        ?? httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.Role);

        if (tenantClaim != null && !string.IsNullOrEmpty(tenantClaim.Value))
        {
            tenantId = tenantClaim.Value;
            isSuperAdmin = roleClaim?.Value == "SUPER_ADMIN" ? "true" : "false";
        }
        else
        {
            // No HTTP context: system/worker. Bypass RLS.
            tenantId = "";
            isSuperAdmin = "true";
        }

        using var setCmd = command.Connection!.CreateCommand();
        setCmd.Transaction = command.Transaction;
        setCmd.CommandText = $"SET app.tenant_id = '{tenantId}'; SET app.is_super_admin = '{isSuperAdmin}'";
        setCmd.ExecuteNonQuery();
    }
}
