using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using HandySuites.Application.DatosFacturacion.DTOs;
using Xunit;

namespace HandySuites.Tests.Application.Company
{
    /// <summary>
    /// Tests para /api/company/billing (DatosEmpresa SAT).
    /// - GET/POST/PUT: IsStrictAdmin (ADMIN o SUPER_ADMIN).
    /// - DELETE: IsSuperAdmin solo.
    /// El test valida que el diferencial de permisos POST/PUT vs DELETE se respeta.
    /// </summary>
    public class CompanyBillingEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public CompanyBillingEndpointsTests(CustomWebApplicationFactory factory)
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

        private static CreateDatosFacturacionRequest BuildValidCreate(string rfc = "ABC010101AAA") => new()
        {
            RFC = rfc,
            RazonSocial = "Empresa Test S.A. de C.V.",
            Calle = "Calle Falsa",
            Colonia = "Centro",
            Municipio = "Cuauhtemoc",
            Estado = "CDMX",
            CodigoPostal = "06600",
            Pais = "Mexico",
            RegimenFiscal = "601",
            UsoCFDI = "G03",
            VersionCFDI = "4.0",
            TipoComprobantePredeterminado = "I",
            FormaPagoPredeterminada = "01",
            MetodoPagoPredeterminado = "PUE",
            MonedaPredeterminada = "MXN"
        };

        // ============================================================
        // POST /api/company/billing — solo IsStrictAdmin
        // ============================================================

        [Fact]
        public async Task PostBilling_ComoAdmin_DeberiaRetornar201_o400()
        {
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var dto = BuildValidCreate();

            var response = await client.PostAsJsonAsync("/api/company/billing", dto);

            // 201 si creo, 400 si ya existe para el tenant. Forbidden NO debe ocurrir.
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.Created,
                HttpStatusCode.OK,
                HttpStatusCode.BadRequest);
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
        }

        [Theory]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task PostBilling_ConRolesNoStrictAdmin_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);
            var dto = BuildValidCreate(rfc: "XYZ010101AAA");

            var response = await client.PostAsJsonAsync("/api/company/billing", dto);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"role {role} no debe poder crear datos de facturacion");
        }

        // ============================================================
        // PUT /api/company/billing — solo IsStrictAdmin
        // ============================================================

        [Theory]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task PutBilling_ConRolesNoStrictAdmin_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);
            var dto = new UpdateDatosFacturacionRequest
            {
                Id = 1,
                RFC = "ABC010101AAA",
                RazonSocial = "Empresa Test",
                Calle = "Calle",
                Colonia = "Col",
                Municipio = "Mun",
                Estado = "Est",
                CodigoPostal = "06600",
                Pais = "Mexico",
                RegimenFiscal = "601",
                UsoCFDI = "G03",
                VersionCFDI = "4.0",
                TipoComprobantePredeterminado = "I",
                FormaPagoPredeterminada = "01",
                MetodoPagoPredeterminado = "PUE",
                MonedaPredeterminada = "MXN"
            };

            var response = await client.PutAsJsonAsync("/api/company/billing", dto);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        // ============================================================
        // DELETE /api/company/billing — SOLO SUPER_ADMIN (no ADMIN)
        // ============================================================

        [Fact]
        public async Task DeleteBilling_ComoAdmin_DeberiaRetornar403_NoEsSuperAdmin()
        {
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.DeleteAsync("/api/company/billing");

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "DELETE billing es SUPER_ADMIN-only; ADMIN debe ser rechazado");
        }

        [Fact]
        public async Task DeleteBilling_ComoSuperAdmin_DeberiaPermitir()
        {
            var client = ClientAs("SUPER_ADMIN", userId: "1", tenantId: "1");

            var response = await client.DeleteAsync("/api/company/billing");

            // 200 si encontro datos, 400 si service retorna false. NUNCA 403.
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.BadRequest);
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
                "SUPER_ADMIN debe pasar el guard IsSuperAdmin");
        }

        [Theory]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task DeleteBilling_ConRolesBajos_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);
            var response = await client.DeleteAsync("/api/company/billing");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        // ============================================================
        // Validacion — RFC con longitud invalida
        // ============================================================

        // Sprint pre-prod #11 audit 2026-06-07: fix aplicado en
        // CompanyEndpoints.cs (POST/PUT billing) — Validator.TryValidateObject
        // ejecuta los DataAnnotations del DTO antes de llamar al service.
        [Fact]
        public async Task PostBilling_ConRFCDemasiadoCorto_DeberiaRetornar400()
        {
            var client = ClientAs("ADMIN");
            var dto = BuildValidCreate();
            dto.RFC = "ABC";

            var response = await client.PostAsJsonAsync("/api/company/billing", dto);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
                "DataAnnotations debe rechazar RFC fuera del rango 12-13");
        }

        [Fact]
        public async Task PostBilling_ConCodigoPostalInvalido_DeberiaRetornar400()
        {
            var client = ClientAs("ADMIN");
            var dto = BuildValidCreate();
            dto.CodigoPostal = "ABCDE"; // RegEx ^\d{5}$ rechaza letras

            var response = await client.PostAsJsonAsync("/api/company/billing", dto);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        // ============================================================
        // GET — accesible para autenticados (IsStrictAdmin no requerido en GET segun codigo)
        // ============================================================

        [Fact]
        public async Task GetBilling_ComoAdmin_DeberiaRetornar200_o404()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/company/billing");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }
    }
}
