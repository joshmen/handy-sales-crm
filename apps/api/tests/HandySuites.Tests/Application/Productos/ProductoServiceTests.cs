using Xunit;
using Moq;
using System.Collections.Generic;
using System.Threading.Tasks;
using HandySuites.Application.Productos.DTOs;
using HandySuites.Application.Productos.Interfaces;
using HandySuites.Application.Productos.Services;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Tests.Application.Productos
{
    public class ProductoServiceTests
    {
        private readonly Mock<IProductoRepository> _repoMock;
        private readonly Mock<ICurrentTenant> _tenantMock;
        private readonly ProductoService _service;

        public ProductoServiceTests()
        {
            _repoMock = new Mock<IProductoRepository>();
            _tenantMock = new Mock<ICurrentTenant>();
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            // FKs válidas por defecto para que las operaciones no-happy pasen el pre-check.
            _repoMock.Setup(r => r.ExisteFamiliaAsync(It.IsAny<int>(), It.IsAny<int>())).ReturnsAsync(true);
            _repoMock.Setup(r => r.ExisteCategoriaAsync(It.IsAny<int>(), It.IsAny<int>())).ReturnsAsync(true);
            _repoMock.Setup(r => r.ExisteUnidadMedidaAsync(It.IsAny<int>())).ReturnsAsync(true);

            _service = new ProductoService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerProductosAsync_DeberiaRetornarLista()
        {
            var productos = new List<ProductoDto>
            {
                new ProductoDto { Id = 1, Nombre = "Prod1", CodigoBarra = "123", Descripcion = "Desc", PrecioBase = 10 },
                new ProductoDto { Id = 2, Nombre = "Prod2", CodigoBarra = "456", Descripcion = "Desc2", PrecioBase = 20 }
            };

            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1)).ReturnsAsync(productos);

            var result = await _service.ObtenerProductosAsync();

            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
        }

        [Fact]
        public async Task CrearProductoAsync_DeberiaRetornarNuevoId()
        {
            var dto = new ProductoCreateDto
            {
                Nombre = "Nuevo",
                CodigoBarra = "789",
                Descripcion = "Nuevo Producto",
                PrecioBase = 15
            };

            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(99);

            var id = await _service.CrearProductoAsync(dto);

            Assert.Equal(99, id);
        }
    }
}
