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
}
