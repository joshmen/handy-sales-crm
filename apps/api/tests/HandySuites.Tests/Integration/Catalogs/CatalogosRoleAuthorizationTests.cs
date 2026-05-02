using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Integration.Catalogs;

/// <summary>
/// Valida que las mutaciones (POST/PUT/DELETE/PATCH) en catálogos de
/// categorías y familias requieran rol ADMIN o SUPER_ADMIN. Antes del fix
/// P1-3 (May 2026), estos endpoints solo usaban .RequireAuthorization() sin
/// role filter, permitiendo escalación de privilegios desde VENDEDOR.
/// </summary>
public class CatalogosRoleAuthorizationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _vendedorClient;
    private readonly HttpClient _viewerClient;
    private readonly HttpClient _adminClient;

    public CatalogosRoleAuthorizationTests(CustomWebApplicationFactory factory)
    {
        _vendedorClient = factory.CreateClient();
        _vendedorClient.DefaultRequestHeaders.Add("X-Test-Role", "VENDEDOR");

        _viewerClient = factory.CreateClient();
        _viewerClient.DefaultRequestHeaders.Add("X-Test-Role", "VIEWER");

        _adminClient = factory.CreateClient(); // default role = ADMIN
    }

    // ──────────────────────────────────────────────────────────
    // CategoriaCliente
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostCategoriaCliente_AsVendedor_Returns403()
    {
        var dto = new { nombre = "Test Cat", descripcion = "" };
        var response = await _vendedorClient.PostAsJsonAsync("/categorias-clientes", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostCategoriaCliente_AsViewer_Returns403()
    {
        var dto = new { nombre = "Test Cat", descripcion = "" };
        var response = await _viewerClient.PostAsJsonAsync("/categorias-clientes", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PutCategoriaCliente_AsVendedor_Returns403()
    {
        var dto = new { nombre = "Edit", descripcion = "" };
        var response = await _vendedorClient.PutAsJsonAsync("/categorias-clientes/1", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteCategoriaCliente_AsVendedor_Returns403()
    {
        var response = await _vendedorClient.DeleteAsync("/categorias-clientes/1");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PatchCategoriaClienteActivo_AsVendedor_Returns403()
    {
        var dto = new { activo = false };
        var response = await _vendedorClient.PatchAsJsonAsync("/categorias-clientes/1/activo", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task BatchToggleCategoriaCliente_AsVendedor_Returns403()
    {
        var dto = new { ids = new[] { 1 }, activo = false };
        var response = await _vendedorClient.PatchAsJsonAsync("/categorias-clientes/batch-toggle", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ──────────────────────────────────────────────────────────
    // CategoriaProducto
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostCategoriaProducto_AsVendedor_Returns403()
    {
        var dto = new { nombre = "Test Cat Prod", descripcion = "" };
        var response = await _vendedorClient.PostAsJsonAsync("/categorias-productos", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PutCategoriaProducto_AsVendedor_Returns403()
    {
        var dto = new { nombre = "Edit", descripcion = "" };
        var response = await _vendedorClient.PutAsJsonAsync("/categorias-productos/1", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteCategoriaProducto_AsVendedor_Returns403()
    {
        var response = await _vendedorClient.DeleteAsync("/categorias-productos/1");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PatchCategoriaProductoActivo_AsVendedor_Returns403()
    {
        var dto = new { activo = false };
        var response = await _vendedorClient.PatchAsJsonAsync("/categorias-productos/1/activo", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task BatchToggleCategoriaProducto_AsVendedor_Returns403()
    {
        var dto = new { ids = new[] { 1 }, activo = false };
        var response = await _vendedorClient.PatchAsJsonAsync("/categorias-productos/batch-toggle", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ──────────────────────────────────────────────────────────
    // FamiliasProducto
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PostFamiliaProducto_AsVendedor_Returns403()
    {
        var dto = new { nombre = "Test Familia", descripcion = "" };
        var response = await _vendedorClient.PostAsJsonAsync("/familias-productos", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PutFamiliaProducto_AsVendedor_Returns403()
    {
        var dto = new { nombre = "Edit", descripcion = "" };
        var response = await _vendedorClient.PutAsJsonAsync("/familias-productos/1", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteFamiliaProducto_AsVendedor_Returns403()
    {
        var response = await _vendedorClient.DeleteAsync("/familias-productos/1");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PatchFamiliaProductoActivo_AsVendedor_Returns403()
    {
        var dto = new { activo = false };
        var response = await _vendedorClient.PatchAsJsonAsync("/familias-productos/1/activo", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task BatchToggleFamiliaProducto_AsVendedor_Returns403()
    {
        var dto = new { ids = new[] { 1 }, activo = false };
        var response = await _vendedorClient.PatchAsJsonAsync("/familias-productos/batch-toggle", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ──────────────────────────────────────────────────────────
    // Smoke check: GET endpoints siguen funcionando para cualquier auth
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetCategoriasCliente_AsVendedor_Returns200()
    {
        var response = await _vendedorClient.GetAsync("/categorias-clientes");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetCategoriasProducto_AsVendedor_Returns200()
    {
        var response = await _vendedorClient.GetAsync("/categorias-productos");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetFamiliasProducto_AsVendedor_Returns200()
    {
        var response = await _vendedorClient.GetAsync("/familias-productos");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
