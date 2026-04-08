using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;

namespace HandySuites.Api.Middleware;

public class SlowQueryInterceptor : DbCommandInterceptor
{
    private readonly ILogger<SlowQueryInterceptor> _logger;
    private const int SlowQueryThresholdMs = 500;

    public SlowQueryInterceptor(ILogger<SlowQueryInterceptor> logger)
    {
        _logger = logger;
    }

    public override DbDataReader ReaderExecuted(DbCommand command,
        CommandExecutedEventData eventData, DbDataReader result)
    {
        LogIfSlow(eventData, command);
        return result;
    }

    public override ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command,
        CommandExecutedEventData eventData, DbDataReader result,
        CancellationToken cancellationToken = default)
    {
        LogIfSlow(eventData, command);
        return ValueTask.FromResult(result);
    }

    public override int NonQueryExecuted(DbCommand command,
        CommandExecutedEventData eventData, int result)
    {
        LogIfSlow(eventData, command);
        return result;
    }

    private void LogIfSlow(CommandExecutedEventData eventData, DbCommand command)
    {
        if (eventData.Duration.TotalMilliseconds > SlowQueryThresholdMs)
        {
            _logger.LogWarning("Slow query ({Duration}ms): {Sql}",
                (int)eventData.Duration.TotalMilliseconds, command.CommandText);
        }
    }
}
