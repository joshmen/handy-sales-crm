using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HandySuites.Tests.Application.Clientes
{
    /// <summary>
    /// Tests para PATCH /clientes/batch-toggle.
    /// Endpoint con `.RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"))`.
    /// Valida happy path, RBAC negative y aislamiento multi-tenant en bulk update.
    /// </summary>
    public class ClienteBatchToggleEndpointTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public ClienteBatchToggleEndpointTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
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

        private async Task<(List<int> idsTenantA, List<int> idsTenantB)> SeedClientesEnAmbosTenantsAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

            var idsA = new List<int>();
            var idsB = new List<int>();

            for (int i = 0; i < 3; i++)
            {
                var ca = new Cliente
                {
                    Nombre = $"BatchA-{Guid.NewGuid():N}".Substring(0, 16),
                    TenantId = 1,
                    CategoriaClienteId = 1,
                    Correo = $"ba-{Guid.NewGuid():N}@t.com",
                    Direccion = "x",
                    IdZona = 1,
                    RFC = $"BTA{Random.Shared.Next(100000, 999999)}XX1",
                    Telefono = "5550000000",
                    Activo = true,
                };
                db.Clientes.Add(ca);

                var cb = new Cliente
                {
                    Nombre = $"BatchB-{Guid.NewGuid():N}".Substring(0, 16),
                    TenantId = 2,
                    CategoriaClienteId = 1,
                    Correo = $"bb-{Guid.NewGuid():N}@t.com",
                    Direccion = "y",
                    IdZona = 1,
                    RFC = $"BTB{Random.Shared.Next(100000, 999999)}XX2",
                    Telefono = "5550000000",
                    Activo = true,
                };
                db.Clientes.Add(cb);
            }

            await db.SaveChangesAsync();

            var seedados = db.Clientes.IgnoreQueryFilters().AsNoTracking()
                .Where(c => c.Nombre.StartsWith("BatchA-") || c.Nombre.StartsWith("BatchB-"))
                .ToList();

            idsA = seedados.Where(c => c.TenantId == 1).Select(c => c.Id).ToList();
            idsB = seedados.Where(c => c.TenantId == 2).Select(c => c.Id).ToList();

            return (idsA, idsB);
        }

        // ---------- Happy path ADMIN ----------

        [Fact]
        public async Task BatchToggle_ComoAdmin_DeberiaDesactivarClientesYRetornar200()
        {
            var (idsA, _) = await SeedClientesEnAmbosTenantsAsync();
            idsA.Should().NotBeEmpty();

            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var request = new { Ids = idsA, Activo = false };

            var response = await client.PatchAsync("/clientes/batch-toggle",
                JsonContent.Create(request));

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, int>>();
            payload.Should().NotBeNull();
            payload!.Should().ContainKey("actualizados");
        }

        // ---------- RBAC negative ----------

        [Theory]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task BatchToggle_RolesNoAdmin_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role, userId: "1", tenantId: "1");
            var request = new { Ids = new[] { 1 }, Activo = false };

            var response = await client.PatchAsync("/clientes/batch-toggle",
                JsonContent.Create(request));

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"role {role} NO esta en RequireRole(ADMIN, SUPER_ADMIN)");
        }

        // ---------- Validacion ----------

        [Fact]
        public async Task BatchToggle_ConIdsVacios_DeberiaRetornar400()
        {
            var client = ClientAs("ADMIN");
            var request = new { Ids = Array.Empty<int>(), Activo = false };

            var response = await client.PatchAsync("/clientes/batch-toggle",
                JsonContent.Create(request));

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BatchToggle_ConMasDe1000Ids_DeberiaRetornar400()
        {
            var client = ClientAs("ADMIN");
            var request = new { Ids = Enumerable.Range(1, 1001).ToArray(), Activo = false };

            var response = await client.PatchAsync("/clientes/batch-toggle",
                JsonContent.Create(request));

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        // ---------- Multi-tenant isolation ----------

        [Fact]
        public async Task BatchToggle_ConIdsCrossTenant_SoloDebeAfectarTenantPropio()
        {
            var (idsA, idsB) = await SeedClientesEnAmbosTenantsAsync();
            idsA.Should().NotBeEmpty();
            idsB.Should().NotBeEmpty();

            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var idsTodos = idsA.Concat(idsB).ToArray();
            var request = new { Ids = idsTodos, Activo = false };

            var response = await client.PatchAsync("/clientes/batch-toggle",
                JsonContent.Create(request));

            response.StatusCode.Should().Be(HttpStatusCode.OK,
                "Endpoint debe aceptar mezcla — query filter por tenant aisla resultados");

            // Verificar que clientes de tenant B siguen activos
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var clientesB = db.Clientes.IgnoreQueryFilters()
                .Where(c => idsB.Contains(c.Id))
                .ToList();

            clientesB.Should().NotBeEmpty();
            clientesB.All(c => c.Activo).Should().BeTrue(
                "BUG / FIX TODO: si esto falla, el batch-toggle NO esta respetando el global query filter por tenant — riesgo de cross-tenant data corruption.");
        }

        // ---------- Anonymous ----------

        [Fact]
        public async Task BatchToggle_SinAutenticacion_DeberiaRetornar401()
        {
            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");

            var request = new { Ids = new[] { 1 }, Activo = false };
            var response = await _client.PatchAsync("/clientes/batch-toggle",
                JsonContent.Create(request));

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
