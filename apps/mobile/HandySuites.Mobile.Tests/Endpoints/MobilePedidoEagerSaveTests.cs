using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.MovimientosInventario.Services;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Services;
using HandySuites.Application.Usuarios.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories.Pedidos;
using HandySuites.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests del PedidoService.EagerSaveAsync (B.1 eager-save endpoint). Esto cubre
/// la capa Application (wrap del repo) — el repo ya tiene cobertura en
/// HandySuites.Tests.Application.Pedidos.PedidoEagerSaveTests.
///
/// Foco: validación + delegación al repo. Mockeamos las deps no usadas
/// (IUsuarioRepository, MovimientoInventarioService, ITransactionManager)
/// porque EagerSaveAsync solo usa _repository + _tenant.
///
/// NO testeamos HTTP pipeline (auth, model binding) porque no hay
/// WebApplicationFactory para Mobile API en este proyecto. El endpoint
/// solo invoca el service — la cobertura es transitiva.
/// </summary>
public class MobilePedidoEagerSaveTests : IDisposable
{
    private readonly HandySuitesDbContext _db;
    private readonly PedidoRepository _repository;
    private readonly PedidoService _service;
    private readonly Mock<ICurrentTenant> _tenant;

    private const int TenantId = 1;
    private const int UsuarioId = 10;
    private const int ProductoId = 200;
    private const int ClienteId = 300;

    public MobilePedidoEagerSaveTests()
    {
        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new HandySuitesDbContext(options);

        var tz = new Mock<ITenantTimeZoneService>();
        tz.Setup(t => t.GetTenantTodayMidnightUtcAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(DateTime.UtcNow.Date);
        _repository = new PedidoRepository(_db, tz.Object);

        _tenant = new Mock<ICurrentTenant>();
        _tenant.Setup(t => t.TenantId).Returns(TenantId);
        _tenant.Setup(t => t.UserId).Returns(UsuarioId.ToString());

        // EagerSaveAsync no usa estas deps — pasamos null!  con cast porque
        // PedidoService requiere los args en el ctor.
        _service = new PedidoService(
            _repository,
            _tenant.Object,
            Mock.Of<IUsuarioRepository>(),
            null!, // MovimientoInventarioService
            null!  // ITransactionManager
        );

        SeedFixtures();
    }

    private void SeedFixtures()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test SA" });
        _db.Productos.Add(new Producto
        {
            Id = ProductoId, TenantId = TenantId, Nombre = "P",
            CodigoBarra = "X", Descripcion = "X", PrecioBase = 10m, Activo = true
        });
        _db.Clientes.Add(new Cliente
        {
            Id = ClienteId, TenantId = TenantId, Nombre = "C",
            RFC = "XAXX010101000", Correo = "c@x.com", Telefono = "0", Direccion = "", Activo = true
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = UsuarioId, TenantId = TenantId, Email = "v@t.com", Nombre = "V",
            PasswordHash = "x", RolExplicito = RoleNames.Vendedor, Activo = true
        });
        _db.SaveChanges();
    }

    private static PedidoEagerSaveDto BuildDto(string mobileRecordId)
    {
        return new PedidoEagerSaveDto
        {
            MobileRecordId = mobileRecordId,
            ClienteId = ClienteId,
            FechaPedido = DateTime.UtcNow,
            TipoVenta = 0,
            Subtotal = 100m, Descuento = 0m, Impuesto = 16m, Total = 116m,
            Detalles = new()
            {
                new() { ProductoId = ProductoId, Cantidad = 5m, PrecioUnitario = 20m, Subtotal = 100m, Impuesto = 16m, Total = 116m }
            }
        };
    }

    [Fact]
    public async Task EagerSaveAsync_ThrowsInvalidOperation_WhenMobileRecordIdIsEmpty()
    {
        var dto = BuildDto("");

        var act = async () => await _service.EagerSaveAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*MobileRecordId*");
    }

    [Fact]
    public async Task EagerSaveAsync_ThrowsInvalidOperation_WhenMobileRecordIdIsWhitespace()
    {
        var dto = BuildDto("   ");

        var act = async () => await _service.EagerSaveAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*MobileRecordId*");
    }

    [Fact]
    public async Task EagerSaveAsync_ReturnsValidResultDto_OnSuccess()
    {
        var dto = BuildDto("wdb-success-test");

        var result = await _service.EagerSaveAsync(dto);

        result.Should().NotBeNull();
        result.ServerId.Should().BeGreaterThan(0);
        result.MobileRecordId.Should().Be("wdb-success-test");
        result.Estado.Should().Be((int)EstadoPedido.Borrador);
        result.Idempotent.Should().BeFalse();
        result.AckedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task EagerSaveAsync_ReadsTenantFromCurrentTenantContext()
    {
        var dto = BuildDto("wdb-tenant-context");
        await _service.EagerSaveAsync(dto);

        // Verificar que el Pedido se creó con el TenantId del contexto, no
        // hardcoded ni del payload (el payload NO contiene TenantId — se
        // toma de ICurrentTenant.TenantId vía claim/JWT en producción).
        var pedido = await _db.Pedidos.AsNoTracking()
            .FirstOrDefaultAsync(p => p.MobileRecordId == "wdb-tenant-context");
        pedido.Should().NotBeNull();
        pedido!.TenantId.Should().Be(TenantId);
        pedido.UsuarioId.Should().Be(UsuarioId);

        _tenant.VerifyGet(t => t.TenantId, Times.AtLeastOnce);
        _tenant.VerifyGet(t => t.UserId, Times.AtLeastOnce);
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}
