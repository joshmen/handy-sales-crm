using System.Net;
using System.Net.Http.Json;
using HandySales.Application.DeviceSessions.DTOs;
using Xunit;

namespace HandySales.Tests.Integration.DeviceSessions;

public class DeviceSessionEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public DeviceSessionEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMisSesiones_DeberiaRetornarLista()
    {
        var response = await _client.GetAsync("/dispositivos/mis-sesiones");
        response.EnsureSuccessStatusCode();

        var sesiones = await response.Content.ReadFromJsonAsync<List<DeviceSessionDto>>();
        Assert.NotNull(sesiones);
    }

    [Fact]
    public async Task GetMiResumen_DeberiaRetornarResumen()
    {
        var response = await _client.GetAsync("/dispositivos/mi-resumen");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        Assert.NotNull(content);
    }

    [Fact]
    public async Task GetDispositivo_DeberiaRetornarPorId()
    {
        var response = await _client.GetAsync("/dispositivos/1");
        if (response.StatusCode == HttpStatusCode.NotFound) return;

        response.EnsureSuccessStatusCode();
        var dispositivo = await response.Content.ReadFromJsonAsync<DeviceSessionDto>();
        Assert.NotNull(dispositivo);
    }

    [Fact]
    public async Task GetDispositivoPorDeviceId_DeberiaRetornarPorDeviceId()
    {
        var response = await _client.GetAsync("/dispositivos/device/test-device-123");
        // Puede no existir
        if (response.StatusCode == HttpStatusCode.NotFound) return;

        response.EnsureSuccessStatusCode();
        var dispositivo = await response.Content.ReadFromJsonAsync<DeviceSessionDto>();
        Assert.NotNull(dispositivo);
    }

    [Fact]
    public async Task PostCerrarSesion_NoExistente_DeberiaRetornarBadRequest()
    {
        var response = await _client.PostAsync("/dispositivos/9999/cerrar", null);

        // Sesion no existe o no pertenece al usuario
        Assert.True(response.StatusCode == HttpStatusCode.BadRequest ||
                    response.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostCerrarTodasSesiones_DeberiaRetornarCantidad()
    {
        var dto = new LogoutAllDevicesDto
        {
            ExcluirSesionActual = true,
            Reason = "Test de cierre masivo"
        };

        var response = await _client.PostAsJsonAsync("/dispositivos/cerrar-todas", dto);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.NotNull(result);
        Assert.True(result.ContainsKey("cantidad"));
    }

    [Fact]
    public async Task PutActualizarPushToken_NoExistente_DeberiaRetornarNotFound()
    {
        var dto = new DeviceSessionUpdatePushTokenDto
        {
            PushToken = "new-fcm-token-xyz789"
        };

        var response = await _client.PutAsJsonAsync("/dispositivos/9999/push-token", dto);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetSesionValida_DeberiaRetornarEstado()
    {
        var response = await _client.GetAsync("/dispositivos/1/valida");
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, bool>>();
        Assert.NotNull(result);
        Assert.True(result.ContainsKey("valida"));
    }

    // ADMIN endpoints
    [Fact]
    public async Task GetAdminSesionesActivas_DeberiaRetornarLista()
    {
        var response = await _client.GetAsync("/dispositivos/admin/activas");
        response.EnsureSuccessStatusCode();

        var sesiones = await response.Content.ReadFromJsonAsync<List<DeviceSessionDto>>();
        Assert.NotNull(sesiones);
    }

    [Fact]
    public async Task GetAdminSesionesPorUsuario_DeberiaRetornarLista()
    {
        var response = await _client.GetAsync("/dispositivos/admin/usuario/1");
        response.EnsureSuccessStatusCode();

        var sesiones = await response.Content.ReadFromJsonAsync<List<DeviceSessionDto>>();
        Assert.NotNull(sesiones);
    }

    [Fact]
    public async Task PostAdminRevocarSesion_NoExistente_DeberiaRetornarBadRequest()
    {
        var response = await _client.PostAsync("/dispositivos/admin/9999/revocar", null);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostAdminCerrarTodasUsuario_DeberiaRetornarCantidad()
    {
        var response = await _client.PostAsync("/dispositivos/admin/usuario/9999/cerrar-todas", null);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.NotNull(result);
        Assert.True(result.ContainsKey("cantidad"));
    }

    [Fact]
    public async Task PostAdminLimpiarExpiradas_DeberiaRetornarCantidad()
    {
        var response = await _client.PostAsync("/dispositivos/admin/limpiar-expiradas?diasInactividad=30", null);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.NotNull(result);
        Assert.True(result.ContainsKey("cantidad"));
    }
}
