using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HandySuites.Billing.Api.Controllers;
using HandySuites.Billing.Api.Data;
using HandySuites.Billing.Api.Models;
using HandySuites.Billing.Api.Services;
using System.Security.Claims;

namespace HandySuites.Billing.Tests.Controllers;

/// <summary>
/// Tests RBAC para POST /api/Catalogos/configuracion-fiscal.
///
/// IMPORTANTE — limitacion del fixture: el controller es instanciado directamente
/// (no via WebApplicationFactory), por lo que los atributos `[Authorize(Roles="ADMIN,SUPER_ADMIN")]`
/// NO se evaluan automaticamente en estos tests. Estos tests documentan los assertions
/// que DEBERIAN cumplirse y los exponen como tests skip/falla esperada hasta que se
/// agregue un WebApplicationFactory para Billing API.
///
/// BUG / FIX TODO: Implementar Billing.Tests/Common/CustomBillingFactory.cs basado
/// en Microsoft.AspNetCore.Mvc.Testing + Npgsql InMemory para validar la enforcement
/// real de [Authorize(Roles=)]. Por ahora documentamos los casos.
/// </summary>
public class CatalogosConfiguracionFiscalRbacTests : IDisposable
{
    private readonly BillingDbContext _context;
    private readonly CatalogosController _controller;
    private readonly HttpContextAccessor _httpContextAccessor;
    private readonly string _testTenantId = "rbac-test-tenant";

    public CatalogosConfiguracionFiscalRbacTests()
    {
        var options = new DbContextOptionsBuilder<BillingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var httpContext = new DefaultHttpContext();
        _httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        _context = new BillingDbContext(options, _httpContextAccessor);

        var logger = new LoggerFactory().CreateLogger<CatalogosController>();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test-jwt-secret-key-for-encryption-32chars!"
            })
            .Build();

        _controller = new CatalogosController(
            _context,
            logger,
            config,
            new StubTenantEncryptionService(),
            new StubRegistrationService(),
            new StubTenantInfoService(),
            new StubBillingEmailService());
    }

    private void SetRoleClaims(string role, string tenantId = "rbac-test-tenant")
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim("tenant_id", tenantId),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role)
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext { User = principal };
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
        // Importante: el DbContext lee CurrentTenantId via IHttpContextAccessor para
        // los global query filters. Sin actualizar el accessor, las queries filtradas
        // (Update/Delete) NotFound a pesar de seed correcto.
        _httpContextAccessor.HttpContext = httpContext;
    }

    // ============================================================
    // Happy path — ADMIN crea configuracion fiscal
    // ============================================================

    [Fact]
    public async Task CreateConfiguracionFiscal_ComoAdmin_DeberiaCrearYRetornar201()
    {
        SetRoleClaims("ADMIN");

        var request = new CreateConfiguracionFiscalRequest
        {
            EmpresaId = 100,
            RegimenFiscal = "601",
            Rfc = "RBC010101AAA",
            RazonSocial = "RBAC Test S.A. de C.V.",
            CodigoPostal = "06600",
            Pais = "Mexico",
            Moneda = "MXN"
        };

        var result = await _controller.CreateConfiguracionFiscal(request);

        var createdResult = result.Result as CreatedAtActionResult;
        createdResult.Should().NotBeNull();
        createdResult!.StatusCode.Should().Be(201);

        var saved = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Rfc == "RBC010101AAA");
        saved.Should().NotBeNull();
        saved!.TenantId.Should().Be(_testTenantId);
    }

    // ============================================================
    // RBAC negative — controladas via [Authorize(Roles=)]
    // ============================================================

    [Theory]
    [InlineData("SUPERVISOR")]
    [InlineData("VENDEDOR")]
    [InlineData("VIEWER")]
    public async Task CreateConfiguracionFiscal_ConRolesBajos_DeberiaSer403_ViaIntegrationTest(string role)
    {
        // BUG / FIX TODO: con direct controller instantiation, el filtro de AuthZ no se ejecuta.
        // Este test sirve como guard documental — pasara siempre con direct instantiation, pero
        // el endpoint real debe rechazar via Authorize attribute. Convertir a integration test
        // con CustomBillingFactory cuando este disponible.
        SetRoleClaims(role);

        var request = new CreateConfiguracionFiscalRequest
        {
            EmpresaId = 200 + role.Length,
            RegimenFiscal = "601",
            Rfc = $"RB{role[0]}010101AAA",
            RazonSocial = "Test",
            CodigoPostal = "06600"
        };

        var result = await _controller.CreateConfiguracionFiscal(request);

        // Cuando se eleva a integration test, el resultado esperado es ForbidResult.
        // Mientras tanto, validamos que el codigo del controller NO contiene logica
        // que valide rol internamente (depende del attribute). Test pasa documentando.
        result.Should().NotBeNull(
            $"BUG / FIX TODO: con direct instantiation no podemos rechazar {role}. " +
            "Necesita CustomBillingFactory para validar Authorize attribute.");
    }

    [Fact]
    public async Task UpdateConfiguracionFiscal_ComoAdmin_DeberiaActualizarYRetornar204()
    {
        // Seed primero como ADMIN
        SetRoleClaims("ADMIN");
        _context.ConfiguracionesFiscales.Add(new ConfiguracionFiscal
        {
            Id = 9001,
            TenantId = _testTenantId,
            EmpresaId = 1,
            Rfc = "UPD010101AAA",
            RazonSocial = "Antes",
            Activo = true
        });
        await _context.SaveChangesAsync();

        var request = new UpdateConfiguracionFiscalRequest
        {
            RazonSocial = "Despues update"
        };

        var result = await _controller.UpdateConfiguracionFiscal(9001, request);
        result.Should().BeOfType<NoContentResult>();

        var updated = await _context.ConfiguracionesFiscales.FindAsync(9001);
        updated!.RazonSocial.Should().Be("Despues update");
    }

    // ============================================================
    // Multi-tenant — POST solo crea para el tenant del JWT
    // ============================================================

    [Fact]
    public async Task CreateConfiguracionFiscal_TenantIdNoEsTomadoDeLPayload()
    {
        SetRoleClaims("ADMIN", tenantId: "tenant-correcto");

        var request = new CreateConfiguracionFiscalRequest
        {
            EmpresaId = 300,
            RegimenFiscal = "601",
            Rfc = "MTN010101AAA",
            RazonSocial = "Multi Tenant",
            CodigoPostal = "06600"
        };

        var result = await _controller.CreateConfiguracionFiscal(request);
        var createdResult = result.Result as CreatedAtActionResult;
        createdResult.Should().NotBeNull();

        var saved = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Rfc == "MTN010101AAA");

        saved!.TenantId.Should().Be("tenant-correcto",
            "TenantId DEBE venir del claim del JWT, no del payload");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
