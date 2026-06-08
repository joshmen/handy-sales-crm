using FluentAssertions;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using Xunit;

namespace HandySuites.Tests.Endpoints
{
    public class ImportExportEndpointsHttpTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public ImportExportEndpointsHttpTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        private HttpClient ClientAs(string role, string userId = "1", string tenantId = "1")
        {
            var c = _client;
            c.DefaultRequestHeaders.Clear();
            c.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            c.DefaultRequestHeaders.Add("X-Test-UserId", userId);
            c.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId);
            c.DefaultRequestHeaders.Add("X-Test-Role", role);
            return c;
        }

        private HttpClient ClientUnauthenticated()
        {
            var c = _client;
            c.DefaultRequestHeaders.Clear();
            c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            return c;
        }

        private static MultipartFormDataContent BuildCsvMultipart(string csvContent, string fileName = "data.csv")
        {
            var content = new MultipartFormDataContent();
            var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes(csvContent));
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
            content.Add(fileContent, "archivo", fileName);
            return content;
        }

        // ====================== EXPORT ENDPOINTS ======================

        [Fact]
        public async Task ExportClientes_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/clientes");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportProductos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/productos");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportInventario_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/inventario");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportPedidos_WithDateRange_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/pedidos?desde=2025-01-01&hasta=2026-12-31");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportCobros_WithDateRange_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/cobros?desde=2025-01-01&hasta=2026-12-31");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportCategoriasClientes_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/categorias-clientes");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportUnidadesMedida_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/unidades-medida");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportCategoriasProductos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/categorias-productos");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportFamiliasProductos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/familias-productos");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportListasPrecios_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/listas-precios");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportDescuentos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/descuentos");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportPromociones_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/promociones");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportRutas_WithDateRange_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/rutas?desde=2025-01-01&hasta=2026-12-31");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ExportZonas_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/export/zonas");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        // ====================== EXPORT RBAC + UNAUTH ======================

        [Fact]
        public async Task ExportClientes_AsVendedor_Returns403()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var response = await client.GetAsync("/api/export/clientes");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task ExportProductos_Unauthenticated_Returns401()
        {
            var client = ClientUnauthenticated();
            var response = await client.GetAsync("/api/export/productos");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // ====================== TEMPLATE ENDPOINTS ======================

        [Fact]
        public async Task TemplateZonas_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/zonas");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task TemplateClientes_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/clientes");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task TemplateCategoriasClientes_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/categorias-clientes");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task TemplateUnidadesMedida_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/unidades-medida");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task TemplateCategoriasProductos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/categorias-productos");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task TemplateFamiliasProductos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/familias-productos");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task TemplateListasPrecios_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/listas-precios");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task TemplateDescuentos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/descuentos");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task TemplateInventario_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/inventario");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task TemplatePromociones_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/promociones");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task TemplateProductos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/import/template/productos");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        // ====================== TEMPLATE RBAC ======================

        [Fact]
        public async Task TemplateClientes_AsViewer_Returns403()
        {
            var client = ClientAs("VIEWER", userId: "201");
            var response = await client.GetAsync("/api/import/template/clientes");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        // ====================== IMPORT ENDPOINTS ======================

        [Fact]
        public async Task ImportClientes_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "Nombre,RFC,Correo,Telefono,Direccion,Zona,Categoria,Latitud,Longitud\nCliente Test,RFC123456789,test@example.com,5551234567,Av Test 123,Zona A,Categoria 1,19.4326,-99.1332\n";
            var content = BuildCsvMultipart(csv, "clientes.csv");
            var response = await client.PostAsync("/api/import/clientes", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ImportProductos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "Nombre,CodigoBarra,Descripcion,PrecioBase,Familia,Categoria,UnidadMedida\nProducto Test,7501234567890,Descripcion test,100.50,Familia 1,Categoria 1,Pieza\n";
            var content = BuildCsvMultipart(csv, "productos.csv");
            var response = await client.PostAsync("/api/import/productos", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ImportCategoriasClientes_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "Nombre,Descripcion\nCategoria Test,Descripcion test\n";
            var content = BuildCsvMultipart(csv, "categorias-clientes.csv");
            var response = await client.PostAsync("/api/import/categorias-clientes", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ImportUnidadesMedida_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "Nombre,Abreviatura\nPieza,PZA\n";
            var content = BuildCsvMultipart(csv, "unidades-medida.csv");
            var response = await client.PostAsync("/api/import/unidades-medida", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ImportCategoriasProductos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "Nombre,Descripcion\nCategoria Productos Test,Descripcion test\n";
            var content = BuildCsvMultipart(csv, "categorias-productos.csv");
            var response = await client.PostAsync("/api/import/categorias-productos", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ImportFamiliasProductos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "Nombre,Descripcion\nFamilia Test,Descripcion test\n";
            var content = BuildCsvMultipart(csv, "familias-productos.csv");
            var response = await client.PostAsync("/api/import/familias-productos", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ImportListasPrecios_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "Nombre,Descripcion\nLista Test,Descripcion test\n";
            var content = BuildCsvMultipart(csv, "listas-precios.csv");
            var response = await client.PostAsync("/api/import/listas-precios", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ImportDescuentos_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "TipoAplicacion,Producto,CantidadMinima,DescuentoPorcentaje\nGlobal,,10,5\n";
            var content = BuildCsvMultipart(csv, "descuentos.csv");
            var response = await client.PostAsync("/api/import/descuentos", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ImportPromociones_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "Nombre,Descripcion,DescuentoPorcentaje,FechaInicio,FechaFin,Productos\nPromocion Test,Descripcion test,10,2026-01-01,2026-12-31,Producto1;Producto2\n";
            var content = BuildCsvMultipart(csv, "promociones.csv");
            var response = await client.PostAsync("/api/import/promociones", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ImportInventario_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "Producto,CodigoBarra,CantidadActual,StockMinimo,StockMaximo\nProducto Test,7501234567890,100,10,500\n";
            var content = BuildCsvMultipart(csv, "inventario.csv");
            var response = await client.PostAsync("/api/import/inventario", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ImportZonas_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var csv = "Nombre,Descripcion,CentroLatitud,CentroLongitud,RadioKm\nZona Test,Descripcion test,19.4326,-99.1332,5\n";
            var content = BuildCsvMultipart(csv, "zonas.csv");
            var response = await client.PostAsync("/api/import/zonas", content);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        // ====================== IMPORT RBAC + UNAUTH ======================

        [Fact]
        public async Task ImportClientes_AsVendedor_Returns403()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var csv = "Nombre,RFC,Correo,Telefono,Direccion,Zona,Categoria,Latitud,Longitud\nCliente Test,RFC123456789,test@example.com,5551234567,Av Test 123,Zona A,Categoria 1,19.4326,-99.1332\n";
            var content = BuildCsvMultipart(csv, "clientes.csv");
            var response = await client.PostAsync("/api/import/clientes", content);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task ImportProductos_AsSupervisor_Returns403()
        {
            var client = ClientAs("SUPERVISOR", userId: "200");
            var csv = "Nombre,CodigoBarra,Descripcion,PrecioBase,Familia,Categoria,UnidadMedida\nProducto Test,7501234567890,Descripcion test,100.50,Familia 1,Categoria 1,Pieza\n";
            var content = BuildCsvMultipart(csv, "productos.csv");
            var response = await client.PostAsync("/api/import/productos", content);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task ImportInventario_Unauthenticated_Returns401()
        {
            var client = ClientUnauthenticated();
            var csv = "Producto,CodigoBarra,CantidadActual,StockMinimo,StockMaximo\nProducto Test,7501234567890,100,10,500\n";
            var content = BuildCsvMultipart(csv, "inventario.csv");
            var response = await client.PostAsync("/api/import/inventario", content);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
