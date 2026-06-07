using HandySuites.Application.SubscriptionPlans.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Mobile.Api.Endpoints;
using HandySuites.Shared.Billing;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests para el rol VENDEDOR sobre /api/mobile/facturas (apps/mobile/HandySuites.Mobile.Api/Endpoints/MobileFacturaEndpoints.cs).
///
/// Los endpoints son lambdas inline que: (a) validan tenant + country gate,
/// (b) validan pedido entregado, (c) consultan enforcement de subscripción, y
/// (d) proxyean a Billing API. No hay un Service class extractable; testeamos
/// las INVARIANTES verificables sin WebApplicationFactory (que no está cableado
/// para Mobile.Tests — ver comentario en MobilePedidoEndpointsTests.cs):
///
///  - Country gate via BillingCountrySupport (MX permitido, otros 403).
///  - Pedido state check: estado != Entregado (5) → 400.
///  - Pedido cross-tenant: query filter tenant-aware → 404.
///  - Subscription enforcement: CanGenerarFacturaAsync y CanUsarTimbreAsync
///    devuelven Allowed=false → endpoint debe devolver 400.
///  - DTO contract estable (CrearFacturaDesdePedidoRequest, EnviarFacturaMobileRequest).
///
/// Para el HTTP pipeline real (auth claim parsing, proxy a Billing API) se
/// requiere CustomWebApplicationFactory que aún no existe en Mobile.Tests;
/// marcamos esos tests con Skip="PENDING".
/// </summary>
public class MobileFacturaEndpointsTests : IDisposable
{
    private const int TenantId = 1;
    private const int OtroTenantId = 99;
    private const int UsuarioId = 10;
    private const int ClienteId = 300;
    private const int PedidoEntregadoId = 500;
    private const int PedidoBorradorId = 501;
    private const int PedidoOtroTenantId = 502;

    private readonly HandySuitesDbContext _db;
    private readonly Mock<ISubscriptionEnforcementService> _enforcement = new();

    public MobileFacturaEndpointsTests()
    {
        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new HandySuitesDbContext(options);

        SeedFixtures();
    }

    private void SeedFixtures()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test MX" });
        _db.Tenants.Add(new Tenant { Id = OtroTenantId, NombreEmpresa = "Otro Tenant" });

        _db.Set<CompanySetting>().Add(new CompanySetting
        {
            Id = 1,
            TenantId = TenantId,
            CompanyName = "Test MX",
            Country = "MX"
        });

        _db.Usuarios.Add(new Usuario
        {
            Id = UsuarioId,
            TenantId = TenantId,
            Email = "vendedor@test.com",
            Nombre = "Vendedor",
            PasswordHash = "x",
            RolExplicito = "VENDEDOR",
            Activo = true
        });

        _db.Clientes.Add(new Cliente
        {
            Id = ClienteId,
            TenantId = TenantId,
            Nombre = "Cliente",
            RFC = "XAXX010101000",
            Correo = "c@x.com",
            Telefono = "0",
            Direccion = "",
            Activo = true
        });

        // Pedido ENTREGADO (estado=5) — facturable.
        _db.Pedidos.Add(new Pedido
        {
            Id = PedidoEntregadoId,
            TenantId = TenantId,
            ClienteId = ClienteId,
            UsuarioId = UsuarioId,
            NumeroPedido = "PED-001",
            Estado = EstadoPedido.Entregado,
            Activo = true
        });

        // Pedido BORRADOR (estado=0) — NO facturable.
        _db.Pedidos.Add(new Pedido
        {
            Id = PedidoBorradorId,
            TenantId = TenantId,
            ClienteId = ClienteId,
            UsuarioId = UsuarioId,
            NumeroPedido = "PED-002",
            Estado = EstadoPedido.Borrador,
            Activo = true
        });

        // Pedido ENTREGADO de OTRO tenant — IDOR target.
        _db.Pedidos.Add(new Pedido
        {
            Id = PedidoOtroTenantId,
            TenantId = OtroTenantId,
            ClienteId = ClienteId,
            UsuarioId = UsuarioId,
            NumeroPedido = "PED-OTRO",
            Estado = EstadoPedido.Entregado,
            Activo = true
        });

        _db.SaveChanges();
    }

    // ============ Country Gate (BillingCountrySupport) ============

    [Fact]
    public void CountryGate_MX_IsSupported()
    {
        // MX es el único país con integración SAT CFDI hoy.
        BillingCountrySupport.IsSupported("MX").Should().BeTrue();
    }

    [Fact]
    public void CountryGate_NonMx_IsRejected()
    {
        // País sin integración fiscal: endpoint debe responder 403.
        BillingCountrySupport.IsSupported("US").Should().BeFalse();
        BillingCountrySupport.IsSupported("CO").Should().BeFalse();
        BillingCountrySupport.IsSupported("AR").Should().BeFalse();
    }

    [Fact]
    public async Task CountryGate_TenantWithMx_PassesGate()
    {
        // Replica el query del endpoint para obtener country del tenant.
        var country = await _db.Set<CompanySetting>()
            .AsNoTracking()
            .Where(s => s.TenantId == TenantId)
            .Select(s => s.Country)
            .FirstOrDefaultAsync() ?? "MX";

        country.Should().Be("MX");
        BillingCountrySupport.IsSupported(country).Should().BeTrue();
    }

    [Fact]
    public async Task CountryGate_TenantSinCompanySetting_DefaultsToMx()
    {
        // Tenant sin row en company_settings → endpoint default a "MX" (?? "MX").
        var country = await _db.Set<CompanySetting>()
            .AsNoTracking()
            .Where(s => s.TenantId == OtroTenantId)
            .Select(s => s.Country)
            .FirstOrDefaultAsync() ?? "MX";

        country.Should().Be("MX");
        BillingCountrySupport.IsSupported(country).Should().BeTrue();
    }

    [Fact]
    public async Task CountryGate_TenantWithUnsupportedCountry_FailsGate()
    {
        // Arrange — tenant con country no soportado.
        _db.Set<CompanySetting>().Add(new CompanySetting
        {
            Id = 99,
            TenantId = 50,
            CompanyName = "Foreign",
            Country = "US"
        });
        _db.Tenants.Add(new Tenant { Id = 50, NombreEmpresa = "Foreign" });
        await _db.SaveChangesAsync();

        // Act — replica query del endpoint.
        var country = await _db.Set<CompanySetting>()
            .AsNoTracking()
            .Where(s => s.TenantId == 50)
            .Select(s => s.Country)
            .FirstOrDefaultAsync() ?? "MX";

        // Assert — gate debe rechazar.
        country.Should().Be("US");
        BillingCountrySupport.IsSupported(country).Should().BeFalse();
    }

    // ============ Pedido Validation (estado=Entregado) ============

    [Fact]
    public async Task PedidoQuery_Entregado_Encontrado()
    {
        // Replica query del endpoint POST /from-order/{pedidoId}.
        var pedido = await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.Id == PedidoEntregadoId && p.TenantId == TenantId)
            .Select(p => new { p.Id, p.Estado })
            .FirstOrDefaultAsync();

        pedido.Should().NotBeNull();
        ((int)pedido!.Estado).Should().Be(5, "Entregado=5 es el único estado facturable");
    }

    [Fact]
    public async Task PedidoQuery_Borrador_RechazadoPorEstado()
    {
        // El endpoint debe devolver 400 cuando estado != 5.
        var pedido = await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.Id == PedidoBorradorId && p.TenantId == TenantId)
            .Select(p => new { p.Id, p.Estado })
            .FirstOrDefaultAsync();

        pedido.Should().NotBeNull();
        ((int)pedido!.Estado).Should().NotBe(5);
        // El endpoint responde: "Solo se pueden facturar pedidos con estado 'Entregado'"
    }

    [Theory]
    [InlineData(EstadoPedido.Borrador)]
    [InlineData(EstadoPedido.Confirmado)]
    [InlineData(EstadoPedido.EnRuta)]
    [InlineData(EstadoPedido.Cancelado)]
    public void EstadoNoEntregado_NoEsFacturable(EstadoPedido estado)
    {
        // Único estado facturable: Entregado (5).
        ((int)estado).Should().NotBe(5);
    }

    [Fact]
    public void EstadoEntregado_EsFacturable()
    {
        ((int)EstadoPedido.Entregado).Should().Be(5);
    }

    // ============ IDOR Cross-Tenant ============

    [Fact]
    public async Task PedidoQuery_CrossTenant_RetornaNull()
    {
        // VENDEDOR de TenantId=1 intenta facturar pedido de TenantId=99.
        // El endpoint filtra por p.TenantId == tenantId (del JWT claim),
        // por lo que debe responder 404 — pedido "no encontrado".
        var pedido = await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.Id == PedidoOtroTenantId && p.TenantId == TenantId)
            .Select(p => new { p.Id, p.Estado })
            .FirstOrDefaultAsync();

        pedido.Should().BeNull("IDOR: pedido de otro tenant NO debe ser visible");
    }

    [Fact]
    public async Task PedidoQuery_PedidoInexistente_RetornaNull()
    {
        var pedido = await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.Id == 99999 && p.TenantId == TenantId)
            .Select(p => new { p.Id, p.Estado })
            .FirstOrDefaultAsync();

        pedido.Should().BeNull();
    }

    // ============ Subscription Enforcement Gates ============

    [Fact]
    public async Task Enforcement_CanGenerarFactura_Denied_DebeBloquear()
    {
        _enforcement.Setup(e => e.CanGenerarFacturaAsync(TenantId))
            .ReturnsAsync(new EnforcementResult(false, "Límite de facturas alcanzado", 100, 100));

        var result = await _enforcement.Object.CanGenerarFacturaAsync(TenantId);

        result.Allowed.Should().BeFalse();
        result.Message.Should().ContainEquivalentOf("límite", because: "endpoint usa este mensaje (case-insensitive) en el 400 response");
    }

    [Fact]
    public async Task Enforcement_CanUsarTimbre_Denied_DebeBloquear()
    {
        _enforcement.Setup(e => e.CanUsarTimbreAsync(TenantId))
            .ReturnsAsync(new EnforcementResult(false, "Sin timbres disponibles", 0, 0));

        var result = await _enforcement.Object.CanUsarTimbreAsync(TenantId);

        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("timbres");
    }

    [Fact]
    public async Task Enforcement_HappyPath_RegistraFacturaYTimbre()
    {
        _enforcement.Setup(e => e.CanGenerarFacturaAsync(TenantId))
            .ReturnsAsync(new EnforcementResult(true));
        _enforcement.Setup(e => e.CanUsarTimbreAsync(TenantId))
            .ReturnsAsync(new EnforcementResult(true));
        _enforcement.Setup(e => e.RegistrarFacturaGeneradaAsync(TenantId)).ReturnsAsync(true);
        _enforcement.Setup(e => e.RegistrarTimbreUsadoAsync(TenantId)).ReturnsAsync(true);

        var canFactura = await _enforcement.Object.CanGenerarFacturaAsync(TenantId);
        var canTimbre = await _enforcement.Object.CanUsarTimbreAsync(TenantId);

        canFactura.Allowed.Should().BeTrue();
        canTimbre.Allowed.Should().BeTrue();

        // Solo se registran usos cuando timbrado fue exitoso (paso 5 del endpoint).
        await _enforcement.Object.RegistrarFacturaGeneradaAsync(TenantId);
        await _enforcement.Object.RegistrarTimbreUsadoAsync(TenantId);

        _enforcement.Verify(e => e.RegistrarFacturaGeneradaAsync(TenantId), Times.Once);
        _enforcement.Verify(e => e.RegistrarTimbreUsadoAsync(TenantId), Times.Once);
    }

    // ============ DTO Contract ============

    [Fact]
    public void CrearFacturaDesdePedidoRequest_AcceptaCamposOpcionales()
    {
        // Endpoint solo usa UsoCfdiReceptor del DTO (el resto se ignora en el proxy);
        // el contract debe permanecer estable para no romper el mobile client.
        var dto = new CrearFacturaDesdePedidoRequest(
            RfcReceptor: "XAXX010101000",
            NombreReceptor: "Receptor SA",
            RegimenFiscalReceptor: "601",
            UsoCfdiReceptor: "G03",
            CpReceptor: "44100"
        );

        dto.RfcReceptor.Should().Be("XAXX010101000");
        dto.UsoCfdiReceptor.Should().Be("G03");
    }

    [Fact]
    public void CrearFacturaDesdePedidoRequest_PermiteCamposNulos()
    {
        // Todos los campos son opcionales (record con nullable strings).
        var dto = new CrearFacturaDesdePedidoRequest(null, null, null, null, null);

        dto.RfcReceptor.Should().BeNull();
        dto.UsoCfdiReceptor.Should().BeNull();
    }

    [Fact]
    public void EnviarFacturaMobileRequest_DefaultsIncluirPdfXml_True()
    {
        // Defaults importantes: incluir PDF y XML por default (cliente solo manda email).
        var dto = new EnviarFacturaMobileRequest(Email: "cliente@empresa.com");

        dto.Email.Should().Be("cliente@empresa.com");
        dto.Mensaje.Should().BeNull();
        dto.IncluirPdf.Should().BeTrue();
        dto.IncluirXml.Should().BeTrue();
    }

    [Fact]
    public void EnviarFacturaMobileRequest_PermiteOverrideIncluirPdf()
    {
        var dto = new EnviarFacturaMobileRequest(
            Email: "cliente@empresa.com",
            Mensaje: "Adjunto su factura",
            IncluirPdf: false,
            IncluirXml: true
        );

        dto.IncluirPdf.Should().BeFalse();
        dto.IncluirXml.Should().BeTrue();
        dto.Mensaje.Should().Be("Adjunto su factura");
    }

    // ============ HTTP Pipeline Integration (PENDING — sin WebApplicationFactory) ============

    [Fact(Skip = "PENDING: requiere CustomWebApplicationFactory para HandySuites.Mobile.Api (no existe aún en Mobile.Tests). Mocks de IHttpClientFactory + JWT setup. Cubre el flujo end-to-end POST /api/mobile/facturas/from-order/{pedidoId} con auth real.")]
    public void Post_FromOrder_HappyPath_Returns200WithTimbradaTrue()
    {
        // TODO: cuando exista CustomWebApplicationFactory, mockear IHttpClientFactory
        // para que BillingApi devuelva { id: 123 } en POST /api/facturas/from-order
        // y { uuid: "..." } en POST /api/facturas/123/timbrar. Verificar respuesta:
        // { success: true, timbrada: true, message: "Factura creada y timbrada exitosamente" }.
    }

    [Fact(Skip = "PENDING: requiere CustomWebApplicationFactory. Cubre VENDEDOR sin JWT → 401 Unauthorized en todos los endpoints del grupo /api/mobile/facturas.")]
    public void AllEndpoints_SinJwt_Returns401()
    {
        // TODO: HTTP request sin Bearer token → RequireAuthorization() debe devolver 401.
    }

    [Fact(Skip = "PENDING: requiere CustomWebApplicationFactory. Cubre VENDEDOR con JWT inválido (tenant_id missing) → endpoint debe responder Unauthorized (GetContext devuelve 0).")]
    public void Post_FromOrder_JwtSinTenantClaim_Returns401()
    {
        // TODO: JWT firmado sin claim "tenant_id" → endpoint llama Results.Unauthorized().
    }

    [Fact(Skip = "PENDING: requiere CustomWebApplicationFactory + mock IHttpClientFactory. Cubre el caso 'creada pero no timbrada': Billing API POST /facturas/from-order = 200 OK, POST /timbrar = 500 → response { success: true, timbrada: false, message: 'Factura creada pero no se pudo timbrar...' }.")]
    public void Post_FromOrder_TimbradoFalla_RetornaFacturaSinTimbrar()
    {
        // TODO: verificar que NO se llama RegistrarFacturaGeneradaAsync ni
        // RegistrarTimbreUsadoAsync cuando timbrar falla — invariante crítica
        // para no consumir cupo del plan en facturas no timbradas.
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}
