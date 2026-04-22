using Xunit;
using Moq;
using FluentAssertions;
using HandySuites.Application.Promociones.DTOs;
using HandySuites.Application.Promociones.Interfaces;
using HandySuites.Application.Promociones.Services;
using HandySuites.Shared.Multitenancy;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HandySuites.Tests.Application.Promociones
{
    public class PromocionServiceTests
    {
        private readonly Mock<IPromocionRepository> _repoMock = new();
        private readonly Mock<ICurrentTenant> _tenantMock = new();
        private readonly PromocionService _service;

        public PromocionServiceTests()
        {
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            // Default: todos los productos existen; vacío = nada faltante.
            _repoMock.Setup(r => r.ObtenerProductosFaltantesAsync(It.IsAny<List<int>>(), It.IsAny<int>()))
                .ReturnsAsync(new List<int>());
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
            var dto = new PromocionCreateDto
            {
                Nombre = "Promo",
                ProductoIds = new List<int> { 1 },
                Descripcion = "Descripcion",
                DescuentoPorcentaje = 10,
                FechaInicio = DateTime.Now,
                FechaFin = DateTime.Now.AddYears(2)
            };

            _repoMock.Setup(r => r.ExisteNombreAsync(dto.Nombre, 1, null)).ReturnsAsync(false);
            _repoMock.Setup(r => r.ObtenerPromocionesConProductoAsync(1, 1, null)).ReturnsAsync(new List<PromocionDto>());
            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(1);

            await _service.CrearPromocionAsync(dto);
            _repoMock.Verify(r => r.CrearAsync(dto, 1), Times.Once);
        }

        [Fact]
        public async Task ActualizarPromocionAsync_DeberiaLlamarAlRepo()
        {
            var dto = new PromocionCreateDto
            {
                Nombre = "Promo",
                ProductoIds = new List<int> { 1 },
                Descripcion = "Descripcion",
                DescuentoPorcentaje = 10,
                FechaInicio = DateTime.Now,
                FechaFin = DateTime.Now.AddYears(2)
            };

            _repoMock.Setup(r => r.ExisteNombreAsync(dto.Nombre, 1, 99)).ReturnsAsync(false);
            _repoMock.Setup(r => r.ObtenerPromocionesConProductoAsync(1, 1, 99)).ReturnsAsync(new List<PromocionDto>());
            _repoMock.Setup(r => r.ActualizarAsync(99, dto, 1)).ReturnsAsync(true);

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
