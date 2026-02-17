using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HandySales.Billing.Api.Controllers;
using HandySales.Billing.Api.Data;
using HandySales.Billing.Api.DTOs;
using HandySales.Billing.Api.Models;
using System.Security.Claims;

namespace HandySales.Billing.Tests.Controllers;

public class FacturasControllerTests : IDisposable
{
    private readonly BillingDbContext _context;
    private readonly FacturasController _controller;
    private readonly string _testTenantId = "test-tenant-001";

    public FacturasControllerTests()
    {
        var options = new DbContextOptionsBuilder<BillingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new BillingDbContext(options);
        var logger = new LoggerFactory().CreateLogger<FacturasController>();
        _controller = new FacturasController(_context, logger);

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
            new Claim("TenantId", _testTenantId),
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
        result.Should().BeOfType<NoContentResult>();

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
    public async Task GetPdf_ReturnsOkForExistingFactura()
    {
        // Act
        var result = await _controller.GetPdf(1);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
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
