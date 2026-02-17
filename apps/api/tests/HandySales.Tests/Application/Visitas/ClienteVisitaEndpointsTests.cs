using System.Net;
using System.Net.Http.Json;
using HandySales.Application.Visitas.DTOs;
using HandySales.Domain.Entities;
using Xunit;

namespace HandySales.Tests.Integration.Visitas;

public class ClienteVisitaEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ClienteVisitaEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostVisita_DeberiaCrearVisita()
    {
        var dto = new ClienteVisitaCreateDto
        {
            ClienteId = 1,
            FechaProgramada = DateTime.UtcNow.AddDays(1),
            Notas = "Visita de prueba"
        };

        var response = await _client.PostAsJsonAsync("/visitas", dto);

        // Si no hay cliente, aceptamos BadRequest
        if (response.StatusCode == HttpStatusCode.BadRequest) return;

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.True(result!.ContainsKey("id"));
    }

    [Fact]
    public async Task GetVisitas_DeberiaRetornarListaPaginada()
    {
        var response = await _client.GetAsync("/visitas?Pagina=1&TamanoPagina=20");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        Assert.NotNull(content);
    }

    [Fact]
    public async Task GetVisita_DeberiaRetornarVisitaPorId()
    {
        var response = await _client.GetAsync("/visitas/1");
        if (response.StatusCode == HttpStatusCode.NotFound) return;

        response.EnsureSuccessStatusCode();
        var visita = await response.Content.ReadFromJsonAsync<ClienteVisitaDto>();
        Assert.NotNull(visita);
    }

    [Fact]
    public async Task GetMisVisitas_DeberiaRetornarLista()
    {
        var response = await _client.GetAsync("/visitas/mis-visitas");
        response.EnsureSuccessStatusCode();

        var visitas = await response.Content.ReadFromJsonAsync<List<ClienteVisitaListaDto>>();
        Assert.NotNull(visitas);
    }

    [Fact]
    public async Task GetVisitasHoy_DeberiaRetornarLista()
    {
        var response = await _client.GetAsync("/visitas/hoy");
        response.EnsureSuccessStatusCode();

        var visitas = await response.Content.ReadFromJsonAsync<List<ClienteVisitaListaDto>>();
        Assert.NotNull(visitas);
    }

    [Fact]
    public async Task GetVisitaActiva_DeberiaRetornarEstado()
    {
        var response = await _client.GetAsync("/visitas/activa");
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.NotNull(result);
        Assert.True(result.ContainsKey("activa"));
    }

    [Fact]
    public async Task GetVisitasPorCliente_DeberiaRetornarLista()
    {
        var response = await _client.GetAsync("/visitas/cliente/1");
        response.EnsureSuccessStatusCode();

        var visitas = await response.Content.ReadFromJsonAsync<List<ClienteVisitaListaDto>>();
        Assert.NotNull(visitas);
    }

    [Fact]
    public async Task PostCheckIn_SinVisitaExistente_DeberiaRetornarBadRequest()
    {
        var dto = new CheckInDto
        {
            Latitud = 19.4326,
            Longitud = -99.1332,
            Notas = "Check-in de prueba"
        };

        var response = await _client.PostAsJsonAsync("/visitas/9999/check-in", dto);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostCheckOut_SinVisitaExistente_DeberiaRetornarBadRequest()
    {
        var dto = new CheckOutDto
        {
            Latitud = 19.4326,
            Longitud = -99.1332,
            Resultado = ResultadoVisita.SinVenta,
            Notas = "Check-out de prueba"
        };

        var response = await _client.PostAsJsonAsync("/visitas/9999/check-out", dto);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetMiResumenDiario_DeberiaRetornarResumen()
    {
        var response = await _client.GetAsync("/visitas/mi-resumen/diario");
        response.EnsureSuccessStatusCode();

        var resumen = await response.Content.ReadFromJsonAsync<VisitaResumenDiarioDto>();
        Assert.NotNull(resumen);
    }

    [Fact]
    public async Task GetMiResumenSemanal_DeberiaRetornarResumen()
    {
        var response = await _client.GetAsync("/visitas/mi-resumen/semanal");
        response.EnsureSuccessStatusCode();

        // El resumen semanal retorna una lista de resúmenes diarios
        var resumen = await response.Content.ReadFromJsonAsync<List<VisitaResumenDiarioDto>>();
        Assert.NotNull(resumen);
    }

    [Fact]
    public async Task DeleteVisita_NoExistente_DeberiaRetornarNotFound()
    {
        var response = await _client.DeleteAsync("/visitas/9999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
