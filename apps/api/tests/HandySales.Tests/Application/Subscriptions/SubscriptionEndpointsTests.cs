using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace HandySales.Tests.Application.Subscriptions
{
    public class SubscriptionEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public SubscriptionEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetPlans_DeberiaRequerir_Autenticacion()
        {
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var response = await _client.GetAsync("/api/subscription/plans");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetPlans_DeberiaRetornarPlanes_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var response = await _client.GetAsync("/api/subscription/plans");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.ValueKind.Should().Be(JsonValueKind.Array);
            result.GetArrayLength().Should().BeGreaterThanOrEqualTo(2);
        }

        [Fact]
        public async Task GetCurrent_DeberiaRequerir_Autenticacion()
        {
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var response = await _client.GetAsync("/api/subscription/current");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetCurrent_DeberiaRetornarEstado_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var response = await _client.GetAsync("/api/subscription/current");
            // May return 200 (has subscription) or 404 (no subscription)
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Checkout_DeberiaRetornar403_ParaVendedor()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "VENDEDOR");

            var request = new
            {
                planCode = "PRO",
                interval = "monthly",
                successUrl = "http://localhost/success",
                cancelUrl = "http://localhost/cancel"
            };
            var response = await _client.PostAsJsonAsync("/api/subscription/checkout", request);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Cancel_DeberiaRetornar403_ParaVendedor()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "VENDEDOR");

            var response = await _client.PostAsync("/api/subscription/cancel", null);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Cancel_DeberiaRequerir_Autenticacion()
        {
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var response = await _client.PostAsync("/api/subscription/cancel", null);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
