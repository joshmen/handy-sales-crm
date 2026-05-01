using System;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Application.Impuestos.DTOs;
using HandySuites.Application.Impuestos.Interfaces;
using HandySuites.Application.Impuestos.Services;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Impuestos;

/// <summary>
/// Unit tests para TasaImpuestoService — cubre cascade denormalization tras
/// cambios de tasa central, default, y delete. La cascade es crítica porque
/// Producto.Tasa vive denormalizada en mobile WatermelonDB; un cambio en la
/// tasa central debe forzar resync (touch ActualizadoEn) o el mobile usa
/// la tasa stale para siempre.
/// </summary>
public class TasaImpuestoServiceTests
{
    private const int Tenant = 1;
    private readonly Mock<ITasaImpuestoRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly TasaImpuestoService _service;

    public TasaImpuestoServiceTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(Tenant);
        _tenant.SetupGet(t => t.UserId).Returns("user-1");
        _service = new TasaImpuestoService(_repo.Object, _tenant.Object);
    }

    [Fact]
    public async Task CrearAsync_TasaSimple_NoEsDefault_NoEjecutaCascade()
    {
        var dto = new TasaImpuestoCreateDto { Nombre = "Frontera 8%", Tasa = 0.08m, EsDefault = false };
        _repo.Setup(r => r.CrearAsync(It.IsAny<TasaImpuesto>())).ReturnsAsync(42);

        var id = await _service.CrearAsync(dto);

        id.Should().Be(42);
        _repo.Verify(r => r.UnsetDefaultExceptAsync(Tenant, It.IsAny<int>()), Times.Never);
        _repo.Verify(r => r.PropagarTasaADefaultProductosAsync(Tenant, It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_NuevaTasaDefault_PropagaProductosSinFK()
    {
        var dto = new TasaImpuestoCreateDto { Nombre = "IVA 18%", Tasa = 0.18m, EsDefault = true };
        _repo.Setup(r => r.CrearAsync(It.IsAny<TasaImpuesto>())).ReturnsAsync(99);

        await _service.CrearAsync(dto);

        _repo.Verify(r => r.UnsetDefaultExceptAsync(Tenant, 99), Times.Once);
        _repo.Verify(r => r.PropagarTasaADefaultProductosAsync(Tenant, 0.18m), Times.Once);
    }

    [Fact]
    public async Task ActualizarAsync_CambioDeTasa_PropagaAProductosConFK()
    {
        var existente = new TasaImpuesto { Id = 5, TenantId = Tenant, Nombre = "IVA 16%", Tasa = 0.16m, EsDefault = true, Activo = true };
        _repo.Setup(r => r.ObtenerEntidadAsync(5, Tenant)).ReturnsAsync(existente);
        _repo.Setup(r => r.ActualizarAsync(It.IsAny<TasaImpuesto>())).ReturnsAsync(true);

        var ok = await _service.ActualizarAsync(5, new TasaImpuestoUpdateDto { Tasa = 0.18m });

        ok.Should().BeTrue();
        _repo.Verify(r => r.PropagarTasaAProductosAsync(Tenant, 5, 0.18m), Times.Once);
    }

    [Fact]
    public async Task ActualizarAsync_TasaIgualNoCambioReal_NoPropaga()
    {
        var existente = new TasaImpuesto { Id = 5, TenantId = Tenant, Nombre = "IVA 16%", Tasa = 0.16m };
        _repo.Setup(r => r.ObtenerEntidadAsync(5, Tenant)).ReturnsAsync(existente);
        _repo.Setup(r => r.ActualizarAsync(It.IsAny<TasaImpuesto>())).ReturnsAsync(true);

        await _service.ActualizarAsync(5, new TasaImpuestoUpdateDto { Tasa = 0.16m, Nombre = "IVA estándar" });

        _repo.Verify(r => r.PropagarTasaAProductosAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<decimal>()), Times.Never);
    }

    [Fact]
    public async Task ActualizarAsync_PromoverADefault_RefrescaProductosSinFK()
    {
        var existente = new TasaImpuesto { Id = 7, TenantId = Tenant, Nombre = "Frontera 8%", Tasa = 0.08m, EsDefault = false, Activo = true };
        _repo.Setup(r => r.ObtenerEntidadAsync(7, Tenant)).ReturnsAsync(existente);
        _repo.Setup(r => r.ActualizarAsync(It.IsAny<TasaImpuesto>())).ReturnsAsync(true);

        await _service.ActualizarAsync(7, new TasaImpuestoUpdateDto { EsDefault = true });

        _repo.Verify(r => r.UnsetDefaultExceptAsync(Tenant, 7), Times.Once);
        _repo.Verify(r => r.PropagarTasaADefaultProductosAsync(Tenant, 0.08m), Times.Once);
    }

    [Fact]
    public async Task EliminarAsync_TasaNoDefault_PropagaTasaDefaultAProductosSinFK()
    {
        var existente = new TasaImpuesto { Id = 9, TenantId = Tenant, Nombre = "Frontera 8%", Tasa = 0.08m, EsDefault = false };
        var defaultTasa = new TasaImpuesto { Id = 1, TenantId = Tenant, Nombre = "IVA 16%", Tasa = 0.16m, EsDefault = true };
        _repo.Setup(r => r.ObtenerEntidadAsync(9, Tenant)).ReturnsAsync(existente);
        _repo.Setup(r => r.EliminarAsync(9, Tenant)).ReturnsAsync(true);
        _repo.Setup(r => r.ObtenerDefaultAsync(Tenant)).ReturnsAsync(defaultTasa);

        var ok = await _service.EliminarAsync(9);

        ok.Should().BeTrue();
        _repo.Verify(r => r.PropagarTasaADefaultProductosAsync(Tenant, 0.16m), Times.Once);
    }

    [Fact]
    public async Task ActualizarAsync_TasaFueraDeRango_LanzaInvalidOperationException()
    {
        var existente = new TasaImpuesto { Id = 5, TenantId = Tenant, Tasa = 0.16m };
        _repo.Setup(r => r.ObtenerEntidadAsync(5, Tenant)).ReturnsAsync(existente);

        Func<Task> act = () => _service.ActualizarAsync(5, new TasaImpuestoUpdateDto { Tasa = 1.5m });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
