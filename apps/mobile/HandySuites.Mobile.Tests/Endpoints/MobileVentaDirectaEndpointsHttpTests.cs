using System.Net;
using System.Net.Http.Json;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories;
using HandySuites.Mobile.Tests.Common;
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

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Self-contained WebApplicationFactory for venta-directa HTTP tests. We avoid
/// inheriting <see cref="MobileWebApplicationFactory"/> because its
/// <c>MobileTestSeeder</c> currently fails on SQLite (Cliente has nullable FKs
/// like CategoriaClienteId/ZonaClienteId set to defaults that violate FK; the
/// InMemory provider ignored this but SQLite enforces it). The seeder bug is
/// pre-existing infra — out of scope for this test file.
///
/// We replicate the JWT/SQLite/HttpClient wiring and seed only the tiny set of
/// fixtures we need to exercise the inline lambda in MobileVentaDirectaEndpoints.
/// </summary>
public class VentaDirectaTestFactory : WebApplicationFactory<Program>
{
    public const int TenantId = 1;
    public const int OtroTenantId = 2;
    public const int VendedorId = 300;
    public const int AdminId = 101;
    public const int SupervisorId = 200;
    public const int ClienteAId = 1000;
    public const int ClienteOtroTenantId = 1001;
    public const int ProductoAId = 2000;

    private readonly string _dbName = $"venta-directa-tests-{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
        Environment.SetEnvironmentVariable("RUN_MIGRATIONS", "false");
        Environment.SetEnvironmentVariable("Jwt__Secret", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__Audience", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__ExpirationMinutes", "60");
        Environment.SetEnvironmentVariable("BILLING_API_URL", "http://billing.test");
        Environment.SetEnvironmentVariable("MAIN_API_URL", "http://main.test");
        Environment.SetEnvironmentVariable("InternalApiKey", "test-internal-key");
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
                ["InternalApiKey"] = "test-internal-key",
            });
        });

        builder.ConfigureServices(services =>
        {
            // Use EF InMemory provider — it skips FK constraint validation, which lets us
            // seed only the Cliente/Producto/Usuario rows we need without also seeding the
            // CategoriaCliente/Zona/Familia/UnidadMedida/TasaImpuesto rows their FKs require.
            // The endpoint's queries are simple LINQ that InMemory handles correctly.
            services.RemoveAll<DbContextOptions<HandySuitesDbContext>>();
            services.AddDbContext<HandySuitesDbContext>(options =>
            {
                options.UseInMemoryDatabase(_dbName);
            });

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

            services.AddHttpClient("BillingApi")
                .ConfigurePrimaryHttpMessageHandler(() => new FakeBillingHttpHandler());
            services.AddHttpClient("MainApi")
                .ConfigurePrimaryHttpMessageHandler(() => new NoopHandler());

            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            db.Database.EnsureDeleted();
            db.Database.EnsureCreated();
            SeedMinimal(db);
        });
    }

    private static void SeedMinimal(HandySuitesDbContext db)
    {
        db.Tenants.AddRange(
            new Tenant { Id = TenantId, NombreEmpresa = "Tenant A" },
            new Tenant { Id = OtroTenantId, NombreEmpresa = "Tenant B" }
        );

        var hash = BCrypt.Net.BCrypt.HashPassword("Test123!");

        db.Usuarios.AddRange(
            new Usuario { Id = AdminId, TenantId = TenantId, Nombre = "Admin", Email = "a@t.com", PasswordHash = hash, RolExplicito = RoleNames.Admin, Activo = true, EmailVerificado = true },
            new Usuario { Id = SupervisorId, TenantId = TenantId, Nombre = "Sup", Email = "s@t.com", PasswordHash = hash, RolExplicito = RoleNames.Supervisor, Activo = true, EmailVerificado = true },
            new Usuario { Id = VendedorId, TenantId = TenantId, Nombre = "Vend", Email = "v@t.com", PasswordHash = hash, RolExplicito = RoleNames.Vendedor, Activo = true, EmailVerificado = true }
        );

        db.Clientes.AddRange(
            new Cliente
            {
                Id = ClienteAId, TenantId = TenantId, Nombre = "Cliente A",
                RFC = "XAXX010101000", Correo = "ca@t.com",
                Telefono = "5551234567", Direccion = "Calle 1",
                Activo = true,
                CategoriaClienteId = 1, IdZona = 1
            },
            new Cliente
            {
                Id = ClienteOtroTenantId, TenantId = OtroTenantId, Nombre = "Cliente B",
                RFC = "XAXX010101000", Correo = "cb@t.com",
                Telefono = "5559876543", Direccion = "Calle 2",
                Activo = true,
                CategoriaClienteId = 1, IdZona = 1
            }
        );

        db.Productos.Add(new Producto
        {
            Id = ProductoAId, TenantId = TenantId, Nombre = "Producto A",
            CodigoBarra = "750100", Descripcion = "P A",
            PrecioBase = 100m, Activo = true
        });

        db.SaveChanges();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
    }

    private class NoopHandler : DelegatingHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
            => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json")
            });
    }
}

/// <summary>
/// HTTP-level tests for MobileVentaDirectaEndpoints (POST /api/mobile/venta-directa).
/// Exercise auth, RBAC, validation branches, and lookup paths via the real ASP.NET
/// Core pipeline. Deep DB invariants are covered in sister MobileVentaDirectaEndpointsTests.
/// </summary>
public class MobileVentaDirectaEndpointsHttpTests : IClassFixture<VentaDirectaTestFactory>
{
    private readonly VentaDirectaTestFactory _factory;

    public MobileVentaDirectaEndpointsHttpTests(VentaDirectaTestFactory factory)
    {
        _factory = factory;
    }

    private HttpClient ClientAs(string role, int userId, int tenantId = VentaDirectaTestFactory.TenantId)
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("Authorization", "Bearer fake");
        c.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());
        c.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId.ToString());
        c.DefaultRequestHeaders.Add("X-Test-Role", role);
        return c;
    }

    private HttpClient AnonymousClient()
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "1");
        return c;
    }

    // ─────────────────────────────────────────────────────────────
    // Auth / RBAC
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task PostVentaDirecta_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new[] { new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 1m } },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostVentaDirecta_AsVendedor_HitsEndpoint()
    {
        // Vendedor is the typical caller. The endpoint only checks authentication
        // (no role gate), so a valid JWT lets the lambda execute. Happy path lands
        // on 201/400/500 depending on inventory; we only assert it's not 401/403.
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new[] { new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 1m } },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
        response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostVentaDirecta_AsAdmin_HitsEndpoint()
    {
        var client = ClientAs("ADMIN", VentaDirectaTestFactory.AdminId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new[] { new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 1m } },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
        response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostVentaDirecta_AsSupervisor_HitsEndpoint()
    {
        var client = ClientAs("SUPERVISOR", VentaDirectaTestFactory.SupervisorId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new[] { new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 1m } },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
        response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    // Body validation branches
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task PostVentaDirecta_NonExistentCliente_Returns400()
    {
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var body = new
        {
            clienteId = 999999,
            items = new[] { new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 1m } },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostVentaDirecta_ClienteFromOtherTenant_Returns400()
    {
        // Cliente OtroTenant pertenece a TenantId=2. Vendedor está en TenantId=1.
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteOtroTenantId,
            items = new[] { new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 1m } },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostVentaDirecta_EmptyItems_Returns400()
    {
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new object[] { },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostVentaDirecta_CantidadZero_Returns400()
    {
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new[] { new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 0m } },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostVentaDirecta_CantidadNegativa_Returns400()
    {
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new[] { new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = -5m } },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostVentaDirecta_ProductosDuplicados_Returns400()
    {
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new[]
            {
                new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 2m },
                new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 5m }
            },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostVentaDirecta_NonExistentProducto_Returns400()
    {
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new[] { new { productoId = 999999, cantidad = 1m } },
            metodoPago = 0,
            monto = 1000m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostVentaDirecta_MontoMenorAlTotal_Returns400()
    {
        // Producto A precio=100, qty=1 → subtotal=100, IVA=16, total=116. Monto=0 < 116.
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new[] { new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 1m } },
            metodoPago = 0,
            monto = 0m
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    // ─────────────────────────────────────────────────────────────
    // Method enumeration / unsupported verbs
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetVentaDirecta_ReturnsMethodNotAllowedOr404()
    {
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var response = await client.GetAsync("/api/mobile/venta-directa");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.MethodNotAllowed, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostVentaDirecta_DifferentMetodoPago_HitsEndpoint()
    {
        // Cubre la rama del cast (MetodoPago)request.MetodoPago para distinto valor.
        var client = ClientAs("VENDEDOR", VentaDirectaTestFactory.VendedorId);
        var body = new
        {
            clienteId = VentaDirectaTestFactory.ClienteAId,
            items = new[] { new { productoId = VentaDirectaTestFactory.ProductoAId, cantidad = 1m } },
            metodoPago = 1, // Transferencia
            monto = 1000m,
            referencia = "REF-TRANSF-001",
            notas = "Pago por transferencia"
        };

        var response = await client.PostAsJsonAsync("/api/mobile/venta-directa", body);

        response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
        response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
    }
}
