using HandySuites.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace HandySuites.Infrastructure.Persistence;

/// <summary>
/// Implementation of <see cref="ISavepointScope"/> backed by an <see cref="IDbContextTransaction"/>.
///
/// Wraps each iteration in a database SAVEPOINT. Rolled-back iterations have their
/// EF change tracker entries detached so they do not leak into subsequent SaveChanges
/// calls on the surviving transaction.
///
/// If the provider does not support savepoints (<see cref="IDbContextTransaction.SupportsSavepoints"/>
/// is false — rare; PostgreSQL and SQLite both support them, including in-memory),
/// we fall back to running the action inline and report success/failure based on
/// whether it threw. In that degraded mode, a thrown action leaves the outer transaction
/// in an inconsistent state and will likely roll back at commit; callers must
/// communicate the degradation to operators.
/// </summary>
internal sealed class SavepointScope : ISavepointScope
{
    private readonly IDbContextTransaction _tx;
    private readonly HandySuitesDbContext _db;

    public SavepointScope(IDbContextTransaction tx, HandySuitesDbContext db)
    {
        _tx = tx;
        _db = db;
    }

    public async Task<(bool Committed, Exception? Error)> TryRunInSavepointAsync(string savepointName, Func<Task> action)
    {
        if (!_tx.SupportsSavepoints)
        {
            // Degraded mode: no rollback isolation. Caller already wrapped us in
            // a transaction; if action throws, the outer transaction is dirty
            // and the final commit will fail. Return (false, ex) so caller records the error.
            try
            {
                await action();
                return (true, null);
            }
            catch (Exception ex)
            {
                DetachUnsavedChanges();
                return (false, ex);
            }
        }

        await _tx.CreateSavepointAsync(savepointName);
        try
        {
            await action();
            await _tx.ReleaseSavepointAsync(savepointName);
            return (true, null);
        }
        catch (Exception ex)
        {
            await _tx.RollbackToSavepointAsync(savepointName);
            // Detach any change tracker entries the failed action staged. Earlier
            // iterations that already called SaveChangesAsync have their entities
            // in Unchanged state — those are NOT detached.
            DetachUnsavedChanges();
            return (false, ex);
        }
    }

    private void DetachUnsavedChanges()
    {
        var dirty = _db.ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added
                     || e.State == EntityState.Modified
                     || e.State == EntityState.Deleted)
            .ToList();

        foreach (var entry in dirty)
        {
            entry.State = EntityState.Detached;
        }
    }
}
