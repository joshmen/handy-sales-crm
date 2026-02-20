using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HandySales.Infrastructure.Persistence;

/// <summary>
/// Factory used by 'dotnet ef' CLI tools at design time.
/// Provides a DbContext without requiring the full application host.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<HandySalesDbContext>
{
    public HandySalesDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Server=localhost;Port=3306;Database=handy_erp;User=handy_user;Password=handy_pass;CharSet=utf8mb4";

        var optionsBuilder = new DbContextOptionsBuilder<HandySalesDbContext>();
        optionsBuilder.UseMySql(
            connectionString,
            ServerVersion.AutoDetect(connectionString)
        );

        return new HandySalesDbContext(optionsBuilder.Options);
    }
}
