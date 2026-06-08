using System.Net;
using System.Text.Json;
using HandySuites.Mobile.Api.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;

namespace HandySuites.Mobile.Tests.Services;

public class SyncNotificationServiceTests
{
    private readonly Mock<ILogger<SyncNotificationService>> _loggerMock = new();

    private (SyncNotificationService service, Mock<HttpMessageHandler> handler, List<HttpRequestMessage> captured)
        CreateService(HttpStatusCode statusCode = HttpStatusCode.OK, bool throwException = false)
    {
        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        var captured = new List<HttpRequestMessage>();

        var setup = handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => captured.Add(req));

        if (throwException)
        {
            setup.ThrowsAsync(new HttpRequestException("simulated network error"));
        }
        else
        {
            setup.ReturnsAsync(new HttpResponseMessage(statusCode));
        }

        var httpClient = new HttpClient(handlerMock.Object)
        {
            BaseAddress = new Uri("http://main-api.test")
        };

        var service = new SyncNotificationService(httpClient, _loggerMock.Object);
        return (service, handlerMock, captured);
    }

    private static SyncSummary SampleSummary() => new()
    {
        PedidosCreados = 3,
        PedidosActualizados = 1,
        CobrosCreados = 2,
        VisitasCreadas = 4,
        ClientesCreados = 1,
        TotalPushed = 11,
        TotalPulled = 7
    };

    [Fact]
    public async Task NotificarSyncCompletado_DeberiaEnviarPostAlEndpointCorrecto()
    {
        // Arrange
        var (service, handler, captured) = CreateService(HttpStatusCode.OK);

        // Act
        await service.NotificarSyncCompletado(1, 100, "Admin User", SampleSummary());

        // Assert
        captured.Should().HaveCount(1);
        var request = captured[0];
        request.Method.Should().Be(HttpMethod.Post);
        request.RequestUri!.AbsolutePath.Should().BeOneOf(
            "/api/internal/sync-notify",
            "/api/internal/sync-notify/");
    }

    [Fact]
    public async Task NotificarSyncCompletado_DeberiaIncluirPayloadConTenantUserYSummary()
    {
        // Arrange
        var (service, _, captured) = CreateService(HttpStatusCode.OK);
        var summary = SampleSummary();

        // Act
        await service.NotificarSyncCompletado(2, 300, "Vendedor1", summary);

        // Assert
        captured.Should().HaveCount(1);
        var request = captured[0];
        request.Content.Should().NotBeNull();

        var json = await request.Content!.ReadAsStringAsync();
        json.Should().NotBeNullOrWhiteSpace();

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // BeOneOf permisivo: aceptar property names en camelCase o PascalCase
        TryGetIntCaseInsensitive(root, "tenantId").Should().BeOneOf(2);
        TryGetIntCaseInsensitive(root, "userId").Should().BeOneOf(300);
        TryGetStringCaseInsensitive(root, "userName").Should().BeOneOf("Vendedor1", "vendedor1", null);

        // summary debe existir
        var hasSummary = root.TryGetProperty("summary", out var summaryEl)
                        || root.TryGetProperty("Summary", out summaryEl);
        hasSummary.Should().BeTrue();
    }

    [Fact]
    public async Task NotificarSyncCompletado_CuandoMainApiResponde500_NoDeberiaLanzarExcepcion()
    {
        // Arrange
        var (service, _, captured) = CreateService(HttpStatusCode.InternalServerError);

        // Act
        Func<Task> act = async () => await service.NotificarSyncCompletado(1, 100, "Admin", SampleSummary());

        // Assert: no debe propagar el error
        await act.Should().NotThrowAsync();
        captured.Should().HaveCount(1);
    }

    [Fact]
    public async Task NotificarSyncCompletado_CuandoHttpClientLanzaExcepcion_DeberiaCapturarSilenciosamente()
    {
        // Arrange: handler arroja excepcion (simula fallo de red)
        var (service, _, _) = CreateService(throwException: true);

        // Act
        Func<Task> act = async () => await service.NotificarSyncCompletado(1, 100, "Admin", SampleSummary());

        // Assert: la excepcion NO debe romper el sync
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task NotificarSyncCompletado_DeberiaUsarContentTypeApplicationJson()
    {
        // Arrange
        var (service, _, captured) = CreateService(HttpStatusCode.OK);

        // Act
        await service.NotificarSyncCompletado(1, 101, "Admin", SampleSummary());

        // Assert
        captured.Should().HaveCount(1);
        var contentType = captured[0].Content?.Headers.ContentType?.MediaType;
        contentType.Should().BeOneOf("application/json", "application/json; charset=utf-8");
    }

    // Helpers — buscan property name en camelCase o PascalCase (permisivo)
    private static int? TryGetIntCaseInsensitive(JsonElement root, string name)
    {
        foreach (var candidate in new[] { name, char.ToUpper(name[0]) + name[1..] })
        {
            if (root.TryGetProperty(candidate, out var el) && el.ValueKind == JsonValueKind.Number)
            {
                return el.GetInt32();
            }
        }
        return null;
    }

    private static string? TryGetStringCaseInsensitive(JsonElement root, string name)
    {
        foreach (var candidate in new[] { name, char.ToUpper(name[0]) + name[1..] })
        {
            if (root.TryGetProperty(candidate, out var el) && el.ValueKind == JsonValueKind.String)
            {
                return el.GetString();
            }
        }
        return null;
    }
}
