using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HandySuites.Billing.Api.Controllers;
using HandySuites.Billing.Api.Data;
using HandySuites.Billing.Api.DTOs;
using HandySuites.Billing.Api.Models;
using HandySuites.Billing.Api.Services;
using QuestPDF.Infrastructure;
using System.Security.Claims;

namespace HandySuites.Billing.Tests.Controllers;

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
    public Task<string> SignXmlAsync(string unsignedXml, ConfiguracionFiscal config, string tenantId)
        => Task.FromResult(unsignedXml);
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

    public Task<SatStatusResult> GetSatStatusAsync(string uuid, string rfcEmisor, string rfcReceptor, decimal total, ConfiguracionFiscal config)
    {
        return Task.FromResult(new SatStatusResult { Success = true, Estado = "Vigente", EsCancelable = "Cancelable sin aceptación" });
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

/// <summary>
/// Mutable stub para inyectar pedidos por test.
/// </summary>
internal class StubOrderReaderService : IOrderReaderService
{
    public OrderForInvoice? NextOrder { get; set; }
    public List<OrderForInvoice> GlobalOrders { get; set; } = new();

    public Task<OrderForInvoice?> GetOrderForInvoiceAsync(string tenantId, int pedidoId)
        => Task.FromResult(NextOrder);

    public Task<List<OrderForInvoice>> GetOrdersForFacturaGlobalAsync(
        string tenantId, DateTime fechaInicio, DateTime fechaFin, List<long> excludedPedidoIds)
        => Task.FromResult(GlobalOrders);
}

internal class StubTimbreEnforcementService : ITimbreEnforcementService
{
    public bool Allow { get; set; } = true;
    public Task<TimbreCheckResult> CheckTimbreAvailableAsync(string authorizationHeader)
        => Task.FromResult(new TimbreCheckResult(Allow, Allow ? null : "Sin timbres disponibles.", 5, 100));
    public Task NotifyTimbreUsedAsync(string authorizationHeader) => Task.CompletedTask;
}

internal class StubEncryptionService : ICertificateEncryptionService
{
    public byte[] Encrypt(byte[] plaintext) => plaintext;
    public byte[] Decrypt(byte[] ciphertext) => ciphertext;
}

internal class StubTenantEncryptionService : ITenantEncryptionService
{
    public Task<EncryptionResult> EncryptAsync(string tenantId, byte[] plaintext)
        => Task.FromResult(new EncryptionResult(plaintext, ""));
    public Task<byte[]> DecryptAsync(string tenantId, byte[] ciphertext, string? encryptedDek, short encryptionVersion)
        => Task.FromResult(ciphertext);
}

// BILL-1 stubs — no llaman Finkok real ni SendGrid, retornan success siempre.
internal class StubRegistrationService : HandySuites.Billing.Api.Services.IRegistrationService
{
    public Task<HandySuites.Billing.Api.DTOs.RegisterEmitterResult> RegisterEmitterAsync(HandySuites.Billing.Api.DTOs.RegisterEmitterRequest request, CancellationToken ct = default)
        => Task.FromResult(new HandySuites.Billing.Api.DTOs.RegisterEmitterResult { Success = true, Message = "stub-success" });

    public Task<HandySuites.Billing.Api.DTOs.RegisterEmitterResult> UpdateEmitterAsync(HandySuites.Billing.Api.DTOs.UpdateEmitterRequest request, CancellationToken ct = default)
        => Task.FromResult(new HandySuites.Billing.Api.DTOs.RegisterEmitterResult { Success = true });

    public Task<HandySuites.Billing.Api.DTOs.EmitterInfoResult> GetEmitterInfoAsync(string rfc, CancellationToken ct = default)
        => Task.FromResult(new HandySuites.Billing.Api.DTOs.EmitterInfoResult { Success = true, Status = "active" });

    public Task<HandySuites.Billing.Api.DTOs.AssignCreditsResult> AssignCreditsAsync(string rfc, int credits, CancellationToken ct = default)
        => Task.FromResult(new HandySuites.Billing.Api.DTOs.AssignCreditsResult { Success = true, CreditsTotal = credits });

    public Task<HandySuites.Billing.Api.DTOs.EmittersListResult> ListEmittersAsync(int page = 1, CancellationToken ct = default)
        => Task.FromResult(new HandySuites.Billing.Api.DTOs.EmittersListResult { Success = true });

    public Task<HandySuites.Billing.Api.DTOs.RegisterEmitterResult> SwitchTypeUserAsync(string rfc, char newTypeUser, CancellationToken ct = default)
        => Task.FromResult(new HandySuites.Billing.Api.DTOs.RegisterEmitterResult { Success = true });
}

internal class StubTenantInfoService : HandySuites.Billing.Api.Services.ITenantInfoService
{
    public Task<IReadOnlyList<string>> GetAdminEmailsAsync(int tenantId, CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>());
}

internal class StubBillingEmailService : HandySuites.Billing.Api.Services.IBillingEmailService
{
    public Task<bool> SendFacturaAsync(string toEmail, string subject, string htmlBody,
        byte[]? pdfBytes = null, string? pdfFileName = null,
        string? xmlContent = null, string? xmlFileName = null) => Task.FromResult(true);

    public Task<bool> SendFinkokRegistrationSuccessAsync(string toEmail, string rfc, string? razonSocial, char typeUser, string lang = "es")
        => Task.FromResult(true);

    public Task<bool> SendFinkokRegistrationFailureAsync(string toEmail, string rfc, string finkokErrorMessage, string lang = "es")
        => Task.FromResult(true);
}

/// <summary>
/// FacturasController — 25 unit tests usando InMemory DB + stubs CFDI.
///
/// Algunos endpoints (TimbrarFactura, CreateFactura) usan ExecuteUpdateAsync / raw SQL
/// que el provider InMemory no soporta. Esos tests están marcados como Skip con razón
/// "Requires relational DB provider — InMemory does not support ExecuteUpdate/raw SQL".
///
/// El resto se ejercita end-to-end con InMemory:
/// GetFacturas (paginación, filtros), GetFactura, GetTicketData, GetInvoicedOrders,
/// CancelarFactura (flujo Finkok), GetPdf, GetXml, GetPublicByUuid, PreviewFacturaFromOrder,
/// CreateFacturaFromOrder validation, ExportZip, GenerarFacturaGlobal validation.
/// </summary>
public class FacturasControllerTests : IDisposable
{
    private readonly BillingDbContext _context;
    private readonly FacturasController _controller;
    private readonly StubOrderReaderService _orderReader;
    private readonly StubTimbreEnforcementService _timbreService;
    private readonly string _testTenantId = "test-tenant-001";

    private const string TestJwtSecret = "test-jwt-secret-key-for-encryption-32chars!";

    public FacturasControllerTests()
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var options = new DbContextOptionsBuilder<BillingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        // Mock IHttpContextAccessor so global query filters resolve CurrentTenantId
        var httpContext = new DefaultHttpContext();
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("tenant_id", _testTenantId),
            new Claim(ClaimTypes.NameIdentifier, "1"),
        }, "test"));
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };

        _context = new BillingDbContext(options, httpContextAccessor);
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
        var fiscalCodeResolver = new FiscalCodeResolver(_context);
        _orderReader = new StubOrderReaderService();
        _timbreService = new StubTimbreEnforcementService();
        _controller = new FacturasController(
            _context, logger, pdfService, emailService,
            new StubXmlBuilder(), new StubCfdiSigner(),
            new StubPacService(), new StubBlobStorageService(),
            _timbreService,
            new StubCompanyLogoService(), _orderReader,
            fiscalCodeResolver, httpClientFactory, config,
            new StubTenantEncryptionService());

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
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Role, "ADMIN")
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

        // Factura TIMBRADA (id=1)
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
            PedidoId = 100,
            CreatedBy = 1
        });

        // Factura PENDIENTE (id=2)
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

        // Factura CANCELADA (id=3) — para verificar que GetInvoicedOrders la excluye
        _context.Facturas.Add(new Factura
        {
            Id = 3,
            TenantId = _testTenantId,
            Serie = "A",
            Folio = 3,
            Uuid = "test-uuid-003",
            FechaEmision = DateTime.UtcNow.AddDays(-3),
            TipoComprobante = "I",
            EmisorRfc = "TEST010101AAA",
            EmisorNombre = "Empresa Test",
            EmisorRegimenFiscal = "601",
            ReceptorRfc = "ABC010101AAA",
            ReceptorNombre = "Otro Cliente",
            ReceptorUsoCfdi = "G03",
            Subtotal = 100m,
            Total = 116m,
            TotalImpuestosTrasladados = 16m,
            Moneda = "MXN",
            TipoCambio = 1,
            Estado = "CANCELADA",
            PedidoId = 101,
            CreatedBy = 1
        });

        // Add test configuracion fiscal (required for timbrado, country gate)
        _context.ConfiguracionesFiscales.Add(new ConfiguracionFiscal
        {
            TenantId = _testTenantId,
            EmpresaId = 1,
            Rfc = "TEST010101AAA",
            RazonSocial = "Empresa Test",
            RegimenFiscal = "601",
            CodigoPostal = "12345",
            Pais = "México",
            SerieFactura = "A",
            CertificadoSat = Convert.ToBase64String(new byte[] { 1, 2, 3 }),
            LlavePrivada = Convert.ToBase64String(new byte[] { 4, 5, 6 }),
            PasswordCertificado = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("testpass")),
            PacUsuario = "test_user",
            PacPassword = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("test_pass")),
            PacAmbiente = "sandbox",
            Activo = true
        });

        _context.SaveChanges();
    }

    // ────────────────────────── GetFacturas ──────────────────────────

    [Fact]
    public async Task GetFacturas_ReturnsAllFacturasForTenant()
    {
        var result = await _controller.GetFacturas(null, null, null, null, 1, 20);

        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var value = okResult!.Value!;
        var items = value.GetType().GetProperty("items")!.GetValue(value) as IEnumerable<FacturaListDto>;
        items.Should().NotBeNull();
        items!.Count().Should().Be(3);
    }

    [Fact]
    public async Task GetFacturas_FiltersByEstado()
    {
        var result = await _controller.GetFacturas(null, null, "TIMBRADA", null, 1, 20);

        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var value = okResult!.Value!;
        var items = value.GetType().GetProperty("items")!.GetValue(value) as IEnumerable<FacturaListDto>;
        items.Should().NotBeNull();
        items!.Count().Should().Be(1);
        items!.First().Estado.Should().Be("TIMBRADA");
    }

    [Fact]
    public async Task GetFacturas_FiltersByReceptorRfc()
    {
        var result = await _controller.GetFacturas(null, null, null, "ABC010101", 1, 20);

        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var value = okResult!.Value!;
        var items = value.GetType().GetProperty("items")!.GetValue(value) as IEnumerable<FacturaListDto>;
        items.Should().NotBeNull();
        items!.Count().Should().Be(1);
        items!.First().ReceptorRfc.Should().Be("ABC010101AAA");
    }

    [Fact]
    public async Task GetFacturas_FiltersByDateRange()
    {
        var desde = DateTime.UtcNow.AddDays(-2);
        var hasta = DateTime.UtcNow.AddDays(1);

        var result = await _controller.GetFacturas(desde, hasta, null, null, 1, 20);

        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var value = okResult!.Value!;
        var items = (value.GetType().GetProperty("items")!.GetValue(value) as IEnumerable<FacturaListDto>)!.ToList();
        items.Should().NotContain(f => f.Id == 3); // CANCELADA es de hace 3 días, fuera del rango
        items.Count.Should().Be(2);
    }

    [Fact]
    public async Task GetFacturas_PageSizeClampedToMax100()
    {
        var result = await _controller.GetFacturas(null, null, null, null, 1, 500);

        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var value = okResult!.Value!;
        var pageSize = (int)value.GetType().GetProperty("pageSize")!.GetValue(value)!;
        pageSize.Should().Be(100);
    }

    [Fact]
    public async Task GetFacturas_OrdersByFechaEmisionDescending()
    {
        var result = await _controller.GetFacturas(null, null, null, null, 1, 20);

        var okResult = result.Result as OkObjectResult;
        var value = okResult!.Value!;
        var items = (value.GetType().GetProperty("items")!.GetValue(value) as IEnumerable<FacturaListDto>)!.ToList();

        // PENDIENTE (hoy) > TIMBRADA (ayer) > CANCELADA (-3 días)
        items[0].Id.Should().Be(2);
        items[^1].Id.Should().Be(3);
    }

    // ────────────────────────── GetFactura ──────────────────────────

    [Fact]
    public async Task GetFactura_ReturnsFacturaById()
    {
        var result = await _controller.GetFactura(1);

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
        var result = await _controller.GetFactura(999);

        result.Result.Should().BeOfType<NotFoundResult>();
    }

    // ────────────────────────── GetInvoicedOrders ──────────────────────────

    [Fact]
    public async Task GetInvoicedOrders_ReturnsDictionaryKeyedByPedidoId()
    {
        var result = await _controller.GetInvoicedOrders();

        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        // El resultado es un Dictionary<long, anon>. Solo debería contener pedido 100
        // (factura 1 TIMBRADA con PedidoId=100). El pedido 101 (factura CANCELADA) NO debe aparecer.
        var value = okResult!.Value;
        value.Should().NotBeNull();

        // Iterar usando reflexión genérica sobre IDictionary
        var dict = value as System.Collections.IDictionary;
        dict.Should().NotBeNull();
        dict!.Count.Should().Be(1);
        dict.Contains(100L).Should().BeTrue();
        dict.Contains(101L).Should().BeFalse();
    }

    // ────────────────────────── GetTicketData ──────────────────────────

    [Fact]
    public async Task GetTicketData_ReturnsBadRequestForFacturaPendiente()
    {
        var result = await _controller.GetTicketData(2);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GetTicketData_ReturnsNotFoundForNonExistentId()
    {
        var result = await _controller.GetTicketData(999);

        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetTicketData_ReturnsOkForTimbradaWithUuid()
    {
        var result = await _controller.GetTicketData(1);

        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var dto = okResult!.Value as FacturaTicketDataDto;
        dto.Should().NotBeNull();
        dto!.Uuid.Should().Be("test-uuid-001");
        dto.EmisorRfc.Should().Be("TEST010101AAA");
        // RFC PAC vacío cuando no hay XmlContent con TFD
        dto.RfcPac.Should().Be(string.Empty);
    }

    // ────────────────────────── CreateFactura ──────────────────────────

    [Fact]
    public async Task CreateFactura_ReturnsBadRequestForInvalidEmisorRfc()
    {
        var request = new CreateFacturaRequest
        {
            TipoComprobante = "I",
            EmisorRfc = "INVALID-RFC",
            EmisorNombre = "Test",
            ReceptorRfc = "XAXX010101000",
            ReceptorNombre = "Cliente",
            Subtotal = 100m,
            Total = 116m,
        };

        var result = await _controller.CreateFactura(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateFactura_ReturnsBadRequestForInvalidReceptorRfc()
    {
        var request = new CreateFacturaRequest
        {
            TipoComprobante = "I",
            EmisorRfc = "TEST010101AAA",
            EmisorNombre = "Test",
            ReceptorRfc = "no-valido",
            ReceptorNombre = "Cliente",
            Subtotal = 100m,
            Total = 116m,
        };

        var result = await _controller.CreateFactura(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact(Skip = "Requires relational DB provider — InMemory does not support raw SQL/ExecuteUpdate")]
    public async Task CreateFactura_CreatesNewFactura()
    {
        var request = new CreateFacturaRequest
        {
            TipoComprobante = "I",
            EmisorRfc = "TEST010101AAA",
            EmisorNombre = "Empresa Test",
            ReceptorRfc = "CLIENTE010101AAA",
            ReceptorNombre = "Nuevo Cliente",
            Subtotal = 2000m,
            Total = 2320m,
        };

        var result = await _controller.CreateFactura(request);

        result.Result.Should().BeOfType<CreatedAtActionResult>();
    }

    // ────────────────────────── PreviewFacturaFromOrder ──────────────────────────

    [Fact]
    public async Task PreviewFacturaFromOrder_ReturnsNotFoundForMissingOrder()
    {
        _orderReader.NextOrder = null;

        var result = await _controller.PreviewFacturaFromOrder(new CreateFacturaFromOrderRequest { PedidoId = 999 });

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task PreviewFacturaFromOrder_ReturnsBadRequestWhenOrderNotEntregado()
    {
        _orderReader.NextOrder = new OrderForInvoice
        {
            PedidoId = 50,
            Estado = 1, // Pendiente, no Entregado
            ClienteFacturable = true,
            ClienteRfc = "ABC010101AAA",
            ClienteRazonSocial = "Razón",
            ClienteRegimenFiscal = "601",
            ClienteCodigoPostalFiscal = "12345",
        };

        var result = await _controller.PreviewFacturaFromOrder(new CreateFacturaFromOrderRequest { PedidoId = 50 });

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task PreviewFacturaFromOrder_ReturnsBadRequestWhenClienteNotFacturable()
    {
        _orderReader.NextOrder = new OrderForInvoice
        {
            PedidoId = 50,
            Estado = 5,
            ClienteFacturable = false,
            ClienteNombre = "Cliente Test",
            ClienteRfc = "ABC010101AAA",
            ClienteRazonSocial = "Razón",
            ClienteRegimenFiscal = "601",
            ClienteCodigoPostalFiscal = "12345",
        };

        var result = await _controller.PreviewFacturaFromOrder(new CreateFacturaFromOrderRequest { PedidoId = 50 });

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task PreviewFacturaFromOrder_ReturnsBadRequestWhenClienteSinRfc()
    {
        _orderReader.NextOrder = new OrderForInvoice
        {
            PedidoId = 50,
            Estado = 5,
            ClienteFacturable = true,
            ClienteNombre = "Cliente Test",
            ClienteRfc = "", // missing
            ClienteRazonSocial = "Razón",
            ClienteRegimenFiscal = "601",
            ClienteCodigoPostalFiscal = "12345",
        };

        var result = await _controller.PreviewFacturaFromOrder(new CreateFacturaFromOrderRequest { PedidoId = 50 });

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task PreviewFacturaFromOrder_ReturnsBadRequestWhenClienteSinCodigoPostal()
    {
        _orderReader.NextOrder = new OrderForInvoice
        {
            PedidoId = 50,
            Estado = 5,
            ClienteFacturable = true,
            ClienteNombre = "Cliente Test",
            ClienteRfc = "ABC010101AAA",
            ClienteRazonSocial = "Razón",
            ClienteRegimenFiscal = "601",
            ClienteCodigoPostalFiscal = "", // missing
        };

        var result = await _controller.PreviewFacturaFromOrder(new CreateFacturaFromOrderRequest { PedidoId = 50 });

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task PreviewFacturaFromOrder_ReturnsOkWithUnmappedFlagWhenFallback()
    {
        _orderReader.NextOrder = new OrderForInvoice
        {
            PedidoId = 50,
            NumeroPedido = "PED-50",
            Estado = 5,
            ClienteId = 7,
            ClienteFacturable = true,
            ClienteNombre = "Cliente Test",
            ClienteRfc = "ABC010101AAA",
            ClienteRazonSocial = "Razón Social SA",
            ClienteRegimenFiscal = "601",
            ClienteCodigoPostalFiscal = "12345",
            Subtotal = 100m,
            Total = 116m,
            Impuestos = 16m,
            Detalles = new List<OrderLineForInvoice>
            {
                new OrderLineForInvoice
                {
                    ProductoId = 999, // no mapping → fallback
                    ProductoNombre = "Producto X",
                    Cantidad = 1,
                    PrecioUnitario = 100m,
                    Subtotal = 100m,
                    Total = 116m,
                }
            }
        };

        var result = await _controller.PreviewFacturaFromOrder(new CreateFacturaFromOrderRequest { PedidoId = 50 });

        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var dto = okResult!.Value as PreFacturaDto;
        dto.Should().NotBeNull();
        dto!.HasUnmappedProducts.Should().BeTrue();
        dto.UnmappedCount.Should().Be(1);
        dto.PedidoId.Should().Be(50);
    }

    // ────────────────────────── CreateFacturaFromOrder ──────────────────────────

    [Fact]
    public async Task CreateFacturaFromOrder_ReturnsBadRequestIfOrderAlreadyInvoiced()
    {
        // Factura 1 (no cancelada) ya tiene PedidoId=100. Reintentar el mismo pedido debe fallar.
        var result = await _controller.CreateFacturaFromOrder(new CreateFacturaFromOrderRequest { PedidoId = 100 });

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateFacturaFromOrder_ReturnsNotFoundWhenOrderMissing()
    {
        _orderReader.NextOrder = null;

        var result = await _controller.CreateFacturaFromOrder(new CreateFacturaFromOrderRequest { PedidoId = 9999 });

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ────────────────────────── CancelarFactura ──────────────────────────

    [Fact]
    public async Task CancelarFactura_CancelaFacturaTimbrada()
    {
        var request = new CancelarFacturaRequest
        {
            MotivoCancelacion = "02",
            FolioSustitucion = "A-003"
        };

        var result = await _controller.CancelarFactura(1, request);

        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        var factura = await _context.Facturas.FindAsync(1L);
        factura!.Estado.Should().Be("CANCELADA");
    }

    [Fact]
    public async Task CancelarFactura_ReturnsBadRequestForPendiente()
    {
        var request = new CancelarFacturaRequest
        {
            MotivoCancelacion = "02"
        };

        var result = await _controller.CancelarFactura(2, request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CancelarFactura_ReturnsBadRequestForInvalidMotivo()
    {
        var request = new CancelarFacturaRequest
        {
            MotivoCancelacion = "99" // no válido (válidos: 01,02,03,04)
        };

        var result = await _controller.CancelarFactura(1, request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CancelarFactura_ReturnsBadRequestForMotivo01WithoutFolioSustitucion()
    {
        var request = new CancelarFacturaRequest
        {
            MotivoCancelacion = "01",
            FolioSustitucion = null
        };

        var result = await _controller.CancelarFactura(1, request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CancelarFactura_ReturnsNotFoundForNonExistentId()
    {
        var request = new CancelarFacturaRequest { MotivoCancelacion = "02" };

        var result = await _controller.CancelarFactura(9999, request);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ────────────────────────── GetPdf ──────────────────────────

    [Fact]
    public async Task GetPdf_ReturnsPdfForExistingFactura()
    {
        var result = await _controller.GetPdf(1);

        var fileResult = result as FileContentResult;
        fileResult.Should().NotBeNull();
        fileResult!.ContentType.Should().Be("application/pdf");
        fileResult.FileContents.Length.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetPdf_ReturnsNotFoundForNonExistentId()
    {
        var result = await _controller.GetPdf(9999);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ────────────────────────── GetXml ──────────────────────────

    [Fact]
    public async Task GetXml_ReturnsNotFoundWhenNoXml()
    {
        // Factura 1 está TIMBRADA pero no tiene XmlContent ni XmlBlobUrl → 404
        var result = await _controller.GetXml(1);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetXml_ReturnsFileWhenXmlContentExists()
    {
        var f = await _context.Facturas.FindAsync(1L);
        f!.XmlContent = "<cfdi:Comprobante>test</cfdi:Comprobante>";
        await _context.SaveChangesAsync();

        var result = await _controller.GetXml(1);

        var fileResult = result as FileContentResult;
        fileResult.Should().NotBeNull();
        fileResult!.ContentType.Should().Be("application/xml");
        fileResult.FileContents.Length.Should().BeGreaterThan(0);
    }

    // ────────────────────────── GetPublicByUuid ──────────────────────────

    [Fact]
    public async Task GetPublicByUuid_ReturnsOkForValidUuid()
    {
        var result = await _controller.GetPublicByUuid("test-uuid-001");

        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();

        var dto = okResult!.Value as FacturaPublicDto;
        dto.Should().NotBeNull();
        dto!.Uuid.Should().Be("test-uuid-001");
        dto.Total.Should().Be(1160m);
    }

    [Fact]
    public async Task GetPublicByUuid_ReturnsBadRequestForEmptyUuid()
    {
        var result = await _controller.GetPublicByUuid("");

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GetPublicByUuid_ReturnsNotFoundForUnknownUuid()
    {
        var result = await _controller.GetPublicByUuid("00000000-0000-0000-0000-000000000000");

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ────────────────────────── ExportZip ──────────────────────────

    [Fact]
    public async Task ExportZip_ReturnsZipForTimbradas()
    {
        var result = await _controller.ExportZip();

        // Si no hay XmlContent en facturas TIMBRADAS, el ZIP queda vacío pero el método aún devuelve File.
        var fileResult = result as FileContentResult;
        fileResult.Should().NotBeNull();
        fileResult!.ContentType.Should().Be("application/zip");
    }

    // ────────────────────────── GenerarFacturaGlobal ──────────────────────────

    [Fact]
    public async Task GenerarFacturaGlobal_ReturnsBadRequestForInvalidPeriodicidad()
    {
        var request = new FacturaGlobalRequest
        {
            FechaInicio = DateTime.UtcNow.AddDays(-7),
            FechaFin = DateTime.UtcNow,
            Periodicidad = "99" // no válido
        };

        var result = await _controller.GenerarFacturaGlobal(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GenerarFacturaGlobal_ReturnsBadRequestWhenFechaInicioAfterFechaFin()
    {
        var request = new FacturaGlobalRequest
        {
            FechaInicio = DateTime.UtcNow,
            FechaFin = DateTime.UtcNow.AddDays(-7),
            Periodicidad = "04"
        };

        var result = await _controller.GenerarFacturaGlobal(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GenerarFacturaGlobal_ReturnsBadRequestWhenNoOrdersInRange()
    {
        _orderReader.GlobalOrders = new List<OrderForInvoice>(); // sin pedidos

        var request = new FacturaGlobalRequest
        {
            FechaInicio = DateTime.UtcNow.AddDays(-7),
            FechaFin = DateTime.UtcNow,
            Periodicidad = "04"
        };

        var result = await _controller.GenerarFacturaGlobal(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
