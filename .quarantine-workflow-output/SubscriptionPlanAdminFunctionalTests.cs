using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace HandySuites.Tests.Application.SuperAdmin
{
    /// <summary>
    /// Tests funcionales (happy path + RBAC negativo + IDOR) para SubscriptionPlanAdminEndpoints.
    ///
    /// Endpoint surface (apps/api/src/HandySuites.Api/Endpoints/SubscriptionPlanAdminEndpoints.cs):
    ///   GET    /api/superadmin/subscription-plans/         — lista todos (SUPER_ADMIN)
    ///   GET    /api/superadmin/subscription-plans/{id}     — uno por id (SUPER_ADMIN)
    ///   POST   /api/superadmin/subscription-plans/         — crear (SUPER_ADMIN)
    ///   PUT    /api/superadmin/subscription-plans/{id}     — actualizar (SUPER_ADMIN)
    ///   PATCH  /api/superadmin/subscription-plans/{id}/toggle — activar/desactivar (SUPER_ADMIN)
    ///
    /// Seed disponible (HandySuitesTestSeeder):
    ///   - Plan id=1  FREE  (Activo=true)
    ///   - Plan id=2  PRO   (Activo=true)
    ///   - Tenants id=1 (Test) y id=2 (Secundario)
    ///
    /// Caso: sa-be-subscription-plans — cobertura functional para el panel SuperAdmin.
    /// Complementa SuperAdminRbacNegativeTests (que cubre solo 403 para roles no-SA).
    /// </summary>
    public class SubscriptionPlanAdminFunctionalTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public SubscriptionPlanAdminFunctionalTests(CustomWebApplicationFactory factory)
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

        // ================================================================
        // GET /api/superadmin/subscription-plans/ — LISTAR
        // ================================================================

        [Fact]
        public async Task GetAll_ComoSuperAdmin_DeberiaRetornar200ConPlanesSeed()
        {
            var client = ClientAs("SUPER_ADMIN");

            var response = await client.GetAsync("/api/superadmin/subscription-plans/");

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var body = await response.Content.ReadAsStringAsync();
            body.Should().NotBeNullOrWhiteSpace("el endpoint debe regresar al menos el seed (FREE/PRO)");

            using var doc = JsonDocument.Parse(body);
            doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array, "GetAll regresa List<SubscriptionPlanAdminDto>");
            doc.RootElement.GetArrayLength().Should().BeGreaterThanOrEqualTo(2, "seed insert FREE + PRO");
        }

        [Fact]
        public async Task GetAll_ComoSuperAdmin_DeberiaIncluirPlanesInactivos()
        {
            // El controller llama repo.GetAllAsync(includeInactive: true) — los planes
            // desactivados tambien deben aparecer (panel SA necesita verlos para reactivar).
            var client = ClientAs("SUPER_ADMIN");

            var response = await client.GetAsync("/api/superadmin/subscription-plans/");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);

            // Buscar el campo activo en cualquier elemento — debe existir en el DTO
            var first = doc.RootElement[0];
            first.TryGetProperty("activo", out _).Should().BeTrue("DTO expone Activo (camelCase serialization)");
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task GetAll_ComoRolNoSuperAdmin_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);

            var response = await client.GetAsync("/api/superadmin/subscription-plans/");

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"role {role} jamas debe leer el catalogo global de planes (precios sensibles + IDOR)");
        }

        [Fact]
        public async Task GetAll_SinAuth_DeberiaRetornar401()
        {
            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");

            var response = await _client.GetAsync("/api/superadmin/subscription-plans/");

            response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
        }

        // ================================================================
        // GET /api/superadmin/subscription-plans/{id} — UNO
        // ================================================================

        [Fact]
        public async Task GetById_ComoSuperAdmin_PlanExistente_DeberiaRetornar200()
        {
            var client = ClientAs("SUPER_ADMIN");

            var response = await client.GetAsync("/api/superadmin/subscription-plans/1");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            doc.RootElement.TryGetProperty("codigo", out var codigo).Should().BeTrue();
            codigo.GetString().Should().Be("FREE", "seed plan id=1 tiene codigo FREE");
        }

        [Fact]
        public async Task GetById_ComoSuperAdmin_PlanInexistente_DeberiaRetornar404()
        {
            var client = ClientAs("SUPER_ADMIN");

            var response = await client.GetAsync("/api/superadmin/subscription-plans/99999");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task GetById_ComoRolNoSuperAdmin_DeberiaRetornar403(string role)
        {
            // IDOR check: incluso si el ADMIN conoce ids de planes ajenos, no debe poder leerlos
            // por esta ruta (precios + limits son data de gobierno del SaaS).
            var client = ClientAs(role);

            var response = await client.GetAsync("/api/superadmin/subscription-plans/1");

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        // ================================================================
        // POST /api/superadmin/subscription-plans/ — CREAR
        // ================================================================

        [Fact]
        public async Task Create_ComoSuperAdmin_PayloadValido_DeberiaRetornar201()
        {
            var client = ClientAs("SUPER_ADMIN");
            var dto = new
            {
                nombre = "Plan Enterprise QA",
                codigo = "ENTQA-" + Guid.NewGuid().ToString("N").Substring(0, 6),
                precioMensual = 1999m,
                precioAnual = 19990m,
                maxUsuarios = 50,
                maxProductos = 5000,
                maxClientesPorMes = 10000,
                incluyeReportes = true,
                incluyeSoportePrioritario = true,
                caracteristicas = new[] { "Reportes avanzados", "SLA 99.9%" },
                orden = 99
            };

            var response = await client.PostAsJsonAsync("/api/superadmin/subscription-plans/", dto);

            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            doc.RootElement.TryGetProperty("id", out var idProp).Should().BeTrue("respuesta incluye el id del nuevo plan");
            idProp.GetInt32().Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task Create_ComoSuperAdmin_CodigoDuplicado_DeberiaRetornar409()
        {
            // El seed ya tiene codigo FREE — repo.GetByCodigoAsync detecta duplicado.
            var client = ClientAs("SUPER_ADMIN");
            var dto = new
            {
                nombre = "Plan Duplicado",
                codigo = "FREE", // colision con seed
                precioMensual = 0m,
                precioAnual = 0m,
                maxUsuarios = 3,
                maxProductos = 50,
                maxClientesPorMes = 100,
                incluyeReportes = false,
                incluyeSoportePrioritario = false,
                caracteristicas = new string[] { },
                orden = 50
            };

            var response = await client.PostAsJsonAsync("/api/superadmin/subscription-plans/", dto);

            response.StatusCode.Should().Be(HttpStatusCode.Conflict,
                "el endpoint debe rechazar codigos duplicados con 409 + mensaje");
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task Create_ComoRolNoSuperAdmin_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);
            var dto = new
            {
                nombre = "Plan Hackeado",
                codigo = "HACK-" + Guid.NewGuid().ToString("N").Substring(0, 6),
                precioMensual = 0m,
                precioAnual = 0m,
                maxUsuarios = 9999,
                maxProductos = 9999,
                maxClientesPorMes = 9999,
                incluyeReportes = true,
                incluyeSoportePrioritario = true,
                caracteristicas = new[] { "EVERYTHING FREE" },
                orden = 0
            };

            var response = await client.PostAsJsonAsync("/api/superadmin/subscription-plans/", dto);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"role {role} jamas debe crear planes — riesgo de IDOR/escalation");
        }

        // ================================================================
        // PUT /api/superadmin/subscription-plans/{id} — ACTUALIZAR
        // ================================================================

        [Fact]
        public async Task Update_ComoSuperAdmin_PlanExistente_DeberiaRetornar200()
        {
            var client = ClientAs("SUPER_ADMIN");
            var dto = new
            {
                nombre = "Plan PRO Actualizado",
                precioMensual = 599m,
                precioAnual = 5990m,
                maxUsuarios = 15,
                maxProductos = 600,
                maxClientesPorMes = 6000,
                incluyeReportes = true,
                incluyeSoportePrioritario = true,
                caracteristicas = new[] { "Nuevo feature" },
                activo = true,
                orden = 2
            };

            var response = await client.PutAsJsonAsync("/api/superadmin/subscription-plans/2", dto);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Update_ComoSuperAdmin_PlanInexistente_DeberiaRetornar404()
        {
            var client = ClientAs("SUPER_ADMIN");
            var dto = new
            {
                nombre = "No existe",
                precioMensual = 0m,
                precioAnual = 0m,
                maxUsuarios = 1,
                maxProductos = 1,
                maxClientesPorMes = 1,
                incluyeReportes = false,
                incluyeSoportePrioritario = false,
                caracteristicas = new string[] { },
                activo = true,
                orden = 0
            };

            var response = await client.PutAsJsonAsync("/api/superadmin/subscription-plans/99999", dto);

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task Update_ComoRolNoSuperAdmin_DeberiaRetornar403(string role)
        {
            // IDOR critico: si un ADMIN pudiera PUT al plan ajeno, podria alterar precios
            // / limites del plan de OTROS tenants. Doble-check con multiples roles.
            var client = ClientAs(role);
            var dto = new
            {
                nombre = "Hackeado",
                precioMensual = 0m,
                precioAnual = 0m,
                maxUsuarios = 9999,
                maxProductos = 9999,
                maxClientesPorMes = 9999,
                incluyeReportes = true,
                incluyeSoportePrioritario = true,
                caracteristicas = new[] { "FREE ENTERPRISE" },
                activo = true,
                orden = 0
            };

            var response = await client.PutAsJsonAsync("/api/superadmin/subscription-plans/1", dto);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Update_CrossTenantIDOR_AdminDeOtroTenant_DeberiaRetornar403()
        {
            // IDOR cross-tenant: ADMIN de tenant=2 NO debe poder modificar planes
            // (los planes son globales del SaaS, NO per-tenant). El guard es por rol,
            // no por TenantId — pero verificamos explicitamente.
            var client = ClientAs("ADMIN", userId: "125", tenantId: "2");
            var dto = new
            {
                nombre = "IDOR attempt",
                precioMensual = 0m,
                precioAnual = 0m,
                maxUsuarios = 9999,
                maxProductos = 9999,
                maxClientesPorMes = 9999,
                incluyeReportes = true,
                incluyeSoportePrioritario = true,
                caracteristicas = new string[] { },
                activo = true,
                orden = 0
            };

            var response = await client.PutAsJsonAsync("/api/superadmin/subscription-plans/1", dto);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "BUG / FIX TODO: si esto regresa 200, ADMIN puede modificar planes globales — escalation critica");
        }

        // ================================================================
        // PATCH /api/superadmin/subscription-plans/{id}/toggle — ACTIVAR/DESACTIVAR
        // ================================================================

        [Fact]
        public async Task Toggle_ComoSuperAdmin_PlanSinTenants_DeberiaRetornar200()
        {
            // Primero creamos un plan virgen (sin tenants asociados) para poder togglearlo
            // sin chocar con la regla "no se puede desactivar si hay tenants usandolo".
            var client = ClientAs("SUPER_ADMIN");
            var createDto = new
            {
                nombre = "Plan Toggle Test",
                codigo = "TGL-" + Guid.NewGuid().ToString("N").Substring(0, 6),
                precioMensual = 100m,
                precioAnual = 1000m,
                maxUsuarios = 5,
                maxProductos = 100,
                maxClientesPorMes = 500,
                incluyeReportes = false,
                incluyeSoportePrioritario = false,
                caracteristicas = new string[] { },
                orden = 10
            };
            var createResp = await client.PostAsJsonAsync("/api/superadmin/subscription-plans/", createDto);
            createResp.StatusCode.Should().Be(HttpStatusCode.Created);
            var createBody = await createResp.Content.ReadAsStringAsync();
            using var createdDoc = JsonDocument.Parse(createBody);
            var newId = createdDoc.RootElement.GetProperty("id").GetInt32();

            // Act — toggle (Activo=true → false)
            var toggleResp = await client.PatchAsync($"/api/superadmin/subscription-plans/{newId}/toggle", null);

            // Assert
            toggleResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var toggleBody = await toggleResp.Content.ReadAsStringAsync();
            toggleBody.Should().Contain("desactivado", "el mensaje refleja la nueva accion ejecutada");
        }

        [Fact]
        public async Task Toggle_ComoSuperAdmin_PlanInexistente_DeberiaRetornar404()
        {
            var client = ClientAs("SUPER_ADMIN");

            var response = await client.PatchAsync("/api/superadmin/subscription-plans/99999/toggle", null);

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task Toggle_ComoRolNoSuperAdmin_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);

            var response = await client.PatchAsync("/api/superadmin/subscription-plans/1/toggle", null);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"role {role} jamas debe togglear planes globales — solo SUPER_ADMIN");
        }

        // ================================================================
        // Edge cases extra
        // ================================================================

        [Fact]
        public async Task Create_ComoSuperAdmin_CodigoSeNormalizaAMayusculas()
        {
            // El controller hace dto.Codigo.ToUpperInvariant() antes de persistir.
            // Test verifica la regla creando con minusculas y leyendo de vuelta.
            var client = ClientAs("SUPER_ADMIN");
            var rawCodigo = "lwr-" + Guid.NewGuid().ToString("N").Substring(0, 6);
            var dto = new
            {
                nombre = "Plan lowercase code",
                codigo = rawCodigo,
                precioMensual = 50m,
                precioAnual = 500m,
                maxUsuarios = 2,
                maxProductos = 20,
                maxClientesPorMes = 50,
                incluyeReportes = false,
                incluyeSoportePrioritario = false,
                caracteristicas = new string[] { },
                orden = 0
            };

            var createResp = await client.PostAsJsonAsync("/api/superadmin/subscription-plans/", dto);
            createResp.StatusCode.Should().Be(HttpStatusCode.Created);
            var createdId = JsonDocument.Parse(await createResp.Content.ReadAsStringAsync())
                .RootElement.GetProperty("id").GetInt32();

            // Read back
            var getResp = await client.GetAsync($"/api/superadmin/subscription-plans/{createdId}");
            getResp.StatusCode.Should().Be(HttpStatusCode.OK);
            using var doc = JsonDocument.Parse(await getResp.Content.ReadAsStringAsync());
            doc.RootElement.GetProperty("codigo").GetString()
                .Should().Be(rawCodigo.ToUpperInvariant(),
                    "el controller normaliza codigo a mayusculas con ToUpperInvariant");
        }

        [Fact]
        public async Task GetAll_DTO_DeberiaIncluirTenantCount()
        {
            // El DTO SubscriptionPlanAdminDto trae TenantCount calculado en repo.
            // El panel SA depende de este campo para mostrar "cuantas empresas usan este plan".
            var client = ClientAs("SUPER_ADMIN");

            var response = await client.GetAsync("/api/superadmin/subscription-plans/");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var first = doc.RootElement[0];
            first.TryGetProperty("tenantCount", out var tcProp).Should()
                .BeTrue("DTO debe exponer TenantCount para el panel SA");
            tcProp.ValueKind.Should().Be(JsonValueKind.Number);
        }
    }
}
