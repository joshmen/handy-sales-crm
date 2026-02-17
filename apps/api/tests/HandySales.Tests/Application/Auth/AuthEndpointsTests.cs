using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using HandySales.Shared.Security;
using Microsoft.Extensions.DependencyInjection;

namespace HandySales.Tests.Integration.Auth
{
    public class AuthEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;

        public AuthEndpointsTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Register_DeberiaRetornarOk_CuandoDatosValidos()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = $"user{Guid.NewGuid():N}@test.com",
                Password = "Password123",
                Nombre = "Usuario Test",
                NombreEmpresa = "Empresa Test",
                RFC = "ABC123456789",
                Contacto = "Contacto Test"
            };

            var response = await _client.PostAsJsonAsync("/auth/register", dto);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            content.GetProperty("message").GetString().Should().Be("Usuario registrado");
        }

        [Fact]
        public async Task Register_DeberiaRetornarBadRequest_CuandoEmailDuplicado()
        {
            var email = $"user{Guid.NewGuid():N}@test.com";
            var dto = new UsuarioRegisterDto
            {
                Email = email,
                Password = "Password123",
                Nombre = "Usuario Test",
                NombreEmpresa = "Empresa Test"
            };

            // Primer registro
            var response1 = await _client.PostAsJsonAsync("/auth/register", dto);
            response1.StatusCode.Should().Be(HttpStatusCode.OK);

            // Segundo intento con mismo email
            var response2 = await _client.PostAsJsonAsync("/auth/register", dto);
            response2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Login_DeberiaRetornarToken_CuandoCredencialesValidas()
        {
            var email = $"user{Guid.NewGuid():N}@test.com";
            var password = "Password123";

            // Registro previo
            var registro = new UsuarioRegisterDto
            {
                Email = email,
                Password = password,
                Nombre = "Usuario",
                NombreEmpresa = "Empresa",
                Contacto = "Test",
                RFC = "IULS910501JUY"
            };
            await _client.PostAsJsonAsync("/auth/register", registro);

            var login = new UsuarioLoginDto
            {
                email = email,
                password = password
            };

            // var generator = _factory.Services.GetRequiredService<JwtTokenGenerator>();
            // var token = generator.GenerateToken(email, 1); //(email, 1);
            // _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _client.PostAsJsonAsync("/auth/login", login);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            content.GetProperty("token").GetString().Should().NotBeNullOrEmpty();
        }

        [Fact]
        public async Task Login_DeberiaRetornarUnauthorized_CuandoCredencialesInvalidas()
        {
            var login = new UsuarioLoginDto
            {
                email = "invalido@test.com",
                password = "incorrecta"
            };

            var response = await _client.PostAsJsonAsync("/auth/login", login);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Login_DeberiaRetornarToken_ConUsuarioSeeded()
        {
            // Usa el usuario pre-seeded en HandySalesTestSeeder
            var login = new UsuarioLoginDto
            {
                email = "test@user.com",
                password = "Test123!"
            };

            var response = await _client.PostAsJsonAsync("/auth/login", login);

            var content = await response.Content.ReadAsStringAsync();
            response.StatusCode.Should().Be(HttpStatusCode.OK, $"Response: {content}");

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            json.GetProperty("token").GetString().Should().NotBeNullOrEmpty();
        }
    }
}
