namespace HandySuites.Application.Common.Interfaces;

/// <summary>
/// Runs a set of EF Core operations inside a single database transaction.
///
/// IMPORTANT: this interface intentionally only exposes the "execute a lambda"
/// shape because we use <c>EnableRetryOnFailure</c> on the DbContext. The Npgsql
/// retrying execution strategy does NOT allow user-initiated transactions
/// (BeginTransactionAsync outside an <c>IExecutionStrategy.ExecuteAsync</c> scope)
/// — those throw at runtime. Implementations wrap the operation with the
/// DbContext's execution strategy so retries cover the whole transactional unit.
///
/// Callers should put everything that must succeed-or-rollback together inside
/// the delegate. Exceptions thrown from the delegate roll back the transaction.
/// </summary>
public interface ITransactionManager
{
    Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation);
    Task ExecuteInTransactionAsync(Func<Task> operation);

    /// <summary>
    /// Like <see cref="ExecuteInTransactionAsync{T}"/> but provides an
    /// <see cref="ISavepointScope"/> for per-iteration savepoint isolation.
    ///
    /// Use when you have a batch of independent operations (e.g., per-entity sync push)
    /// where a single failure should NOT roll back the whole batch. Each iteration runs
    /// inside <see cref="ISavepointScope.TryRunInSavepointAsync"/> — failures roll back
    /// only that savepoint and detach the failed entity's change tracker entries,
    /// while the outer transaction continues and commits surviving iterations.
    ///
    /// This is the EF Core best practice for batch processing with partial failure tolerance.
    /// See <see href="https://learn.microsoft.com/en-us/ef/core/saving/transactions#using-savepoints"/>.
    /// </summary>
    Task<T> ExecuteWithSavepointsAsync<T>(Func<ISavepointScope, Task<T>> operation);

    Task ExecuteWithSavepointsAsync(Func<ISavepointScope, Task> operation);
}
