using FluentAssertions;
using HandySuites.Billing.Api.Controllers;
using HandySuites.Billing.Api.Data;
using HandySuites.Billing.Api.DTOs;
using HandySuites.Billing.Api.Models;
using HandySuites.Billing.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using Xunit;

namespace HandySuites.Billing.Tests.Controllers;

/// <summary>
/// Tests SUPER_ADMIN-specific behavior of FinkokAdminController.
///
/// El panel /admin/finkok (apps/web/src/app/(dashboard)/admin/finkok/page.tsx) consume
/// estos endpoints directamente. La distincion clave de los tests SA es:
///
///   1. SA debe poder ver/operar emisores de CUALQUIER tenant — el codigo usa
///      `.IgnoreQueryFilters()` para saltar el filtro multi-tenant.
///   2. El claim "role" se lee tanto en `User.FindFirst("role")` como en `ClaimTypes.Role`.
///   3. Los efectos de SuspendEmitter / ReactivateEmitter / SwitchMode / AssignCredits
///      deben actualizar la BD local (FinkokStatus, FinkokTypeUser, FinkokCreditosRestantes).
///
/// Cubre: cross-tenant access (SA capability), happy-path SA, RBAC negativos, validacion
/// de entrada (typeUser P|O, credits > 0), e idempotencia razonable de suspend/reactivate.
///
/// Patron: InMemory + StubRegistrationService (sin WebApplicationFactory para evitar
/// dependencias de JWT/config).
/// </summary>
public class FinkokAdminControllerSATests : IDisposable
{
    private readonly BillingDbContext _context;
    private readonly FinkokAdminController _controller;
    private readonly RecordingStubRegistrationService _registrationStub;

    private const string TenantA = "tenant-a";
    private const string TenantB = "tenant-b";
    private const string TenantC = "tenant-c";

    public FinkokAdminControllerSATests()
    {
        var options = new DbContextOptionsBuilder<BillingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var httpContext = new DefaultHttpContext();
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        _context = new BillingDbContext(options, httpContextAccessor);

        var logger = new LoggerFactory().CreateLogger<FinkokAdminController>();
        _registrationStub = new RecordingStubRegistrationService();

        _controller = new FinkokAdminController(_context, _registrationStub, logger);

        SeedMultiTenantEmitters();
    }

    private void SeedMultiTenantEmitters()
    {
        // 3 emisores en 3 tenants distintos para validar capacidad cross-tenant del SA.
        _context.ConfiguracionesFiscales.AddRange(new[]
        {
            new ConfiguracionFiscal
            {
                Id = 6001,
                TenantId = TenantA,
                EmpresaId = 1,
                Rfc = "AAA010101AAA",
                RazonSocial = "Tenant A S.A.",
                Activo = true,
                FinkokStatus = "active",
                FinkokTypeUser = 'P',
                FinkokCreditosRestantes = 100
            },
            new ConfiguracionFiscal
            {
                Id = 6002,
                TenantId = TenantB,
                EmpresaId = 1,
                Rfc = "BBB020202BBB",
                RazonSocial = "Tenant B S.A.",
                Activo = true,
                FinkokStatus = "active",
                FinkokTypeUser = 'O',
                FinkokCreditosRestantes = 0
            },
            new ConfiguracionFiscal
            {
                Id = 6003,
                TenantId = TenantC,
                EmpresaId = 1,
                Rfc = "CCC030303CCC",
                RazonSocial = "Tenant C S.A.",
                Activo = true,
                FinkokStatus = "suspended",
                FinkokTypeUser = 'P',
                FinkokCreditosRestantes = 50
            }
        });
        _context.SaveChanges();
    }

    private void SetSuperAdminContext(string userId = "sa-1", string saTenantId = "sa-tenant")
    {
        // SA tipicamente esta logueado bajo un tenant "operador" pero sus claims llevan role=SUPER_ADMIN.
        SetRoleClaims("SUPER_ADMIN", userId, saTenantId);
    }

    private void SetRoleClaims(string role, string userId, string tenantId)
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

    // ============================================================
    // SA cross-tenant: SuperAdmin debe poder operar emisores de cualquier tenant
    // ============================================================

    [Theory]
    [InlineData("AAA010101AAA")]
    [InlineData("BBB020202BBB")]
    [InlineData("CCC030303CCC")]
    public async Task GetEmitter_ComoSuperAdmin_DeberiaVerEmisorDeCualquierTenant(string rfc)
    {
        SetSuperAdminContext();

        var result = await _controller.GetEmitter(rfc);

        result.Should().BeOfType<OkObjectResult>(
            $"SA usa IgnoreQueryFilters() — debe ver emisor de cualquier tenant ({rfc})");
    }

    [Fact]
    public async Task SuspendEmitter_ComoSuperAdmin_AfectaEmisorDeOtroTenant()
    {
        SetSuperAdminContext(saTenantId: "sa-tenant"); // SA NO pertenece a TenantB
        var rfcDeOtroTenant = "BBB020202BBB"; // Pertenece a TenantB

        var result = await _controller.SuspendEmitter(rfcDeOtroTenant);

        result.Should().BeOfType<OkObjectResult>();

        var config = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstAsync(c => c.Rfc == rfcDeOtroTenant);
        config.FinkokStatus.Should().Be("suspended",
            "SA puede suspender emisores cross-tenant via IgnoreQueryFilters()");
        config.TenantId.Should().Be(TenantB, "el TenantId del emisor no debe mutarse");
    }

    [Fact]
    public async Task ReactivateEmitter_ComoSuperAdmin_ReactivaEmisorSuspendido()
    {
        SetSuperAdminContext();
        var rfcSuspendido = "CCC030303CCC"; // Esta seedeado como "suspended"

        var result = await _controller.ReactivateEmitter(rfcSuspendido);

        result.Should().BeOfType<OkObjectResult>();

        var config = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstAsync(c => c.Rfc == rfcSuspendido);
        config.FinkokStatus.Should().Be("active");
    }

    [Fact]
    public async Task SwitchMode_ComoSuperAdmin_DeberiaActualizarFinkokTypeUserEnBD()
    {
        SetSuperAdminContext();
        var rfc = "AAA010101AAA"; // Inicialmente FinkokTypeUser = 'P'

        var result = await _controller.SwitchMode(rfc,
            new FinkokAdminController.SwitchModeRequest("O"));

        result.Should().BeOfType<OkObjectResult>();

        var config = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstAsync(c => c.Rfc == rfc);
        config.FinkokTypeUser.Should().Be('O',
            "SwitchMode debe persistir el nuevo type_user en BD local");
    }

    [Fact]
    public async Task AssignCredits_ComoSuperAdmin_DeberiaActualizarCreditosRestantesEnBD()
    {
        SetSuperAdminContext();
        var rfc = "BBB020202BBB"; // Inicia con 0 creditos
        _registrationStub.AssignCreditsTotalToReturn = 250; // El stub devuelve el total post-asignacion

        var result = await _controller.AssignCreditsToEmitter(rfc,
            new FinkokAdminController.AssignCreditsRequest(250));

        result.Should().BeOfType<OkObjectResult>();

        var config = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstAsync(c => c.Rfc == rfc);
        config.FinkokCreditosRestantes.Should().Be(250,
            "AssignCredits debe persistir CreditsTotal devuelto por Finkok");
    }

    // ============================================================
    // SA happy path: ListEmitters enriquece con datos locales
    // ============================================================

    [Fact]
    public async Task ListEmitters_ComoSuperAdmin_DeberiaRetornar200ConPagina()
    {
        SetSuperAdminContext();

        var result = await _controller.ListEmitters(page: 1);

        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        okResult.Value.Should().NotBeNull();
    }

    [Fact]
    public async Task ListEmitters_PaginaPersonalizada_DeberiaPropagarseAlService()
    {
        SetSuperAdminContext();

        await _controller.ListEmitters(page: 3);

        _registrationStub.LastListPageRequested.Should().Be(3,
            "el parametro page debe propagarse al IRegistrationService");
    }

    // ============================================================
    // RBAC negativos: roles inferiores no pueden actuar como SA
    // ============================================================

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("SUPERVISOR")]
    [InlineData("VENDEDOR")]
    [InlineData("VIEWER")]
    [InlineData("")] // string vacio
    [InlineData("super_admin")] // case-sensitive: debe fallar
    public async Task ListEmitters_RolNoSuperAdmin_DeberiaRetornarForbid(string role)
    {
        SetRoleClaims(role, userId: "1", tenantId: TenantA);

        var result = await _controller.ListEmitters(page: 1);

        result.Should().BeOfType<ForbidResult>(
            $"role '{role}' no es exactamente 'SUPER_ADMIN' — IsSuperAdmin() retorna false");
    }

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("SUPERVISOR")]
    [InlineData("VENDEDOR")]
    public async Task SuspendEmitter_RolNoSuperAdmin_NoModificaBD(string role)
    {
        SetRoleClaims(role, userId: "1", tenantId: TenantA);
        var rfc = "AAA010101AAA";

        var result = await _controller.SuspendEmitter(rfc);

        result.Should().BeOfType<ForbidResult>();

        // Verificar que la BD NO se modifico
        var config = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstAsync(c => c.Rfc == rfc);
        config.FinkokStatus.Should().Be("active",
            "el Forbid debe ocurrir ANTES de tocar BD — sin side effects");
    }

    [Theory]
    [InlineData("ADMIN")]
    [InlineData("VENDEDOR")]
    public async Task AssignCredits_RolNoSuperAdmin_NoLlamaAlService(string role)
    {
        SetRoleClaims(role, userId: "1", tenantId: TenantA);
        _registrationStub.AssignCreditsCallCount = 0;

        var result = await _controller.AssignCreditsToEmitter("AAA010101AAA",
            new FinkokAdminController.AssignCreditsRequest(100));

        result.Should().BeOfType<ForbidResult>();
        _registrationStub.AssignCreditsCallCount.Should().Be(0,
            "Forbid debe ocurrir antes de invocar a Finkok — no consumir credenciales");
    }

    // ============================================================
    // Validacion de entrada
    // ============================================================

    [Theory]
    [InlineData("X")]
    [InlineData("PP")]
    [InlineData("")]
    [InlineData("p")] // lowercase: debe rechazar (codigo compara con 'P'/'O' exactos)
    [InlineData("o")]
    public async Task SwitchMode_TypeUserInvalido_DeberiaRetornar400(string invalidTypeUser)
    {
        SetSuperAdminContext();

        var result = await _controller.SwitchMode("AAA010101AAA",
            new FinkokAdminController.SwitchModeRequest(invalidTypeUser));

        result.Should().BeOfType<BadRequestObjectResult>(
            $"typeUser='{invalidTypeUser}' no es 'P' ni 'O'");
    }

    [Theory]
    [InlineData("P")]
    [InlineData("O")]
    public async Task SwitchMode_TypeUserValido_DeberiaRetornar200(string validTypeUser)
    {
        SetSuperAdminContext();

        var result = await _controller.SwitchMode("AAA010101AAA",
            new FinkokAdminController.SwitchModeRequest(validTypeUser));

        result.Should().BeOfType<OkObjectResult>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100)]
    public async Task AssignCredits_CreditsNoPositivos_DeberiaRetornar400(int credits)
    {
        SetSuperAdminContext();

        var result = await _controller.AssignCreditsToEmitter("AAA010101AAA",
            new FinkokAdminController.AssignCreditsRequest(credits));

        result.Should().BeOfType<BadRequestObjectResult>(
            $"credits={credits} <= 0 debe rechazarse");
    }

    [Fact]
    public async Task AssignCredits_CreditsMaximo_DeberiaRetornar200()
    {
        SetSuperAdminContext();
        _registrationStub.AssignCreditsTotalToReturn = 10000;

        var result = await _controller.AssignCreditsToEmitter("AAA010101AAA",
            new FinkokAdminController.AssignCreditsRequest(10000));

        result.Should().BeOfType<OkObjectResult>();
    }

    // ============================================================
    // Error propagation: Finkok rechaza la operacion
    // ============================================================

    [Fact]
    public async Task SuspendEmitter_FinkokRechaza_DeberiaRetornar400ConMensaje()
    {
        SetSuperAdminContext();
        _registrationStub.UpdateEmitterShouldSucceed = false;
        _registrationStub.UpdateEmitterErrorMessage = "Cuenta ya suspendida";

        var result = await _controller.SuspendEmitter("AAA010101AAA");

        result.Should().BeOfType<BadRequestObjectResult>(
            "cuando Finkok devuelve Success=false el controller debe retornar 400");

        // Y la BD NO debe modificarse
        var config = await _context.ConfiguracionesFiscales
            .IgnoreQueryFilters()
            .FirstAsync(c => c.Rfc == "AAA010101AAA");
        config.FinkokStatus.Should().Be("active",
            "si Finkok falla, BD local NO debe quedar inconsistente");
    }

    [Fact]
    public async Task ListEmitters_FinkokRechaza_DeberiaRetornar502()
    {
        SetSuperAdminContext();
        _registrationStub.ListEmittersShouldSucceed = false;
        _registrationStub.ListEmittersErrorMessage = "WSDL timeout";

        var result = await _controller.ListEmitters(page: 1);

        result.Should().BeOfType<ObjectResult>();
        ((ObjectResult)result).StatusCode.Should().Be(502,
            "errores de upstream Finkok se mapean a 502 Bad Gateway");
    }

    [Fact]
    public async Task GetEmitter_FinkokRechaza_DeberiaRetornar502()
    {
        SetSuperAdminContext();
        _registrationStub.GetEmitterShouldSucceed = false;

        var result = await _controller.GetEmitter("AAA010101AAA");

        result.Should().BeOfType<ObjectResult>();
        ((ObjectResult)result).StatusCode.Should().Be(502);
    }

    // ============================================================
    // Anonymous: sin claims = Forbid (no NullReferenceException)
    // ============================================================

    [Fact]
    public async Task SuspendEmitter_SinClaims_DeberiaRetornarForbidSinExcepciones()
    {
        var identity = new ClaimsIdentity();
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };

        var act = async () => await _controller.SuspendEmitter("AAA010101AAA");

        var result = await act.Should().NotThrowAsync();
        result.Subject.Should().BeOfType<ForbidResult>();
    }

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}

/// <summary>
/// Stub que registra llamadas y permite forzar success/error para probar branches del controller.
/// </summary>
internal class RecordingStubRegistrationService : IRegistrationService
{
    public int LastListPageRequested { get; private set; }
    public int AssignCreditsCallCount { get; set; }
    public int? AssignCreditsTotalToReturn { get; set; } = 100;

    public bool UpdateEmitterShouldSucceed { get; set; } = true;
    public string? UpdateEmitterErrorMessage { get; set; }

    public bool ListEmittersShouldSucceed { get; set; } = true;
    public string? ListEmittersErrorMessage { get; set; }

    public bool GetEmitterShouldSucceed { get; set; } = true;

    public Task<RegisterEmitterResult> RegisterEmitterAsync(RegisterEmitterRequest request, CancellationToken ct = default)
        => Task.FromResult(new RegisterEmitterResult { Success = true, Message = "stub" });

    public Task<RegisterEmitterResult> UpdateEmitterAsync(UpdateEmitterRequest request, CancellationToken ct = default)
        => Task.FromResult(new RegisterEmitterResult
        {
            Success = UpdateEmitterShouldSucceed,
            Message = UpdateEmitterErrorMessage
        });

    public Task<EmitterInfoResult> GetEmitterInfoAsync(string rfc, CancellationToken ct = default)
        => Task.FromResult(new EmitterInfoResult
        {
            Success = GetEmitterShouldSucceed,
            Status = "active",
            Message = GetEmitterShouldSucceed ? null : "stub-finkok-error"
        });

    public Task<AssignCreditsResult> AssignCreditsAsync(string rfc, int credits, CancellationToken ct = default)
    {
        AssignCreditsCallCount++;
        return Task.FromResult(new AssignCreditsResult
        {
            Success = true,
            CreditsTotal = AssignCreditsTotalToReturn
        });
    }

    public Task<EmittersListResult> ListEmittersAsync(int page = 1, CancellationToken ct = default)
    {
        LastListPageRequested = page;
        return Task.FromResult(new EmittersListResult
        {
            Success = ListEmittersShouldSucceed,
            Message = ListEmittersErrorMessage,
            Items = ListEmittersShouldSucceed
                ? new List<EmitterSummary>
                {
                    new EmitterSummary(
                        Rfc: "AAA010101AAA",
                        RazonSocial: "Tenant A S.A.",
                        Status: "active",
                        TypeUser: 'P',
                        CreditsRemaining: 100,
                        RegisteredAt: DateTime.UtcNow)
                }
                : new List<EmitterSummary>()
        });
    }

    public Task<RegisterEmitterResult> SwitchTypeUserAsync(string rfc, char newTypeUser, CancellationToken ct = default)
        => Task.FromResult(new RegisterEmitterResult { Success = true });
}
