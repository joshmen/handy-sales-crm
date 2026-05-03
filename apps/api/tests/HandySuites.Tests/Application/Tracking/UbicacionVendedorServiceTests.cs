using FluentAssertions;
using HandySuites.Application.Tracking.DTOs;
using HandySuites.Application.Tracking.Interfaces;
using HandySuites.Application.Tracking.Services;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Tracking;

public class UbicacionVendedorServiceTests
{
    private const int Tenant = 1;
    private const string UserId = "42";
    private readonly Mock<IUbicacionVendedorRepository> _repo = new();
    private readonly Mock<ISubscriptionFeatureGuard> _guard = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly UbicacionVendedorService _service;

    public UbicacionVendedorServiceTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(Tenant);
        _tenant.SetupGet(t => t.UserId).Returns(UserId);
        // Default: no última ubicación previa (vendedor nuevo). Tests que
        // necesitan validar velocity check pueden override este setup.
        _repo.Setup(r => r.ObtenerUltimasAsync(Tenant, It.IsAny<List<int>?>()))
            .ReturnsAsync(new List<UltimaUbicacionDto>());
        _service = new UbicacionVendedorService(_repo.Object, _guard.Object, _tenant.Object);
    }

    [Fact]
    public async Task GuardarBatch_PlanSinFeature_LanzaException()
    {
        _guard.Setup(g => g.RequireFeatureAsync(Tenant, UbicacionVendedorService.FeatureCode))
            .ThrowsAsync(new FeatureNotInPlanException("tracking_vendedor"));

        var act = () => _service.GuardarBatchAsync(new UbicacionBatchRequestDto
        {
            Pings = new List<UbicacionPingDto>
            {
                new() { Latitud = 19.4m, Longitud = -99.1m, Tipo = TipoPingUbicacion.Venta, CapturadoEn = DateTime.UtcNow }
            }
        });

        await act.Should().ThrowAsync<FeatureNotInPlanException>();
        _repo.Verify(r => r.InsertBatchAsync(It.IsAny<int>(), It.IsAny<IEnumerable<UbicacionVendedor>>()), Times.Never);
    }

    [Fact]
    public async Task GuardarBatch_BatchVacio_NoLlamaRepo()
    {
        _guard.Setup(g => g.RequireFeatureAsync(Tenant, It.IsAny<string>())).Returns(Task.CompletedTask);

        var result = await _service.GuardarBatchAsync(new UbicacionBatchRequestDto { Pings = new() });

        result.Aceptados.Should().Be(0);
        result.Duplicados.Should().Be(0);
        _repo.Verify(r => r.InsertBatchAsync(It.IsAny<int>(), It.IsAny<IEnumerable<UbicacionVendedor>>()), Times.Never);
    }

    [Fact]
    public async Task GuardarBatch_PingsValidos_PersistenConTenantYUsuarioCorrectos()
    {
        _guard.Setup(g => g.RequireFeatureAsync(Tenant, It.IsAny<string>())).Returns(Task.CompletedTask);
        _repo.Setup(r => r.InsertBatchAsync(Tenant, It.IsAny<IEnumerable<UbicacionVendedor>>()))
            .ReturnsAsync((2, 0));

        // Timestamp dentro de la ventana válida (últimas 2h) — el service
        // rechaza pings fuera de [-6h, +2min] desde UtcNow (VULN-M04 fix).
        var capturedoEn = DateTime.UtcNow.AddMinutes(-30);
        var result = await _service.GuardarBatchAsync(new UbicacionBatchRequestDto
        {
            Pings = new List<UbicacionPingDto>
            {
                new() { Latitud = 19.4326m, Longitud = -99.1332m, Tipo = TipoPingUbicacion.Venta, CapturadoEn = capturedoEn, ReferenciaId = 100 },
                new() { Latitud = 19.4327m, Longitud = -99.1333m, Tipo = TipoPingUbicacion.Checkpoint, CapturadoEn = capturedoEn.AddMinutes(15) },
            }
        });

        result.Aceptados.Should().Be(2);
        _repo.Verify(r => r.InsertBatchAsync(Tenant, It.Is<IEnumerable<UbicacionVendedor>>(pings =>
            pings.All(p => p.TenantId == Tenant && p.UsuarioId == 42 && p.DiaServicio == DateOnly.FromDateTime(capturedoEn))
        )), Times.Once);
    }

    [Fact]
    public async Task GuardarBatch_PingsConCoordenadasCero_SeDescartan()
    {
        _guard.Setup(g => g.RequireFeatureAsync(Tenant, It.IsAny<string>())).Returns(Task.CompletedTask);
        IEnumerable<UbicacionVendedor>? captured = null;
        _repo.Setup(r => r.InsertBatchAsync(Tenant, It.IsAny<IEnumerable<UbicacionVendedor>>()))
            .Callback<int, IEnumerable<UbicacionVendedor>>((_, p) => captured = p.ToList())
            .ReturnsAsync((1, 0));

        await _service.GuardarBatchAsync(new UbicacionBatchRequestDto
        {
            Pings = new List<UbicacionPingDto>
            {
                new() { Latitud = 0m, Longitud = 0m, Tipo = TipoPingUbicacion.Venta, CapturadoEn = DateTime.UtcNow }, // descartado
                new() { Latitud = 19.4m, Longitud = -99.1m, Tipo = TipoPingUbicacion.Venta, CapturadoEn = DateTime.UtcNow },
            }
        });

        captured.Should().NotBeNull();
        captured!.Should().HaveCount(1);
    }

    [Fact]
    public async Task GuardarBatch_RepoReportaDuplicados_PassThrough()
    {
        _guard.Setup(g => g.RequireFeatureAsync(Tenant, It.IsAny<string>())).Returns(Task.CompletedTask);
        _repo.Setup(r => r.InsertBatchAsync(Tenant, It.IsAny<IEnumerable<UbicacionVendedor>>()))
            .ReturnsAsync((3, 2)); // 3 nuevos, 2 dedup

        // Timestamps en el pasado para no chocar con FutureTolerance (2min).
        var now = DateTime.UtcNow;
        var result = await _service.GuardarBatchAsync(new UbicacionBatchRequestDto
        {
            Pings = Enumerable.Range(0, 5).Select(i => new UbicacionPingDto
            {
                Latitud = 19m + i * 0.001m,
                Longitud = -99m,
                Tipo = TipoPingUbicacion.Checkpoint,
                CapturadoEn = now.AddMinutes(-(5 - i)),
            }).ToList(),
        });

        result.Aceptados.Should().Be(3);
        result.Duplicados.Should().Be(2);
    }

    [Fact]
    public async Task ObtenerUltimas_PassesUsuarioIdsAlRepo()
    {
        var ids = new List<int> { 10, 20, 30 };
        _repo.Setup(r => r.ObtenerUltimasAsync(Tenant, ids)).ReturnsAsync(new List<UltimaUbicacionDto>());

        await _service.ObtenerUltimasAsync(ids);

        _repo.Verify(r => r.ObtenerUltimasAsync(Tenant, ids), Times.Once);
    }
}
