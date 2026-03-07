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
            ?? "Host=localhost;Port=5432;Database=handy_erp;Username=handy_user;Password=handy_pass";

        var optionsBuilder = new DbContextOptionsBuilder<HandySalesDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new HandySalesDbContext(optionsBuilder.Options);
    }
}
