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
/// Stub IOrderReaderService that returns predefined orders for Factura Global tests.
/// </summary>
internal class StubOrderReaderServiceWithOrders : IOrderReaderService
{
    private readonly List<OrderForInvoice> _orders;

    public StubOrderReaderServiceWithOrders(List<OrderForInvoice>? orders = null)
    {
        _orders = orders ?? new List<OrderForInvoice>();
    }

    public Task<OrderForInvoice?> GetOrderForInvoiceAsync(string tenantId, int pedidoId)
        => Task.FromResult<OrderForInvoice?>(null);

    public Task<List<OrderForInvoice>> GetOrdersForFacturaGlobalAsync(
        string tenantId, DateTime fechaInicio, DateTime fechaFin, List<long> excludedPedidoIds)
        => Task.FromResult(_orders);
}

/// <summary>
/// Stub IOrderReaderService that returns empty orders (no pedidos found).
/// </summary>
internal class StubOrderReaderServiceEmpty : IOrderReaderService
{
    public Task<OrderForInvoice?> GetOrderForInvoiceAsync(string tenantId, int pedidoId)
        => Task.FromResult<OrderForInvoice?>(null);

    public Task<List<OrderForInvoice>> GetOrdersForFacturaGlobalAsync(
        string tenantId, DateTime fechaInicio, DateTime fechaFin, List<long> excludedPedidoIds)
        => Task.FromResult(new List<OrderForInvoice>());
}

public class FacturasGlobalPublicTests : IDisposable
{
    private readonly BillingDbContext _context;
    private readonly string _testTenantId = "test-tenant-pub-001";
    private const string TestJwtSecret = "test-jwt-secret-key-for-encryption-32chars!";

    public FacturasGlobalPublicTests()
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var options = new DbContextOptionsBuilder<BillingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("tenant_id", _testTenantId),
            new Claim(ClaimTypes.NameIdentifier, "1"),
        }, "test"));
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };

        _context = new BillingDbContext(options, httpContextAccessor);
        SeedTestData();
    }

    private FacturasController CreateController(IOrderReaderService? orderReaderService = null)
    {
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

        var controller = new FacturasController(
            _context, logger, pdfService, emailService,
            new StubXmlBuilder(), new StubCfdiSigner(),
            new StubPacService(), new StubBlobStorageService(),
            new StubTimbreEnforcementService(),
            new StubCompanyLogoService(),
            orderReaderService ?? new StubOrderReaderService(),
            new FiscalCodeResolver(_context),
            new StubHttpClientFactory(), config);

        // Setup user claims
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim("tenant_id", _testTenantId),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Role, "ADMIN")
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        httpContext.Response.Headers.Clear();

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }

    private void SeedTestData()
    {
        // Add numeracion
        _context.NumeracionDocumentos.Add(new NumeracionDocumento
        {
            TenantId = _testTenantId,
            TipoDocumento = "FACTURA",
            Serie = "A",
            FolioInicial = 1,
            FolioActual = 1,
            Activo = true
        });

        // Factura TIMBRADA with known UUID
        _context.Facturas.Add(new Factura
        {
            Id = 1,
            TenantId = _testTenantId,
            Serie = "A",
            Folio = 1,
            Uuid = "test-uuid-pub-001",
            FechaEmision = DateTime.UtcNow.AddDays(-1),
            FechaTimbrado = DateTime.UtcNow.AddDays(-1),
            TipoComprobante = "I",
            EmisorRfc = "TEST010101AAA",
            EmisorNombre = "Empresa Test SA de CV",
            EmisorRegimenFiscal = "601",
            ReceptorRfc = "XAXX010101000",
            ReceptorNombre = "PUBLICO EN GENERAL",
            ReceptorUsoCfdi = "S01",
            Subtotal = 1000m,
            Total = 1160m,
            TotalImpuestosTrasladados = 160m,
            Moneda = "MXN",
            TipoCambio = 1,
            Estado = "TIMBRADA",
            PdfBlobUrl = "test-tenant-pub-001/2026/03/test-uuid-pub-001.pdf",
            XmlBlobUrl = "test-tenant-pub-001/2026/03/test-uuid-pub-001.xml",
            CreatedBy = 1
        });

        // Factura PENDIENTE with known UUID
        _context.Facturas.Add(new Factura
        {
            Id = 2,
            TenantId = _testTenantId,
            Serie = "A",
            Folio = 2,
            Uuid = "test-uuid-pub-002",
            FechaEmision = DateTime.UtcNow,
            TipoComprobante = "I",
            EmisorRfc = "TEST010101AAA",
            EmisorNombre = "Empresa Test SA de CV",
            EmisorRegimenFiscal = "601",
            ReceptorRfc = "CLIENTE010101BBB",
            ReceptorNombre = "Cliente Pendiente",
            ReceptorUsoCfdi = "G03",
            Subtotal = 500m,
            Total = 580m,
            TotalImpuestosTrasladados = 80m,
            Moneda = "MXN",
            TipoCambio = 1,
            Estado = "PENDIENTE",
            CreatedBy = 1
        });

        // Configuracion fiscal for Factura Global tests
        _context.ConfiguracionesFiscales.Add(new ConfiguracionFiscal
        {
            TenantId = _testTenantId,
            EmpresaId = 1,
            Rfc = "TEST010101AAA",
            RazonSocial = "Empresa Test SA de CV",
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

    // ═══════════════════════════════════════════════════════════════════════
    // Public Endpoint Tests
    // ═══════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task GetPublicByUuid_RetornaFacturaTimbrada()
    {
        // Arrange
        var controller = CreateController();

        // Act
        var result = await controller.GetPublicByUuid("test-uuid-pub-001");

        // Assert
        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        var dto = okResult!.Value as FacturaPublicDto;
        dto.Should().NotBeNull();
        dto!.Uuid.Should().Be("test-uuid-pub-001");
        dto.Estado.Should().Be("TIMBRADA");
        dto.EmisorRfc.Should().Be("TEST010101AAA");
        dto.EmisorNombre.Should().Be("Empresa Test SA de CV");
        dto.ReceptorRfc.Should().Be("XAXX010101000");
        dto.ReceptorNombre.Should().Be("PUBLICO EN GENERAL");
        dto.Total.Should().Be(1160m);
        dto.Moneda.Should().Be("MXN");

        // Timbrada facturas should have presigned download URLs
        dto.PdfUrl.Should().NotBeNullOrEmpty();
        dto.XmlUrl.Should().NotBeNullOrEmpty();
        dto.PdfUrl.Should().Contain("stub.blob.core.windows.net");
    }

    [Fact]
    public async Task GetPublicByUuid_RetornaFacturaPendiente()
    {
        // Arrange
        var controller = CreateController();

        // Act
        var result = await controller.GetPublicByUuid("test-uuid-pub-002");

        // Assert
        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        var dto = okResult!.Value as FacturaPublicDto;
        dto.Should().NotBeNull();
        dto!.Uuid.Should().Be("test-uuid-pub-002");
        dto.Estado.Should().Be("PENDIENTE");
        dto.ReceptorNombre.Should().Be("Cliente Pendiente");

        // Pendiente facturas should NOT have download URLs
        dto.PdfUrl.Should().BeNull();
        dto.XmlUrl.Should().BeNull();
    }

    [Fact]
    public async Task GetPublicByUuid_RetornaNotFound_CuandoUuidNoExiste()
    {
        // Arrange
        var controller = CreateController();

        // Act
        var result = await controller.GetPublicByUuid("uuid-que-no-existe-999");

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Factura Global Tests
    // ═══════════════════════════════════════════════════════════════════════

    [Fact(Skip = "Requires relational DB provider — InMemory does not support raw SQL/ExecuteUpdate")]
    public async Task PostFacturaGlobal_CreaFacturaConPedidosPublicoGeneral()
    {
        // Arrange — stub order reader returns 2 orders with detalles
        var orders = new List<OrderForInvoice>
        {
            new OrderForInvoice
            {
                PedidoId = 100,
                NumeroPedido = "PED-100",
                Estado = 5,
                Subtotal = 500m,
                Descuento = 0m,
                Impuestos = 80m,
                Total = 580m,
                ClienteRfc = "XAXX010101000",
                ClienteNombre = "PUBLICO EN GENERAL",
                Detalles = new List<OrderLineForInvoice>
                {
                    new OrderLineForInvoice
                    {
                        ProductoId = 1,
                        ProductoNombre = "Producto A",
                        ProductoClaveSat = "50211502",
                        UnidadNombre = "Pieza",
                        UnidadClaveSat = "H87",
                        Cantidad = 2,
                        PrecioUnitario = 250m,
                        Subtotal = 500m,
                        Descuento = 0m,
                        Impuesto = 80m,
                        Total = 580m
                    }
                }
            },
            new OrderForInvoice
            {
                PedidoId = 101,
                NumeroPedido = "PED-101",
                Estado = 5,
                Subtotal = 300m,
                Descuento = 0m,
                Impuestos = 48m,
                Total = 348m,
                ClienteRfc = "XAXX010101000",
                ClienteNombre = "PUBLICO EN GENERAL",
                Detalles = new List<OrderLineForInvoice>
                {
                    new OrderLineForInvoice
                    {
                        ProductoId = 2,
                        ProductoNombre = "Producto B",
                        ProductoClaveSat = "50211503",
                        UnidadNombre = "Kilogramo",
                        UnidadClaveSat = "KGM",
                        Cantidad = 3,
                        PrecioUnitario = 100m,
                        Subtotal = 300m,
                        Descuento = 0m,
                        Impuesto = 48m,
                        Total = 348m
                    }
                }
            }
        };

        var controller = CreateController(new StubOrderReaderServiceWithOrders(orders));

        var request = new FacturaGlobalRequest
        {
            FechaInicio = DateTime.UtcNow.AddDays(-30),
            FechaFin = DateTime.UtcNow,
            Periodicidad = "04" // Mensual
        };

        // Act
        var result = await controller.GenerarFacturaGlobal(request);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        createdResult.Should().NotBeNull();
        createdResult!.StatusCode.Should().Be(201);

        var dto = createdResult.Value as FacturaDto;
        dto.Should().NotBeNull();
        dto!.ReceptorRfc.Should().Be("XAXX010101000");
        dto.ReceptorNombre.Should().Be("PUBLICO EN GENERAL");
        dto.Estado.Should().Be("PENDIENTE");
        dto.Subtotal.Should().Be(800m); // 500 + 300
        dto.Total.Should().Be(928m); // 580 + 348
        dto.Detalles.Should().NotBeNullOrEmpty();
        dto.Detalles!.Count.Should().Be(2);
    }

    [Fact]
    public async Task PostFacturaGlobal_RechazaSinPedidos()
    {
        // Arrange — empty order reader, no pedidos in range
        var controller = CreateController(new StubOrderReaderServiceEmpty());

        var request = new FacturaGlobalRequest
        {
            FechaInicio = DateTime.UtcNow.AddDays(-1),
            FechaFin = DateTime.UtcNow,
            Periodicidad = "04"
        };

        // Act
        var result = await controller.GenerarFacturaGlobal(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
