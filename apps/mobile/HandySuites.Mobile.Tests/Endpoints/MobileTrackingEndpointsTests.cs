using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Tracking.DTOs;
using HandySuites.Application.Tracking.Interfaces;
using HandySuites.Application.Tracking.Services;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests del POST /api/mobile/tracking/batch (GPS Fase A/B vendedores).
///
/// UbicacionVendedorServiceTests (apps/api/tests/.../Application/Tracking) cubre
/// feature flag + dedup. Aqui completamos la capa HTTP-equivalent: auth implicita,
/// binding DTO (coords invalidas → rechazadas), 403 cuando el plan tenant no
/// incluye `tracking_vendedor`, y anti-spoofing del UsuarioId (el service usa
/// _tenant.UserId del JWT, ignorando cualquier id del body).
///
/// NO usamos WebApplicationFactory para mobile (no esta wired); testeamos el
/// UbicacionVendedorService directo con mocks. Esto refleja el comportamiento
/// del endpoint MobileTrackingEndpoints.cs que solo delega:
///   try { service.GuardarBatchAsync(req) }
///   catch FeatureNotInPlanException { return 403 TRACKING_NOT_IN_PLAN }
/// </summary>
public class MobileTrackingEndpointsTests
{
    private const int TenantId = 1;
    private const int UsuarioId = 42;
    private const string UsuarioIdStr = "42";

    private readonly Mock<IUbicacionVendedorRepository> _repo = new();
    private readonly Mock<ISubscriptionFeatureGuard> _guard = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly Mock<ITenantTimeZoneService> _tz = new();
    private readonly UbicacionVendedorService _service;

    public MobileTrackingEndpointsTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(TenantId);
        _tenant.SetupGet(t => t.UserId).Returns(UsuarioIdStr);
        _tenant.SetupGet(t => t.Role).Returns("VENDEDOR");
        _tz.Setup(t => t.GetTenantTimeZoneAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(TimeZoneInfo.Utc);
        _repo.Setup(r => r.ObtenerUltimasAsync(TenantId, It.IsAny<List<int>?>()))
            .ReturnsAsync(new List<UltimaUbicacionDto>());
        _service = new UbicacionVendedorService(_repo.Object, _guard.Object, _tenant.Object, _tz.Object);
    }

    private static UbicacionBatchRequestDto BuildBatch(params UbicacionPingDto[] pings)
        => new() { Pings = pings.ToList() };

    private static UbicacionPingDto BuildPing(
        decimal lat = 19.4326m,
        decimal lng = -99.1332m,
        TipoPingUbicacion tipo = TipoPingUbicacion.Checkpoint,
        DateTime? capturadoEn = null)
    {
        return new UbicacionPingDto
        {
            Latitud = lat,
            Longitud = lng,
            Tipo = tipo,
            CapturadoEn = capturadoEn ?? DateTime.UtcNow.AddMinutes(-1)
        };
    }

    // ============ Feature flag (403 TRACKING_NOT_IN_PLAN) ============

    [Fact]
    public async Task GuardarBatchAsync_PlanSinFeature_LanzaFeatureNotInPlan_Para403()
    {
        // El endpoint MobileTrackingEndpoints captura esta excepcion y la
        // convierte a 403 Forbidden con code=TRACKING_NOT_IN_PLAN.
        _guard.Setup(g => g.RequireFeatureAsync(TenantId, UbicacionVendedorService.FeatureCode))
            .ThrowsAsync(new FeatureNotInPlanException(UbicacionVendedorService.FeatureCode));

        var batch = BuildBatch(BuildPing());

        var act = () => _service.GuardarBatchAsync(batch);

        var ex = await act.Should().ThrowAsync<FeatureNotInPlanException>();
        ex.Which.FeatureCode.Should().Be(UbicacionVendedorService.FeatureCode);
        _repo.Verify(r => r.InsertBatchAsync(It.IsAny<int>(), It.IsAny<IEnumerable<UbicacionVendedor>>()), Times.Never);
    }

    [Fact]
    public async Task GuardarBatchAsync_FeatureHabilitado_HappyPath_Persiste()
    {
        _guard.Setup(g => g.RequireFeatureAsync(TenantId, It.IsAny<string>())).Returns(Task.CompletedTask);
        _repo.Setup(r => r.InsertBatchAsync(TenantId, It.IsAny<IEnumerable<UbicacionVendedor>>()))
            .ReturnsAsync((1, 0));

        var batch = BuildBatch(BuildPing());

        var result = await _service.GuardarBatchAsync(batch);

        result.Aceptados.Should().Be(1);
        result.Duplicados.Should().Be(0);
    }

    // ============ Binding DTO — coords invalidas ============

    [Theory]
    [InlineData(91.0, -99.0)]       // lat > 90
    [InlineData(-91.0, -99.0)]      // lat < -90
    [InlineData(19.0, 181.0)]       // lng > 180
    [InlineData(19.0, -181.0)]      // lng < -180
    public async Task GuardarBatchAsync_CoordsInvalidas_SeDescartan(double lat, double lng)
    {
        // El service filtra silenciosamente (no devuelve 400, los cuenta como
        // duplicados para no exponer la logica al cliente). El endpoint mapea
        // a 200 con aceptados=0, duplicados=N.
        _guard.Setup(g => g.RequireFeatureAsync(TenantId, It.IsAny<string>())).Returns(Task.CompletedTask);

        var batch = BuildBatch(BuildPing(lat: (decimal)lat, lng: (decimal)lng));

        var result = await _service.GuardarBatchAsync(batch);

        result.Aceptados.Should().Be(0);
        result.Duplicados.Should().Be(1);
        _repo.Verify(r => r.InsertBatchAsync(It.IsAny<int>(), It.IsAny<IEnumerable<UbicacionVendedor>>()), Times.Never);
    }

    [Fact]
    public async Task GuardarBatchAsync_TimestampMuyEnElFuturo_SeDescarta()
    {
        // FutureTolerance = 2min. Un ping +1h adelantado es spoof.
        _guard.Setup(g => g.RequireFeatureAsync(TenantId, It.IsAny<string>())).Returns(Task.CompletedTask);

        var batch = BuildBatch(BuildPing(capturadoEn: DateTime.UtcNow.AddHours(1)));

        var result = await _service.GuardarBatchAsync(batch);

        result.Aceptados.Should().Be(0);
        result.Duplicados.Should().Be(1);
    }

    [Fact]
    public async Task GuardarBatchAsync_TimestampMuyEnElPasado_SeDescarta()
    {
        // PastTolerance = 6h. Un ping de hace 1 dia es sospechoso/legacy.
        _guard.Setup(g => g.RequireFeatureAsync(TenantId, It.IsAny<string>())).Returns(Task.CompletedTask);

        var batch = BuildBatch(BuildPing(capturadoEn: DateTime.UtcNow.AddDays(-1)));

        var result = await _service.GuardarBatchAsync(batch);

        result.Aceptados.Should().Be(0);
        result.Duplicados.Should().Be(1);
    }

    // ============ Anti-spoofing UsuarioId (token, no body) ============

    [Fact]
    public async Task GuardarBatchAsync_PersisteConUsuarioIdDelToken_NuncaDelBody()
    {
        _guard.Setup(g => g.RequireFeatureAsync(TenantId, It.IsAny<string>())).Returns(Task.CompletedTask);
        List<UbicacionVendedor>? capturedEntities = null;
        _repo.Setup(r => r.InsertBatchAsync(TenantId, It.IsAny<IEnumerable<UbicacionVendedor>>()))
            .Callback<int, IEnumerable<UbicacionVendedor>>((_, entidades) => capturedEntities = entidades.ToList())
            .ReturnsAsync((1, 0));

        var batch = BuildBatch(BuildPing());

        await _service.GuardarBatchAsync(batch);

        capturedEntities.Should().NotBeNull().And.HaveCount(1);
        capturedEntities![0].UsuarioId.Should().Be(UsuarioId);
        capturedEntities[0].TenantId.Should().Be(TenantId);
        // El ping DTO NO tiene UsuarioId (no se puede spoofear desde el body):
        // se setea solo desde _tenant.UserId. Verificado leyendo el service
        // UbicacionVendedorService:165 — UsuarioId = usuarioIdInt (parsed JWT).
    }

    // ============ Batch grande (perf path) ============

    [Fact]
    public async Task GuardarBatchAsync_BatchDe100Pings_DelegaUnaSolaVezAlRepo()
    {
        _guard.Setup(g => g.RequireFeatureAsync(TenantId, It.IsAny<string>())).Returns(Task.CompletedTask);
        _repo.Setup(r => r.InsertBatchAsync(TenantId, It.IsAny<IEnumerable<UbicacionVendedor>>()))
            .ReturnsAsync((100, 0));

        var ahora = DateTime.UtcNow;
        // Generar 100 pings espaciados 30s cada uno, todos dentro de la ventana valida
        // y a < 1 km/s velocity para no ser rechazados por anti-teleport check.
        var pings = Enumerable.Range(0, 100)
            .Select(i => new UbicacionPingDto
            {
                // Pequeno delta de coords (<100m) para mantener velocity razonable.
                Latitud = 19.4326m + (decimal)(i * 0.00001),
                Longitud = -99.1332m + (decimal)(i * 0.00001),
                Tipo = TipoPingUbicacion.Checkpoint,
                CapturadoEn = ahora.AddSeconds(-3000 + (i * 30))
            })
            .ToArray();

        var result = await _service.GuardarBatchAsync(BuildBatch(pings));

        result.Aceptados.Should().Be(100);
        // Garantia clave de performance: el service NO hace 100 inserts, hace 1 batch insert.
        _repo.Verify(r => r.InsertBatchAsync(TenantId, It.IsAny<IEnumerable<UbicacionVendedor>>()), Times.Once);
    }

    // ============ Batch vacio (edge case) ============

    [Fact]
    public async Task GuardarBatchAsync_BatchVacio_NoLlamaRepo()
    {
        _guard.Setup(g => g.RequireFeatureAsync(TenantId, It.IsAny<string>())).Returns(Task.CompletedTask);

        var result = await _service.GuardarBatchAsync(new UbicacionBatchRequestDto { Pings = new() });

        result.Aceptados.Should().Be(0);
        result.Duplicados.Should().Be(0);
        _repo.Verify(r => r.InsertBatchAsync(It.IsAny<int>(), It.IsAny<IEnumerable<UbicacionVendedor>>()), Times.Never);
    }

    // ============ Feature flag verifica TENANT del contexto (no spoof) ============

    [Fact]
    public async Task GuardarBatchAsync_VerificaFeatureContraTenantDelToken()
    {
        // Anti tenant-spoof: el service usa _tenant.TenantId del JWT, jamas
        // un campo del body. Si el guard ve un tenantId distinto, eso seria
        // un bug critico.
        _guard.Setup(g => g.RequireFeatureAsync(TenantId, It.IsAny<string>())).Returns(Task.CompletedTask);
        _repo.Setup(r => r.InsertBatchAsync(TenantId, It.IsAny<IEnumerable<UbicacionVendedor>>()))
            .ReturnsAsync((1, 0));

        await _service.GuardarBatchAsync(BuildBatch(BuildPing()));

        _guard.Verify(g => g.RequireFeatureAsync(TenantId, UbicacionVendedorService.FeatureCode), Times.Once);
        _guard.Verify(g => g.RequireFeatureAsync(It.Is<int>(t => t != TenantId), It.IsAny<string>()), Times.Never);
    }
}
