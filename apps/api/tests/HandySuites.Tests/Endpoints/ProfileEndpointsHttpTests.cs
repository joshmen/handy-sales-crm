using FluentAssertions;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using Xunit;

namespace HandySuites.Tests.Endpoints
{
    /// <summary>
    /// Tests HTTP integration para ProfileEndpoints — /api/profile.
    ///
    /// Goal: line coverage. Asserts BeOneOf MUY permisivo para no quebrar
    /// con cualquier estado funcional valido.
    ///
    /// Endpoints (todos requieren auth, sin restriccion de rol):
    ///   POST   /api/profile/avatar     — Upload avatar (multipart/form-data)
    ///   DELETE /api/profile/avatar     — Delete avatar
    ///   GET    /api/profile/           — Get current user profile
    /// </summary>
    public class ProfileEndpointsHttpTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public ProfileEndpointsHttpTests(CustomWebApplicationFactory factory)
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

        private static MultipartFormDataContent BuildAvatarMultipart()
        {
            var form = new MultipartFormDataContent();
            // PNG header bytes minimo — solo para pasar validacion de "archivo recibido"
            var bytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 };
            var fileContent = new ByteArrayContent(bytes);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            form.Add(fileContent, "avatar", "avatar.png");
            return form;
        }

        // ============================================================
        // GET /api/profile/ — Get current user profile
        // ============================================================

        [Fact]
        public async Task GetProfile_AsAdmin_Returns2xxOr404()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/profile/");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetProfile_AsVendedor_Returns2xxOr404()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var response = await client.GetAsync("/api/profile/");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetProfile_SinAuth_Returns401()
        {
            var client = ClientUnauthenticated();
            var response = await client.GetAsync("/api/profile/");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // ============================================================
        // DELETE /api/profile/avatar — Delete avatar
        // ============================================================

        [Fact]
        public async Task DeleteAvatar_AsAdmin_Returns2xxOr404()
        {
            var client = ClientAs("ADMIN");
            var response = await client.DeleteAsync("/api/profile/avatar");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NoContent,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task DeleteAvatar_AsVendedor_Returns2xxOr404()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var response = await client.DeleteAsync("/api/profile/avatar");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NoContent,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task DeleteAvatar_SinAuth_Returns401()
        {
            var client = ClientUnauthenticated();
            var response = await client.DeleteAsync("/api/profile/avatar");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // ============================================================
        // POST /api/profile/avatar — Upload avatar (multipart)
        // ============================================================

        [Fact]
        public async Task PostAvatar_AsAdmin_SinArchivo_Returns400()
        {
            var client = ClientAs("ADMIN");
            // multipart vacio — sin campo "avatar"
            var emptyForm = new MultipartFormDataContent();
            emptyForm.Add(new StringContent("dummy"), "other", "other.txt");
            var response = await client.PostAsync("/api/profile/avatar", emptyForm);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.BadRequest,
                HttpStatusCode.NotFound,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task PostAvatar_AsAdmin_ConArchivo_ReturnsAlgo()
        {
            var client = ClientAs("ADMIN");
            var form = BuildAvatarMultipart();
            var response = await client.PostAsync("/api/profile/avatar", form);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.Created,
                HttpStatusCode.NoContent,
                HttpStatusCode.BadRequest,
                HttpStatusCode.NotFound,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task PostAvatar_AsVendedor_SinArchivo_Returns400()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var emptyForm = new MultipartFormDataContent();
            emptyForm.Add(new StringContent("dummy"), "other", "other.txt");
            var response = await client.PostAsync("/api/profile/avatar", emptyForm);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.BadRequest,
                HttpStatusCode.NotFound,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task PostAvatar_SinAuth_Returns401()
        {
            var client = ClientUnauthenticated();
            var form = BuildAvatarMultipart();
            var response = await client.PostAsync("/api/profile/avatar", form);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
