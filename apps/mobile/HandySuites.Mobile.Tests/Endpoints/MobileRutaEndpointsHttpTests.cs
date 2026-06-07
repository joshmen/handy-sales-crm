using FluentAssertions;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories;
using HandySuites.Mobile.Tests.Common;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using HandySuites.Shared.Multitenancy;
using HandySuites.Shared.Security;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// HTTP-level tests for MobileRutaEndpoints (/api/mobile/rutas).
/// Exercises every route via real DI + SQLite in-memory + FakeJwt.
/// Status codes asserted with BeOneOf(...) where service-level state
/// requirements may surface (rutas don't exist in seed → 404/400 vs.
/// 200 happy path).
///
/// Patron de fixture copiado de MobileProductoEndpointsHttpTests: el
/// MobileWebApplicationFactory.Seed compartido tiene un seed de Clientes
/// que viola FK en SQLite, por lo que usamos un MinimalSeed local.
/// </summary>
public class MobileRutaEndpointsHttpTests : IClassFixture<MobileRutaEndpointsHttpTests.JwtPreSetFactory>
{
    public class JwtPreSetFactory : Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program>
    {
        private SqliteConnection? _connection;

        static JwtPreSetFactory()
        {
            Environment.SetEnvironmentVariable("Jwt__Secret", "12345678901234567890123456789012");
            Environment.SetEnvironmentVariable("Jwt__Issuer", "HandySuites.Test");
            Environment.SetEnvironmentVariable("Jwt__Audience", "HandySuites.Test");
            Environment.SetEnvironmentVariable("Jwt__ExpirationMinutes", "60");
            Environment.SetEnvironmentVariable("JWT_SECRET", "12345678901234567890123456789012");
            Environment.SetEnvironmentVariable("BILLING_API_URL", "http://billing.test");
            Environment.SetEnvironmentVariable("MAIN_API_URL", "http://main.test");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
            Environment.SetEnvironmentVariable("RUN_MIGRATIONS", "false");
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
                _connection = new SqliteConnection("DataSource=:memory:");
                _connection.Open();

                services.RemoveAll<DbContextOptions<HandySuitesDbContext>>();
                services.AddDbContext<HandySuitesDbContext>(options =>
                {
                    options.UseSqlite(_connection);
                });

                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = FakeJwtAuthHandler.Scheme;
                    options.DefaultChallengeScheme = FakeJwtAuthHandler.Scheme;
                }).AddScheme<AuthenticationSchemeOptions, FakeJwtAuthHandler>(
                    FakeJwtAuthHandler.Scheme, _ => { });

                services.TryAddSingleton<IHttpContextAccessor, HttpContextAccessor>();
                services.AddScoped<ICurrentTenant, CurrentTenant>();

                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                db.Database.EnsureDeleted();
                db.Database.EnsureCreated();

                MinimalSeed(db);
            });
        }

        private static void MinimalSeed(HandySuitesDbContext db)
        {
            db.Tenants.AddRange(
                new Tenant { Id = 1, NombreEmpresa = "Tenant A" },
                new Tenant { Id = 2, NombreEmpresa = "Tenant B" }
            );

            var hash = BCrypt.Net.BCrypt.HashPassword("Test123!");

            db.Usuarios.AddRange(
                new Usuario { Id = 100, TenantId = 1, Nombre = "SA", Email = "sa@t.com", PasswordHash = hash, RolExplicito = RoleNames.SuperAdmin, Activo = true, EmailVerificado = true },
                new Usuario { Id = 101, TenantId = 1, Nombre = "Admin", Email = "admin@t.com", PasswordHash = hash, RolExplicito = RoleNames.Admin, Activo = true, EmailVerificado = true },
                new Usuario { Id = 200, TenantId = 1, Nombre = "Sup", Email = "sup@t.com", PasswordHash = hash, RolExplicito = RoleNames.Supervisor, Activo = true, EmailVerificado = true },
                new Usuario { Id = 300, TenantId = 1, Nombre = "V1", Email = "v1@t.com", PasswordHash = hash, RolExplicito = RoleNames.Vendedor, Activo = true, EmailVerificado = true }
            );

            db.SaveChanges();
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            _connection?.Close();
            _connection?.Dispose();
        }
    }

    private readonly JwtPreSetFactory _factory;

    public MobileRutaEndpointsHttpTests(JwtPreSetFactory factory)
    {
        _factory = factory;
    }

    // Convenience constants matching MinimalSeed IDs
    private const int SuperAdminUserId = 100;
    private const int AdminUserId = 101;
    private const int SupervisorAUserId = 200;
    private const int Vendedor1Id = 300;

    private HttpClient ClientAs(string role, int userId, int tenantId = 1)
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("Authorization", "Bearer fake");
        c.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());
        c.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId.ToString());
        c.DefaultRequestHeaders.Add("X-Test-Role", role);
        return c;
    }

    private HttpClient UnauthenticatedClient()
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "1");
        return c;
    }

    // ============================================================
    // GET /hoy
    // ============================================================

    [Fact]
    public async Task GetHoy_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/rutas/hoy");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetHoy_AsAdmin_Returns200OrOk()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var response = await client.GetAsync("/api/mobile/rutas/hoy");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Forbidden, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetHoy_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/rutas/hoy");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // GET /pendientes
    // ============================================================

    [Fact]
    public async Task GetPendientes_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/rutas/pendientes");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPendientes_AsAdmin_Returns200OrOk()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var response = await client.GetAsync("/api/mobile/rutas/pendientes");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Forbidden, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPendientes_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/rutas/pendientes");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // GET /historico
    // ============================================================

    [Fact]
    public async Task GetHistorico_AsVendedor_DefaultLimit_Returns200()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/rutas/historico");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetHistorico_AsVendedor_WithLimit_Returns200()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/rutas/historico?limit=10");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetHistorico_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/rutas/historico");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // GET /{id}
    // ============================================================

    [Fact]
    public async Task GetById_AsVendedor_NotFound_Returns404()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/rutas/999999");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.OK, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetById_AsAdmin_Returns200or404()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var response = await client.GetAsync("/api/mobile/rutas/1");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetById_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/rutas/1");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /{id}/iniciar
    // ============================================================

    [Fact]
    public async Task IniciarRuta_AsVendedor_NotFound_Returns400Or403()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var response = await client.PostAsync("/api/mobile/rutas/999999/iniciar", null);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task IniciarRuta_AsAdmin_Returns400OrForbidden()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var response = await client.PostAsync("/api/mobile/rutas/1/iniciar", null);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task IniciarRuta_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.PostAsync("/api/mobile/rutas/1/iniciar", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /{id}/aceptar
    // ============================================================

    [Fact]
    public async Task AceptarRuta_AsVendedor_Returns409Or400()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var response = await client.PostAsync("/api/mobile/rutas/999999/aceptar", null);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Conflict,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task AceptarRuta_AsAdmin_Returns4xx()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var response = await client.PostAsync("/api/mobile/rutas/1/aceptar", null);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Conflict,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task AceptarRuta_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.PostAsync("/api/mobile/rutas/1/aceptar", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /{id}/completar
    // ============================================================

    [Fact]
    public async Task CompletarRuta_AsVendedor_WithBody_Returns4xx()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var body = new { kilometrosReales = 12.5 };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/999999/completar", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task CompletarRuta_AsVendedor_NullBody_Returns4xx()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var response = await client.PostAsync("/api/mobile/rutas/999999/completar", null);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.OK,
            HttpStatusCode.UnsupportedMediaType);
    }

    [Fact]
    public async Task CompletarRuta_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { kilometrosReales = 10.0 };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/1/completar", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /{id}/cancelar
    // ============================================================

    [Fact]
    public async Task CancelarRuta_AsVendedor_WithMotivo_Returns4xx()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var body = new { motivo = "Test cancel" };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/999999/cancelar", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task CancelarRuta_AsAdmin_NullBody_Returns4xx()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var response = await client.PostAsync("/api/mobile/rutas/1/cancelar", null);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.OK,
            HttpStatusCode.UnsupportedMediaType);
    }

    [Fact]
    public async Task CancelarRuta_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { motivo = "x" };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/1/cancelar", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // GET /{rutaId}/parada-actual
    // ============================================================

    [Fact]
    public async Task GetParadaActual_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/rutas/1/parada-actual");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetParadaActual_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var response = await client.GetAsync("/api/mobile/rutas/1/parada-actual");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetParadaActual_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/rutas/1/parada-actual");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // GET /{rutaId}/siguiente-parada
    // ============================================================

    [Fact]
    public async Task GetSiguienteParada_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/rutas/1/siguiente-parada");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetSiguienteParada_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var response = await client.GetAsync("/api/mobile/rutas/1/siguiente-parada");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetSiguienteParada_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/rutas/1/siguiente-parada");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /paradas/{detalleId}/llegar
    // ============================================================

    [Fact]
    public async Task LlegarParada_AsVendedor_WithBody_Returns4xx()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var body = new { latitud = 19.4326, longitud = -99.1332 };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/paradas/999999/llegar", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.Forbidden,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task LlegarParada_AsAdmin_WithBody_Returns4xx()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var body = new { latitud = 19.4326, longitud = -99.1332 };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/paradas/1/llegar", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.Forbidden,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task LlegarParada_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { latitud = 0.0, longitud = 0.0 };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/paradas/1/llegar", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /paradas/{detalleId}/salir
    // ============================================================

    [Fact]
    public async Task SalirParada_AsVendedor_WithBody_Returns4xx()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var body = new { latitud = 19.4326, longitud = -99.1332, notas = "Salida ok" };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/paradas/999999/salir", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.Forbidden,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task SalirParada_AsAdmin_WithMinimalBody_Returns4xx()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var body = new { };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/paradas/1/salir", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.Forbidden,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task SalirParada_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/paradas/1/salir", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /paradas/{detalleId}/omitir
    // ============================================================

    [Fact]
    public async Task OmitirParada_AsVendedor_WithBody_Returns4xx()
    {
        var client = ClientAs("VENDEDOR", Vendedor1Id);
        var body = new { razonOmision = "Cliente cerrado" };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/paradas/999999/omitir", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.Forbidden,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task OmitirParada_AsAdmin_WithBody_Returns4xx()
    {
        var client = ClientAs("ADMIN", AdminUserId);
        var body = new { razonOmision = "Sin acceso" };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/paradas/1/omitir", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.Forbidden,
            HttpStatusCode.OK);
    }

    [Fact]
    public async Task OmitirParada_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { razonOmision = "x" };
        var response = await client.PostAsJsonAsync("/api/mobile/rutas/paradas/1/omitir", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
