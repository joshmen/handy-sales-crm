using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories;
using HandySuites.Shared.Multitenancy;
using HandySuites.Shared.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace HandySuites.Mobile.Tests.Common;

/// <summary>
/// Fake HTTP handler para BillingApi named HttpClient. Devuelve 200 OK
/// con body vacio. Captura outbound requests para que tests puedan
/// assert que el endpoint mobile invoco la API billing correctamente.
/// </summary>
public class FakeBillingHttpHandler : DelegatingHandler
{
    public List<HttpRequestMessage> CapturedRequests { get; } = new();

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        CapturedRequests.Add(request);
        return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new StringContent("{\"success\":true}", System.Text.Encoding.UTF8, "application/json")
        });
    }
}

internal class FakeNoOpHttpHandler : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new StringContent("{\"success\":true}")
        });
    }
}

/// <summary>
/// WebApplicationFactory compartido para Mobile.Tests. Replica el pattern
/// del Main API (CustomWebApplicationFactory): SQLite in-memory + FakeJwt +
/// stubs HTTP + seed deterministico.
///
/// Sprint pre-prod #11 audit 2026-06-07: introducido para desbloquear los
/// 23 tests skipped en MobileSupervisorSABranchTests y MobileFacturaEndpointsTests
/// que intentaban inline WebApplicationFactory custom (rompia por JWT config).
/// </summary>
public class MobileWebApplicationFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;
    public FakeBillingHttpHandler BillingHandler { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
        Environment.SetEnvironmentVariable("RUN_MIGRATIONS", "false");
        // Mobile API's Program.cs reads Jwt:Secret synchronously during AddJwtAuthentication
        // (before ConfigureAppConfiguration callbacks apply). Setting via env var with __ separator
        // ensures the value is present in builder.Configuration when .AddEnvironmentVariables() runs.
        Environment.SetEnvironmentVariable("Jwt__Secret", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__Audience", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__ExpirationMinutes", "60");
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "12345678901234567890123456789012",
                ["Jwt:Issuer"] = "HandySuites.Test",
                ["Jwt:Audience"] = "HandySuites.Test",
                ["Jwt:ExpirationMinutes"] = "60",
                ["BILLING_API_URL"] = "http://billing.test",
                ["MAIN_API_URL"] = "http://main.test",
            });
        });

        builder.ConfigureServices(services =>
        {
            // SQLite in-memory (persistent during fixture lifetime)
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            // Disable FK enforcement to keep seeding minimal — the domain has many
            // required FKs (IdZona, CategoriaClienteId, etc.) that are not relevant
            // for HTTP-level endpoint coverage tests. Production uses PostgreSQL
            // which loads full seed scripts with referenced rows present.
            using (var pragma = _connection.CreateCommand())
            {
                pragma.CommandText = "PRAGMA foreign_keys = OFF;";
                pragma.ExecuteNonQuery();
            }

            services.RemoveAll<DbContextOptions<HandySuitesDbContext>>();
            services.AddDbContext<HandySuitesDbContext>(options =>
            {
                options.UseSqlite(_connection);
            });

            // Replace JWT auth con Fake (header-driven role/tenant)
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = FakeJwtAuthHandler.Scheme;
                options.DefaultChallengeScheme = FakeJwtAuthHandler.Scheme;
            }).AddScheme<AuthenticationSchemeOptions, FakeJwtAuthHandler>(
                FakeJwtAuthHandler.Scheme, options => { });

            services.TryAddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddScoped<ICurrentTenant, CurrentTenant>();
            services.Configure<JwtSettings>(opts =>
            {
                opts.Secret = "12345678901234567890123456789012";
                opts.Issuer = "HandySuites.Test";
                opts.Audience = "HandySuites.Test";
                opts.ExpirationMinutes = 60;
            });

            // Stub HttpClient para BillingApi (capturado para asserts)
            services.AddHttpClient("BillingApi")
                .ConfigurePrimaryHttpMessageHandler(() => BillingHandler);

            // Stub HttpClient para MainApi (no asserts; solo evitar HTTP real)
            services.AddHttpClient("MainApi")
                .ConfigurePrimaryHttpMessageHandler(() => new FakeNoOpHttpHandler());

            // Crear base + seed
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            db.Database.EnsureDeleted();
            db.Database.EnsureCreated();
            // EF Core (and SQLite default) may have re-enabled FK enforcement after
            // EnsureCreated. Re-apply to ensure the seed can insert with partial graphs
            // (e.g. Cliente.IdZona/CategoriaClienteId without referenced rows).
            using (var pragma2 = _connection.CreateCommand())
            {
                pragma2.CommandText = "PRAGMA foreign_keys = OFF;";
                pragma2.ExecuteNonQuery();
            }
            MobileTestSeeder.Seed(db);
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection?.Close();
        _connection?.Dispose();
    }
}
