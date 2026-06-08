using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Application.Clientes
{
    /// <summary>
    /// RBAC SUPERVISOR para endpoints de Clientes — gap detectado por workflow
    /// wrleo01wo (2026-06-06). ClienteEndpointsTests.cs original tenia CERO
    /// referencias a SUPERVISOR (grep -c SUPERVISOR = 0).
    ///
    /// Boundary que se valida:
    /// - POST /clientes/{id}/aprobar-prospecto  -> IsStrictAdmin OR IsSupervisor (escala)
    /// - POST /clientes/{id}/rechazar-prospecto -> IsStrictAdmin OR IsSupervisor (escala)
    /// - POST /clientes/transferir-cartera      -> IsStrictAdmin ONLY (SUPERVISOR debe 403)
    /// - PATCH /clientes/batch-toggle           -> RequireRole("ADMIN","SUPER_ADMIN") (SUPERVISOR 403)
    ///
    /// Si alguno de los gates anteriores se relaja accidentalmente a IsAdminOrAbove
    /// (lo cual *si* incluye SUPERVISOR), un SUPERVISOR podria transferir cartera
    /// entre vendedores o desactivar clientes en bulk — escalation horizontal.
    /// </summary>
    public class ClienteSupervisorRbacTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public ClienteSupervisorRbacTests(CustomWebApplicationFactory factory)
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

        // ============================================================
        // aprobar-prospecto / rechazar-prospecto
        // Gate: !IsStrictAdmin && !IsSupervisor -> Forbid
        // (i.e. solo ADMIN, SUPER_ADMIN, SUPERVISOR pueden aprobar/rechazar)
        // ============================================================

        [Theory]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task AprobarProspecto_DeberiaRetornar403_ParaVendedorYViewer(string role)
        {
            // Arrange — el cliente 1 existe en seed (no es prospecto, pero el gate RBAC
            // se evalua ANTES de cualquier query a DB, por lo que el 403 debe ocurrir
            // sin importar el estado del cliente).
            var client = ClientAs(role);

            // Act
            var response = await client.PostAsync("/clientes/1/aprobar-prospecto", content: null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"{role} NO debe poder aprobar prospectos (solo ADMIN/SUPER_ADMIN/SUPERVISOR)");
        }

        [Theory]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task RechazarProspecto_DeberiaRetornar403_ParaVendedorYViewer(string role)
        {
            var client = ClientAs(role);
            var response = await client.PostAsync("/clientes/1/rechazar-prospecto", content: null);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"{role} NO debe poder rechazar prospectos (solo ADMIN/SUPER_ADMIN/SUPERVISOR)");
        }

        [Fact]
        public async Task AprobarProspecto_DeberiaPasarGuardRbac_ParaSupervisor()
        {
            // SUPERVISOR (id 200, tenant 1) — seed agrega supervisor@test.com con rol SUPERVISOR.
            // El cliente 1 en seed NO es prospecto activo, por lo que esperamos 404
            // (NotFound del business rule) *no* 403. Esto demuestra que el gate RBAC
            // permitio pasar (passes IsSupervisor branch).
            var client = ClientAs("SUPERVISOR", userId: "200", tenantId: "1");

            var response = await client.PostAsync("/clientes/1/aprobar-prospecto", content: null);

            // 204 NoContent (si seed cambia a prospecto), 404 (cliente no es prospecto),
            // pero NUNCA 403.
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
                "SUPERVISOR SI puede aprobar prospectos (gate permite IsSupervisor).");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.NoContent, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task RechazarProspecto_DeberiaPasarGuardRbac_ParaSupervisor()
        {
            var client = ClientAs("SUPERVISOR", userId: "200", tenantId: "1");
            var response = await client.PostAsync("/clientes/1/rechazar-prospecto", content: null);

            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
                "SUPERVISOR SI puede rechazar prospectos (gate permite IsSupervisor).");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.NoContent, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task AprobarProspecto_DeberiaPasarGuardRbac_ParaAdmin()
        {
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var response = await client.PostAsync("/clientes/1/aprobar-prospecto", content: null);

            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
                "ADMIN cumple IsStrictAdmin -> el gate permite operar.");
        }

        // ============================================================
        // transferir-cartera — IsStrictAdmin ONLY
        // SUPERVISOR debe ser rechazado para evitar escalation (mover toda la
        // cartera de un vendedor a otro es decision administrativa, no operativa).
        // ============================================================

        [Fact]
        public async Task TransferirCartera_SUPERVISOR_DeberiaRetornar403()
        {
            // Aunque SUPERVISOR puede aprobar prospectos, NO debe poder
            // transferir cartera completa (privilege escalation horizontal).
            // Este test es el muro contra un cambio accidental a IsAdminOrAbove.
            var client = ClientAs("SUPERVISOR", userId: "200", tenantId: "1");
            var dto = new { FromUsuarioId = 123, ToUsuarioId = 124, SoloActivos = true };

            var response = await client.PostAsJsonAsync("/clientes/transferir-cartera", dto);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "SUPERVISOR NO debe poder transferir cartera (IsStrictAdmin only). " +
                "Si esto pasa de 403 a 200/400, alguien cambio el gate a IsAdminOrAbove — REVISAR.");
        }

        [Theory]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task TransferirCartera_VendedorYViewer_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);
            var dto = new { FromUsuarioId = 123, ToUsuarioId = 124, SoloActivos = true };
            var response = await client.PostAsJsonAsync("/clientes/transferir-cartera", dto);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task TransferirCartera_ADMIN_DeberiaPasarGuardRbac()
        {
            // ADMIN (id 1, tenant 1) — cumple IsStrictAdmin.
            // Esperamos 200 OK (transferencia ejecutada, count puede ser 0 si seed
            // no tiene clientes con vendedorId=123) o BadRequest si la validacion
            // de DTO dispara primero. Lo importante: NO 403.
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var dto = new { FromUsuarioId = 123, ToUsuarioId = 124, SoloActivos = true };

            var response = await client.PostAsJsonAsync("/clientes/transferir-cartera", dto);

            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
                "ADMIN SI puede transferir cartera (IsStrictAdmin).");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task TransferirCartera_VendedorOrigenIgualDestino_DeberiaRetornar400()
        {
            // Sanity check de la validacion del DTO — defensa en profundidad
            // contra movimientos no-op accidentales.
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var dto = new { FromUsuarioId = 123, ToUsuarioId = 123, SoloActivos = true };

            var response = await client.PostAsJsonAsync("/clientes/transferir-cartera", dto);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
                "From == To debe ser 400 (no-op semantico).");
        }

        // ============================================================
        // batch-toggle — RequireRole("ADMIN","SUPER_ADMIN")
        // Gate aplicado a nivel de policy: SUPERVISOR debe 403.
        // ============================================================

        [Fact]
        public async Task BatchToggle_SUPERVISOR_DeberiaRetornar403()
        {
            var client = ClientAs("SUPERVISOR", userId: "200", tenantId: "1");
            var request = new { Ids = new[] { 1 }, Activo = false };
            var content = JsonContent.Create(request);

            var response = await client.PatchAsync("/clientes/batch-toggle", content);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "PATCH /clientes/batch-toggle es RequireRole(ADMIN,SUPER_ADMIN) — SUPERVISOR NO entra.");
        }

        [Theory]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task BatchToggle_VendedorYViewer_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);
            var request = new { Ids = new[] { 1 }, Activo = false };
            var content = JsonContent.Create(request);
            var response = await client.PatchAsync("/clientes/batch-toggle", content);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task BatchToggle_ADMIN_DeberiaPasarGuardRbac()
        {
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var request = new { Ids = new[] { 1 }, Activo = false };
            var content = JsonContent.Create(request);

            var response = await client.PatchAsync("/clientes/batch-toggle", content);

            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        // ============================================================
        // Cross-tenant IDOR — SUPERVISOR del tenant 2 NO debe aprobar
        // prospectos del tenant 1.
        //
        // El query filter global de HandySuitesDbContext (e.TenantId == CurrentTenantId)
        // hace que el cliente 1 (tenant 1) sea invisible para un SUPERVISOR del
        // tenant 2 — el service retorna NotFound, no Forbidden. Esto es el
        // comportamiento esperado: 404 leak-resistant en vez de 403 leak-revealing.
        // ============================================================

        [Fact]
        public async Task AprobarProspecto_SupervisorTenantDistinto_DeberiaRetornar404()
        {
            // SUPERVISOR pero del tenant 2 — query filter oculta cliente 1 (tenant 1).
            var client = ClientAs("SUPERVISOR", userId: "125", tenantId: "2");

            var response = await client.PostAsync("/clientes/1/aprobar-prospecto", content: null);

            // Patron leak-resistant: NotFound (no Forbidden) cuando el recurso
            // pertenece a otro tenant — no debe revelar que existe.
            response.StatusCode.Should().Be(HttpStatusCode.NotFound,
                "cross-tenant IDOR: cliente del tenant 1 debe ser invisible para usuario del tenant 2 (404, no 403)");
        }

        [Fact]
        public async Task TransferirCartera_AdminTenantDistinto_NoDeberiaTransferirClientesDeOtroTenant()
        {
            // ADMIN del tenant 2 intentando transferir cartera entre vendedores
            // del tenant 1. El query filter hace que no encuentre ningun cliente
            // que matchear → count = 0 (no-op silencioso, sin leak).
            var client = ClientAs("ADMIN", userId: "125", tenantId: "2");
            var dto = new { FromUsuarioId = 123, ToUsuarioId = 124, SoloActivos = true };

            var response = await client.PostAsJsonAsync("/clientes/transferir-cartera", dto);

            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                var body = await response.Content.ReadAsStringAsync();
                // count debe ser 0 — ningun cliente del tenant 1 transferido por admin del tenant 2.
                body.Should().Contain("\"transferidos\":0",
                    "cross-tenant: ADMIN del tenant 2 NO debe poder mover clientes del tenant 1.");
            }
        }

        // ============================================================
        // Auth requerida
        // ============================================================

        [Theory]
        [InlineData("POST", "/clientes/1/aprobar-prospecto")]
        [InlineData("POST", "/clientes/1/rechazar-prospecto")]
        [InlineData("POST", "/clientes/transferir-cartera")]
        public async Task EndpointsSensibles_DeberianRequerirAutenticacion(string method, string path)
        {
            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");

            HttpResponseMessage response = method switch
            {
                "POST" => await _client.PostAsync(path, content: null),
                _ => throw new ArgumentException("metodo no soportado")
            };

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task BatchToggle_DeberiaRequerirAutenticacion()
        {
            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var request = new { Ids = new[] { 1 }, Activo = false };
            var content = JsonContent.Create(request);

            var response = await _client.PatchAsync("/clientes/batch-toggle", content);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
