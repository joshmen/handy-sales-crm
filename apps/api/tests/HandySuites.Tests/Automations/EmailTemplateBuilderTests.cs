using FluentAssertions;
using HandySuites.Api.Automations;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HandySuites.Tests.Automations;

/// <summary>
/// Tests para EmailTemplateBuilder — verifica los helpers estáticos de construcción
/// de HTML (Text, Callout, KpiRow, Table, PrimaryButton, SectionHeading) y el flujo
/// CreateAsync + Build con datos del tenant (CompanySetting + DatosEmpresa).
/// </summary>
public class EmailTemplateBuilderTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly HandySuitesDbContext _db;

    private const int TenantId = 1;

    public EmailTemplateBuilderTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using (var pragma = _connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA foreign_keys = OFF;";
            pragma.ExecuteNonQuery();
        }

        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new HandySuitesDbContext(options);
        _db.Database.EnsureCreated();
    }

    private void SeedTenantWithCompanyData()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Jeyma SA" });
        _db.Set<CompanySetting>().Add(new CompanySetting
        {
            Id = 1,
            TenantId = TenantId,
            CompanyName = "Jeyma SA",
            PrimaryColor = "#10b981",
            LogoUrl = "https://res.cloudinary.com/demo/image/upload/v123/logo.jpg",
            Activo = true,
        });
        _db.DatosEmpresa.Add(new DatosEmpresa
        {
            Id = 1,
            TenantId = TenantId,
            RazonSocial = "Jeyma SA de CV",
            Direccion = "Av. Reforma 100",
            Ciudad = "CDMX",
            Estado = "CDMX",
            CodigoPostal = "06000",
            Telefono = "5555555555",
            Email = "contacto@jeyma.com",
            SitioWeb = "https://jeyma.com",
            Activo = true,
        });
        _db.SaveChanges();
    }

    [Fact]
    public async Task CreateAsync_ConCompanySettingYDatosEmpresa_ConstruyeBuilderConBranding()
    {
        // Arrange
        SeedTenantWithCompanyData();

        // Act
        var builder = await EmailTemplateBuilder.CreateAsync(_db, TenantId, CancellationToken.None);
        var html = builder.Build("Reporte Diario", "<p>contenido</p>");

        // Assert — debe usar PrimaryColor del settings y mostrar el nombre de la empresa
        html.Should().Contain("#10b981");
        html.Should().Contain("Jeyma SA");
        html.Should().Contain("Reporte Diario");
        html.Should().Contain("Av. Reforma 100");
        html.Should().Contain("contacto@jeyma.com");
        // Logo Cloudinary debe haber recibido la transformación c_pad,w_96,h_96
        html.Should().Contain("c_pad,w_96,h_96");
    }

    [Fact]
    public async Task CreateAsync_SinDatosTenant_UsaDefaults()
    {
        // Arrange — solo tenant, sin CompanySetting ni DatosEmpresa
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test" });
        _db.SaveChanges();

        // Act
        var builder = await EmailTemplateBuilder.CreateAsync(_db, TenantId, CancellationToken.None);
        var html = builder.Build("Bienvenida", "<p>hola</p>");

        // Assert — defaults: companyName="Mi Empresa", primaryColor="#16a34a"
        html.Should().Contain("Mi Empresa");
        html.Should().Contain("#16a34a");
        // Sin logo, no debe haber transformación cloudinary
        html.Should().NotContain("c_pad,w_96,h_96");
    }

    [Fact]
    public async Task Build_DeberiaEscaparTituloParaPrevenirInyeccionHtml()
    {
        // Arrange
        SeedTenantWithCompanyData();
        var builder = await EmailTemplateBuilder.CreateAsync(_db, TenantId, CancellationToken.None);

        // Act
        var html = builder.Build("<script>alert(1)</script>", "<p>body</p>");

        // Assert — el título se escapa; el contentHtml se inserta raw
        html.Should().Contain("&lt;script&gt;alert(1)&lt;/script&gt;");
        html.Should().Contain("<p>body</p>");
    }

    [Fact]
    public void Text_DeberiaGenerarParrafoConTextoCrudo()
    {
        // Act
        var html = EmailTemplateBuilder.Text("Hola mundo");

        // Assert
        html.Should().Contain("<p");
        html.Should().Contain("Hola mundo");
        html.Should().Contain("font-size:14px");
    }

    [Fact]
    public void Callout_TypoSuccess_DeberiaUsarColorVerdeYIconoCheck()
    {
        // Act
        var html = EmailTemplateBuilder.Callout("Listo", "success");

        // Assert — bg verde claro y border verde
        html.Should().Contain("#f0fdf4");
        html.Should().Contain("#86efac");
        html.Should().Contain("&#9989;"); // check icon
        html.Should().Contain("Listo");
    }

    [Fact]
    public void Callout_TypoDesconocido_DeberiaUsarEstiloInfoPorDefault()
    {
        // Act
        var html = EmailTemplateBuilder.Callout("Detalle", "random-unknown-type");

        // Assert — fallback a info (bg azul claro)
        html.Should().Contain("#eff6ff");
        html.Should().Contain("#93c5fd");
        html.Should().Contain("Detalle");
    }

    [Fact]
    public void KpiRow_ConTresKpis_DeberiaGenerarCeldasConWidth33Porciento()
    {
        // Act
        var html = EmailTemplateBuilder.KpiRow(
            ("Ventas", "$1,000", "&#128176;"),
            ("Pedidos", "42", null),
            ("Clientes", "10", null)
        );

        // Assert — 100/3 = 33
        html.Should().Contain("width=\"33%\"");
        html.Should().Contain("$1,000");
        html.Should().Contain("Ventas");
        html.Should().Contain("Pedidos");
        html.Should().Contain("Clientes");
        // Solo el primero tiene icon
        html.Should().Contain("&#128176;");
    }

    [Fact]
    public void Table_DeberiaRenderizarHeadersYFilasConBandeoAlternado()
    {
        // Arrange
        var headers = new[] { "Producto", "Cantidad" };
        var rows = new List<string[]>
        {
            new[] { "Coca 600ml", "10" },
            new[] { "Sprite 600ml", "5" },
            new[] { "Agua 1L", "3" },
        };

        // Act
        var html = EmailTemplateBuilder.Table(headers, rows, primaryColor: "#16a34a");

        // Assert — headers + datos + alternancia de fondo
        html.Should().Contain("Producto");
        html.Should().Contain("Cantidad");
        html.Should().Contain("Coca 600ml");
        html.Should().Contain("Sprite 600ml");
        html.Should().Contain("Agua 1L");
        html.Should().Contain("#16a34a");
        html.Should().Contain("#ffffff"); // fila par
        html.Should().Contain("#f9fafb"); // fila impar (banded)
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
