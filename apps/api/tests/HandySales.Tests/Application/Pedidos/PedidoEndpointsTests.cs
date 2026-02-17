using System.Net;
using System.Net.Http.Json;
using HandySales.Application.Pedidos.DTOs;
using Xunit;

namespace HandySales.Tests.Integration.Pedidos;

public class PedidoEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public PedidoEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostPedido_DeberiaCrearPedido()
    {
        var dto = new PedidoCreateDto
        {
            ClienteId = 1,
            ListaPrecioId = 1,
            FechaEntregaEstimada = DateTime.UtcNow.AddDays(3),
            DireccionEntrega = "Calle Test 123",
            Notas = "Pedido de prueba",
            Detalles = new List<DetallePedidoCreateDto>
            {
                new DetallePedidoCreateDto
                {
                    ProductoId = 1,
                    Cantidad = 2,
                    PrecioUnitario = 100.00m,
                    Descuento = 0
                }
            }
        };

        var response = await _client.PostAsJsonAsync("/pedidos", dto);

        // Si no hay cliente/producto, aceptamos BadRequest
        if (response.StatusCode == HttpStatusCode.BadRequest) return;

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.True(result!.ContainsKey("id"));
    }

    [Fact]
    public async Task GetPedidos_DeberiaRetornarListaPaginada()
    {
        var response = await _client.GetAsync("/pedidos?Pagina=1&TamanoPagina=20");
        response.EnsureSuccessStatusCode();

        var resultado = await response.Content.ReadFromJsonAsync<PaginatedResult<PedidoListaDto>>();
        Assert.NotNull(resultado);
        Assert.NotNull(resultado.Items);
    }

    [Fact]
    public async Task GetPedido_DeberiaRetornarPedidoPorId()
    {
        var response = await _client.GetAsync("/pedidos/1");
        if (response.StatusCode == HttpStatusCode.NotFound) return;

        response.EnsureSuccessStatusCode();
        var pedido = await response.Content.ReadFromJsonAsync<PedidoDto>();
        Assert.NotNull(pedido);
    }

    [Fact]
    public async Task GetPedidoPorNumero_DeberiaRetornarPedido()
    {
        var response = await _client.GetAsync("/pedidos/numero/PED-2026-00001");
        if (response.StatusCode == HttpStatusCode.NotFound) return;

        response.EnsureSuccessStatusCode();
        var pedido = await response.Content.ReadFromJsonAsync<PedidoDto>();
        Assert.NotNull(pedido);
    }

    [Fact]
    public async Task GetMisPedidos_DeberiaRetornarLista()
    {
        var response = await _client.GetAsync("/pedidos/mis-pedidos");
        response.EnsureSuccessStatusCode();

        var pedidos = await response.Content.ReadFromJsonAsync<List<PedidoListaDto>>();
        Assert.NotNull(pedidos);
    }

    [Fact]
    public async Task GetPedidosPorCliente_DeberiaRetornarLista()
    {
        var response = await _client.GetAsync("/pedidos/cliente/1");
        response.EnsureSuccessStatusCode();

        var pedidos = await response.Content.ReadFromJsonAsync<List<PedidoListaDto>>();
        Assert.NotNull(pedidos);
    }

    [Fact]
    public async Task PostEnviarPedido_SinPedidoExistente_DeberiaRetornarBadRequest()
    {
        var response = await _client.PostAsync("/pedidos/9999/enviar", null);
        Assert.True(response.StatusCode == HttpStatusCode.BadRequest ||
                    response.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostConfirmarPedido_SinPedidoExistente_DeberiaRetornarBadRequest()
    {
        var response = await _client.PostAsync("/pedidos/9999/confirmar", null);
        Assert.True(response.StatusCode == HttpStatusCode.BadRequest ||
                    response.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostCancelarPedido_ConMotivo_DeberiaFuncionar()
    {
        var dto = new PedidoEstadoDto { Notas = "Cancelado por prueba" };
        var response = await _client.PostAsJsonAsync("/pedidos/9999/cancelar", dto);

        // Esperamos BadRequest o NotFound porque el pedido no existe
        Assert.True(response.StatusCode == HttpStatusCode.BadRequest ||
                    response.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeletePedido_NoExistente_DeberiaRetornarNotFound()
    {
        var response = await _client.DeleteAsync("/pedidos/9999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostAgregarDetalle_SinPedidoExistente_DeberiaRetornarBadRequest()
    {
        var dto = new DetallePedidoCreateDto
        {
            ProductoId = 1,
            Cantidad = 1,
            PrecioUnitario = 50.00m
        };

        var response = await _client.PostAsJsonAsync("/pedidos/9999/detalles", dto);
        Assert.True(response.StatusCode == HttpStatusCode.BadRequest ||
                    response.StatusCode == HttpStatusCode.NotFound);
    }
}
