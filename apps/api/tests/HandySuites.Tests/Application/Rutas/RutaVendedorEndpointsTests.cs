using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace HandySuites.Tests.Application.Rutas
{
    // === H-2 / Item 5.2 (Outbox Test Sweep — 2026-06-07) ===
    //
    // The four endpoints `POST /rutas/{id}/cancelar`, `POST /rutas/{id}/carga/pedidos`,
    // `POST /rutas/{id}/carga/enviar`, plus the Update/Create paths that emit
    // `RouteAssignedSignalR`, were refactored from `_ = Task.Run(...)` fire-and-forget
    // to durable `IOutboxService.EnqueueAsync(...)` writes against the `NotificationOutbox`
    // table (helpers in `RutaVendedorEndpoints.cs#L40-L146`).
    //
    // SWEEP RESULT: No existing tests in this file (or in `RutaVendedorServiceUnitTests`)
    // mocked `IHttpClientFactory` + `IRealtimePushService` for those endpoints — so there
    // were no `mockPushService.Verify(...)` calls to convert into
    // `db.NotificationOutbox.Should().ContainSingle(...)` assertions. The existing tests
    // only assert HTTP status codes and don't reach the notification path.
    //
    // FOLLOW-UP TICKET (recommended): add positive coverage that:
    //   1. POST /rutas/{id}/cancelar (state CargaAceptada|EnProgreso) ->
    //      db.NotificationOutbox has 1 Pending row with NotificationType=MobileRouteCancelled,
    //      TenantId=expected, RetryCount=0.
    //   2. POST /rutas/{id}/carga/pedidos (state CargaAceptada|EnProgreso) ->
    //      1 Pending row with NotificationType=MobileRouteAssignment, payload pedidoId matches.
    //   3. POST /rutas/{id}/carga/enviar -> 2 Pending rows
    //      (MobileRouteSentToLoad + RouteAssignedSignalR), both same TenantId.
    //   4. POST /rutas + PUT /rutas/{id} (with UsuarioId assigned) ->
    //      1 Pending row with NotificationType=RouteAssignedSignalR, EventName="RutaAssigned".
    //
    // These tests need DB seeding (RutaVendedor + RutasCarga + Pedido fixtures) that
    // doesn't exist yet in the integration harness, so they are deferred.
    public class RutaVendedorEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public RutaVendedorEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetRutas_DeberiaRequerir_Autenticacion()
        {
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var response = await _client.GetAsync("/rutas");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetRutas_DeberiaRetornarLista_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            // RutaFiltroDto requires query params or defaults
            var response = await _client.GetAsync("/rutas?pagina=1&tamanoPagina=10");
            // Sprint correctivo 2026-06-06: el 500 SQLite ORDER BY TimeSpan
            // se arreglo usando Ticks (cross-DB compatible).
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GetRutaById_DeberiaRetornar404_CuandoNoExiste()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var response = await _client.GetAsync("/rutas/9999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task PostRuta_DeberiaCrearRuta_ConDatosValidos()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-UserId", "123");

            var ruta = new
            {
                nombre = "Ruta Test",
                fecha = DateTime.UtcNow.ToString("o"),
                usuarioId = 123,
                notas = "Ruta de prueba"
            };

            var response = await _client.PostAsJsonAsync("/rutas", ruta);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Created, HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetMiRutaHoy_DeberiaRetornarRutaONotFound()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-UserId", "123");

            var response = await _client.GetAsync("/rutas/mi-ruta-hoy");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetMisRutasPendientes_DeberiaRetornarLista()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-UserId", "123");

            var response = await _client.GetAsync("/rutas/mis-rutas-pendientes");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetRutasPorUsuario_DeberiaRetornarLista()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var response = await _client.GetAsync("/rutas/usuario/123");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task DeleteRuta_DeberiaRetornar404_CuandoNoExiste()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var response = await _client.DeleteAsync("/rutas/9999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task IniciarRuta_DeberiaRetornar404OBadRequest_CuandoRutaNoExiste()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var response = await _client.PostAsJsonAsync("/rutas/9999/iniciar", new { });
            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CompletarRuta_DeberiaRetornar404OBadRequest_CuandoRutaNoExiste()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var response = await _client.PostAsJsonAsync("/rutas/9999/completar", new { });
            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GetCargaRuta_DeberiaRetornar404_CuandoRutaNoExiste()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var response = await _client.GetAsync("/rutas/9999/carga");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.OK);
        }

        [Fact]
        public async Task BatchToggle_DeberiaRequerir_Autenticacion()
        {
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var request = new { ids = new[] { 1, 2 }, activo = false };
            var response = await _client.PatchAsJsonAsync("/rutas/batch-toggle", request);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
