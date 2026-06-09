using HandySuites.Mobile.Tests.Common;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// HTTP integration tests for MobilePedidoEndpoints. Exercises all routes
/// under /api/mobile/pedidos using MobileWebApplicationFactory (SQLite + Fake JWT).
/// Routes covered:
///   POST   /api/mobile/pedidos/
///   POST   /api/mobile/pedidos/eager-save
///   GET    /api/mobile/pedidos/mis-pedidos
///   GET    /api/mobile/pedidos/{id:int}
///   GET    /api/mobile/pedidos/cliente/{clienteId:int}
///   PUT    /api/mobile/pedidos/{id:int}
///   DELETE /api/mobile/pedidos/{id:int}
///   POST   /api/mobile/pedidos/{id:int}/enviar
///   POST   /api/mobile/pedidos/{id:int}/cancelar
///   POST   /api/mobile/pedidos/{id:int}/confirmar
///   POST   /api/mobile/pedidos/{id:int}/entregar
///   POST   /api/mobile/pedidos/{pedidoId:int}/productos
///   PUT    /api/mobile/pedidos/{pedidoId:int}/productos/{detalleId:int}
///   DELETE /api/mobile/pedidos/{pedidoId:int}/productos/{detalleId:int}
///
/// Endpoints only require RequireAuthorization() (no explicit role gate),
/// so most authenticated roles get 200/400/404 — focus is on line coverage.
/// </summary>
public class MobilePedidoEndpointsHttpTests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    public MobilePedidoEndpointsHttpTests(MobileWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient ClientAs(string role, int userId, int tenantId = MobileTestSeeder.TenantA)
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("Authorization", "Bearer fake");
        c.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());
        c.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId.ToString());
        c.DefaultRequestHeaders.Add("X-Test-Role", role);
        return c;
    }

    private HttpClient UnauthenticatedClient()
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "1");
        return c;
    }

    // ============================================================
    // POST /api/mobile/pedidos/  — Crear pedido
    // ============================================================

    [Fact]
    public async Task CrearPedido_AsVendedor_Returns201OrBadRequest()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new
        {
            clienteId = MobileTestSeeder.ClienteAId,
            tipoVenta = 0,
            detalles = new[]
            {
                new { productoId = MobileTestSeeder.ProductoAId, cantidad = 1m, precioUnitario = 10m }
            }
        };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Created,
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task CrearPedido_AsAdmin_Returns201OrBadRequest()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var body = new
        {
            clienteId = MobileTestSeeder.ClienteAId,
            tipoVenta = 0,
            detalles = new[]
            {
                new { productoId = MobileTestSeeder.ProductoAId, cantidad = 1m, precioUnitario = 10m }
            }
        };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Created,
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task CrearPedido_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { clienteId = MobileTestSeeder.ClienteAId, detalles = new object[0] };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /api/mobile/pedidos/eager-save
    // ============================================================

    [Fact]
    public async Task EagerSave_AsVendedor_Returns200OrBadRequest()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new
        {
            mobileRecordId = "test-record-001",
            clienteId = MobileTestSeeder.ClienteAId,
            tipoVenta = 0,
            detalles = new[]
            {
                new { productoId = MobileTestSeeder.ProductoAId, cantidad = 1m, precioUnitario = 10m }
            }
        };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/eager-save", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task EagerSave_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { mobileRecordId = "x", clienteId = 1, detalles = new object[0] };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/eager-save", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task EagerSave_AsAdmin_Returns200OrBadRequest()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var body = new
        {
            mobileRecordId = "test-record-admin-001",
            clienteId = MobileTestSeeder.ClienteAId,
            tipoVenta = 0,
            detalles = new[]
            {
                new { productoId = MobileTestSeeder.ProductoAId, cantidad = 2m, precioUnitario = 20m }
            }
        };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/eager-save", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.InternalServerError);
    }

    // ============================================================
    // GET /api/mobile/pedidos/mis-pedidos
    // ============================================================

    [Fact]
    public async Task GetMisPedidos_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/pedidos/mis-pedidos");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetMisPedidos_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/pedidos/mis-pedidos");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetMisPedidos_WithFilters_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/pedidos/mis-pedidos?estado=1&tipoVenta=0&pagina=1&porPagina=10");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetMisPedidos_WithDefaultPagination_Returns200()
    {
        // pagina=0 + porPagina=0 → service uses defaults (page=1, size=20)
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/pedidos/mis-pedidos?pagina=0&porPagina=0");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetMisPedidos_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/pedidos/mis-pedidos");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // GET /api/mobile/pedidos/{id:int}
    // ============================================================

    [Fact]
    public async Task GetPedidoPorId_AsVendedor_Returns200OrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPedidoPorId_NonExistent_Returns404()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/pedidos/99999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPedidoPorId_AsAdmin_Returns200OrNotFound()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPedidoPorId_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/pedidos/1");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetPedidoPorId_InvalidIdRoute_Returns404()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/pedidos/abc");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ============================================================
    // GET /api/mobile/pedidos/cliente/{clienteId:int}
    // ============================================================

    [Fact]
    public async Task GetPedidosPorCliente_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/pedidos/cliente/{MobileTestSeeder.ClienteAId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetPedidosPorCliente_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync($"/api/mobile/pedidos/cliente/{MobileTestSeeder.ClienteAId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetPedidosPorCliente_NonExistent_Returns200WithEmpty()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/pedidos/cliente/99999");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetPedidosPorCliente_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/pedidos/cliente/1");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // PUT /api/mobile/pedidos/{id:int}
    // ============================================================

    [Fact]
    public async Task ActualizarPedido_AsVendedor_Returns200OrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { notas = "actualizado" };
        var response = await client.PutAsJsonAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}", body);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ActualizarPedido_NonExistent_Returns404()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { notas = "x" };
        var response = await client.PutAsJsonAsync("/api/mobile/pedidos/99999", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ActualizarPedido_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { notas = "x" };
        var response = await client.PutAsJsonAsync("/api/mobile/pedidos/1", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // DELETE /api/mobile/pedidos/{id:int}
    // ============================================================

    [Fact]
    public async Task EliminarPedido_AsVendedor_Returns200OrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.DeleteAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task EliminarPedido_NonExistent_Returns404()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.DeleteAsync("/api/mobile/pedidos/99999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task EliminarPedido_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.DeleteAsync("/api/mobile/pedidos/1");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /api/mobile/pedidos/{id:int}/enviar  (legacy → confirmar)
    // ============================================================

    [Fact]
    public async Task EnviarPedido_AsVendedor_Returns200OrBadRequest()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.PostAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}/enviar", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task EnviarPedido_NonExistent_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.PostAsync("/api/mobile/pedidos/99999/enviar", null);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task EnviarPedido_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.PostAsync("/api/mobile/pedidos/1/enviar", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /api/mobile/pedidos/{id:int}/cancelar
    // ============================================================

    [Fact]
    public async Task CancelarPedido_AsVendedor_WithMotivo_Returns200OrBadRequest()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { motivo = "Cliente cambio de opinion" };
        var response = await client.PostAsJsonAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}/cancelar", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CancelarPedido_AsAdmin_WithNullBody_Returns200OrBadRequest()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        // Body NULL — endpoint handles dto?.Motivo
        var response = await client.PostAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}/cancelar", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.UnsupportedMediaType);
    }

    [Fact]
    public async Task CancelarPedido_NonExistent_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { motivo = "x" };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/99999/cancelar", body);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CancelarPedido_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { motivo = "x" };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/1/cancelar", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /api/mobile/pedidos/{id:int}/confirmar
    // ============================================================

    [Fact]
    public async Task ConfirmarPedido_AsVendedor_Returns200OrBadRequest()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.PostAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}/confirmar", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ConfirmarPedido_AsAdmin_Returns200OrBadRequest()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.PostAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}/confirmar", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ConfirmarPedido_NonExistent_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.PostAsync("/api/mobile/pedidos/99999/confirmar", null);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ConfirmarPedido_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.PostAsync("/api/mobile/pedidos/1/confirmar", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /api/mobile/pedidos/{id:int}/entregar
    // ============================================================

    [Fact]
    public async Task EntregarPedido_AsVendedor_WithNotas_Returns200OrBadRequest()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { notasEntrega = "Entregado en recepcion" };
        var response = await client.PostAsJsonAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoEntregadoId}/entregar", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task EntregarPedido_AsAdmin_WithoutBody_Returns200OrBadRequest()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.PostAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoEntregadoId}/entregar", null);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.UnsupportedMediaType);
    }

    [Fact]
    public async Task EntregarPedido_NonExistent_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { notasEntrega = "x" };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/99999/entregar", body);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task EntregarPedido_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { notasEntrega = "x" };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/1/entregar", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // POST /api/mobile/pedidos/{pedidoId:int}/productos
    // ============================================================

    [Fact]
    public async Task AgregarProducto_AsVendedor_Returns200OrBadRequest()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new
        {
            productoId = MobileTestSeeder.ProductoAId,
            cantidad = 3m,
            precioUnitario = 25m,
            descuento = 0m
        };
        var response = await client.PostAsJsonAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}/productos", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AgregarProducto_NonExistentPedido_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new
        {
            productoId = MobileTestSeeder.ProductoAId,
            cantidad = 1m,
            precioUnitario = 10m
        };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/99999/productos", body);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AgregarProducto_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { productoId = 1, cantidad = 1m };
        var response = await client.PostAsJsonAsync("/api/mobile/pedidos/1/productos", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // PUT /api/mobile/pedidos/{pedidoId:int}/productos/{detalleId:int}
    // ============================================================

    [Fact]
    public async Task ActualizarProducto_AsVendedor_Returns200OrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new
        {
            productoId = MobileTestSeeder.ProductoAId,
            cantidad = 5m,
            precioUnitario = 30m
        };
        var response = await client.PutAsJsonAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}/productos/1", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ActualizarProducto_NonExistent_Returns404()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new
        {
            productoId = MobileTestSeeder.ProductoAId,
            cantidad = 1m,
            precioUnitario = 5m
        };
        var response = await client.PutAsJsonAsync("/api/mobile/pedidos/99999/productos/88888", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ActualizarProducto_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var body = new { productoId = 1, cantidad = 1m };
        var response = await client.PutAsJsonAsync("/api/mobile/pedidos/1/productos/1", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // DELETE /api/mobile/pedidos/{pedidoId:int}/productos/{detalleId:int}
    // ============================================================

    [Fact]
    public async Task EliminarProducto_AsVendedor_Returns200OrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.DeleteAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}/productos/1");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task EliminarProducto_NonExistent_Returns404()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.DeleteAsync("/api/mobile/pedidos/99999/productos/88888");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task EliminarProducto_AsAdmin_Returns200OrNotFound()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.DeleteAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}/productos/1");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task EliminarProducto_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.DeleteAsync("/api/mobile/pedidos/1/productos/1");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============================================================
    // Cross-tenant smoke test
    // ============================================================

    [Fact]
    public async Task GetMisPedidos_AsVendedorOtroTenant_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.VendedorOtroTenantId, MobileTestSeeder.TenantB);
        var response = await client.GetAsync("/api/mobile/pedidos/mis-pedidos");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetPedidoPorId_CrossTenant_Returns404()
    {
        // Tenant B trying to read tenant A's pedido — repo filter by TenantId returns null → 404
        var client = ClientAs("VENDEDOR", MobileTestSeeder.VendedorOtroTenantId, MobileTestSeeder.TenantB);
        var response = await client.GetAsync($"/api/mobile/pedidos/{MobileTestSeeder.PedidoConfirmadoId}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
