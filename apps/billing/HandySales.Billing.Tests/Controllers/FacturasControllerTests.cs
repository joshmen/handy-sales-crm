using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HandySales.Billing.Api.Controllers;
using HandySales.Billing.Api.Data;
using HandySales.Billing.Api.DTOs;
using HandySales.Billing.Api.Models;
using HandySales.Billing.Api.Services;
using QuestPDF.Infrastructure;
using System.Security.Claims;

namespace HandySales.Billing.Tests.Controllers;

/// <summary>
/// Stub implementations for CFDI services used in controller tests.
/// These bypass real XML generation, signing, PAC, and blob storage.
/// </summary>
internal class StubXmlBuilder : ICfdiXmlBuilder
{
    public string BuildXml(Factura factura, ConfiguracionFiscal config) => "<cfdi:Comprobante />";
}

internal class StubCfdiSigner : ICfdiSigner
{
    public string SignXml(string unsignedXml, ConfiguracionFiscal config) => unsignedXml;
    public string GetNoCertificado(byte[] cerBytes) => "00001000000412345678";
}

internal class StubPacService : IPacService
{
    public Task<TimbradoResult> TimbrarAsync(string xmlPreFirmado, ConfiguracionFiscal config)
    {
        return Task.FromResult(new TimbradoResult
        {
            Success = true,
            Uuid = Guid.NewGuid().ToString(),
            XmlTimbrado = xmlPreFirmado,
            SelloSat = "STUB_SELLO_SAT",
            NoCertificadoSat = "00001000000412345678",
            FechaTimbrado = DateTime.UtcNow,
            CadenaOriginalSat = "||1.1|test||"
        });
    }

    public Task<CancelacionResult> CancelarAsync(string uuid, string rfcEmisor, string motivo,
        string? folioSustitucion, ConfiguracionFiscal config)
    {
        return Task.FromResult(new CancelacionResult
        {
            Success = true,
            EstadoCancelacion = "CANCELADA",
            AcuseXml = "<Acuse />"
        });
    }

    public Task<ConsultaResult> ConsultarEstatusAsync(string uuid, string rfcEmisor, ConfiguracionFiscal config)
    {
        return Task.FromResult(new ConsultaResult { Success = true, Estado = "Vigente" });
    }
}

internal class StubBlobStorageService : IBlobStorageService
{
    public Task<string> UploadXmlAsync(string tenantId, string uuid, string xmlContent)
        => Task.FromResult($"{tenantId}/2026/03/{uuid}.xml");
    public Task<string> UploadPdfAsync(string tenantId, string uuid, byte[] pdfBytes)
        => Task.FromResult($"{tenantId}/2026/03/{uuid}.pdf");
    public Task<string> GetXmlAsync(string blobPath) => Task.FromResult("<cfdi:Comprobante />");
    public Task<byte[]> GetPdfAsync(string blobPath) => Task.FromResult(Array.Empty<byte>());
    public Task<string> GenerateSasUrlAsync(string blobPath, string containerName, TimeSpan? expiry = null)
        => Task.FromResult($"https://stub.blob.core.windows.net/{containerName}/{blobPath}?sig=test");
    public Task DeleteBlobAsync(string blobPath, string containerName) => Task.CompletedTask;
}

internal class StubHttpClientFactory : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => new HttpClient();
}

internal class StubCompanyLogoService : ICompanyLogoService
{
    public Task<string?> GetLogoUrlAsync(string tenantId) => Task.FromResult<string?>(null);
}

internal class StubOrderReaderService : IOrderReaderService
{
    public Task<OrderForInvoice?> GetOrderForInvoiceAsync(string tenantId, int pedidoId)
        => Task.FromResult<OrderForInvoice?>(null);
}

internal class StubTimbreEnforcementService : ITimbreEnforcementService
{
    public Task<TimbreCheckResult> CheckTimbreAvailableAsync(string authorizationHeader)
        => Task.FromResult(new TimbreCheckResult(true, null, 5, 100));
    public Task NotifyTimbreUsedAsync(string authorizationHeader) => Task.CompletedTask;
}

public class FacturasControllerTests : IDisposable
{
    private readonly BillingDbContext _context;
    private readonly FacturasController _controller;
    private readonly string _testTenantId = "test-tenant-001";

    private const string TestJwtSecret = "test-jwt-secret-key-for-encryption-32chars!";

    public FacturasControllerTests()
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var options = new DbContextOptionsBuilder<BillingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new BillingDbContext(options);
        var logger = new LoggerFactory().CreateLogger<FacturasController>();
        var pdfService = new InvoicePdfService();
        var emailLogger = new LoggerFactory().CreateLogger<BillingEmailService>();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = TestJwtSecret
            })
            .Build();
        var emailService = new BillingEmailService(config, emailLogger);
        var httpClientFactory = new StubHttpClientFactory();
        _controller = new FacturasController(
            _context, logger, pdfService, emailService,
            new StubXmlBuilder(), new StubCfdiSigner(),
            new StubPacService(), new StubBlobStorageService(),
            new StubTimbreEnforcementService(),
            new StubCompanyLogoService(), new StubOrderReaderService(),
            httpClientFactory, config);

        // Setup user claims
        SetupUserClaims();

        // Seed test data
        SeedTestData();
    }

    private void SetupUserClaims()
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim("tenant_id", _testTenantId),
            new Claim(ClaimTypes.Email, "test@example.com")
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext { User = principal };
        httpContext.Response.Headers.Clear();

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private void SeedTestData()
    {
        // Add test numeracion
        _context.NumeracionDocumentos.Add(new NumeracionDocumento
        {
            TenantId = _testTenantId,
            TipoDocumento = "FACTURA",
            Serie = "A",
            FolioInicial = 1,
            FolioActual = 1,
            Activo = true
        });

        // Add test facturas
        _context.Facturas.Add(new Factura
        {
            Id = 1,
            TenantId = _testTenantId,
            Serie = "A",
            Folio = 1,
            Uuid = "test-uuid-001",
            FechaEmision = DateTime.UtcNow.AddDays(-1),
            TipoComprobante = "I",
            EmisorRfc = "TEST010101AAA",
            EmisorNombre = "Empresa Test",
            EmisorRegimenFiscal = "601",
            ReceptorRfc = "XAXX010101000",
            ReceptorNombre = "Cliente Test",
            ReceptorUsoCfdi = "G03",
            Subtotal = 1000m,
            Total = 1160m,
            TotalImpuestosTrasladados = 160m,
            Moneda = "MXN",
            TipoCambio = 1,
            Estado = "TIMBRADA",
            CreatedBy = 1
        });

        _context.Facturas.Add(new Factura
        {
            Id = 2,
            TenantId = _testTenantId,
            Serie = "A",
            Folio = 2,
            FechaEmision = DateTime.UtcNow,
            TipoComprobante = "I",
            EmisorRfc = "TEST010101AAA",
            EmisorNombre = "Empresa Test",
            EmisorRegimenFiscal = "601",
            ReceptorRfc = "XAXX010101000",
            ReceptorNombre = "Cliente Test 2",
            ReceptorUsoCfdi = "G03",
            Subtotal = 500m,
            Total = 580m,
            TotalImpuestosTrasladados = 80m,
            Moneda = "MXN",
            TipoCambio = 1,
            Estado = "PENDIENTE",
            CreatedBy = 1
        });

        // Add test configuracion fiscal (required for timbrado)
        _context.ConfiguracionesFiscales.Add(new ConfiguracionFiscal
        {
            TenantId = _testTenantId,
            EmpresaId = 1,
            Rfc = "TEST010101AAA",
            RazonSocial = "Empresa Test",
            RegimenFiscal = "601",
            CodigoPostal = "12345",
            CertificadoSat = Convert.ToBase64String(new byte[] { 1, 2, 3 }),
            LlavePrivada = Convert.ToBase64String(new byte[] { 4, 5, 6 }),
            PasswordCertificado = CatalogosController.EncryptPassword("testpass", TestJwtSecret),
            PacUsuario = "test_user",
            PacPassword = CatalogosController.EncryptPassword("test_pass", TestJwtSecret),
            PacAmbiente = "sandbox",
            Activo = true
        });

        _context.SaveChanges();
    }

    [Fact]
    public async Task GetFacturas_ReturnsAllFacturasForTenant()
    {
        // Act
        var result = await _controller.GetFacturas(null, null, null, null, 1, 20);

        // Assert
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var facturas = okResult!.Value as IEnumerable<FacturaListDto>;
        facturas.Should().NotBeNull();
        facturas!.Count().Should().Be(2);
    }

    [Fact]
    public async Task GetFacturas_FiltersByEstado()
    {
        // Act
        var result = await _controller.GetFacturas(null, null, "TIMBRADA", null, 1, 20);

        // Assert
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var facturas = okResult!.Value as IEnumerable<FacturaListDto>;
        facturas.Should().NotBeNull();
        facturas!.Count().Should().Be(1);
        facturas!.First().Estado.Should().Be("TIMBRADA");
    }

    [Fact]
    public async Task GetFactura_ReturnsFacturaById()
    {
        // Act
        var result = await _controller.GetFactura(1);

        // Assert
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var factura = okResult!.Value as FacturaDto;
        factura.Should().NotBeNull();
        factura!.Id.Should().Be(1);
        factura.ReceptorNombre.Should().Be("Cliente Test");
    }

    [Fact]
    public async Task GetFactura_ReturnsNotFoundForNonExistentId()
    {
        // Act
        var result = await _controller.GetFactura(999);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task CreateFactura_CreatesNewFactura()
    {
        // Arrange
        var request = new CreateFacturaRequest
        {
            TipoComprobante = "I",
            MetodoPago = "PUE",
            FormaPago = "01",
            UsoCfdi = "G03",
            EmisorRfc = "TEST010101AAA",
            EmisorNombre = "Empresa Test",
            EmisorRegimenFiscal = "601",
            ReceptorRfc = "CLIENTE010101AAA",
            ReceptorNombre = "Nuevo Cliente",
            ReceptorUsoCfdi = "G03",
            ReceptorDomicilioFiscal = "12345",
            Subtotal = 2000m,
            Total = 2320m,
            TotalImpuestosTrasladados = 320m
        };

        // Act
        var result = await _controller.CreateFactura(request);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        createdResult.Should().NotBeNull();
        createdResult!.StatusCode.Should().Be(201);

        var factura = createdResult.Value as FacturaDto;
        factura.Should().NotBeNull();
        factura!.ReceptorNombre.Should().Be("Nuevo Cliente");
        factura.Estado.Should().Be("PENDIENTE");
    }

    [Fact]
    public async Task TimbrarFactura_TimbraFacturaPendiente()
    {
        // Act
        var result = await _controller.TimbrarFactura(2); // Factura pendiente

        // Assert
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var factura = okResult!.Value as FacturaDto;
        factura.Should().NotBeNull();
        factura!.Estado.Should().Be("TIMBRADA");
        factura.Uuid.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task TimbrarFactura_ReturnsBadRequestForTimbrada()
    {
        // Act
        var result = await _controller.TimbrarFactura(1); // Factura ya timbrada

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CancelarFactura_CancelaFacturaTimbrada()
    {
        // Arrange
        var request = new CancelarFacturaRequest
        {
            MotivoCancelacion = "02",
            FolioSustitucion = "A-003"
        };

        // Act
        var result = await _controller.CancelarFactura(1, request);

        // Assert
        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        // Verify the state changed
        var factura = await _context.Facturas.FindAsync(1L);
        factura!.Estado.Should().Be("CANCELADA");
    }

    [Fact]
    public async Task CancelarFactura_ReturnsBadRequestForPendiente()
    {
        // Arrange
        var request = new CancelarFacturaRequest
        {
            MotivoCancelacion = "02"
        };

        // Act
        var result = await _controller.CancelarFactura(2, request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GetPdf_ReturnsPdfForExistingFactura()
    {
        // Act
        var result = await _controller.GetPdf(1);

        // Assert
        var fileResult = result as FileContentResult;
        fileResult.Should().NotBeNull();
        fileResult!.ContentType.Should().Be("application/pdf");
        fileResult.FileContents.Length.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetXml_ReturnsNotFoundWhenNoXml()
    {
        // Act
        var result = await _controller.GetXml(1);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
