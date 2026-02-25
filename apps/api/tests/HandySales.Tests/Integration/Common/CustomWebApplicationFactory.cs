using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Infrastructure.Repositories;
using HandySales.Shared.Multitenancy;
using HandySales.Shared.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

/// <summary>
/// Fake HTTP handler that returns empty responses for HIBP Pwned Passwords API.
/// This prevents real HTTP calls during tests and marks all passwords as safe.
/// </summary>
internal class FakePwnedPasswordHandler : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        // Return empty response — no matching hashes means password is not compromised
        return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new StringContent("")
        });
    }
}

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Establecer ambiente de Testing para evitar conexión MySQL
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
        // Skip DatabaseMigrator — EnsureCreated() handles schema for SQLite
        Environment.SetEnvironmentVariable("RUN_MIGRATIONS", "false");
        builder.UseEnvironment("Testing");

        // Provide dummy config values for services that require them
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cloudinary:Url"] = "cloudinary://000000000000000:fake_secret@fake_cloud",
                ["SendGrid:ApiKey"] = "SG.fake-key-for-testing",
            });
        });

        builder.ConfigureServices(services =>
        {
            // Usa SQLite en memoria
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            services.AddDbContext<HandySalesDbContext>(options =>
            {
                options.UseSqlite(_connection);
            });

            // Reemplaza autenticación por la fake
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = FakeJwtAuthHandler.Scheme;
                options.DefaultChallengeScheme = FakeJwtAuthHandler.Scheme;
            }).AddScheme<AuthenticationSchemeOptions, FakeJwtAuthHandler>(
                FakeJwtAuthHandler.Scheme, options => { });

            services.TryAddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            // Registra CurrentTenant para pruebas
            services.AddScoped<ICurrentTenant, CurrentTenant>();
            services.Configure<JwtSettings>(opts =>
            {
                opts.Secret = "12345678901234567890123456789012";
                opts.Issuer = "TestIssuer";
                opts.Audience = "TestAudience";
                opts.ExpirationMinutes = 60;
            });
            services.AddScoped<HandySales.Shared.Security.JwtTokenGenerator>();

            // Replace PwnedPasswordService with a fake that never flags passwords
            services.AddHttpClient<PwnedPasswordService>()
                .ConfigurePrimaryHttpMessageHandler(() => new FakePwnedPasswordHandler());

            // Crea base de datos
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySalesDbContext>();
            db.Database.EnsureDeleted();
            db.Database.EnsureCreated();
            HandySalesTestSeeder.SeedTestData(db);
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection?.Close();
        _connection?.Dispose();
    }
}
