using System.Data.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace HandySales.Infrastructure.Persistence;

/// <summary>
/// EF Core interceptor that sets PostgreSQL session variable 'app.tenant_id'
/// on every connection open. This enables Row Level Security (RLS) policies
/// to enforce tenant isolation at the database level — a second layer of
/// protection beyond EF Core's global query filters.
/// </summary>
public class TenantRlsInterceptor : DbConnectionInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantRlsInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        SetTenantId(connection);
        base.ConnectionOpened(connection, eventData);
    }

    public override async Task ConnectionOpenedAsync(DbConnection connection, ConnectionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        SetTenantId(connection);
        await base.ConnectionOpenedAsync(connection, eventData, cancellationToken);
    }

    private void SetTenantId(DbConnection connection)
    {
        var tenantClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("tenant_id");
        if (tenantClaim == null || string.IsNullOrEmpty(tenantClaim.Value)) return;

        using var cmd = connection.CreateCommand();
        cmd.CommandText = $"SET app.tenant_id = '{tenantClaim.Value}'";
        cmd.ExecuteNonQuery();
    }
}
