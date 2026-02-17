using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HandySales.Billing.Api.Controllers;
using HandySales.Billing.Api.Data;
using HandySales.Billing.Api.Models;
using System.Security.Claims;

namespace HandySales.Billing.Tests.Controllers;

public class CatalogosControllerTests : IDisposable
{
    private readonly BillingDbContext _context;
    private readonly CatalogosController _controller;
    private readonly string _testTenantId = "test-tenant-001";

    public CatalogosControllerTests()
    {
        var options = new DbContextOptionsBuilder<BillingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new BillingDbContext(options);
        var logger = new LoggerFactory().CreateLogger<CatalogosController>();
        _controller = new CatalogosController(_context, logger);

        SetupUserClaims();
        SeedTestData();
    }

    private void SetupUserClaims()
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim("TenantId", _testTenantId),
            new Claim(ClaimTypes.Role, "Admin")
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private void SeedTestData()
    {
        // Seed tipos de comprobante
        _context.TiposComprobante.AddRange(new[]
        {
            new TipoComprobante { Codigo = "I", Descripcion = "Ingreso", Activo = true },
            new TipoComprobante { Codigo = "E", Descripcion = "Egreso", Activo = true },
            new TipoComprobante { Codigo = "T", Descripcion = "Traslado", Activo = true },
            new TipoComprobante { Codigo = "N", Descripcion = "Nómina", Activo = false }
        });

        // Seed metodos de pago
        _context.MetodosPago.AddRange(new[]
        {
            new MetodoPago { Codigo = "PUE", Descripcion = "Pago en una sola exhibición", Activo = true },
            new MetodoPago { Codigo = "PPD", Descripcion = "Pago en parcialidades o diferido", Activo = true }
        });

        // Seed formas de pago
        _context.FormasPago.AddRange(new[]
        {
            new FormaPago { Codigo = "01", Descripcion = "Efectivo", Activo = true },
            new FormaPago { Codigo = "02", Descripcion = "Cheque nominativo", Activo = true },
            new FormaPago { Codigo = "03", Descripcion = "Transferencia electrónica de fondos", Activo = true }
        });

        // Seed usos CFDI
        _context.UsosCfdi.AddRange(new[]
        {
            new UsoCfdi { Codigo = "G01", Descripcion = "Adquisición de mercancias", AplicaPersonaFisica = true, AplicaPersonaMoral = true, Activo = true },
            new UsoCfdi { Codigo = "G03", Descripcion = "Gastos en general", AplicaPersonaFisica = true, AplicaPersonaMoral = true, Activo = true },
            new UsoCfdi { Codigo = "D01", Descripcion = "Honorarios médicos", AplicaPersonaFisica = true, AplicaPersonaMoral = false, Activo = true }
        });

        // Seed configuración fiscal
        _context.ConfiguracionesFiscales.Add(new ConfiguracionFiscal
        {
            Id = 1,
            TenantId = _testTenantId,
            EmpresaId = 1,
            RegimenFiscal = "601",
            Rfc = "TEST010101AAA",
            RazonSocial = "Empresa Test S.A. de C.V.",
            DireccionFiscal = "Calle Test 123, Col. Centro",
            CodigoPostal = "06600",
            Pais = "México",
            Moneda = "MXN",
            SerieFactura = "A",
            FolioActual = 1,
            Activo = true
        });

        // Seed numeración
        _context.NumeracionDocumentos.Add(new NumeracionDocumento
        {
            TenantId = _testTenantId,
            TipoDocumento = "FACTURA",
            Serie = "A",
            FolioInicial = 1,
            FolioActual = 5,
            Activo = true
        });

        _context.SaveChanges();
    }

    [Fact]
    public async Task GetTiposComprobante_ReturnsOnlyActive()
    {
        // Act
        var result = await _controller.GetTiposComprobante();

        // Assert
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var tipos = okResult!.Value as IEnumerable<TipoComprobante>;
        tipos.Should().NotBeNull();
        tipos!.Count().Should().Be(3); // Solo activos
        tipos!.All(t => t.Activo).Should().BeTrue();
    }

    [Fact]
    public async Task GetMetodosPago_ReturnsAllActive()
    {
        // Act
        var result = await _controller.GetMetodosPago();

        // Assert
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var metodos = okResult!.Value as IEnumerable<MetodoPago>;
        metodos.Should().NotBeNull();
        metodos!.Count().Should().Be(2);
    }

    [Fact]
    public async Task GetFormasPago_ReturnsAllActive()
    {
        // Act
        var result = await _controller.GetFormasPago();

        // Assert
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var formas = okResult!.Value as IEnumerable<FormaPago>;
        formas.Should().NotBeNull();
        formas!.Count().Should().Be(3);
    }

    [Fact]
    public async Task GetUsosCfdi_ReturnsAllActive()
    {
        // Act
        var result = await _controller.GetUsosCfdi(null, null);

        // Assert
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var usos = okResult!.Value as IEnumerable<UsoCfdi>;
        usos.Should().NotBeNull();
        usos!.Count().Should().Be(3);
    }

    [Fact]
    public async Task GetUsosCfdi_FiltersByPersonaFisica()
    {
        // Act
        var result = await _controller.GetUsosCfdi(personaFisica: true, personaMoral: null);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var usos = okResult!.Value as IEnumerable<UsoCfdi>;
        usos!.All(u => u.AplicaPersonaFisica).Should().BeTrue();
    }

    [Fact]
    public async Task GetConfiguracionFiscal_ReturnsConfigForTenant()
    {
        // Act
        var result = await _controller.GetConfiguracionFiscal();

        // Assert
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var config = okResult!.Value as ConfiguracionFiscal;
        config.Should().NotBeNull();
        config!.Rfc.Should().Be("TEST010101AAA");
        config.CertificadoSat.Should().BeNull(); // Info sensible no devuelta
    }

    [Fact]
    public async Task CreateConfiguracionFiscal_CreatesNewConfig()
    {
        // Arrange - Use different tenant
        var newTenantClaims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "2"),
            new Claim("TenantId", "new-tenant-002")
        };
        _controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(newTenantClaims, "TestAuth"));

        var request = new CreateConfiguracionFiscalRequest
        {
            EmpresaId = 2,
            RegimenFiscal = "601",
            Rfc = "NEWRFC010101AAA",
            RazonSocial = "Nueva Empresa",
            CodigoPostal = "12345"
        };

        // Act
        var result = await _controller.CreateConfiguracionFiscal(request);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        createdResult.Should().NotBeNull();

        var config = createdResult!.Value as ConfiguracionFiscal;
        config.Should().NotBeNull();
        config!.Rfc.Should().Be("NEWRFC010101AAA");
    }

    [Fact]
    public async Task CreateConfiguracionFiscal_ReturnsBadRequestForDuplicate()
    {
        // Arrange
        var request = new CreateConfiguracionFiscalRequest
        {
            EmpresaId = 1, // Ya existe para este tenant
            Rfc = "DUPLICATE"
        };

        // Act
        var result = await _controller.CreateConfiguracionFiscal(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateConfiguracionFiscal_UpdatesExisting()
    {
        // Arrange
        var request = new UpdateConfiguracionFiscalRequest
        {
            RazonSocial = "Nombre Actualizado"
        };

        // Act
        var result = await _controller.UpdateConfiguracionFiscal(1, request);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        // Verify
        var updated = await _context.ConfiguracionesFiscales.FindAsync(1);
        updated!.RazonSocial.Should().Be("Nombre Actualizado");
    }

    [Fact]
    public async Task GetNumeracion_ReturnsNumeracionForTenant()
    {
        // Act
        var result = await _controller.GetNumeracion();

        // Assert
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();

        var numeraciones = okResult!.Value as IEnumerable<NumeracionDocumento>;
        numeraciones.Should().NotBeNull();
        numeraciones!.Count().Should().Be(1);
    }

    [Fact]
    public async Task CreateNumeracion_CreatesNewNumeracion()
    {
        // Arrange
        var request = new CreateNumeracionRequest
        {
            TipoDocumento = "NOTA_CREDITO",
            Serie = "NC",
            FolioInicial = 1
        };

        // Act
        var result = await _controller.CreateNumeracion(request);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        createdResult.Should().NotBeNull();

        var numeracion = createdResult!.Value as NumeracionDocumento;
        numeracion.Should().NotBeNull();
        numeracion!.Serie.Should().Be("NC");
    }

    [Fact]
    public async Task CreateNumeracion_ReturnsBadRequestForDuplicate()
    {
        // Arrange
        var request = new CreateNumeracionRequest
        {
            TipoDocumento = "FACTURA",
            Serie = "A", // Ya existe
            FolioInicial = 1
        };

        // Act
        var result = await _controller.CreateNumeracion(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
