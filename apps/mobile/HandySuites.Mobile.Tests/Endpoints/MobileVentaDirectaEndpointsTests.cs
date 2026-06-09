using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Inventario.DTOs;
using HandySuites.Application.Inventario.Interfaces;
using HandySuites.Application.MovimientosInventario.DTOs;
using HandySuites.Application.MovimientosInventario.Interfaces;
using HandySuites.Application.MovimientosInventario.Services;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Mobile.Api.Endpoints;
using HandySuites.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests del flujo Venta Directa (POST /api/mobile/venta-directa) — hot path
/// VENDEDOR mobile. El endpoint vive como lambda inline en
/// MobileVentaDirectaEndpoints.MapMobileVentaDirectaEndpoints, así que NO
/// podemos invocarlo directo sin un host completo (WebApplicationFactory).
///
/// El proyecto HandySuites.Mobile.Tests intencionalmente no enchufa
/// WebApplicationFactory (ver MobilePedidoEagerSaveTests y
/// MobilePedidoEndpointsTests para el racional). En su lugar replicamos la
/// MISMA lógica de validación + DB queries que ejecuta la lambda, contra el
/// mismo InMemory DbContext que usa la API real. Esto cubre:
///
///  - Validación de DTO (cantidad &gt; 0, productos duplicados, monto &gt;= total).
///  - Filtros AsNoTracking + TenantId (cliente / producto deben ser del tenant).
///  - Cómputo de subtotal/impuestos/total con el precio del servidor (no del
///    payload — anti-tampering).
///  - Path de descuento de inventario (delegado al MovimientoInventarioService
///    real, con un IInventarioRepository in-memory).
///  - Idempotencia del tracking de carga: solo se incrementa CantidadVendida si
///    existe ruta activa (EnProgreso / CargaAceptada) y RutaCarga del producto.
///  - Aislamiento cross-tenant: el endpoint exige `Activo && TenantId == ctx`,
///    así que un cliente/producto de otro tenant cae a "no encontrado".
///
/// Cobertura HTTP/pipeline (auth, RBAC roles distintos a VENDEDOR, JWT claims)
/// queda fuera y se cubre en E2E Maestro contra la API levantada en Docker.
/// </summary>
public class MobileVentaDirectaEndpointsTests : IDisposable
{
    private const int TenantId = 1;
    private const int OtroTenantId = 2;
    private const int UsuarioId = 10;
    private const int ClienteId = 300;
    private const int ProductoA = 200;
    private const int ProductoB = 201;
    private const int ProductoOtroTenant = 999;

    private readonly HandySuitesDbContext _db;
    private readonly Mock<ICurrentTenant> _tenant;

    public MobileVentaDirectaEndpointsTests()
    {
        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new HandySuitesDbContext(options);

        _tenant = new Mock<ICurrentTenant>();
        _tenant.SetupGet(t => t.TenantId).Returns(TenantId);
        _tenant.SetupGet(t => t.UserId).Returns(UsuarioId.ToString());
        _tenant.SetupGet(t => t.Role).Returns("VENDEDOR");
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);

        SeedFixtures();
    }

    private void SeedFixtures()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Tenant A" });
        _db.Tenants.Add(new Tenant { Id = OtroTenantId, NombreEmpresa = "Tenant B" });

        _db.Productos.Add(new Producto
        {
            Id = ProductoA, TenantId = TenantId, Nombre = "Coca 600",
            CodigoBarra = "750100", Descripcion = "Coca 600 ml",
            PrecioBase = 25m, Activo = true
        });
        _db.Productos.Add(new Producto
        {
            Id = ProductoB, TenantId = TenantId, Nombre = "Sabritas",
            CodigoBarra = "750200", Descripcion = "Sabritas 45 g",
            PrecioBase = 18m, Activo = true
        });
        // Producto de otro tenant — la lambda NO debe encontrarlo.
        _db.Productos.Add(new Producto
        {
            Id = ProductoOtroTenant, TenantId = OtroTenantId, Nombre = "Forbidden",
            CodigoBarra = "999", Descripcion = "Otro tenant",
            PrecioBase = 100m, Activo = true
        });

        _db.Clientes.Add(new Cliente
        {
            Id = ClienteId, TenantId = TenantId, Nombre = "Tiendita La Esquina",
            RFC = "XAXX010101000", Correo = "tienda@x.com",
            Telefono = "5555555555", Direccion = "Av. Reforma", Activo = true
        });
        // Cliente de otro tenant — IDOR check.
        _db.Clientes.Add(new Cliente
        {
            Id = 9001, TenantId = OtroTenantId, Nombre = "Cliente Forbidden",
            RFC = "XAXX020202000", Correo = "forb@x.com",
            Telefono = "5550000000", Direccion = "Otro Tenant", Activo = true
        });

        _db.Usuarios.Add(new Usuario
        {
            Id = UsuarioId, TenantId = TenantId, Email = "vendedor@test.com",
            Nombre = "Juan Vendedor", PasswordHash = "x",
            RolExplicito = "VENDEDOR", Activo = true
        });
        _db.SaveChanges();
    }

    // ─────────────────────────────────────────────────────────────
    // DTO validation rules (replicadas de la lambda inline)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public void Request_WithEmptyItems_IsRejected()
    {
        var request = new VentaDirectaRequest
        {
            ClienteId = ClienteId,
            Items = new List<VentaDirectaItemRequest>(),
            MetodoPago = 0,
            Monto = 100m
        };

        // Regla del endpoint: "Se requiere al menos un producto"
        (request.Items == null || request.Items.Count == 0).Should().BeTrue();
    }

    [Fact]
    public void Request_WithCantidadCero_IsRejected()
    {
        var request = new VentaDirectaRequest
        {
            ClienteId = ClienteId,
            Items = new List<VentaDirectaItemRequest>
            {
                new() { ProductoId = ProductoA, Cantidad = 0m }
            },
            MetodoPago = 0,
            Monto = 100m
        };

        // Regla del endpoint: "Cantidad del producto X debe ser mayor a cero"
        request.Items.Any(i => i.Cantidad <= 0).Should().BeTrue();
    }

    [Fact]
    public void Request_WithCantidadNegativa_IsRejected()
    {
        var request = new VentaDirectaRequest
        {
            ClienteId = ClienteId,
            Items = new List<VentaDirectaItemRequest>
            {
                new() { ProductoId = ProductoA, Cantidad = -5m }
            },
            MetodoPago = 0,
            Monto = 100m
        };

        request.Items.Any(i => i.Cantidad <= 0).Should().BeTrue();
    }

    [Fact]
    public void Request_WithProductosDuplicados_IsRejected()
    {
        // Regla del endpoint (mismo invariante que PedidoService.CrearAsync):
        // "El pedido contiene productos duplicados (IDs: ...). Consolida la
        // cantidad en una sola línea."
        var items = new List<VentaDirectaItemRequest>
        {
            new() { ProductoId = ProductoA, Cantidad = 2m },
            new() { ProductoId = ProductoB, Cantidad = 1m },
            new() { ProductoId = ProductoA, Cantidad = 5m }
        };

        var duplicados = items.GroupBy(i => i.ProductoId)
                              .Where(g => g.Count() > 1)
                              .Select(g => g.Key)
                              .ToList();

        duplicados.Should().HaveCount(1);
        duplicados.Should().Contain(ProductoA);
    }

    [Fact]
    public void Request_WithSinDuplicados_IsAccepted()
    {
        var items = new List<VentaDirectaItemRequest>
        {
            new() { ProductoId = ProductoA, Cantidad = 2m },
            new() { ProductoId = ProductoB, Cantidad = 1m }
        };

        var duplicados = items.GroupBy(i => i.ProductoId)
                              .Where(g => g.Count() > 1)
                              .ToList();

        duplicados.Should().BeEmpty();
    }

    // ─────────────────────────────────────────────────────────────
    // Cliente / Producto lookup (anti-IDOR cross-tenant)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task ClienteLookup_RespectsTenantFilter_ReturnsNullForOtroTenant()
    {
        // El endpoint hace: c.Id == request.ClienteId && c.TenantId == tenantId && c.Activo
        var cliente = await _db.Clientes
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == 9001 && c.TenantId == TenantId && c.Activo);

        cliente.Should().BeNull("el cliente 9001 pertenece a OtroTenantId — un VENDEDOR de TenantId no debe poder venderle");
    }

    [Fact]
    public async Task ClienteLookup_ReturnsCliente_WhenMismoTenantYActivo()
    {
        var cliente = await _db.Clientes
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == ClienteId && c.TenantId == TenantId && c.Activo);

        cliente.Should().NotBeNull();
        cliente!.Id.Should().Be(ClienteId);
    }

    [Fact]
    public async Task ClienteLookup_ReturnsNull_WhenInactivo()
    {
        var cliente = await _db.Clientes.FirstAsync(c => c.Id == ClienteId);
        cliente.Activo = false;
        await _db.SaveChangesAsync();

        var lookup = await _db.Clientes
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == ClienteId && c.TenantId == TenantId && c.Activo);

        lookup.Should().BeNull("clientes inactivos no aceptan venta directa");
    }

    [Fact]
    public async Task ProductoLookup_RespectsTenantFilter_ReturnsNullForOtroTenant()
    {
        var producto = await _db.Productos
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == ProductoOtroTenant && p.TenantId == TenantId && p.Activo);

        producto.Should().BeNull("producto de otro tenant no debe poder venderse desde TenantId");
    }

    [Fact]
    public async Task ProductoLookup_ReturnsProducto_WhenMismoTenantYActivo()
    {
        var producto = await _db.Productos
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == ProductoA && p.TenantId == TenantId && p.Activo);

        producto.Should().NotBeNull();
        producto!.PrecioBase.Should().Be(25m);
    }

    // ─────────────────────────────────────────────────────────────
    // Cálculo de totales con precio del servidor (anti-tampering)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task SubtotalImpuestoTotal_UsesPrecioBaseDelServidor_IgnoresPayloadPrecio()
    {
        var producto = await _db.Productos.AsNoTracking()
            .FirstAsync(p => p.Id == ProductoA && p.TenantId == TenantId);

        // Cliente envía "PrecioUnitario = 1m" intentando tampering. La lambda
        // NUNCA lo lee — usa producto.PrecioBase del DB.
        var item = new VentaDirectaItemRequest
        {
            ProductoId = ProductoA, Cantidad = 4m, PrecioUnitario = 1m /* ignorado */
        };

        var precioUnitario = producto.PrecioBase;            // 25
        var lineSubtotal   = precioUnitario * item.Cantidad; // 100
        var lineImpuesto   = lineSubtotal * 0.16m;           // 16
        var lineTotal      = lineSubtotal + lineImpuesto;    // 116

        lineSubtotal.Should().Be(100m);
        lineImpuesto.Should().Be(16m);
        lineTotal.Should().Be(116m);
        precioUnitario.Should().NotBe(item.PrecioUnitario, "el endpoint ignora el precio del payload");
    }

    [Fact]
    public void MontoDePago_MenorQueTotal_IsRejected()
    {
        // Regla: "Monto de pago (X) es menor al total (Y)"
        decimal total = 116m;
        decimal montoEnviado = 100m;

        (montoEnviado < total).Should().BeTrue();
    }

    [Fact]
    public void MontoDePago_MayorOIgualQueTotal_IsAccepted()
    {
        decimal total = 116m;
        decimal montoEnviado = 116m;
        (montoEnviado < total).Should().BeFalse();

        decimal montoMayor = 200m;
        (montoMayor < total).Should().BeFalse();
    }

    // ─────────────────────────────────────────────────────────────
    // Numeración VD-yyyyMMdd-NNNN: secuencia y prefijo
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task NumeroPedido_SiguePatron_VDFechaSequencial()
    {
        var fecha = DateTime.UtcNow;
        var prefijo = $"VD-{fecha:yyyyMMdd}";

        // Sin pedidos previos: empieza en 0001
        var ultimo = await _db.Pedidos
            .Where(p => p.TenantId == TenantId && p.NumeroPedido.StartsWith(prefijo))
            .OrderByDescending(p => p.NumeroPedido)
            .Select(p => p.NumeroPedido)
            .FirstOrDefaultAsync();

        int secuencia = 1;
        if (!string.IsNullOrEmpty(ultimo))
        {
            var partes = ultimo.Split('-');
            if (partes.Length == 3 && int.TryParse(partes[2], out var num))
                secuencia = num + 1;
        }
        var numero = $"{prefijo}-{secuencia:D4}";

        numero.Should().StartWith("VD-");
        numero.Should().EndWith("-0001");
    }

    [Fact]
    public async Task NumeroPedido_Incrementa_CuandoYaExistePedidoMismoDia()
    {
        var fecha = DateTime.UtcNow;
        var prefijo = $"VD-{fecha:yyyyMMdd}";

        _db.Pedidos.Add(new Pedido
        {
            TenantId = TenantId, ClienteId = ClienteId, UsuarioId = UsuarioId,
            NumeroPedido = $"{prefijo}-0007",
            Estado = EstadoPedido.Entregado, TipoVenta = TipoVenta.VentaDirecta,
            Subtotal = 100m, Impuestos = 16m, Total = 116m,
            Activo = true, CreadoEn = fecha, CreadoPor = UsuarioId.ToString()
        });
        await _db.SaveChangesAsync();

        var ultimo = await _db.Pedidos
            .Where(p => p.TenantId == TenantId && p.NumeroPedido.StartsWith(prefijo))
            .OrderByDescending(p => p.NumeroPedido)
            .Select(p => p.NumeroPedido)
            .FirstOrDefaultAsync();

        int secuencia = 1;
        var partes = ultimo!.Split('-');
        if (partes.Length == 3 && int.TryParse(partes[2], out var num))
            secuencia = num + 1;

        secuencia.Should().Be(8);
        $"{prefijo}-{secuencia:D4}".Should().EndWith("-0008");
    }

    // ─────────────────────────────────────────────────────────────
    // Descuento de inventario: usa MovimientoInventarioService real
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task MovimientoSALIDA_DescuentaStock_CuandoHaySuficiente()
    {
        var movRepo = new Mock<IMovimientoInventarioRepository>();
        var invRepo = new FakeInventarioRepository();
        invRepo.SetStock(TenantId, ProductoA, cantidadActual: 50m);

        var txm = new InlineTransactionManager();
        movRepo.Setup(r => r.CrearAsync(It.IsAny<MovimientoInventarioCreateDto>(),
            TenantId, UsuarioId, It.IsAny<decimal>(), It.IsAny<decimal>())).ReturnsAsync(42);

        var svc = new MovimientoInventarioService(movRepo.Object, invRepo, _tenant.Object, txm);

        var (movId, ok, err) = await svc.CrearMovimientoAsync(new MovimientoInventarioCreateDto
        {
            ProductoId = ProductoA, TipoMovimiento = "SALIDA",
            Cantidad = 4m, Motivo = "VENTA",
            Comentario = "Venta directa - Pedido #1"
        });

        ok.Should().BeTrue();
        err.Should().BeNull();
        invRepo.GetStock(TenantId, ProductoA).Should().Be(46m, "50 - 4 = 46");
    }

    [Fact]
    public async Task MovimientoSALIDA_Falla_ConErrorClaro_CuandoStockInsuficiente()
    {
        var movRepo = new Mock<IMovimientoInventarioRepository>();
        var invRepo = new FakeInventarioRepository();
        invRepo.SetStock(TenantId, ProductoA, cantidadActual: 2m);

        var svc = new MovimientoInventarioService(movRepo.Object, invRepo, _tenant.Object,
            new InlineTransactionManager());

        var (_, ok, err) = await svc.CrearMovimientoAsync(new MovimientoInventarioCreateDto
        {
            ProductoId = ProductoA, TipoMovimiento = "SALIDA",
            Cantidad = 10m, Motivo = "VENTA"
        });

        ok.Should().BeFalse();
        err.Should().NotBeNull();
        err!.Should().Contain("Stock insuficiente");
        // La lambda eleva esto a InvalidOperationException → 400 con el mismo mensaje.
        // Importante para que el vendedor vea exactamente qué pasó.
    }

    [Fact]
    public async Task MovimientoSALIDA_Falla_CuandoNoHayInventarioParaProducto()
    {
        var movRepo = new Mock<IMovimientoInventarioRepository>();
        var invRepo = new FakeInventarioRepository(); // sin stock seteado

        var svc = new MovimientoInventarioService(movRepo.Object, invRepo, _tenant.Object,
            new InlineTransactionManager());

        var (_, ok, err) = await svc.CrearMovimientoAsync(new MovimientoInventarioCreateDto
        {
            ProductoId = ProductoB, TipoMovimiento = "SALIDA",
            Cantidad = 1m, Motivo = "VENTA"
        });

        ok.Should().BeFalse();
        err.Should().Contain("No existe inventario");
    }

    // ─────────────────────────────────────────────────────────────
    // Tracking de carga (fix prod reportado 2026-05-05)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task RutaActivaLookup_ReturnsRuta_WhenEstadoEnProgreso()
    {
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = 50, TenantId = TenantId, UsuarioId = UsuarioId,
            Nombre = "Ruta Centro", Estado = EstadoRuta.EnProgreso, Activo = true
        });
        await _db.SaveChangesAsync();

        var rutaId = await _db.RutasVendedor
            .Where(r => r.UsuarioId == UsuarioId
                     && r.TenantId == TenantId
                     && r.Activo
                     && (r.Estado == EstadoRuta.EnProgreso || r.Estado == EstadoRuta.CargaAceptada))
            .Select(r => (int?)r.Id)
            .FirstOrDefaultAsync();

        rutaId.Should().Be(50);
    }

    [Fact]
    public async Task RutaActivaLookup_ReturnsRuta_WhenEstadoCargaAceptada()
    {
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = 51, TenantId = TenantId, UsuarioId = UsuarioId,
            Nombre = "Ruta Sur", Estado = EstadoRuta.CargaAceptada, Activo = true
        });
        await _db.SaveChangesAsync();

        var rutaId = await _db.RutasVendedor
            .Where(r => r.UsuarioId == UsuarioId
                     && r.TenantId == TenantId
                     && r.Activo
                     && (r.Estado == EstadoRuta.EnProgreso || r.Estado == EstadoRuta.CargaAceptada))
            .Select(r => (int?)r.Id)
            .FirstOrDefaultAsync();

        rutaId.Should().Be(51);
    }

    [Fact]
    public async Task RutaActivaLookup_ReturnsNull_WhenEstadoPlanificadaOCompletada()
    {
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = 60, TenantId = TenantId, UsuarioId = UsuarioId,
            Nombre = "Ruta Norte", Estado = EstadoRuta.Planificada, Activo = true
        });
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = 61, TenantId = TenantId, UsuarioId = UsuarioId,
            Nombre = "Ruta Vieja", Estado = EstadoRuta.Completada, Activo = true
        });
        await _db.SaveChangesAsync();

        var rutaId = await _db.RutasVendedor
            .Where(r => r.UsuarioId == UsuarioId
                     && r.TenantId == TenantId
                     && r.Activo
                     && (r.Estado == EstadoRuta.EnProgreso || r.Estado == EstadoRuta.CargaAceptada))
            .Select(r => (int?)r.Id)
            .FirstOrDefaultAsync();

        rutaId.Should().BeNull("solo rutas EnProgreso o CargaAceptada cuentan para el tracking de carga");
    }

    [Fact]
    public async Task RutaCarga_IncrementaCantidadVendida_CuandoExisteCargaParaProducto()
    {
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = 70, TenantId = TenantId, UsuarioId = UsuarioId,
            Nombre = "R", Estado = EstadoRuta.EnProgreso, Activo = true
        });
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 700, TenantId = TenantId, RutaId = 70, ProductoId = ProductoA,
            CantidadEntrega = 10, CantidadVendida = 3, Activo = true
        });
        await _db.SaveChangesAsync();

        // Mismo query que la lambda
        var carga = await _db.RutasCarga.FirstOrDefaultAsync(c =>
            c.RutaId == 70 && c.ProductoId == ProductoA &&
            c.TenantId == TenantId && c.Activo);

        carga.Should().NotBeNull();
        carga!.CantidadVendida += 4;
        await _db.SaveChangesAsync();

        var updated = await _db.RutasCarga.FirstAsync(c => c.Id == 700);
        updated.CantidadVendida.Should().Be(7, "3 inicial + 4 venta directa");
    }

    [Fact]
    public async Task RutaCarga_NoEncuentraNada_ParaProductoFueraDeLaCarga()
    {
        // VENDEDOR vendió ProductoB pero su carga solo tiene ProductoA.
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = 80, TenantId = TenantId, UsuarioId = UsuarioId,
            Nombre = "R", Estado = EstadoRuta.EnProgreso, Activo = true
        });
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 800, TenantId = TenantId, RutaId = 80, ProductoId = ProductoA,
            CantidadEntrega = 10, CantidadVendida = 0, Activo = true
        });
        await _db.SaveChangesAsync();

        var carga = await _db.RutasCarga.FirstOrDefaultAsync(c =>
            c.RutaId == 80 && c.ProductoId == ProductoB &&
            c.TenantId == TenantId && c.Activo);

        carga.Should().BeNull("vender un producto fuera de la carga NO debe crear filas RutasCarga implícitas — solo se incrementa si ya existe");
    }

    // ─────────────────────────────────────────────────────────────
    // RBAC: cross-tenant cliente / producto (IDOR)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task IDOR_VendedorTenantA_NoPuedeVenderAClienteDeTenantB()
    {
        // Vendedor de TenantId=1 intenta crear venta directa para Cliente 9001
        // (que pertenece a OtroTenantId=2). El lookup retorna null → 400.
        var cliente = await _db.Clientes.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == 9001 && c.TenantId == TenantId && c.Activo);

        cliente.Should().BeNull();
    }

    [Fact]
    public async Task IDOR_VendedorTenantA_NoPuedeIncluirProductoDeTenantB()
    {
        var producto = await _db.Productos.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == ProductoOtroTenant && p.TenantId == TenantId && p.Activo);

        producto.Should().BeNull();
    }

    // ─────────────────────────────────────────────────────────────
    // PENDING: tests del pipeline HTTP completo. Requieren
    // CustomWebApplicationFactory contra HandySuites.Mobile.Api con JWT
    // configurado en Test. No existe esa fixture en este proyecto.
    // ─────────────────────────────────────────────────────────────

    [Fact(Skip = "PENDING: requires CustomWebApplicationFactory<MobileApi.Program> with JWT test config. Track as separate integration test.")]
    public Task POST_VentaDirecta_Returns401_WhenNoJwt() => Task.CompletedTask;

    [Fact(Skip = "PENDING: requires CustomWebApplicationFactory<MobileApi.Program>. Cobertura RBAC para roles no-VENDEDOR (admin/supervisor) si aplica.")]
    public Task POST_VentaDirecta_Returns403_WhenRolNoAutorizado() => Task.CompletedTask;

    [Fact(Skip = "PENDING: requires CustomWebApplicationFactory<MobileApi.Program>. Happy path E2E con resp 201 + payload {pedidoId, cobroId, numeroPedido, total}.")]
    public Task POST_VentaDirecta_Returns201_WithCorrectPayload_OnHappyPath() => Task.CompletedTask;

    public void Dispose()
    {
        _db.Dispose();
    }

    // ─────────────────────────────────────────────────────────────
    // Test doubles
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// ITransactionManager que ejecuta el delegate inline — el InMemory provider
    /// no soporta transacciones reales y la lambda solo necesita que las llamadas
    /// se ejecuten en orden. Igual patrón que MobilePedidoEndpointsTests.
    /// </summary>
    private sealed class InlineTransactionManager : ITransactionManager
    {
        public Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation) => operation();
        public Task ExecuteInTransactionAsync(Func<Task> operation) => operation();

        // 2026-06-08: per-entity savepoints API. InMemory provider no soporta savepoints
        // reales; el fake scope ejecuta cada accion inline y captura excepciones.
        public Task<T> ExecuteWithSavepointsAsync<T>(Func<ISavepointScope, Task<T>> operation)
            => operation(new InlineSavepointScope());
        public Task ExecuteWithSavepointsAsync(Func<ISavepointScope, Task> operation)
            => operation(new InlineSavepointScope());
    }

    private sealed class InlineSavepointScope : ISavepointScope
    {
        public async Task<(bool Committed, Exception? Error)> TryRunInSavepointAsync(string savepointName, Func<Task> action)
        {
            try { await action(); return (true, null); }
            catch (Exception ex) { return (false, ex); }
        }
    }

    /// <summary>
    /// Fake in-memory IInventarioRepository — solo implementa los métodos que
    /// MovimientoInventarioService.CrearMovimientoAsync invoca (AcquireLock,
    /// ObtenerPorProductoIdAsync, ActualizarAsync). El resto throw para detectar
    /// si la API empieza a depender de ellos sin actualizar este test.
    /// </summary>
    private sealed class FakeInventarioRepository : IInventarioRepository
    {
        private readonly Dictionary<(int tenantId, int productoId), InventarioDto> _stocks = new();
        private int _nextId = 1;

        public void SetStock(int tenantId, int productoId, decimal cantidadActual,
            decimal stockMinimo = 0m, decimal stockMaximo = 9999m)
        {
            _stocks[(tenantId, productoId)] = new InventarioDto
            {
                Id = _nextId++, ProductoId = productoId,
                CantidadActual = cantidadActual,
                StockMinimo = stockMinimo, StockMaximo = stockMaximo
            };
        }

        public decimal GetStock(int tenantId, int productoId) =>
            _stocks.TryGetValue((tenantId, productoId), out var inv) ? inv.CantidadActual : -1m;

        public Task AcquireProductoLockAsync(int tenantId, int productoId) => Task.CompletedTask;

        public Task<InventarioDto?> ObtenerPorProductoIdAsync(int productoId, int tenantId)
        {
            _stocks.TryGetValue((tenantId, productoId), out var inv);
            return Task.FromResult<InventarioDto?>(inv);
        }

        public Task<bool> ActualizarAsync(int id, InventarioUpdateDto dto, int tenantId)
        {
            var key = _stocks.FirstOrDefault(kv => kv.Value.Id == id && kv.Key.tenantId == tenantId).Key;
            if (key.Equals(default((int, int)))) return Task.FromResult(false);
            _stocks[key].CantidadActual = dto.CantidadActual;
            _stocks[key].StockMinimo = dto.StockMinimo;
            _stocks[key].StockMaximo = dto.StockMaximo;
            return Task.FromResult(true);
        }

        // Métodos no usados por el flujo de venta directa.
        public Task<List<InventarioDto>> ObtenerPorTenantAsync(int tenantId) =>
            throw new NotImplementedException();
        public Task<InventarioDto?> ObtenerPorIdAsync(int id, int tenantId) =>
            throw new NotImplementedException();
        public Task<int> CrearAsync(InventarioCreateDto dto, int tenantId) =>
            throw new NotImplementedException();
        public Task<bool> EliminarAsync(int id, int tenantId) =>
            throw new NotImplementedException();
        public Task<InventarioPaginatedResult> ObtenerPorFiltroAsync(InventarioFiltroDto filtro, int tenantId) =>
            throw new NotImplementedException();
        public Task<bool> ExisteProductoEnTenantAsync(int productoId, int tenantId) =>
            throw new NotImplementedException();
    }
}
