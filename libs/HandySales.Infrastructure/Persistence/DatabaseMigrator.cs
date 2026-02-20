using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HandySales.Infrastructure.Persistence;

/// <summary>
/// Applies pending EF Core migrations on startup.
/// Uses MySQL advisory lock to prevent concurrent runs
/// (Main API and Mobile API share the same database).
/// </summary>
public static class DatabaseMigrator
{
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
            // MySQL advisory lock prevents concurrent migration runs
            using var lockCommand = connection.CreateCommand();
            lockCommand.CommandText = "SELECT GET_LOCK('handysales_migration', 30)";
            var lockResult = await lockCommand.ExecuteScalarAsync();

            if (lockResult?.ToString() != "1")
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
                unlockCommand.CommandText = "SELECT RELEASE_LOCK('handysales_migration')";
                await unlockCommand.ExecuteScalarAsync();
            }
        }
        finally
        {
            await connection.CloseAsync();
        }
    }
}
