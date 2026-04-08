namespace HandySuites.Application.Common.Interfaces;

public interface ITransactionManager
{
    Task<IAsyncDisposable> BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}
