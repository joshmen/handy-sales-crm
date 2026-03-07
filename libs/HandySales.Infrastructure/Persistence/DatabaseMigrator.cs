using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HandySales.Infrastructure.Persistence;

/// <summary>
/// Applies pending EF Core migrations on startup.
/// Uses PostgreSQL advisory lock to prevent concurrent runs
/// (Main API and Mobile API share the same database).
/// </summary>
public static class DatabaseMigrator
{
    private const long MigrationLockId = 123456789;

    public static async Task MigrateAsync(IServiceProvider services, ILogger logger)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<HandySalesDbContext>();

        var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync()).ToList();

        if (pendingMigrations.Count == 0)
        {
            logger.LogInformation("Database is up to date. No pending migrations.");
            return;
        }

        logger.LogInformation(
            "Applying {Count} pending migration(s): {Migrations}",
            pendingMigrations.Count,
            string.Join(", ", pendingMigrations));

        var connection = dbContext.Database.GetDbConnection();
        await connection.OpenAsync();

        try
        {
            // PostgreSQL advisory lock prevents concurrent migration runs
            using var lockCommand = connection.CreateCommand();
            lockCommand.CommandText = $"SELECT pg_try_advisory_lock({MigrationLockId})";
            var lockResult = await lockCommand.ExecuteScalarAsync();

            if (lockResult is not true)
            {
                logger.LogWarning(
                    "Could not acquire migration lock. Another instance may be migrating. Skipping.");
                return;
            }

            try
            {
                await dbContext.Database.MigrateAsync();
                logger.LogInformation("All migrations applied successfully.");
            }
            finally
            {
                using var unlockCommand = connection.CreateCommand();
                unlockCommand.CommandText = $"SELECT pg_advisory_unlock({MigrationLockId})";
                await unlockCommand.ExecuteScalarAsync();
            }
        }
        finally
        {
            await connection.CloseAsync();
        }
    }
}
