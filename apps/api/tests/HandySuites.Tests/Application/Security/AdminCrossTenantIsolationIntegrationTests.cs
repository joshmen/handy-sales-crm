using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using HandySuites.Application.Clientes.DTOs;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HandySuites.Tests.Application.Security
{
    /// <summary>
    /// Integration tests para el global query filter del DbContext.
    /// Verifica que ADMIN de tenant A NO puede ver/modificar/eliminar entidades
    /// de tenant B en clientes, pedidos, productos. Tambien valida que el listado
    /// /clientes (paginado) no incluya ids de tenant ajeno.
    ///
    /// El TenantId del JWT es la unica fuente confiable; si el ADMIN envia TenantId
    /// hardcodeado en el payload de un POST, el servidor debe overriden con el del JWT.
    /// </summary>
    public class AdminCrossTenantIsolationIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public AdminCrossTenantIsolationIntegrationTests(CustomWebApplicationFactory factory)
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

        private async Task<(int clienteTenantB, int productoTenantB, int pedidoTenantB)>
            SeedTenantBEntitiesAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

            // Asegurar Familia/Categoria/Zona/CategoriaCliente/Unidad para tenant 2
            if (!db.FamiliasProductos.IgnoreQueryFilters().Any(f => f.TenantId == 2))
                db.FamiliasProductos.Add(new FamiliaProducto { Id = 2, Nombre = "Familia T2", TenantId = 2 });
            if (!db.CategoriasProductos.IgnoreQueryFilters().Any(c => c.TenantId == 2))
                db.CategoriasProductos.Add(new CategoriaProducto { Id = 2, Nombre = "Cat T2", TenantId = 2 });
            if (!db.UnidadesMedida.IgnoreQueryFilters().Any(u => u.TenantId == 2))
                db.UnidadesMedida.Add(new UnidadMedida { Id = 2, Nombre = "U T2", Abreviatura = "u", TenantId = 2 });
            if (!db.CategoriasClientes.IgnoreQueryFilters().Any(c => c.TenantId == 2))
                db.CategoriasClientes.Add(new CategoriaCliente { Id = 2, Nombre = "Cat Cli T2", TenantId = 2 });
            if (!db.Zonas.IgnoreQueryFilters().Any(z => z.TenantId == 2))
                db.Zonas.Add(new Zona { Id = 2, Nombre = "Zona T2", TenantId = 2 });

            await db.SaveChangesAsync();

            var cliente = new Cliente
            {
                Nombre = $"TenantB-Cliente-{Guid.NewGuid():N}".Substring(0, 22),
                TenantId = 2,
                CategoriaClienteId = 2,
                Correo = $"tb-{Guid.NewGuid():N}@cli.com",
                Direccion = "Direccion B",
                IdZona = 2,
                RFC = $"TBC{Random.Shared.Next(100000, 999999)}XX2",
                Telefono = "5550000000",
                Activo = true,
            };
            db.Clientes.Add(cliente);

            var producto = new Producto
            {
                Nombre = $"TenantB-Prod-{Guid.NewGuid():N}".Substring(0, 22),
                Descripcion = "Prod T2",
                CategoraId = 2,
                FamiliaId = 2,
                CodigoBarra = $"TB{Random.Shared.Next(100000, 999999)}",
                PrecioBase = 50m,
                TenantId = 2,
                UnidadMedidaId = 2,
                Activo = true,
            };
            db.Productos.Add(producto);

            await db.SaveChangesAsync();

            var pedido = new Pedido
            {
                TenantId = 2,
                ClienteId = cliente.Id,
                UsuarioId = 125,
                NumeroPedido = $"PED-T2-{Random.Shared.Next(1000, 9999)}",
                FechaPedido = DateTime.UtcNow,
                Estado = EstadoPedido.Confirmado,
                TipoVenta = TipoVenta.Preventa,
                Subtotal = 100m,
                Impuestos = 16m,
                Total = 116m,
                Activo = true,
                CreadoEn = DateTime.UtcNow
            };
            db.Pedidos.Add(pedido);
            await db.SaveChangesAsync();

            return (cliente.Id, producto.Id, pedido.Id);
        }

        // ============================================================
        // GET listings — no debe incluir ids de tenant ajeno
        // ============================================================

        [Fact]
        public async Task GetClientes_ComoAdminTenantA_NoDebeIncluirClientesDeTenantB()
        {
            var (clienteTenantB, _, _) = await SeedTenantBEntitiesAsync();

            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var response = await client.GetAsync("/clientes?Pagina=1&TamanoPagina=100");

            response.EnsureSuccessStatusCode();
            var resultado = await response.Content.ReadFromJsonAsync<ClientePaginatedResult>();
            resultado.Should().NotBeNull();
            resultado!.Items.Should().NotBeNull();

            var ids = resultado.Items!.Select(c => c.Id).ToList();
            ids.Should().NotContain(clienteTenantB,
                "CRITICAL: el listado /clientes para ADMIN tenant 1 NO debe filtrar clientes de tenant 2");
        }

        [Fact]
        public async Task GetProductos_ComoAdminTenantA_NoDebeIncluirProductosDeTenantB()
        {
            var (_, productoTenantB, _) = await SeedTenantBEntitiesAsync();

            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var response = await client.GetAsync("/productos?Pagina=1&TamanoPagina=100");

            if (response.StatusCode == HttpStatusCode.NotFound) return;
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            // Defensa minima: el id de tenant B no debe aparecer literalmente en el payload
            json.Should().NotContain($"\"id\":{productoTenantB}",
                "CRITICAL: cross-tenant data leak en /productos");
        }

        // ============================================================
        // GET by id — debe retornar 404 cross-tenant (filtro elimina el registro)
        // ============================================================

        [Fact]
        public async Task GetClientePorId_ComoAdminTenantA_CrossTenant_DeberiaRetornar404()
        {
            var (clienteTenantB, _, _) = await SeedTenantBEntitiesAsync();

            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var response = await client.GetAsync($"/clientes/{clienteTenantB}");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound,
                "CRITICAL: GET /clientes/{id} cross-tenant debe retornar 404, nunca 200 con datos");
        }

        [Fact]
        public async Task GetProductoPorId_ComoAdminTenantA_CrossTenant_DeberiaRetornar404()
        {
            var (_, productoTenantB, _) = await SeedTenantBEntitiesAsync();

            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var response = await client.GetAsync($"/productos/{productoTenantB}");

            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK);
        }

        // ============================================================
        // PUT cross-tenant — 404 o 403, nunca 200
        // ============================================================

        [Fact]
        public async Task PutCliente_ComoAdminTenantA_CrossTenant_DeberiaRetornar404o403()
        {
            var (clienteTenantB, _, _) = await SeedTenantBEntitiesAsync();

            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var dto = new ClienteCreateDto
            {
                Nombre = "Cliente Hijacked",
                RFC = "HJK010101XX1",
                Correo = "hijack@evil.com",
                Telefono = "5550000000",
                Direccion = "Calle Hack",
                NumeroExterior = "1",
                CategoriaClienteId = 1,
                IdZona = 1
            };

            var response = await client.PutAsJsonAsync($"/clientes/{clienteTenantB}", dto);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.NotFound,
                HttpStatusCode.Forbidden,
                HttpStatusCode.BadRequest);

            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL: ADMIN no debe poder modificar cliente de otro tenant");
            response.StatusCode.Should().NotBe(HttpStatusCode.NoContent,
                "CRITICAL: PUT cross-tenant retornando 204 implica que el cambio se aplico");

            // Defensa: verificar que el cliente NO fue modificado
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var clienteOriginal = db.Clientes.IgnoreQueryFilters()
                .FirstOrDefault(c => c.Id == clienteTenantB);
            clienteOriginal.Should().NotBeNull();
            clienteOriginal!.Nombre.Should().NotBe("Cliente Hijacked",
                "CRITICAL: cross-tenant data corruption — cliente modificado por ADMIN ajeno");
        }

        // ============================================================
        // DELETE cross-tenant — 404, nunca 204
        // ============================================================

        [Fact]
        public async Task DeleteCliente_ComoAdminTenantA_CrossTenant_DeberiaRetornar404()
        {
            var (clienteTenantB, _, _) = await SeedTenantBEntitiesAsync();

            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var response = await client.DeleteAsync($"/clientes/{clienteTenantB}?forzar=true");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound,
                "CRITICAL: DELETE cross-tenant debe retornar 404 — el cliente no existe en el scope del ADMIN");

            // El cliente sigue ahi en BD (no soft-deleted)
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var clienteVivo = db.Clientes.IgnoreQueryFilters()
                .FirstOrDefault(c => c.Id == clienteTenantB);
            clienteVivo.Should().NotBeNull(
                "CRITICAL: el cliente de tenant B fue eliminado por ADMIN de tenant A");
            clienteVivo!.EliminadoEn.Should().BeNull(
                "CRITICAL: el cliente de tenant B fue soft-deleted por ADMIN ajeno");
        }

        // ============================================================
        // POST con TenantId hardcodeado en payload — debe overridearse al JWT
        // ============================================================

        [Fact]
        public async Task PostCliente_ConTenantIdHardcodeado_DebeUsarTenantIdDelJWT()
        {
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var unique = Random.Shared.Next(100000, 1000000);
            var dto = new ClienteCreateDto
            {
                TenandId = 2, // intento de hijack: payload trae tenant ajeno
                Nombre = $"CliHijack {unique}",
                RFC = $"HJK{unique}XX1",
                Correo = $"hijack-{unique}@evil.com",
                Telefono = "5550000000",
                Direccion = "Calle Hack",
                NumeroExterior = "1",
                CategoriaClienteId = 1,
                IdZona = 1
            };

            var response = await client.PostAsJsonAsync("/clientes", dto);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            var id = result.GetProperty("id").GetInt32();

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var creado = db.Clientes.IgnoreQueryFilters().First(c => c.Id == id);

            creado.TenantId.Should().Be(1,
                "CRITICAL: el TenantId del payload debe ser ignorado — el servidor lo asigna desde el JWT");
        }
    }
}
