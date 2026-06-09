using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HandySuites.Tests.Integration.Security
{
    /// <summary>
    /// IDOR (Insecure Direct Object Reference) cross-tenant tests para rol ADMIN.
    ///
    /// Caso: ext-tenant-isolation-idor
    ///
    /// Estrategia:
    ///  - Seedar entidades de tenant B (pedidos, zonas, usuarios, rutas, productos)
    ///    en la base SQLite in-memory.
    ///  - Como ADMIN de tenant A (X-Test-TenantId=1), intentar acceder por id
    ///    directo (URL path) a las entidades de tenant B.
    ///  - Cualquier endpoint que retorne 200 con datos del tenant ajeno es un
    ///    IDOR critico. El comportamiento correcto es 404 (filtro global) o 403.
    ///
    /// Tambien se valida que el listado paginado no incluya ids cross-tenant
    /// (la defensa en profundidad del global query filter).
    ///
    /// Complementa los tests existentes en
    ///   Application/Security/AdminCrossTenantIsolationIntegrationTests.cs
    ///   Application/Companies/CompaniesAdminCrossTenantIsolationTests.cs
    /// extendiendo cobertura a Pedidos, Usuarios, Zonas, Rutas y verificando
    /// IDOR por id directo en multiples vectores.
    /// </summary>
    public class AdminCrossTenantIDORTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public AdminCrossTenantIDORTests(CustomWebApplicationFactory factory)
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

        /// <summary>
        /// Seedea (idempotente) datos minimos de Tenant 2 para los tests IDOR.
        /// Reutiliza ids estables (Familia/Categoria/Zona = 2) ya provistos
        /// por el seeder base de CompaniesAdminCrossTenantIsolationTests
        /// si no existen aun.
        /// </summary>
        private async Task<TenantBFixture> SeedTenantBAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

            // Catalogos base de tenant 2 (idempotente — IgnoreQueryFilters porque
            // estamos seedeando sin contexto de tenant)
            if (!db.FamiliasProductos.IgnoreQueryFilters().Any(f => f.TenantId == 2))
                db.FamiliasProductos.Add(new FamiliaProducto { Id = 2, Nombre = "Familia T2", TenantId = 2 });
            if (!db.CategoriasProductos.IgnoreQueryFilters().Any(c => c.TenantId == 2))
                db.CategoriasProductos.Add(new CategoriaProducto { Id = 2, Nombre = "Cat T2", TenantId = 2 });
            if (!db.UnidadesMedida.IgnoreQueryFilters().Any(u => u.TenantId == 2))
                db.UnidadesMedida.Add(new UnidadMedida { Id = 2, Nombre = "U T2", Abreviatura = "u", TenantId = 2 });
            if (!db.CategoriasClientes.IgnoreQueryFilters().Any(c => c.TenantId == 2))
                db.CategoriasClientes.Add(new CategoriaCliente { Id = 2, Nombre = "Cat Cli T2", TenantId = 2 });

            // Zona de tenant B — vector IDOR para /zonas/{id}
            Zona? zonaB = db.Zonas.IgnoreQueryFilters().FirstOrDefault(z => z.TenantId == 2);
            if (zonaB is null)
            {
                zonaB = new Zona { Nombre = "Zona T2 IDOR", TenantId = 2, Activo = true };
                db.Zonas.Add(zonaB);
            }

            await db.SaveChangesAsync();

            // Cliente de tenant B (necesario para FK del pedido)
            var cliente = new Cliente
            {
                Nombre = $"TenantB-Cli-{Guid.NewGuid():N}".Substring(0, 22),
                TenantId = 2,
                CategoriaClienteId = 2,
                Correo = $"tb-{Guid.NewGuid():N}@cli.com",
                Direccion = "Direccion B",
                IdZona = zonaB.Id,
                RFC = $"TBC{Random.Shared.Next(100000, 999999)}XX2",
                Telefono = "5550000000",
                Activo = true,
            };
            db.Clientes.Add(cliente);

            // Producto de tenant B
            var producto = new Producto
            {
                Nombre = $"TenantB-Prod-{Guid.NewGuid():N}".Substring(0, 22),
                Descripcion = "Prod T2 IDOR",
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

            // Pedido de tenant B — vector IDOR para /pedidos/{id}, /pedidos/{id}/confirmar,
            // /pedidos/{id}/cancelar, /pedidos/cliente/{clienteId}, etc.
            var pedido = new Pedido
            {
                TenantId = 2,
                ClienteId = cliente.Id,
                UsuarioId = 125, // usuario seedeado del tenant 2
                // 2026-06-09 fix flake: Random.Shared.Next(1000,9999) tenia ~9000 valores
                // unicos, colisionaba con UNIQUE (tenant_id, numero_pedido) cuando el suite
                // corria multiples tests con el mismo proceso. Guid prefix da 8 hex chars
                // = ~4B variaciones, suficiente para correr todo el suite sin colision.
                NumeroPedido = $"PED-T2-IDOR-{Guid.NewGuid().ToString("N")[..8]}",
                FechaPedido = DateTime.UtcNow,
                Estado = EstadoPedido.Borrador,
                TipoVenta = TipoVenta.Preventa,
                Subtotal = 100m,
                Impuestos = 16m,
                Total = 116m,
                Activo = true,
                CreadoEn = DateTime.UtcNow
            };
            db.Pedidos.Add(pedido);
            await db.SaveChangesAsync();

            return new TenantBFixture(
                ClienteId: cliente.Id,
                ProductoId: producto.Id,
                PedidoId: pedido.Id,
                ZonaId: zonaB.Id,
                UsuarioId: 125,
                NumeroPedido: pedido.NumeroPedido);
        }

        private record TenantBFixture(
            int ClienteId,
            int ProductoId,
            int PedidoId,
            int ZonaId,
            int UsuarioId,
            string NumeroPedido);

        // ============================================================
        // GET /pedidos/{id} — IDOR por id directo
        // ============================================================

        [Fact]
        public async Task GetPedidoPorId_AdminTenantA_CrossTenant_DeberiaRetornar404()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.GetAsync($"/pedidos/{fix.PedidoId}");

            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR: ADMIN tenant 1 vio detalle de pedido de tenant 2");
        }

        [Fact]
        public async Task GetPedidoPorNumero_AdminTenantA_CrossTenant_DeberiaRetornar404()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.GetAsync($"/pedidos/numero/{Uri.EscapeDataString(fix.NumeroPedido)}");

            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR: el lookup por NumeroPedido no debe permitir cross-tenant lookup");
        }

        [Fact]
        public async Task GetPedidosPorCliente_AdminTenantA_CrossTenantCliente_NoDebeRetornarPedidosDeOtroTenant()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            // ADMIN de tenant 1 pasa clienteId de tenant 2 — variante de IDOR
            var response = await client.GetAsync($"/pedidos/cliente/{fix.ClienteId}");

            if (response.StatusCode == HttpStatusCode.NotFound) return; // aceptable

            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();

            // Defensa minima: el pedido de tenant B no debe aparecer en el payload
            json.Should().NotContain(fix.NumeroPedido,
                "CRITICAL IDOR: /pedidos/cliente/{clienteId} retorno pedidos de tenant ajeno");
        }

        [Fact]
        public async Task GetPedidosPorUsuario_AdminTenantA_CrossTenantUsuario_NoDebeRetornarPedidosDeOtroTenant()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            // userId=125 vive en tenant 2; el filtro global debe limitar
            var response = await client.GetAsync($"/pedidos/usuario/{fix.UsuarioId}");

            if (response.StatusCode == HttpStatusCode.NotFound
                || response.StatusCode == HttpStatusCode.Forbidden) return;

            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();

            json.Should().NotContain(fix.NumeroPedido,
                "CRITICAL IDOR: /pedidos/usuario/{usuarioId} expone pedidos de tenant ajeno");
        }

        // ============================================================
        // PUT /pedidos/{id} — IDOR para mutar pedido de otro tenant
        // ============================================================

        [Fact]
        public async Task PutPedido_AdminTenantA_CrossTenant_NoDebeMutar()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            // PedidoUpdateDto shape — usamos object anonimo para evitar dep en DTO concreto
            var dto = new
            {
                Notas = "Hijack IDOR",
                Observaciones = "ADMIN tenant 1 mutando tenant 2"
            };

            var response = await client.PutAsJsonAsync($"/pedidos/{fix.PedidoId}", dto);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.NotFound,
                HttpStatusCode.Forbidden,
                HttpStatusCode.BadRequest);

            response.StatusCode.Should().NotBe(HttpStatusCode.NoContent,
                "CRITICAL IDOR: PUT cross-tenant retornando 204 implica modificacion aplicada");
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR: PUT cross-tenant retornando 200 implica modificacion aplicada");

            // Defensa: verificar que el pedido NO fue modificado en BD
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var pedidoActual = db.Pedidos.IgnoreQueryFilters()
                .FirstOrDefault(p => p.Id == fix.PedidoId);
            pedidoActual.Should().NotBeNull();
            pedidoActual!.TenantId.Should().Be(2,
                "CRITICAL IDOR: TenantId del pedido fue alterado por ADMIN ajeno");
        }

        // ============================================================
        // DELETE /pedidos/{id} — IDOR para eliminar pedido de otro tenant
        // ============================================================

        [Fact]
        public async Task DeletePedido_AdminTenantA_CrossTenant_NoDebeEliminar()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.DeleteAsync($"/pedidos/{fix.PedidoId}");

            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
            response.StatusCode.Should().NotBe(HttpStatusCode.NoContent,
                "CRITICAL IDOR: DELETE cross-tenant retornando 204 = eliminacion exitosa");

            // Verificar persistencia: pedido sigue vivo en BD
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var pedidoVivo = db.Pedidos.IgnoreQueryFilters()
                .FirstOrDefault(p => p.Id == fix.PedidoId);
            pedidoVivo.Should().NotBeNull(
                "CRITICAL IDOR: el pedido de tenant B fue eliminado por ADMIN de tenant A");
            pedidoVivo!.EliminadoEn.Should().BeNull(
                "CRITICAL IDOR: pedido tenant B fue soft-deleted por ADMIN ajeno");
        }

        // ============================================================
        // POST /pedidos/{id}/confirmar — IDOR para cambiar estado cross-tenant
        // ============================================================

        [Fact]
        public async Task ConfirmarPedido_AdminTenantA_CrossTenant_NoDebeCambiarEstado()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.PostAsync($"/pedidos/{fix.PedidoId}/confirmar", null);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.NotFound,
                HttpStatusCode.Forbidden,
                HttpStatusCode.BadRequest);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR: ADMIN cambio estado de pedido de tenant ajeno via /confirmar");

            // Estado en BD permanece Borrador
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var pedido = db.Pedidos.IgnoreQueryFilters()
                .FirstOrDefault(p => p.Id == fix.PedidoId);
            pedido!.Estado.Should().Be(EstadoPedido.Borrador,
                "CRITICAL IDOR: el estado del pedido tenant B fue alterado cross-tenant");
        }

        [Fact]
        public async Task CancelarPedido_AdminTenantA_CrossTenant_NoDebeCancelar()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.PostAsJsonAsync(
                $"/pedidos/{fix.PedidoId}/cancelar",
                new { Notas = "IDOR hijack" });

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.NotFound,
                HttpStatusCode.Forbidden,
                HttpStatusCode.BadRequest);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR: ADMIN cancelo pedido de tenant ajeno");
        }

        // ============================================================
        // GET /zonas/{id} — IDOR catalogo
        // ============================================================

        [Fact]
        public async Task GetZonaPorId_AdminTenantA_CrossTenant_DeberiaRetornar404()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.GetAsync($"/zonas/{fix.ZonaId}");

            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR: GET /zonas/{id} cross-tenant nunca debe ser 200");
        }

        [Fact]
        public async Task PutZona_AdminTenantA_CrossTenant_NoDebeMutar()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var dto = new { nombre = "Zona Hijacked", descripcion = "IDOR" };
            var response = await client.PutAsJsonAsync($"/zonas/{fix.ZonaId}", dto);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.NotFound,
                HttpStatusCode.Forbidden,
                HttpStatusCode.BadRequest);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR: PUT /zonas/{id} cross-tenant retorno 200");
            response.StatusCode.Should().NotBe(HttpStatusCode.NoContent);

            // Persistencia: nombre NO debe haber cambiado a "Zona Hijacked"
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var zonaActual = db.Zonas.IgnoreQueryFilters()
                .FirstOrDefault(z => z.Id == fix.ZonaId);
            zonaActual.Should().NotBeNull();
            zonaActual!.Nombre.Should().NotBe("Zona Hijacked",
                "CRITICAL IDOR: la zona tenant B fue renombrada por ADMIN ajeno");
            zonaActual.TenantId.Should().Be(2);
        }

        [Fact]
        public async Task DeleteZona_AdminTenantA_CrossTenant_NoDebeEliminar()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.DeleteAsync($"/zonas/{fix.ZonaId}");

            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
            response.StatusCode.Should().NotBe(HttpStatusCode.NoContent,
                "CRITICAL IDOR: DELETE /zonas/{id} cross-tenant nunca debe ser 204");

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var zonaViva = db.Zonas.IgnoreQueryFilters()
                .FirstOrDefault(z => z.Id == fix.ZonaId);
            zonaViva.Should().NotBeNull("CRITICAL IDOR: zona tenant B eliminada por ADMIN ajeno");
            zonaViva!.EliminadoEn.Should().BeNull();
        }

        // ============================================================
        // /api/usuarios — IDOR cross-tenant para usuarios
        // ============================================================

        [Fact]
        public async Task GetUsuarioPorId_AdminTenantA_CrossTenant_DeberiaRetornar404()
        {
            await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            // Usuario 125 vive en tenant 2 (seedeado por base)
            var response = await client.GetAsync("/api/usuarios/125");

            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR: GET /api/usuarios/{id} expuso usuario de tenant ajeno");
        }

        [Fact]
        public async Task GetUsuariosLista_AdminTenantA_NoDebeIncluirUsuariosDeOtroTenant()
        {
            await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.GetAsync("/api/usuarios/");

            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();

            // Email de usuario 125 (tenant 2): user125@test.com
            json.Should().NotContain("user125@test.com",
                "CRITICAL IDOR: el listado de usuarios incluye un usuario de tenant ajeno");
        }

        [Fact]
        public async Task PutUsuario_AdminTenantA_CrossTenant_NoDebeMutar()
        {
            await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            // Intento de mutar usuario 125 (tenant 2) desde tenant 1
            var dto = new
            {
                nombre = "Usuario Hijacked",
                email = "hijack@evil.com"
            };

            var response = await client.PutAsJsonAsync("/api/usuarios/125", dto);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.NotFound,
                HttpStatusCode.Forbidden,
                HttpStatusCode.BadRequest);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR: ADMIN modifico usuario de tenant ajeno");
            response.StatusCode.Should().NotBe(HttpStatusCode.NoContent);

            // Persistencia: el usuario NO fue modificado
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var u = db.Usuarios.IgnoreQueryFilters().FirstOrDefault(x => x.Id == 125);
            u.Should().NotBeNull();
            u!.Nombre.Should().NotBe("Usuario Hijacked",
                "CRITICAL IDOR: usuario tenant B renombrado por ADMIN ajeno");
            u.Email.Should().NotBe("hijack@evil.com",
                "CRITICAL IDOR: usuario tenant B tuvo email cambiado por ADMIN ajeno");
            u.TenantId.Should().Be(2);
        }

        [Fact]
        public async Task DeleteUsuario_AdminTenantA_CrossTenant_NoDebeEliminar()
        {
            await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.DeleteAsync("/api/usuarios/125");

            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
            response.StatusCode.Should().NotBe(HttpStatusCode.NoContent,
                "CRITICAL IDOR: DELETE /api/usuarios/{id} cross-tenant nunca debe ser exitoso");
            response.StatusCode.Should().NotBe(HttpStatusCode.OK);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var u = db.Usuarios.IgnoreQueryFilters().FirstOrDefault(x => x.Id == 125);
            u.Should().NotBeNull("CRITICAL IDOR: usuario tenant B eliminado por ADMIN ajeno");
            u!.EliminadoEn.Should().BeNull();
        }

        [Fact]
        public async Task ActivateUsuario_AdminTenantA_CrossTenant_NoDebeActivar()
        {
            // Primero asegurar usuario 125 esta inactivo
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                var u125 = db.Usuarios.IgnoreQueryFilters().FirstOrDefault(x => x.Id == 125);
                if (u125 != null)
                {
                    u125.Activo = false;
                    await db.SaveChangesAsync();
                }
            }

            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var response = await client.PatchAsync("/api/usuarios/125/activate", null);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.NotFound,
                HttpStatusCode.Forbidden,
                HttpStatusCode.BadRequest);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR: ADMIN activo usuario de tenant ajeno via PATCH /activate");
            response.StatusCode.Should().NotBe(HttpStatusCode.NoContent);

            using var verifyScope = _factory.Services.CreateScope();
            var verifyDb = verifyScope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var u = verifyDb.Usuarios.IgnoreQueryFilters().FirstOrDefault(x => x.Id == 125);
            u.Should().NotBeNull();
            u!.Activo.Should().BeFalse(
                "CRITICAL IDOR: usuario tenant B fue activado por ADMIN de tenant A");
        }

        [Fact]
        public async Task AsignarRol_AdminTenantA_CrossTenant_NoDebeAsignar()
        {
            await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            // Intento de promover usuario 125 (tenant 2) a Admin (roleId=1)
            var response = await client.PatchAsync("/api/usuarios/125/assign-role/1", null);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.NotFound,
                HttpStatusCode.Forbidden,
                HttpStatusCode.BadRequest);
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL IDOR + PRIV-ESC: ADMIN promovio rol de usuario de tenant ajeno");

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var u = db.Usuarios.IgnoreQueryFilters().FirstOrDefault(x => x.Id == 125);
            u!.RolExplicito.Should().Be("VENDEDOR",
                "CRITICAL IDOR: el rol del usuario tenant B fue elevado por ADMIN ajeno");
        }

        // ============================================================
        // Batch endpoints — IDOR via batch ids cross-tenant
        // ============================================================

        [Fact]
        public async Task BatchToggleUsuarios_AdminTenantA_ConIdsCrossTenant_NoDebeAfectarOtroTenant()
        {
            await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            // Payload con id 125 (tenant 2) — el endpoint debe filtrar por tenant del JWT
            var dto = new { ids = new[] { 125 }, activo = false };
            var response = await client.PatchAsJsonAsync("/api/usuarios/batch-toggle", dto);

            // Aceptable: 200/204 con 0 afectados, o 404, o 400. NUNCA debe haber
            // mutado el usuario 125 que pertenece a tenant 2.
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var u125 = db.Usuarios.IgnoreQueryFilters().FirstOrDefault(x => x.Id == 125);
            u125.Should().NotBeNull();
            // El test base de seeder garantiza Activo=true. Verifica que sigue true.
            u125!.Activo.Should().BeTrue(
                "CRITICAL IDOR: batch-toggle desactivo usuario de tenant ajeno usando id en payload");
            u125.TenantId.Should().Be(2);
        }

        // ============================================================
        // POST /pedidos con ClienteId cross-tenant — IDOR por payload
        // ============================================================

        [Fact]
        public async Task PostPedido_AdminTenantA_ConClienteIdCrossTenant_NoDebeCrearPedidoVinculadoAOtroTenant()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            // Intento de crear pedido en tenant 1 referenciando cliente de tenant 2
            var dto = new
            {
                ClienteId = fix.ClienteId,
                TipoVenta = 0, // Preventa
                Detalles = new object[] { },
            };

            var response = await client.PostAsJsonAsync("/pedidos", dto);

            // Esperado: BadRequest/NotFound porque el cliente no existe en el scope del tenant 1.
            // INACEPTABLE: 200 + pedido creado vinculado a cliente de tenant ajeno.
            response.StatusCode.Should().NotBe(HttpStatusCode.Created,
                "CRITICAL IDOR: pedido creado vinculando cliente de tenant ajeno");

            if (response.IsSuccessStatusCode)
            {
                // Si el endpoint devolvio 200/201, asegurar que NO se persistio
                // un pedido con ClienteId del tenant ajeno
                using var scope = _factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                var pedidosFraudulentos = db.Pedidos.IgnoreQueryFilters()
                    .Where(p => p.ClienteId == fix.ClienteId && p.TenantId == 1)
                    .ToList();
                pedidosFraudulentos.Should().BeEmpty(
                    "CRITICAL IDOR: se persistio pedido en tenant 1 referenciando cliente de tenant 2");
            }
        }

        // ============================================================
        // SUPER_ADMIN puede cross-tenant (control negativo del control)
        // ============================================================

        [Fact]
        public async Task GetPedidoPorId_SuperAdmin_CrossTenant_DeberiaPoderVer()
        {
            var fix = await SeedTenantBAsync();
            // SuperAdmin con header de tenant 2 — el SUPER_ADMIN normalmente escoge tenant
            var client = ClientAs("SUPER_ADMIN", userId: "1", tenantId: "2");

            var response = await client.GetAsync($"/pedidos/{fix.PedidoId}");

            // Debe poder ver el pedido cuando esta en contexto del tenant correcto.
            // Si retorna 404 puede ser bug; si retorna 403 es bug; OK es lo esperado.
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
                "SUPER_ADMIN debe poder cross-tenant cuando opera dentro del tenant target");
        }

        // ============================================================
        // GET /pedidos — listado paginado, validacion defensa en profundidad
        // ============================================================

        [Fact]
        public async Task GetPedidosListado_AdminTenantA_NoDebeIncluirNumeroPedidoDeTenantB()
        {
            var fix = await SeedTenantBAsync();
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.GetAsync("/pedidos?pagina=1&tamanoPagina=200");

            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();

            json.Should().NotContain(fix.NumeroPedido,
                "CRITICAL IDOR: listado /pedidos incluye NumeroPedido de tenant ajeno");
        }
    }
}
