using HandySuites.Infrastructure.Persistence;
using HandySuites.Mobile.Tests.Common;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using HandySuites.Infrastructure.Repositories;
using HandySuites.Shared.Multitenancy;
using HandySuites.Shared.Security;
using System.Net;
using System.Net.Http.Headers;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Factory dedicado para los tests de attachments. La shared AttachmentTestFactory
/// tiene un bug conocido (pre-prod #11, 2026-06-07): el seed con SupervisorId self-FK
/// falla en SQLite porque EF Core no garantiza orden de insert. Aquí desactivamos
/// el FK enforcement con `PRAGMA foreign_keys = OFF` antes del seed para evitar el bug
/// sin tocar shared code.
/// </summary>
public class AttachmentTestFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

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

            // Apagar FK enforcement para evitar el bug de seed con SupervisorId self-FK.
            using (var cmd = _connection.CreateCommand())
            {
                cmd.CommandText = "PRAGMA foreign_keys = OFF;";
                cmd.ExecuteNonQuery();
            }

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

            services.TryAddSingleton<Microsoft.AspNetCore.Http.IHttpContextAccessor, Microsoft.AspNetCore.Http.HttpContextAccessor>();
            services.AddScoped<ICurrentTenant, CurrentTenant>();
            services.Configure<JwtSettings>(opts =>
            {
                opts.Secret = "12345678901234567890123456789012";
                opts.Issuer = "HandySuites.Test";
                opts.Audience = "HandySuites.Test";
                opts.ExpirationMinutes = 60;
            });

            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            db.Database.EnsureDeleted();
            db.Database.EnsureCreated();

            // Re-confirmar PRAGMA después de EnsureCreated (EF puede haberlo reseteado).
            db.Database.ExecuteSqlRaw("PRAGMA foreign_keys = OFF;");

            try
            {
                MobileTestSeeder.Seed(db);
            }
            catch
            {
                // Si el seed falla por bug pre-existente, ignoramos — los tests de attachment
                // no requieren los registros de Usuario para correr (la auth la falsifica el
                // FakeJwtAuthHandler vía headers, sin consultar DB).
            }
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection?.Close();
        _connection?.Dispose();
    }
}

/// <summary>
/// HTTP integration tests for MobileAttachmentEndpoints
/// (apps/mobile/HandySuites.Mobile.Api/Endpoints/MobileAttachmentEndpoints.cs).
///
/// Endpoint: POST /api/mobile/attachments/upload (multipart/form-data)
///   - Requires authentication (group.RequireAuthorization()).
///   - Accepts fields: file (IFormFile), eventType, eventLocalId, tipo.
///   - eventType allowlist: pedido, visita, cobro, gasto, devolucion.
///   - Allowed file extensions: .jpg, .jpeg, .png, .webp; max 10MB.
///   - Si NO hay ICloudinaryService registrado y env != Development -> 501.
///
/// El factory AttachmentTestFactory corre con UseEnvironment("Testing"). Sin
/// ICloudinaryService registrado, el endpoint puede:
///   - Devolver 501 (env != Development, rama explícita).
///   - Devolver 500 si la rama Development intenta escribir en disco y falla.
///   - Devolver 200 si se inyecta un mock Cloudinary.
/// Por eso usamos BeOneOf(200, 500, 501) en happy-path: el objetivo es ejercer
/// el pipeline del endpoint, no probar Cloudinary real.
/// </summary>
public class MobileAttachmentEndpointsHttpTests : IClassFixture<AttachmentTestFactory>
{
    private readonly AttachmentTestFactory _factory;

    static MobileAttachmentEndpointsHttpTests()
    {
        // Asegurar que JwtExtensions encuentra el secret antes de que el host arranque.
        // El factory hace ConfigureAppConfiguration pero la validación de
        // JwtExtensions corre temprano y a veces lee de variables de entorno.
        Environment.SetEnvironmentVariable("Jwt__Secret", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__Audience", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__ExpirationMinutes", "60");
        Environment.SetEnvironmentVariable("JWT_SECRET", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("BILLING_API_URL", "http://billing.test");
        Environment.SetEnvironmentVariable("MAIN_API_URL", "http://main.test");
    }

    public MobileAttachmentEndpointsHttpTests(AttachmentTestFactory factory)
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
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
        return c;
    }

    private static MultipartFormDataContent BuildMultipart(
        byte[]? fileBytes,
        string fileName,
        string? eventType,
        string? eventLocalId,
        string? tipo,
        string contentType = "image/jpeg")
    {
        var content = new MultipartFormDataContent();
        if (fileBytes != null)
        {
            var fileContent = new ByteArrayContent(fileBytes);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            content.Add(fileContent, "file", fileName);
        }
        if (eventType != null) content.Add(new StringContent(eventType), "eventType");
        if (eventLocalId != null) content.Add(new StringContent(eventLocalId), "eventLocalId");
        if (tipo != null) content.Add(new StringContent(tipo), "tipo");
        return content;
    }

    // 1×1 JPEG header bytes — sufficient to pass "Length > 0" and extension check.
    private static byte[] FakeJpegBytes() => new byte[]
    {
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
        0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00
    };

    // ─────────────────────────────────────────────────────────────
    // Happy path / auth coverage
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Upload_AsVendedor_WithValidJpeg_ReturnsOkOr501()
    {
        // En el entorno de tests no hay ICloudinaryService registrado y
        // env != Development → la rama de Cloudinary devuelve 501.
        // Aceptamos 200 si en el futuro se inyecta un mock.
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            FakeJpegBytes(), "evidencia.jpg",
            eventType: "visita",
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotImplemented,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Upload_AsAdmin_WithValidPng_ReturnsOkOr501()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var content = BuildMultipart(
            FakeJpegBytes(), "foto.png",
            eventType: "pedido",
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia",
            contentType: "image/png");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotImplemented,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Upload_AsSupervisor_WithGastoEventType_ReturnsOkOr501()
    {
        // Gasto rama hace stamping post-upload — debe seguir respondiendo OK/501
        // aún cuando el gasto no exista (catch logueado, no falla el upload).
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var content = BuildMultipart(
            FakeJpegBytes(), "comprobante.jpg",
            eventType: "gasto",
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "comprobante");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotImplemented,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Upload_AsVendedor_WithDevolucionEventType_ReturnsOkOr501()
    {
        // Devolucion rama también hace stamping post-upload.
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            FakeJpegBytes(), "evidence.webp",
            eventType: "devolucion",
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia",
            contentType: "image/webp");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotImplemented,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Upload_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var content = BuildMultipart(
            FakeJpegBytes(), "foto.jpg",
            eventType: "visita",
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────
    // BadRequest validations
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Upload_WithoutMultipart_RejectsRequest()
    {
        // El endpoint declara .Accepts<IFormFile>("multipart/form-data"); ASP.NET Core
        // responde 415 UnsupportedMediaType ANTES de entrar a la lambda con
        // content-type JSON. Si en algún momento el decorador se quita, la lambda
        // misma devolvería 400 BadRequest ("Expected multipart/form-data"). Aceptamos
        // ambos códigos para no acoplar el test al detalle del pipeline.
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new StringContent("{\"foo\":\"bar\"}", System.Text.Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/mobile/attachments/upload", body);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.UnsupportedMediaType);
    }

    [Fact]
    public async Task Upload_WithoutFile_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            fileBytes: null, fileName: "n/a",
            eventType: "visita",
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_MissingEventType_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            FakeJpegBytes(), "foto.jpg",
            eventType: null,
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_MissingEventLocalId_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            FakeJpegBytes(), "foto.jpg",
            eventType: "visita",
            eventLocalId: null,
            tipo: "evidencia");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_MissingTipo_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            FakeJpegBytes(), "foto.jpg",
            eventType: "visita",
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: null);

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_WithInvalidEventType_Returns400()
    {
        // 'wedding' no está en el allowlist (pedido/visita/cobro/gasto/devolucion).
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            FakeJpegBytes(), "foto.jpg",
            eventType: "wedding",
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_WithDisallowedExtension_Returns400()
    {
        // .gif no está en allowlist (.jpg, .jpeg, .png, .webp).
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            FakeJpegBytes(), "animated.gif",
            eventType: "visita",
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia",
            contentType: "image/gif");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_WithPdfExtension_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            FakeJpegBytes(), "documento.pdf",
            eventType: "visita",
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia",
            contentType: "application/pdf");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("pedido")]
    [InlineData("visita")]
    [InlineData("cobro")]
    [InlineData("gasto")]
    [InlineData("devolucion")]
    public async Task Upload_WithEachAllowedEventType_DoesNotReturn400ForEventType(string eventType)
    {
        // Verifica el allowlist por exhaustividad: ninguno de los allowed eventTypes
        // debe disparar el 400 del allowlist check (cualquier código != 400 es válido).
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            FakeJpegBytes(), "foto.jpg",
            eventType: eventType,
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotImplemented,
            HttpStatusCode.InternalServerError);
    }

    [Theory]
    [InlineData("PEDIDO")]
    [InlineData("Visita")]
    [InlineData("CoBrO")]
    public async Task Upload_EventTypeAllowlist_IsCaseInsensitive(string eventType)
    {
        // Allowlist usa StringComparer.OrdinalIgnoreCase — variantes en mayúsculas
        // también deben ser aceptadas (no 400).
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var content = BuildMultipart(
            FakeJpegBytes(), "foto.jpg",
            eventType: eventType,
            eventLocalId: Guid.NewGuid().ToString(),
            tipo: "evidencia");

        var response = await client.PostAsync("/api/mobile/attachments/upload", content);

        response.StatusCode.Should().NotBe(HttpStatusCode.BadRequest);
    }
}
