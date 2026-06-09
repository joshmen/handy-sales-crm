using HandySuites.Billing.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace HandySuites.Billing.Api.Services;

/// <summary>
/// PostgreSQL implementation of <see cref="IFolioProvider"/> using
/// <c>INSERT ... ON CONFLICT DO UPDATE</c> to atomically reserve folios on
/// <c>numeracion_documentos</c>.
///
/// BR-010 (Audit CRITICAL-2 + MEDIUM-12, Abril 2026): the folio increment
/// shares the ambient EF transaction so that if the subsequent Factura save
/// fails, the folio reservation rolls back and no SAT-compliance gap is
/// created. Callers should wrap GetNextFolioAsync + Factura.Add +
/// SaveChangesAsync in a single transaction (via
/// <c>ITransactionManager.BeginTransactionAsync</c>).
/// </summary>
public class NpgsqlFolioProvider : IFolioProvider
{
    private readonly BillingDbContext _context;

    public NpgsqlFolioProvider(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<int> GetNextFolioAsync(string tenantId, string serie)
    {
        var conn = (Npgsql.NpgsqlConnection)_context.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync();

        var tx = _context.Database.CurrentTransaction?.GetDbTransaction() as Npgsql.NpgsqlTransaction;

        const string sql = @"INSERT INTO numeracion_documentos (tenant_id, tipo_documento, serie, folio_inicial, folio_actual, activo, created_at, updated_at)
                    VALUES (@tid, 'FACTURA', @serie, 1, 1, true, NOW(), NOW())
                    ON CONFLICT (tenant_id, tipo_documento, serie)
                    DO UPDATE SET folio_actual = numeracion_documentos.folio_actual + 1, updated_at = NOW()
                    RETURNING folio_actual";

        await using var cmd = new Npgsql.NpgsqlCommand(sql, conn, tx);
        cmd.Parameters.AddWithValue("tid", tenantId);
        cmd.Parameters.AddWithValue("serie", serie);
        var folio = await cmd.ExecuteScalarAsync();
        return folio is int f ? f : 1;
    }
}
