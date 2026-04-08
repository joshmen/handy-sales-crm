using HandySuites.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore.Storage;

namespace HandySuites.Infrastructure.Persistence;

public class TransactionManager : ITransactionManager
{
    private readonly HandySuitesDbContext _db;
    private IDbContextTransaction? _currentTransaction;

    public TransactionManager(HandySuitesDbContext db) => _db = db;

    public async Task<IAsyncDisposable> BeginTransactionAsync()
    {
        _currentTransaction = await _db.Database.BeginTransactionAsync();
        return _currentTransaction;
    }

    public async Task CommitTransactionAsync()
    {
        if (_currentTransaction != null)
        {
            await _currentTransaction.CommitAsync();
            await _currentTransaction.DisposeAsync();
            _currentTransaction = null;
        }
    }

    public async Task RollbackTransactionAsync()
    {
        if (_currentTransaction != null)
        {
            await _currentTransaction.RollbackAsync();
            await _currentTransaction.DisposeAsync();
            _currentTransaction = null;
        }
    }
}
