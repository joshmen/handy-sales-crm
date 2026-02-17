using HandySales.Application.Inventario.DTOs;
using HandySales.Application.Inventario.Interfaces;
using HandySales.Application.Inventario.Services;
using HandySales.Application.Productos.DTOs;
using HandySales.Application.Productos.Interfaces;
using HandySales.Application.Productos.Services;
using HandySales.Shared.Multitenancy;
using Moq;

namespace HandySales.Mobile.Tests.Endpoints;

public class MobileProductoEndpointsTests
{
    private readonly Mock<IProductoRepository> _productoRepoMock;
    private readonly Mock<IInventarioRepository> _inventarioRepoMock;
    private readonly Mock<ICurrentTenant> _tenantMock;
    private readonly ProductoService _productoService;
    private readonly InventarioService _inventarioService;
    private readonly List<ProductoDto> _testProductos;
    private readonly List<InventarioDto> _testInventarios;

    public MobileProductoEndpointsTests()
    {
        _productoRepoMock = new Mock<IProductoRepository>();
        _inventarioRepoMock = new Mock<IInventarioRepository>();
        _tenantMock = new Mock<ICurrentTenant>();
        _tenantMock.Setup(t => t.TenantId).Returns(1);

        _productoService = new ProductoService(_productoRepoMock.Object, _tenantMock.Object);
        _inventarioService = new InventarioService(_inventarioRepoMock.Object, _tenantMock.Object);

        _testProductos = new List<ProductoDto>
        {
            new()
            {
                Id = 1,
                Nombre = "Coca Cola 600ml",
                Descripcion = "Refresco de cola",
                CodigoBarra = "7501055300051",
                CategoraId = 1,
                FamiliaId = 1,
                UnidadMedidaId = 1,
                PrecioBase = 18.50m,
                Activo = true
            },
            new()
            {
                Id = 2,
                Nombre = "Pepsi 600ml",
                Descripcion = "Refresco de cola",
                CodigoBarra = "7501031311309",
                CategoraId = 1,
                FamiliaId = 1,
                UnidadMedidaId = 1,
                PrecioBase = 17.00m,
                Activo = true
            },
            new()
            {
                Id = 3,
                Nombre = "Sabritas Original",
                Descripcion = "Papas fritas",
                CodigoBarra = "7501011170001",
                CategoraId = 2,
                FamiliaId = 0,
                UnidadMedidaId = 1,
                PrecioBase = 25.00m,
                Activo = true
            },
            new()
            {
                Id = 4,
                Nombre = "Agua Bonafont 1L",
                Descripcion = "Agua natural",
                CodigoBarra = "7501086801251",
                CategoraId = 1,
                FamiliaId = 0,
                UnidadMedidaId = 1,
                PrecioBase = 12.00m,
                Activo = true
            }
        };

        _testInventarios = new List<InventarioDto>
        {
            new() { ProductoId = 1, CantidadActual = 100, StockMinimo = 10, StockMaximo = 200 },
            new() { ProductoId = 2, CantidadActual = 5, StockMinimo = 10, StockMaximo = 200 },
            new() { ProductoId = 3, CantidadActual = 0, StockMinimo = 5, StockMaximo = 100 }
        };
    }

    [Fact]
    public async Task ObtenerProductosAsync_ReturnsAllProducts()
    {
        // Arrange
        _productoRepoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testProductos);

        // Act
        var productos = await _productoService.ObtenerProductosAsync();

        // Assert
        productos.Should().HaveCount(4);
    }

    [Fact]
    public async Task ObtenerProductosAsync_FilterByBusqueda_ReturnsMatchingProducts()
    {
        // Arrange
        var busqueda = "coca";
        _productoRepoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testProductos);

        // Act
        var productos = await _productoService.ObtenerProductosAsync();
        var filtrados = productos.Where(p =>
            p.Nombre.ToLower().Contains(busqueda.ToLower())).ToList();

        // Assert
        filtrados.Should().HaveCount(1);
        filtrados.First().Nombre.Should().Be("Coca Cola 600ml");
    }

    [Fact]
    public async Task ObtenerProductosAsync_FilterByCategoria_ReturnsProductsInCategory()
    {
        // Arrange
        var categoriaId = 1;
        _productoRepoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testProductos);

        // Act
        var productos = await _productoService.ObtenerProductosAsync();
        var filtrados = productos.Where(p => p.CategoraId == categoriaId).ToList();

        // Assert
        filtrados.Should().HaveCount(3);
    }

    [Fact]
    public async Task ObtenerProductosAsync_FilterByFamilia_ReturnsProductsInFamily()
    {
        // Arrange
        var familiaId = 1;
        _productoRepoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testProductos);

        // Act
        var productos = await _productoService.ObtenerProductosAsync();
        var filtrados = productos.Where(p => p.FamiliaId == familiaId).ToList();

        // Assert
        filtrados.Should().HaveCount(2);
    }

    [Fact]
    public async Task ObtenerProductosAsync_Pagination_ReturnsCorrectPage()
    {
        // Arrange
        var pagina = 1;
        var porPagina = 2;
        _productoRepoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testProductos);

        // Act
        var productos = await _productoService.ObtenerProductosAsync();
        var paginados = productos
            .Skip((pagina - 1) * porPagina)
            .Take(porPagina)
            .ToList();

        // Assert
        paginados.Should().HaveCount(2);
    }

    [Fact]
    public async Task ObtenerPorIdAsync_ReturnsProduct_WhenExists()
    {
        // Arrange
        _productoRepoMock.Setup(r => r.ObtenerPorIdAsync(1, 1))
            .ReturnsAsync(_testProductos.First());

        // Act
        var producto = await _productoService.ObtenerPorIdAsync(1);

        // Assert
        producto.Should().NotBeNull();
        producto!.Id.Should().Be(1);
        producto.Nombre.Should().Be("Coca Cola 600ml");
    }

    [Fact]
    public async Task ObtenerPorIdAsync_ReturnsNull_WhenNotExists()
    {
        // Arrange
        _productoRepoMock.Setup(r => r.ObtenerPorIdAsync(999, 1))
            .ReturnsAsync((ProductoDto?)null);

        // Act
        var producto = await _productoService.ObtenerPorIdAsync(999);

        // Assert
        producto.Should().BeNull();
    }

    [Fact]
    public async Task ObtenerPorProductoIdAsync_ReturnsStock_WhenExists()
    {
        // Arrange
        _inventarioRepoMock.Setup(r => r.ObtenerPorProductoIdAsync(1, 1))
            .ReturnsAsync(_testInventarios.First());

        // Act
        var inventario = await _inventarioService.ObtenerPorProductoIdAsync(1);

        // Assert
        inventario.Should().NotBeNull();
        inventario!.CantidadActual.Should().Be(100);
        inventario.StockMinimo.Should().Be(10);
    }

    [Fact]
    public async Task ObtenerPorProductoIdAsync_ReturnsNull_WhenNoInventory()
    {
        // Arrange
        _inventarioRepoMock.Setup(r => r.ObtenerPorProductoIdAsync(4, 1))
            .ReturnsAsync((InventarioDto?)null);

        // Act
        var inventario = await _inventarioService.ObtenerPorProductoIdAsync(4);

        // Assert
        inventario.Should().BeNull();
    }

    [Fact]
    public async Task Stock_ShowsEnAlerta_WhenBelowMinimum()
    {
        // Arrange
        var inventarioConBajoStock = _testInventarios[1];
        _inventarioRepoMock.Setup(r => r.ObtenerPorProductoIdAsync(2, 1))
            .ReturnsAsync(inventarioConBajoStock);

        // Act
        var inventario = await _inventarioService.ObtenerPorProductoIdAsync(2);

        // Assert
        inventario.Should().NotBeNull();
        inventario!.CantidadActual.Should().BeLessThanOrEqualTo(inventario.StockMinimo);
    }

    [Fact]
    public async Task Stock_ShowsNoDisponible_WhenZeroStock()
    {
        // Arrange
        var inventarioSinStock = _testInventarios[2];
        _inventarioRepoMock.Setup(r => r.ObtenerPorProductoIdAsync(3, 1))
            .ReturnsAsync(inventarioSinStock);

        // Act
        var inventario = await _inventarioService.ObtenerPorProductoIdAsync(3);

        // Assert
        inventario.Should().NotBeNull();
        inventario!.CantidadActual.Should().Be(0);
    }

    [Fact]
    public async Task SearchByCodigoBarra_ReturnsProduct_WhenExists()
    {
        // Arrange
        var codigo = "7501055300051";
        _productoRepoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testProductos);

        // Act
        var productos = await _productoService.ObtenerProductosAsync();
        var producto = productos.FirstOrDefault(p =>
            p.CodigoBarra.Equals(codigo, StringComparison.OrdinalIgnoreCase));

        // Assert
        producto.Should().NotBeNull();
        producto!.Nombre.Should().Be("Coca Cola 600ml");
    }

    [Fact]
    public async Task SearchByCodigoBarra_ReturnsNull_WhenNotExists()
    {
        // Arrange
        var codigo = "0000000000000";
        _productoRepoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testProductos);

        // Act
        var productos = await _productoService.ObtenerProductosAsync();
        var producto = productos.FirstOrDefault(p =>
            p.CodigoBarra.Equals(codigo, StringComparison.OrdinalIgnoreCase));

        // Assert
        producto.Should().BeNull();
    }

    [Fact]
    public async Task SearchByDescripcion_ReturnsMatchingProducts()
    {
        // Arrange
        var busqueda = "refresco de cola";
        _productoRepoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testProductos);

        // Act
        var productos = await _productoService.ObtenerProductosAsync();
        var filtrados = productos.Where(p =>
            p.Descripcion.ToLower().Contains(busqueda.ToLower())).ToList();

        // Assert
        filtrados.Should().HaveCount(2);
    }

    [Fact]
    public async Task ObtenerPorFiltroAsync_ReturnsPaginatedResults()
    {
        // Arrange
        var filtro = new ProductoFiltroDto
        {
            CategoriaId = 1,
            Pagina = 1,
            TamanoPagina = 10
        };
        var expectedResult = new ProductoPaginatedResult
        {
            Items = _testProductos
                .Where(p => p.CategoraId == 1)
                .Select(p => new ProductoListaDto
                {
                    Id = p.Id,
                    Nombre = p.Nombre,
                    CodigoBarra = p.CodigoBarra,
                    Descripcion = p.Descripcion,
                    PrecioBase = p.PrecioBase,
                    Activo = p.Activo
                }).ToList(),
            TotalItems = 3,
            Pagina = 1,
            TamanoPagina = 10
        };
        _productoRepoMock.Setup(r => r.ObtenerPorFiltroAsync(filtro, 1))
            .ReturnsAsync(expectedResult);

        // Act
        var result = await _productoService.ObtenerPorFiltroAsync(filtro);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(3);
        result.TotalItems.Should().Be(3);
    }
}
