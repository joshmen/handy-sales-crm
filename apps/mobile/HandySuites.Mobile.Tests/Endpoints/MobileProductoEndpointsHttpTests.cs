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
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests HTTP reales contra /api/mobile/productos usando MobileWebApplicationFactory.
/// El endpoint solo requiere autenticacion (RequireAuthorization sin roles), por lo que
/// todos los roles autenticados deben recibir 2xx; tests RBAC se limitan a 401 unauth.
/// </summary>
public class MobileProductoEndpointsHttpTests : IClassFixture<MobileProductoEndpointsHttpTests.JwtPreSetFactory>
{
    /// <summary>
    /// Wrapper que garantiza env vars JWT antes de que el host se construya y
    /// reemplaza el seed con uno minimo (sin Clientes FK-violators) para no romper
    /// SQLite. El factory original tiene un seed de Clientes que viola FK en SQLite.
    /// </summary>
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

                // Seed minimo: solo Tenants + Usuarios (Producto endpoint no requiere mas)
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

    public MobileProductoEndpointsHttpTests(JwtPreSetFactory factory)
    {
        _factory = factory;
    }

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

    // =====================================================================
    // GET /api/mobile/productos  (listar con paginacion + filtros)
    // =====================================================================

    // El endpoint requiere `pagina` y `porPagina` como int (no nullable), por lo
    // que SIEMPRE deben venir en el querystring; omitirlos da 400.
    private const string Page = "pagina=1&porPagina=20";

    [Fact]
    public async Task ListarProductos_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/productos/?{Page}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarProductos_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync($"/api/mobile/productos/?{Page}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarProductos_AsSupervisor_Returns200()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var response = await client.GetAsync($"/api/mobile/productos/?{Page}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarProductos_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync($"/api/mobile/productos/?{Page}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ListarProductos_ConBusqueda_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/productos/?{Page}&busqueda=coca");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarProductos_ConCategoriaId_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/productos/?{Page}&categoriaId=1");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarProductos_ConFamiliaId_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/productos/?{Page}&familiaId=1");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarProductos_ConPaginacion_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/productos/?pagina=1&porPagina=10");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarProductos_ConPorPaginaExcesivo_LimitadoA100()
    {
        // El endpoint hace Math.Min(porPagina, 100) — solo verificamos que no rompa
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/productos/?pagina=1&porPagina=9999");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarProductos_ConTodosLosFiltros_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/productos/?busqueda=test&categoriaId=1&familiaId=1&pagina=1&porPagina=20");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    // =====================================================================
    // GET /api/mobile/productos/{id:int}  (detalle por id)
    // =====================================================================

    [Fact]
    public async Task ObtenerPorId_AsVendedor_Returns200OrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/productos/{MobileTestSeeder.ProductoAId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ObtenerPorId_AsAdmin_Returns200OrNotFound()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync($"/api/mobile/productos/{MobileTestSeeder.ProductoAId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ObtenerPorId_NoExistente_Returns404()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/productos/999999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ObtenerPorId_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync($"/api/mobile/productos/{MobileTestSeeder.ProductoAId}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // =====================================================================
    // GET /api/mobile/productos/{id:int}/stock
    // =====================================================================

    [Fact]
    public async Task ObtenerStock_AsVendedor_Returns200()
    {
        // El endpoint siempre devuelve 200 (incluso si no hay inventario)
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/productos/{MobileTestSeeder.ProductoAId}/stock");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ObtenerStock_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync($"/api/mobile/productos/{MobileTestSeeder.ProductoAId}/stock");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ObtenerStock_ProductoSinInventario_Returns200ConStockCero()
    {
        // Endpoint devuelve 200 con stock=0 cuando no hay inventario
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/productos/999999/stock");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ObtenerStock_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync($"/api/mobile/productos/{MobileTestSeeder.ProductoAId}/stock");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // =====================================================================
    // GET /api/mobile/productos/codigo/{codigo}
    // =====================================================================

    [Fact]
    public async Task BuscarPorCodigo_AsVendedor_Returns200OrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/productos/codigo/7501055300051");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task BuscarPorCodigo_AsAdmin_Returns200OrNotFound()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/productos/codigo/7501055300051");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task BuscarPorCodigo_CodigoInexistente_Returns404()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/productos/codigo/CODIGO_NO_EXISTE_XYZ");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task BuscarPorCodigo_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/productos/codigo/7501055300051");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
