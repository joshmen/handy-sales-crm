using HandySuites.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Persistence;

public class TransactionManager : ITransactionManager
{
    private readonly HandySuitesDbContext _db;

    public TransactionManager(HandySuitesDbContext db) => _db = db;

    /// <summary>
    /// Runs <paramref name="operation"/> inside a DB transaction, wrapped by the
    /// DbContext's retrying execution strategy. If the operation throws, the
    /// transaction rolls back and the strategy decides whether to retry.
    ///
    /// If the caller is ALREADY inside a transaction (e.g. PedidoService owns the
    /// transaction and then calls MovimientoInventarioService which also wraps
    /// its work in ExecuteInTransactionAsync), we just run the operation inline —
    /// the outer caller owns the transaction lifecycle. Attempting to start a
    /// nested transaction on the same connection throws "The connection is already
    /// in a transaction and cannot participate in another transaction."
    /// </summary>
    public async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation)
    {
        if (_db.Database.CurrentTransaction != null)
        {
            return await operation();
        }

        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            var result = await operation();
            await tx.CommitAsync();
            return result;
        });
    }

    public Task ExecuteInTransactionAsync(Func<Task> operation) =>
        ExecuteInTransactionAsync<object?>(async () =>
        {
            await operation();
            return null;
        });

    /// <summary>
    /// Like <see cref="ExecuteInTransactionAsync{T}"/> but exposes an
    /// <see cref="ISavepointScope"/> for per-iteration savepoint isolation.
    ///
    /// If we are already inside a transaction (nested call), the savepoint scope is
    /// constructed from the existing CurrentTransaction so failures from inner iterations
    /// roll back only their savepoint, leaving the outer transaction intact. This mirrors
    /// the nested-transaction handling in <see cref="ExecuteInTransactionAsync{T}"/>.
    ///
    /// See <see href="https://learn.microsoft.com/en-us/ef/core/saving/transactions#using-savepoints"/>.
    /// </summary>
    public async Task<T> ExecuteWithSavepointsAsync<T>(Func<ISavepointScope, Task<T>> operation)
    {
        if (_db.Database.CurrentTransaction != null)
        {
            var scope = new SavepointScope(_db.Database.CurrentTransaction, _db);
            return await operation(scope);
        }

        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            var scope = new SavepointScope(tx, _db);
            var result = await operation(scope);
            await tx.CommitAsync();
            return result;
        });
    }

    public Task ExecuteWithSavepointsAsync(Func<ISavepointScope, Task> operation) =>
        ExecuteWithSavepointsAsync<object?>(async sp =>
        {
            await operation(sp);
            return null;
        });
}
