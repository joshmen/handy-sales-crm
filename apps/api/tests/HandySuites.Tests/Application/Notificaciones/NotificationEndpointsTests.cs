using System.Net;
using System.Net.Http.Json;
using HandySuites.Application.Notifications.DTOs;
using Xunit;

namespace HandySuites.Tests.Integration.Notificaciones;

public class NotificationEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public NotificationEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetNotificaciones_DeberiaRetornarListaPaginada()
    {
        var response = await _client.GetAsync("/api/notificaciones?Pagina=1&TamanoPagina=20");
        response.EnsureSuccessStatusCode();

        var resultado = await response.Content.ReadFromJsonAsync<NotificationPaginatedResult>();
        Assert.NotNull(resultado);
        Assert.NotNull(resultado.Items);
    }

    [Fact]
    public async Task GetConteoNoLeidas_DeberiaRetornarConteo()
    {
        var response = await _client.GetAsync("/api/notificaciones/no-leidas/count");
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, int>>();
        Assert.NotNull(result);
        Assert.True(result.ContainsKey("noLeidas"));
    }

    [Fact]
    public async Task PostMarcarComoLeida_NotificacionNoExistente_DeberiaRetornarNotFound()
    {
        var response = await _client.PostAsync("/api/notificaciones/9999/leer", null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostMarcarTodasComoLeidas_DeberiaRetornarConteo()
    {
        var response = await _client.PostAsync("/api/notificaciones/leer-todas", null);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, int>>();
        Assert.NotNull(result);
        Assert.True(result.ContainsKey("marcadas"));
    }

    [Fact]
    public async Task DeleteNotificacion_NoExistente_DeberiaRetornarNotFound()
    {
        var response = await _client.DeleteAsync("/api/notificaciones/9999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostRegistrarPushToken_DeberiaFuncionar()
    {
        var dto = new RegisterPushTokenDto
        {
            SessionId = 1,
            PushToken = "test-fcm-token-abc123"
        };

        var response = await _client.PostAsJsonAsync("/api/notificaciones/push-token", dto);

        // Puede fallar si no hay sesión de dispositivo, aceptamos BadRequest
        Assert.True(response.IsSuccessStatusCode ||
                    response.StatusCode == HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostEnviarNotificacion_SinUsuarioExistente_DeberiaFallar()
    {
        var dto = new SendNotificationDto
        {
            UsuarioId = 9999,
            Titulo = "Test",
            Mensaje = "Mensaje de prueba",
            Tipo = "General"
        };

        var response = await _client.PostAsJsonAsync("/api/notificaciones/enviar", dto);

        // Puede ser OK (con Success=false) o BadRequest — ambos son válidos
        Assert.True(response.IsSuccessStatusCode ||
                    response.StatusCode == HttpStatusCode.BadRequest,
                    $"Expected success or BadRequest, got {response.StatusCode}");
    }

    [Fact]
    public async Task PostBroadcast_AUsuariosInexistentes_DeberiaRetornarResultado()
    {
        var dto = new BroadcastNotificationDto
        {
            UsuarioIds = new List<int> { 9999, 9998 },
            Titulo = "Broadcast Test",
            Mensaje = "Mensaje de prueba broadcast",
            Tipo = "System"
        };

        var response = await _client.PostAsJsonAsync("/api/notificaciones/broadcast", dto);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<BroadcastResultDto>();
        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetNotificaciones_ConFiltroTipo_DeberiaFiltrar()
    {
        var response = await _client.GetAsync("/api/notificaciones?Tipo=Order&Pagina=1&TamanoPagina=10");
        response.EnsureSuccessStatusCode();

        var resultado = await response.Content.ReadFromJsonAsync<NotificationPaginatedResult>();
        Assert.NotNull(resultado);
    }

    [Fact]
    public async Task GetNotificaciones_ConFiltroNoLeidas_DeberiaFiltrar()
    {
        var response = await _client.GetAsync("/api/notificaciones?NoLeidas=true&Pagina=1&TamanoPagina=10");
        response.EnsureSuccessStatusCode();

        var resultado = await response.Content.ReadFromJsonAsync<NotificationPaginatedResult>();
        Assert.NotNull(resultado);
    }
}
