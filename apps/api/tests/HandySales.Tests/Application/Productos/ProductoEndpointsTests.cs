using System.Net.Http.Json;
using Xunit;
using HandySales.Application.Productos.DTOs;
using System.Net;

namespace HandySales.Tests.Integration.Productos
{
    public class ProductoEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public ProductoEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
            // var token = JwtTokenGenerator.GenerateToken();
            // _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }

        [Fact]
        public async Task PostProducto_DeberiaCrearProducto()
        {
            var dto = new ProductoCreateDto
            {
                Nombre = "Producto Test",
                CodigoBarra = "ABC123456",
                Descripcion = "Producto creado en test",
                PrecioBase = 123.45M,
                FamiliaId = 1,               // Debe existir
                CategoraId = 1,             // Debe existir
                UnidadMedidaId = 1           // Debe existir
            };

            var response = await _client.PostAsJsonAsync("/productos", dto);

            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
            Assert.True(body!.ContainsKey("id"));
        }

        [Fact]
        public async Task GetProductos_DeberiaRetornarLista()
        {
            var response = await _client.GetAsync("/productos?Pagina=1&TamanoPagina=20");
            response.EnsureSuccessStatusCode();

            var resultado = await response.Content.ReadFromJsonAsync<ProductoPaginatedResult>();
            Assert.NotNull(resultado);
            Assert.NotNull(resultado.Items);
            Assert.True(resultado!.Items.Count >= 0); // incluso si está vacía, pasa
        }

        [Fact]
        public async Task GetProducto_DeberiaRetornarProductoPorId()
        {
            var response = await _client.GetAsync("/productos/1");
            if (response.StatusCode == HttpStatusCode.NotFound) return; // aún no existe
            response.EnsureSuccessStatusCode();

            var producto = await response.Content.ReadFromJsonAsync<ProductoDto>();
            Assert.Equal(1, producto!.Id);
        }

        [Fact]
        public async Task PutProducto_DeberiaActualizarProductoExistente()
        {
            var dto = new ProductoCreateDto
            {
                Nombre = "Producto Actualizado",
                CodigoBarra = "XYZ987654",
                Descripcion = "Producto actualizado en test",
                PrecioBase = 150.00M,
                FamiliaId = 1,
                CategoraId = 1,
                UnidadMedidaId = 1
            };

            var response = await _client.PutAsJsonAsync("/productos/1", dto);
            if (response.StatusCode == HttpStatusCode.NotFound) return;
            response.EnsureSuccessStatusCode();
        }

        [Fact]
        public async Task DeleteProducto_DeberiaEliminarProductoExistente()
        {
            var response = await _client.DeleteAsync("/productos/1");
            if (response.StatusCode == HttpStatusCode.NotFound) return;
            response.EnsureSuccessStatusCode();
        }

        [Fact]
        public async Task PostProducto_DeberiaRetornarBadRequestSiFaltanCampos()
        {
            var dto = new ProductoCreateDto
            {
                Nombre = "",
                CodigoBarra = "",
                Descripcion = "",
                PrecioBase = 0
            };

            var response = await _client.PostAsJsonAsync("/productos", dto);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task PutProducto_DeberiaRetornarNotFoundSiNoExiste()
        {
            var dto = new ProductoCreateDto
            {
                Nombre = "NoExiste",
                CodigoBarra = "000",
                Descripcion = "Nada",
                PrecioBase = 10,
                FamiliaId = 1,
                CategoraId = 1,
                UnidadMedidaId = 1
            };

            var response = await _client.PutAsJsonAsync("/productos/9999", dto);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task DeleteProducto_DeberiaRetornarNotFoundSiNoExiste()
        {
            var response = await _client.DeleteAsync("/productos/9999");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
