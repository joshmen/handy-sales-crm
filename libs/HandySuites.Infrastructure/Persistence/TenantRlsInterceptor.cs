using System.Data.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace HandySuites.Infrastructure.Persistence;

/// <summary>
/// Sets app.tenant_id on connection open AND on every command.
/// Double-ensures RLS context is always correct even with connection pooling.
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
        PrependSet(command);
        return base.ReaderExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        PrependSet(command);
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> NonQueryExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<int> result)
    {
        PrependSet(command);
        return base.NonQueryExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        PrependSet(command);
        return base.NonQueryExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override InterceptionResult<object> ScalarExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<object> result)
    {
        PrependSet(command);
        return base.ScalarExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<object> result,
        CancellationToken cancellationToken = default)
    {
        PrependSet(command);
        return base.ScalarExecutingAsync(command, eventData, result, cancellationToken);
    }

    private void PrependSet(DbCommand command)
    {
        var tenantClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("tenant_id");
        if (tenantClaim == null || string.IsNullOrEmpty(tenantClaim.Value)) return;

        // Don't prepend if already set (avoid double-setting on retries)
        if (command.CommandText.StartsWith("SET app.tenant_id")) return;

        // Execute SET as a separate command on the same connection BEFORE the actual command
        // This avoids issues with batch commands where SET gets mixed into multi-statement batches
        using var setCmd = command.Connection!.CreateCommand();
        setCmd.Transaction = command.Transaction;
        setCmd.CommandText = $"SET app.tenant_id = '{tenantClaim.Value}'";
        setCmd.ExecuteNonQuery();
    }
}
