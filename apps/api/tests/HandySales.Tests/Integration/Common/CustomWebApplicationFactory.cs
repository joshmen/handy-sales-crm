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

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Establecer ambiente de Testing para evitar conexión MySQL
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // Remueve el contexto real si existe
            // var descriptor = services.SingleOrDefault(d =>
            //     d.ServiceType == typeof(DbContextOptions<HandySalesDbContext>));
            // if (descriptor != null) services.Remove(descriptor);

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
            //services.AddSingleton<JwtTokenGenerator>();
            services.Configure<JwtSettings>(opts =>
            {
                opts.Secret = "12345678901234567890123456789012";
                opts.Issuer = "TestIssuer";
                opts.Audience = "TestAudience";
                opts.ExpirationMinutes = 60;
            });
            services.AddScoped<HandySales.Shared.Security.JwtTokenGenerator>();

            // Crea base de datos
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySalesDbContext>();
            db.Database.EnsureDeleted();  // <- importante
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
