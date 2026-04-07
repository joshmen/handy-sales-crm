using System.Data.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace HandySales.Infrastructure.Persistence;

/// <summary>
/// EF Core command interceptor that prepends SET app.tenant_id before every SQL command.
/// This enables PostgreSQL RLS policies to enforce tenant isolation at the DB level.
/// Uses CommandInterceptor (not ConnectionInterceptor) to work with connection pooling.
/// </summary>
public class TenantRlsInterceptor : DbCommandInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantRlsInterceptor(IHttpContextAccessor httpContextAccessor)
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

    public override InterceptionResult<object> ScalarExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<object> result)
    {
        SetTenantId(command);
        return base.ScalarExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<object> result,
        CancellationToken cancellationToken = default)
    {
        SetTenantId(command);
        return base.ScalarExecutingAsync(command, eventData, result, cancellationToken);
    }

    private void SetTenantId(DbCommand command)
    {
        var tenantClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("tenant_id");
        if (tenantClaim == null || string.IsNullOrEmpty(tenantClaim.Value)) return;

        // Prepend SET to the actual SQL command — runs in same transaction/connection
        command.CommandText = $"SET LOCAL app.tenant_id = '{tenantClaim.Value}'; {command.CommandText}";
    }
}
