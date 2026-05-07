using System.Data.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace HandySuites.Infrastructure.Persistence;

/// <summary>
/// Sets app.tenant_id + app.is_super_admin on every command so PostgreSQL RLS
/// policies can enforce tenant isolation at the DB layer.
///
/// Context sources (priority order):
///   1. HttpContext with JWT → use tenant_id + es_super_admin claims.
///   2. No HttpContext (background workers, webhook handlers, startup tasks) →
///      treat as trusted system caller: is_super_admin='true', tenant_id=0.
///      Workers are trusted code that iterate all tenants; bypassing RLS is intentional.
///
/// RLS policy evaluates: is_super_admin='true' OR tenant_id = session tenant.
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
        // Avoid re-setting on nested/batch calls
        if (command.CommandText.StartsWith("SET app.") || command.CommandText.StartsWith("SELECT set_config(")) return;

        int tenantIdInt;
        bool isSuperAdminBool;

        var httpContext = _httpContextAccessor.HttpContext;
        var tenantClaim = httpContext?.User?.FindFirst("tenant_id");
        var roleClaim = httpContext?.User?.FindFirst("role")
                        ?? httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.Role);

        if (tenantClaim != null && !string.IsNullOrEmpty(tenantClaim.Value))
        {
            // Authenticated HTTP request. CRIT-1 fix: validate tenant claim
            // is a non-negative int. Antes lo interpolábamos raw en SQL — un
            // JWT forjado con claim tipo `0'; DROP TABLE x;--` ejecutaba SQL
            // arbitrario.
            if (!int.TryParse(tenantClaim.Value, System.Globalization.NumberStyles.Integer,
                              System.Globalization.CultureInfo.InvariantCulture, out tenantIdInt)
                || tenantIdInt < 0)
            {
                throw new InvalidOperationException(
                    "Invalid tenant_id claim — value must be a non-negative integer.");
            }
            isSuperAdminBool = roleClaim?.Value == "SUPER_ADMIN";
        }
        else
        {
            // No HttpContext OR no tenant claim (background worker, webhook, anonymous request).
            // System context: bypass RLS. Trusted code paths only.
            tenantIdInt = 0;
            isSuperAdminBool = true;
        }

        // `set_config(name, value, is_local)` admite parámetros bound (a diferencia
        // del `SET` plano que es comando DDL en Postgres). Defense in depth: aunque
        // los valores ya están saneados arriba, los pasamos como parámetros para
        // que no sean ni siquiera evaluados como SQL literal.
        using var setCmd = command.Connection!.CreateCommand();
        setCmd.Transaction = command.Transaction;
        setCmd.CommandText = "SELECT set_config('app.tenant_id', @tid, false), set_config('app.is_super_admin', @sup, false)";

        var pTid = setCmd.CreateParameter();
        pTid.ParameterName = "@tid";
        pTid.Value = tenantIdInt.ToString(System.Globalization.CultureInfo.InvariantCulture);
        setCmd.Parameters.Add(pTid);

        var pSup = setCmd.CreateParameter();
        pSup.ParameterName = "@sup";
        pSup.Value = isSuperAdminBool ? "true" : "false";
        setCmd.Parameters.Add(pSup);

        setCmd.ExecuteNonQuery();
    }
}
