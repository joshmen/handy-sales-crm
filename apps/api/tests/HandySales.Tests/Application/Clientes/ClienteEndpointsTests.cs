
using System.Net;
using System.Net.Http.Json;
using HandySales.Application.Clientes.DTOs;
using Xunit;

namespace HandySales.Tests.Integration.Clientes;

public class ClienteEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ClienteEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostCliente_DeberiaCrearCliente()
    {
        var dto = new ClienteCreateDto
        {
            TenandId = 1,
            Nombre = "Cliente Test",
            RFC = "TEST123456XX0",
            Correo = "cliente@test.com",
            Telefono = "5551234567",
            Direccion = "Calle Falsa 123",
            IdZona = 1,
            CategoriaClienteId = 1
        };

        var response = await _client.PostAsJsonAsync("/clientes", dto);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.True(result!.ContainsKey("id"));
    }

    [Fact]
    public async Task GetClientes_DeberiaRetornarLista()
    {
        var response = await _client.GetAsync("/clientes?Pagina=1&TamanoPagina=20");
        response.EnsureSuccessStatusCode();

        var resultado = await response.Content.ReadFromJsonAsync<ClientePaginatedResult>();
        Assert.NotNull(resultado);
        Assert.NotNull(resultado.Items);
    }

    [Fact]
    public async Task GetCliente_DeberiaRetornarClientePorId()
    {
        var response = await _client.GetAsync("/clientes/1");
        if (response.StatusCode == HttpStatusCode.NotFound) return;
        response.EnsureSuccessStatusCode();

        var cliente = await response.Content.ReadFromJsonAsync<ClienteDto>();
        Assert.Equal(1, cliente!.Id);
    }

    [Fact]
    public async Task PutCliente_DeberiaActualizarClienteExistente()
    {
        var dto = new ClienteCreateDto
        {
            Nombre = "Cliente Actualizado",
            RFC = "MOD456789XY1",
            Correo = "nuevo@cliente.com",
            Telefono = "5567891234",
            Direccion = "Av Nueva 456",
            CategoriaClienteId = 1,
            IdZona = 1
        };

        var response = await _client.PutAsJsonAsync("/clientes/1", dto);
        if (response.StatusCode == HttpStatusCode.NotFound) return;
        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task DeleteCliente_DeberiaEliminarClienteExistente()
    {
        var response = await _client.DeleteAsync("/clientes/1");
        if (response.StatusCode == HttpStatusCode.NotFound) return;
        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task PostCliente_DeberiaRetornarBadRequestSiFaltanCampos()
    {
        var dto = new ClienteCreateDto { Nombre = "", RFC = "", Correo = "", Telefono = "", Direccion = "" }; // Vacío/inválido
        var response = await _client.PostAsJsonAsync("/clientes", dto);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PutCliente_DeberiaRetornarNotFoundSiNoExiste()
    {
        var dto = new ClienteCreateDto
        {
            Nombre = "Fantasma",
            RFC = "NOEX123456",
            Correo = "no@existe.com",
            Telefono = "0000000000",
            Direccion = "Ahorahere",
            CategoriaClienteId = 1,
            IdZona = 1
        };

        var response = await _client.PutAsJsonAsync("/clientes/9999", dto);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteCliente_DeberiaRetornarNotFoundSiNoExiste()
    {
        var response = await _client.DeleteAsync("/clientes/9999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
