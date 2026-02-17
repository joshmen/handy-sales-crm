using Xunit;
using Moq;
using FluentAssertions;
using HandySales.Application.Promociones.DTOs;
using HandySales.Application.Promociones.Interfaces;
using HandySales.Application.Promociones.Services;
using HandySales.Shared.Multitenancy;

namespace HandySales.Tests.Application.Promociones
{
    public class PromocionServiceTests
    {
        private readonly Mock<IPromocionRepository> _repoMock = new();
        private readonly Mock<ICurrentTenant> _tenantMock = new();
        private readonly PromocionService _service;

        public PromocionServiceTests()
        {
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            _service = new PromocionService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerPromocionesAsync_DeberiaLlamarAlRepo()
        {
            await _service.ObtenerPromocionesAsync();
            _repoMock.Verify(r => r.ObtenerPorTenantAsync(1), Times.Once);
        }

        [Fact]
        public async Task ObtenerPorIdAsync_DeberiaLlamarAlRepo()
        {
            await _service.ObtenerPorIdAsync(10);
            _repoMock.Verify(r => r.ObtenerPorIdAsync(10, 1), Times.Once);
        }

        [Fact]
        public async Task CrearPromocionAsync_DeberiaLlamarAlRepo()
        {
            var dto = new PromocionCreateDto { Nombre = "Promo", ProductoId = 1, Descripcion = "Descripcion", DescuentoPorcentaje = 10, FechaInicio = DateTime.Now, FechaFin = DateTime.Now.AddYears(2), TenandId = 1 };

            await _service.CrearPromocionAsync(dto);
            _repoMock.Verify(r => r.CrearAsync(dto, 1), Times.Once);
        }

        [Fact]
        public async Task ActualizarPromocionAsync_DeberiaLlamarAlRepo()
        {
            var dto = new PromocionCreateDto { Nombre = "Promo", ProductoId = 1, Descripcion = "Descripcion", DescuentoPorcentaje = 10, FechaInicio = DateTime.Now, FechaFin = DateTime.Now.AddYears(2), TenandId = 1 };

            await _service.ActualizarPromocionAsync(99, dto);
            _repoMock.Verify(r => r.ActualizarAsync(99, dto, 1), Times.Once);
        }

        [Fact]
        public async Task EliminarPromocionAsync_DeberiaLlamarAlRepo()
        {
            await _service.EliminarPromocionAsync(99);
            _repoMock.Verify(r => r.EliminarAsync(99, 1), Times.Once);
        }
    }
}
