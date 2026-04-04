using FluentAssertions;
using HandySales.Application.SubscriptionPlans.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HandySales.Tests.Application.Subscriptions
{
    public class FacturacionEnforcementTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly HandySalesDbContext _db;
        private readonly SubscriptionEnforcementService _sut;

        public FacturacionEnforcementTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<HandySalesDbContext>()
                .UseSqlite(_connection)
                .Options;

            _db = new HandySalesDbContext(options);
            _db.Database.EnsureCreated();

            _sut = new SubscriptionEnforcementService(_db);

            SeedBaseData();
        }

        private void SeedBaseData()
        {
            // Plan FREE — sin facturacion
            _db.SubscriptionPlans.Add(new SubscriptionPlan
            {
                Id = 10, Codigo = "FREE", Nombre = "Plan Gratuito",
                PrecioMensual = 0, PrecioAnual = 0,
                MaxUsuarios = 3, MaxProductos = 50,
                IncluyeFacturacion = false, MaxFacturasMes = 0, MaxTimbresMes = 0,
                Activo = true, Orden = 1
            });

            // Plan BASIC — con facturacion, 100 facturas/mes
            _db.SubscriptionPlans.Add(new SubscriptionPlan
            {
                Id = 11, Codigo = "BASIC", Nombre = "Plan Basico",
                PrecioMensual = 299, PrecioAnual = 2990,
                MaxUsuarios = 5, MaxProductos = 200,
                IncluyeFacturacion = true, MaxFacturasMes = 100, MaxTimbresMes = 100,
                Activo = true, Orden = 2
            });

            // Plan PRO — con facturacion, 500 facturas/mes
            _db.SubscriptionPlans.Add(new SubscriptionPlan
            {
                Id = 12, Codigo = "PRO", Nombre = "Plan Profesional",
                PrecioMensual = 499, PrecioAnual = 4990,
                MaxUsuarios = 10, MaxProductos = 500,
                IncluyeFacturacion = true, MaxFacturasMes = 500, MaxTimbresMes = 500,
                Activo = true, Orden = 3
            });

            _db.SaveChanges();
        }

        private Tenant CreateTenant(int id, string planTipo, int facturasGeneradasMes = 0, DateTime? facturasResetFecha = null)
        {
            var tenant = new Tenant
            {
                Id = id,
                NombreEmpresa = $"Tenant Test {id}",
                PlanTipo = planTipo,
                FacturasGeneradasMes = facturasGeneradasMes,
                FacturasResetFecha = facturasResetFecha
            };
            _db.Tenants.Add(tenant);
            _db.SaveChanges();
            return tenant;
        }

        // ── CanGenerarFacturaAsync ──

        [Fact]
        public async Task CanGenerarFactura_RetornaFalse_CuandoPlanSinFacturacion()
        {
            // Arrange — Tenant con plan FREE (IncluyeFacturacion=false)
            CreateTenant(100, "FREE");

            // Act
            var result = await _sut.CanGenerarFacturaAsync(100);

            // Assert
            result.Allowed.Should().BeFalse();
            result.Message.Should().Contain("no incluye facturación");
        }

        [Fact]
        public async Task CanGenerarFactura_RetornaTrue_CuandoDentroDelLimite()
        {
            // Arrange — Tenant BASIC con 50/100 facturas usadas este mes
            var now = DateTime.UtcNow;
            var resetFecha = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            CreateTenant(101, "BASIC", facturasGeneradasMes: 50, facturasResetFecha: resetFecha);

            // Act
            var result = await _sut.CanGenerarFacturaAsync(101);

            // Assert
            result.Allowed.Should().BeTrue();
            result.Message.Should().BeNull();
            result.Current.Should().Be(50);
            result.Limit.Should().Be(100);
        }

        [Fact]
        public async Task CanGenerarFactura_RetornaTrueConOverage_CuandoSobreLimite()
        {
            // Arrange — Tenant BASIC con 150/100 facturas (permite pero marca overage)
            var now = DateTime.UtcNow;
            var resetFecha = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            CreateTenant(102, "BASIC", facturasGeneradasMes: 150, facturasResetFecha: resetFecha);

            // Act
            var result = await _sut.CanGenerarFacturaAsync(102);

            // Assert
            result.Allowed.Should().BeTrue(); // Permite pero con overage
            result.Message.Should().Contain("excedido");
            result.Current.Should().Be(150);
            result.Limit.Should().Be(100);
        }

        [Fact]
        public async Task CanGenerarFactura_RetornaFalse_CuandoTenantSinPlan()
        {
            // Arrange — Tenant sin PlanTipo asignado
            _db.Tenants.Add(new Tenant { Id = 103, NombreEmpresa = "Sin Plan", PlanTipo = null });
            _db.SaveChanges();

            // Act
            var result = await _sut.CanGenerarFacturaAsync(103);

            // Assert
            result.Allowed.Should().BeFalse();
            result.Message.Should().Contain("No se encontró un plan");
        }

        [Fact]
        public async Task CanGenerarFactura_RetornaFalse_CuandoTenantNoExiste()
        {
            // Act
            var result = await _sut.CanGenerarFacturaAsync(99999);

            // Assert
            result.Allowed.Should().BeFalse();
        }

        [Fact]
        public async Task CanGenerarFactura_ReseteaContadorVirtual_CuandoResetFechaEsDelMesPasado()
        {
            // Arrange — Tenant BASIC con 90 facturas pero reset del mes pasado
            // El servicio normaliza: si la fecha es del mes pasado, trata como 0 usadas
            var mesPasado = DateTime.UtcNow.AddMonths(-1);
            var resetAnterior = new DateTime(mesPasado.Year, mesPasado.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            CreateTenant(104, "BASIC", facturasGeneradasMes: 90, facturasResetFecha: resetAnterior);

            // Act
            var result = await _sut.CanGenerarFacturaAsync(104);

            // Assert
            result.Allowed.Should().BeTrue();
            result.Message.Should().BeNull();
            // El servicio normaliza el contador a 0 porque el reset es del mes anterior
            result.Current.Should().Be(0);
            result.Limit.Should().Be(100);
        }

        [Fact]
        public async Task CanGenerarFactura_RetornaTrue_CuandoPlanProConEspacioSuficiente()
        {
            // Arrange — Tenant PRO con 200/500 facturas
            var now = DateTime.UtcNow;
            var resetFecha = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            CreateTenant(105, "PRO", facturasGeneradasMes: 200, facturasResetFecha: resetFecha);

            // Act
            var result = await _sut.CanGenerarFacturaAsync(105);

            // Assert
            result.Allowed.Should().BeTrue();
            result.Message.Should().BeNull();
            result.Current.Should().Be(200);
            result.Limit.Should().Be(500);
        }

        // ── CanUsarTimbreAsync ──

        [Fact]
        public async Task CanUsarTimbre_RetornaFalse_CuandoPlanSinTimbres()
        {
            // Arrange — Tenant FREE (MaxTimbresMes=0)
            CreateTenant(110, "FREE");

            // Act
            var result = await _sut.CanUsarTimbreAsync(110);

            // Assert
            result.Allowed.Should().BeFalse();
            result.Message.Should().Contain("no incluye facturación");
        }

        [Fact]
        public async Task CanUsarTimbre_RetornaTrue_CuandoDentroDelLimite()
        {
            // Arrange — Tenant BASIC con timbres dentro del limite
            var now = DateTime.UtcNow;
            var resetFecha = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var tenant = new Tenant
            {
                Id = 111, NombreEmpresa = "Tenant Timbre OK", PlanTipo = "BASIC",
                TimbresUsadosMes = 50,
                TimbresResetFecha = resetFecha,
                TimbresExtras = 0
            };
            _db.Tenants.Add(tenant);
            _db.SaveChanges();

            // Act
            var result = await _sut.CanUsarTimbreAsync(111);

            // Assert
            result.Allowed.Should().BeTrue();
            result.Current.Should().Be(50);
            result.Limit.Should().Be(100); // MaxTimbresMes de BASIC + 0 extras
        }

        [Fact]
        public async Task CanUsarTimbre_RetornaFalse_CuandoSobreLimite()
        {
            // Arrange — Tenant BASIC con timbres agotados
            var now = DateTime.UtcNow;
            var resetFecha = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var tenant = new Tenant
            {
                Id = 112, NombreEmpresa = "Tenant Timbres Agotados", PlanTipo = "BASIC",
                TimbresUsadosMes = 100,
                TimbresResetFecha = resetFecha,
                TimbresExtras = 0
            };
            _db.Tenants.Add(tenant);
            _db.SaveChanges();

            // Act
            var result = await _sut.CanUsarTimbreAsync(112);

            // Assert
            result.Allowed.Should().BeFalse();
            result.Message.Should().NotBeNullOrEmpty();
            (result.Message!.Contains("agotado") || result.Message.Contains("máximo")).Should().BeTrue();
        }

        [Fact]
        public async Task CanUsarTimbre_ConsideraTimbresExtras_CuandoTieneExtras()
        {
            // Arrange — Tenant BASIC con 100 usados pero 50 extras = limite es 150
            var now = DateTime.UtcNow;
            var resetFecha = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var tenant = new Tenant
            {
                Id = 113, NombreEmpresa = "Tenant Con Extras", PlanTipo = "BASIC",
                TimbresUsadosMes = 100,
                TimbresResetFecha = resetFecha,
                TimbresExtras = 50
            };
            _db.Tenants.Add(tenant);
            _db.SaveChanges();

            // Act
            var result = await _sut.CanUsarTimbreAsync(113);

            // Assert
            result.Allowed.Should().BeTrue();
            result.Current.Should().Be(100);
            result.Limit.Should().Be(150); // 100 base + 50 extras
        }

        // ── NormalizePlanCode (implicitly via CanGenerarFacturaAsync) ──

        [Fact]
        public async Task CanGenerarFactura_NormalizaPlanCode_CuandoEsLegacy()
        {
            // Arrange — Tenant con PlanTipo "PROFESIONAL" (legacy) -> se mapea a PRO
            var now = DateTime.UtcNow;
            var resetFecha = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            CreateTenant(106, "PROFESIONAL", facturasGeneradasMes: 10, facturasResetFecha: resetFecha);

            // Act
            var result = await _sut.CanGenerarFacturaAsync(106);

            // Assert
            result.Allowed.Should().BeTrue();
            result.Limit.Should().Be(500); // PRO plan has 500
        }

        [Fact]
        public async Task CanGenerarFactura_NormalizaTrial_AFree()
        {
            // Arrange — Tenant con PlanTipo "Trial" -> se mapea a FREE
            CreateTenant(107, "Trial");

            // Act
            var result = await _sut.CanGenerarFacturaAsync(107);

            // Assert
            result.Allowed.Should().BeFalse();
            result.Message.Should().Contain("no incluye facturación");
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Close();
            _connection.Dispose();
        }
    }
}
