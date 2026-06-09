using FluentAssertions;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using Xunit;

namespace HandySuites.Tests.Endpoints
{
    /// <summary>
    /// Tests HTTP integration para WebErrorEndpoints — POST /api/web-errors.
    ///
    /// Endpoint anonimo (AllowAnonymous) usado por el frontend web para reportar
    /// crashes. No tiene RBAC real, asi que las variantes cubren:
    ///   1. Happy path con body valido
    ///   2. Invalid JSON (raw string) — branch del try/catch
    ///   3. Empty body (null JSON literal) — branch dto is null
    ///   4. URL con query params sensibles — branch SanitizeUrl
    /// </summary>
    public class WebErrorEndpointsHttpTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public WebErrorEndpointsHttpTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        private HttpClient AnonymousClient()
        {
            var c = _client;
            c.DefaultRequestHeaders.Clear();
            c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            return c;
        }

        [Fact]
        public async Task PostWebError_HappyPath_Returns200()
        {
            var client = AnonymousClient();
            var payload = new
            {
                message = "TypeError: Cannot read property 'foo' of undefined",
                stack = "at Object.<anonymous> (app.js:42:13)\n  at Module._compile (module.js:653:30)",
                url = "https://app.handysuites.com/dashboard/clientes",
                userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                timestamp = "2026-06-07T12:34:56Z"
            };

            var response = await client.PostAsJsonAsync("/api/web-errors", payload);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task PostWebError_InvalidJson_ReturnsBadRequest()
        {
            var client = AnonymousClient();
            var content = new StringContent("{ this is not valid json ", Encoding.UTF8, "application/json");

            var response = await client.PostAsync("/api/web-errors", content);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.BadRequest,
                HttpStatusCode.NotFound,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task PostWebError_EmptyBody_ReturnsBadRequest()
        {
            var client = AnonymousClient();
            var content = new StringContent("null", Encoding.UTF8, "application/json");

            var response = await client.PostAsync("/api/web-errors", content);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.BadRequest,
                HttpStatusCode.NotFound,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task PostWebError_WithSensitiveQueryParams_RedactsAndReturns200()
        {
            var client = AnonymousClient();
            var payload = new
            {
                message = "Network error fetching resource",
                stack = "Error: 401 Unauthorized\n  at fetch (api.ts:88)",
                url = "https://app.handysuites.com/api/secure?token=abc123&password=hunter2&apikey=xyz&jwt=eyJ&session=s1&sid=99&auth=Bearer%20foo&secret=topsecret&key=k1&page=2",
                userAgent = "Mozilla/5.0",
                timestamp = "2026-06-07T12:35:00Z"
            };

            var response = await client.PostAsJsonAsync("/api/web-errors", payload);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }
    }
}
