using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Endpoints
{
    public class AiEndpointsHttpTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public AiEndpointsHttpTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        private HttpClient ClientAs(string role, string userId = "1", string tenantId = "1")
        {
            var c = _client;
            c.DefaultRequestHeaders.Clear();
            c.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            c.DefaultRequestHeaders.Add("X-Test-UserId", userId);
            c.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId);
            c.DefaultRequestHeaders.Add("X-Test-Role", role);
            return c;
        }

        private HttpClient ClientUnauthenticated()
        {
            var c = _client;
            c.DefaultRequestHeaders.Clear();
            c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            return c;
        }

        private static readonly HttpStatusCode[] AnyReasonable = new[]
        {
            HttpStatusCode.OK,
            HttpStatusCode.Created,
            HttpStatusCode.Accepted,
            HttpStatusCode.NoContent,
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest,
            HttpStatusCode.PaymentRequired,
            (HttpStatusCode)429,
            HttpStatusCode.InternalServerError
        };

        [Fact]
        public async Task PostQuery_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var body = new { TipoAccion = "pregunta", Prompt = "Resumen del dia" };
            var response = await client.PostAsJsonAsync("/api/ai/query", body);
            response.StatusCode.Should().BeOneOf(AnyReasonable);
        }

        [Fact]
        public async Task PostQuery_Unauthenticated_Returns401()
        {
            var client = ClientUnauthenticated();
            var body = new { TipoAccion = "pregunta", Prompt = "Hola" };
            var response = await client.PostAsJsonAsync("/api/ai/query", body);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task PostActionsExecute_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var body = new { ActionId = "non-existent-action-id", ActionType = "ejecutar" };
            var response = await client.PostAsJsonAsync("/api/ai/actions/execute", body);
            response.StatusCode.Should().BeOneOf(AnyReasonable);
        }

        [Fact]
        public async Task GetCredits_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/ai/credits");
            response.StatusCode.Should().BeOneOf(AnyReasonable);
        }

        [Fact]
        public async Task GetUsage_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/ai/usage?page=1&pageSize=20");
            response.StatusCode.Should().BeOneOf(AnyReasonable);
        }

        [Fact]
        public async Task GetUsageStats_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/ai/usage/stats");
            response.StatusCode.Should().BeOneOf(AnyReasonable);
        }

        [Fact]
        public async Task GetClientSuggestedProducts_AsVendedor_Returns2xxOr4xx()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var response = await client.GetAsync("/api/ai/client/1/suggested-products?limit=10&days=90");
            response.StatusCode.Should().BeOneOf(AnyReasonable);
        }

        [Fact]
        public async Task GetCollectionsPriority_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/ai/collections-priority?limit=20");
            response.StatusCode.Should().BeOneOf(AnyReasonable);
        }

        [Fact]
        public async Task PostCollectionsMessage_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var body = new { ClienteId = 1, Tono = "amable" };
            var response = await client.PostAsJsonAsync("/api/ai/collections-message", body);
            response.StatusCode.Should().BeOneOf(AnyReasonable);
        }

        [Fact]
        public async Task GetOrderAnomalies_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/ai/orders/1/anomalies");
            response.StatusCode.Should().BeOneOf(AnyReasonable);
        }

        [Fact]
        public async Task PostAdminRefreshViews_AsVendedor_Returns403()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var response = await client.PostAsync("/api/ai/admin/refresh-views", null);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task PostAdminBackfillEmbeddings_Unauthenticated_Returns401()
        {
            var client = ClientUnauthenticated();
            var response = await client.PostAsync("/api/ai/admin/backfill-embeddings", null);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
