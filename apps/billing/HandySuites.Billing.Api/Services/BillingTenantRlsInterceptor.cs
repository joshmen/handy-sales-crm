using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace HandySuites.Billing.Api.Services;

/// <summary>
/// EF Core command interceptor for billing DB — sets app.tenant_id (text) for RLS.
/// Billing uses string tenant_id (varchar), not int like the main DB.
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
        var tenantClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("tenant_id");
        if (tenantClaim == null || string.IsNullOrEmpty(tenantClaim.Value)) return;

        command.CommandText = $"SET LOCAL app.tenant_id = '{tenantClaim.Value}'; {command.CommandText}";
    }
}
