using System.Data.Common;
using System.Text.RegularExpressions;
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
///
/// Audit code-quality 2026-06-06 (sprint pre-prod, #1): parametrizar el SET con
/// set_config() en vez de concatenar el claim JWT al CommandText. Sin esto, un
/// payload tenant_id="'; SET app.is_super_admin = 'true'; --" inyectaba SQL
/// y bypassa RLS multi-tenant. set_config(name, value, is_local) trata el value
/// como text parameter literal — Postgres NO lo parsea como SQL.
/// </summary>
public class BillingTenantRlsInterceptor : DbCommandInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    // Billing tenant_id es string (varchar 64). Permitimos alfanumericos + '-_' (formato slug).
    // Cualquier otro caracter (comilla, ;, espacio, comentario --) rechaza el claim.
    private static readonly Regex SafeTenantIdRegex =
        new(@"^[a-zA-Z0-9_-]{0,64}$", RegexOptions.Compiled);

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
        // Recursion guard: nuestro propio SELECT set_config(...) NO debe re-entrar al interceptor
        // (DbCommandInterceptor solo intercepta commands via EF; nuestro setCmd usa ADO.NET raw,
        // pero conservamos el guard como defense-in-depth y compat con el patron previo).
        if (command.CommandText.StartsWith("SET app.")) return;
        if (command.CommandText.StartsWith("SELECT set_config")) return;

        string tenantId;
        bool isSuperAdmin;

        var httpContext = _httpContextAccessor.HttpContext;
        var tenantClaim = httpContext?.User?.FindFirst("tenant_id");
        var roleClaim = httpContext?.User?.FindFirst("role")
                        ?? httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.Role);

        if (tenantClaim != null && !string.IsNullOrEmpty(tenantClaim.Value))
        {
            // Validar formato — claim JWT puede venir envenenado.
            if (!SafeTenantIdRegex.IsMatch(tenantClaim.Value))
            {
                throw new InvalidOperationException(
                    "Invalid tenant_id JWT claim — formato no permitido.");
            }
            tenantId = tenantClaim.Value;
            isSuperAdmin = roleClaim?.Value == "SUPER_ADMIN";
        }
        else
        {
            // No HTTP context: system/worker. Bypass RLS.
            tenantId = "";
            isSuperAdmin = true;
        }

        using var setCmd = command.Connection!.CreateCommand();
        setCmd.Transaction = command.Transaction;
        // set_config(name, value, is_local) — Postgres trata @tenant_id y @is_super_admin
        // como parametros bind, no parsea su contenido como SQL.
        setCmd.CommandText =
            "SELECT set_config('app.tenant_id', @tenant_id, false), " +
            "set_config('app.is_super_admin', @is_super_admin, false)";

        var pTenant = setCmd.CreateParameter();
        pTenant.ParameterName = "@tenant_id";
        pTenant.Value = tenantId;
        setCmd.Parameters.Add(pTenant);

        var pSuper = setCmd.CreateParameter();
        pSuper.ParameterName = "@is_super_admin";
        pSuper.Value = isSuperAdmin ? "true" : "false";
        setCmd.Parameters.Add(pSuper);

        setCmd.ExecuteNonQuery();
    }
}
