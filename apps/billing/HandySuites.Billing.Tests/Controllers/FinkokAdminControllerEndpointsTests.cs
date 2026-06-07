using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HandySuites.Billing.Api.Controllers;
using HandySuites.Billing.Api.Data;
using HandySuites.Billing.Api.Models;
using HandySuites.Billing.Api.Services;
using System.Security.Claims;

namespace HandySuites.Billing.Tests.Controllers;

/// <summary>
/// Tests para FinkokAdminController.
///
/// IMPORTANTE — el controller usa `IsSuperAdmin()` (lectura del claim "role" o ClaimTypes.Role)
/// como guard INTERNO antes de cada operacion. Esto significa que podemos testear RBAC
/// con direct instantiation porque la logica de role-check vive en el codigo del controller,
/// NO depende del attribute [Authorize].
///
/// IMPORTANTE 2 — segun el inventory el endpoint era "ADMIN". En realidad el controller exige
/// SUPER_ADMIN. Tests escritos contra el comportamiento real (SUPER_ADMIN-only).
///
/// El endpoint POST /api/admin/finkok/register / resync mencionado en el inventory NO existe
/// en FinkokAdminController.cs — register/retry esta en CatalogosController:
/// POST /api/Catalogos/configuracion-fiscal/{id}/retry-finkok-registration.
/// Cubrimos: list, get, suspend, reactivate, switch-mode, assign-credits.
/// </summary>
public class FinkokAdminControllerEndpointsTests : IDisposable
{
    private readonly BillingDbContext _context;
    private readonly FinkokAdminController _controller;
    private readonly StubRegistrationService _registrationStub;
    private readonly string _testTenantId = "finkok-test-tenant";

    public FinkokAdminControllerEndpointsTests()
    {
        var options = new DbContextOptionsBuilder<BillingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var httpContext = new DefaultHttpContext();
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        _context = new BillingDbContext(options, httpContextAccessor);

        var logger = new LoggerFactory().CreateLogger<FinkokAdminController>();
        _registrationStub = new StubRegistrationService();

        _controller = new FinkokAdminController(
            _context,
            _registrationStub,
            logger);

        SeedTestData();
    }

    private void SetRoleClaims(string role, string userId = "1", string tenantId = "finkok-test-tenant")
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim("tenant_id", tenantId),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role)
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private void SetAnonymous()
    {
        var identity = new ClaimsIdentity(); // no claims, no IsAuthenticated
        var principal = new ClaimsPrincipal(identity);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private void SeedTestData()
    {
        _context.ConfiguracionesFiscales.Add(new ConfiguracionFiscal
        {
            Id = 5001,
            TenantId = _testTenantId,
            EmpresaId = 1,
            Rfc = "FNK010101AAA",
            RazonSocial = "Finkok Test S.A.",
            Activo = true,
            FinkokStatus = "active",
            FinkokTypeUser = 'P',
            FinkokCreditosRestantes = 100
        });
        _context.SaveChanges();
    }

    // ============================================================
    // LIST emitters — SUPER_ADMIN only
    // ============================================================

    [Fact]
    public async Task ListEmitters_ComoSuperAdmin_DeberiaRetornar200()
    {
        SetRoleClaims("SUPER_ADMIN");

        var result = await _controller.ListEmitters(page: 1);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("SUPERVISOR")]
    [InlineData("VENDEDOR")]
    [InlineData("VIEWER")]
    public async Task ListEmitters_ConRolesNoSuperAdmin_DeberiaRetornarForbid(string role)
    {
        SetRoleClaims(role);

        var result = await _controller.ListEmitters(page: 1);

        result.Should().BeOfType<ForbidResult>(
            $"role {role} no es SUPER_ADMIN — IsSuperAdmin() retorna false");
    }

    // ============================================================
    // GET emitter — SUPER_ADMIN only
    // ============================================================

    [Fact]
    public async Task GetEmitter_ComoSuperAdmin_DeberiaRetornar200()
    {
        SetRoleClaims("SUPER_ADMIN");

        var result = await _controller.GetEmitter("FNK010101AAA");

        result.Should().BeOfType<OkObjectResult>();
    }

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("SUPERVISOR")]
    [InlineData("VENDEDOR")]
    public async Task GetEmitter_ConRolesNoSuperAdmin_DeberiaRetornarForbid(string role)
    {
        SetRoleClaims(role);

        var result = await _controller.GetEmitter("FNK010101AAA");

        result.Should().BeOfType<ForbidResult>();
    }

    // ============================================================
    // SUSPEND emitter — SUPER_ADMIN only
    // ============================================================

    [Fact]
    public async Task SuspendEmitter_ComoSuperAdmin_DeberiaRetornar200YActualizarBD()
    {
        SetRoleClaims("SUPER_ADMIN");

        var result = await _controller.SuspendEmitter("FNK010101AAA");

        result.Should().BeOfType<OkObjectResult>();

        var config = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstAsync(c => c.Rfc == "FNK010101AAA");
        config.FinkokStatus.Should().Be("suspended");
    }

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("SUPERVISOR")]
    [InlineData("VENDEDOR")]
    public async Task SuspendEmitter_ConRolesNoSuperAdmin_DeberiaRetornarForbid(string role)
    {
        SetRoleClaims(role);

        var result = await _controller.SuspendEmitter("FNK010101AAA");

        result.Should().BeOfType<ForbidResult>();
    }

    // ============================================================
    // REACTIVATE emitter — SUPER_ADMIN only
    // ============================================================

    [Fact]
    public async Task ReactivateEmitter_ComoSuperAdmin_DeberiaRetornar200()
    {
        SetRoleClaims("SUPER_ADMIN");

        var result = await _controller.ReactivateEmitter("FNK010101AAA");

        result.Should().BeOfType<OkObjectResult>();
    }

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("VENDEDOR")]
    public async Task ReactivateEmitter_ConRolesNoSuperAdmin_DeberiaRetornarForbid(string role)
    {
        SetRoleClaims(role);

        var result = await _controller.ReactivateEmitter("FNK010101AAA");

        result.Should().BeOfType<ForbidResult>();
    }

    // ============================================================
    // SWITCH MODE — SUPER_ADMIN only + validacion typeUser
    // ============================================================

    [Fact]
    public async Task SwitchMode_ComoSuperAdmin_TypeUserValido_DeberiaRetornar200()
    {
        SetRoleClaims("SUPER_ADMIN");

        var result = await _controller.SwitchMode("FNK010101AAA",
            new FinkokAdminController.SwitchModeRequest("O"));

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task SwitchMode_TypeUserInvalido_DeberiaRetornar400()
    {
        SetRoleClaims("SUPER_ADMIN");

        var result = await _controller.SwitchMode("FNK010101AAA",
            new FinkokAdminController.SwitchModeRequest("X"));

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("SUPERVISOR")]
    public async Task SwitchMode_ConRolesNoSuperAdmin_DeberiaRetornarForbid(string role)
    {
        SetRoleClaims(role);

        var result = await _controller.SwitchMode("FNK010101AAA",
            new FinkokAdminController.SwitchModeRequest("O"));

        result.Should().BeOfType<ForbidResult>();
    }

    // ============================================================
    // ASSIGN CREDITS — SUPER_ADMIN only + validacion credits > 0
    // ============================================================

    [Fact]
    public async Task AssignCredits_ComoSuperAdmin_DeberiaRetornar200()
    {
        SetRoleClaims("SUPER_ADMIN");

        var result = await _controller.AssignCreditsToEmitter("FNK010101AAA",
            new FinkokAdminController.AssignCreditsRequest(50));

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task AssignCredits_CreditsZero_DeberiaRetornar400()
    {
        SetRoleClaims("SUPER_ADMIN");

        var result = await _controller.AssignCreditsToEmitter("FNK010101AAA",
            new FinkokAdminController.AssignCreditsRequest(0));

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("VENDEDOR")]
    public async Task AssignCredits_ConRolesNoSuperAdmin_DeberiaRetornarForbid(string role)
    {
        SetRoleClaims(role);

        var result = await _controller.AssignCreditsToEmitter("FNK010101AAA",
            new FinkokAdminController.AssignCreditsRequest(50));

        result.Should().BeOfType<ForbidResult>();
    }

    // ============================================================
    // Anonymous / no role claim
    // ============================================================

    [Fact]
    public async Task ListEmitters_SinClaimRole_DeberiaRetornarForbid()
    {
        SetAnonymous();

        var result = await _controller.ListEmitters(page: 1);

        result.Should().BeOfType<ForbidResult>(
            "sin claim 'role' IsSuperAdmin() retorna false");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
