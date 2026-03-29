using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Multitenancy;
using HandySales.Application.Clientes.Interfaces;
using HandySales.Application.Clientes.Services;
using Microsoft.EntityFrameworkCore;
using HandySales.Shared.Security;
using HandySales.Application.Usuarios.Interfaces;
using HandySales.Infrastructure.Repositories;
using FluentValidation;
using FluentValidation.AspNetCore;
using HandySales.Application.Clientes.Validators;
using HandySales.Application.Usuarios.Validators;
using HandySales.Application.Pedidos.Interfaces;
using HandySales.Application.Pedidos.Services;
using HandySales.Infrastructure.Repositories.Pedidos;
using HandySales.Application.Pedidos.Validators;
using HandySales.Application.Visitas.Interfaces;
using HandySales.Application.Visitas.Services;
using HandySales.Infrastructure.Repositories.Visitas;
using HandySales.Application.Productos.Interfaces;
using HandySales.Application.Productos.Services;
using HandySales.Infrastructure.Productos.Repositories;
using HandySales.Application.Rutas.Interfaces;
using HandySales.Application.Rutas.Services;
using HandySales.Infrastructure.Repositories.Rutas;
using HandySales.Application.Sync.Interfaces;
using HandySales.Application.Sync.Services;
using HandySales.Infrastructure.Repositories.Sync;
using HandySales.Application.DeviceSessions.Interfaces;
using HandySales.Application.DeviceSessions.Services;
using HandySales.Infrastructure.Repositories.DeviceSessions;
using HandySales.Application.ListasPrecios.Interfaces;
using HandySales.Application.ListasPrecios.Services;
using HandySales.Infrastructure.ListasPrecios.Repositories;
using HandySales.Application.Precios.Interfaces;
using HandySales.Application.Precios.Services;
using HandySales.Infrastructure.Precios.Repositories;
using HandySales.Application.Descuentos.Interfaces;
using HandySales.Application.Descuentos.Services;
using HandySales.Infrastructure.Descuentos.Repositories;
using HandySales.Application.Promociones.Interfaces;
using HandySales.Application.Promociones.Services;
using HandySales.Infrastructure.Promociones.Repositories;
using HandySales.Application.Inventario.Interfaces;
using HandySales.Application.Inventario.Services;
using HandySales.Infrastructure.Inventario.Repositories;
using HandySales.Application.MovimientosInventario.Interfaces;
using HandySales.Application.MovimientosInventario.Services;
using HandySales.Infrastructure.MovimientosInventario.Repositories;
using HandySales.Application.Cobranza.Interfaces;
using HandySales.Application.Cobranza.Services;
using HandySales.Infrastructure.Repositories.Cobranza;
using HandySales.Application.Zonas.Interfaces;
using HandySales.Application.Zonas.Services;
using HandySales.Infrastructure.Zonas.Repositories;
using HandySales.Application.CategoriasClientes.Interfaces;
using HandySales.Application.CategoriasClientes.Services;
using HandySales.Infrastructure.CategoriasClientes.Repositories;
using HandySales.Application.CategoriasProductos.Interfaces;
using HandySales.Application.CategoriasProductos.Services;
using HandySales.Infrastructure.CategoriasProductos.Repositories;
using HandySales.Application.FamiliasProductos.Interfaces;
using HandySales.Application.FamiliasProductos.Services;
using HandySales.Infrastructure.FamiliasProductos.Repositories;
using HandySales.Mobile.Api.Services;

namespace HandySales.Mobile.Api.Configuration;

public static class ServiceRegistrationExtensions
{
    public static IServiceCollection AddMobileServices(this IServiceCollection services, IConfiguration config)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        Console.WriteLine($"[Mobile API] Entorno actual: {environment}");

        // HttpContextAccessor es necesario para ITenantContextService
        services.AddHttpContextAccessor();

        // Servicio de tenant para Global Query Filters
        services.AddScoped<ITenantContextService, TenantContextService>();

        if (environment != "Testing")
        {
            services.AddDbContext<HandySalesDbContext>(options =>
                options.UseNpgsql(
                    config.GetConnectionString("DefaultConnection"),
                    o =>
                    {
                        o.UseVector();
                        o.EnableRetryOnFailure(
                            maxRetryCount: 3,
                            maxRetryDelay: TimeSpan.FromSeconds(5),
                            errorCodesToAdd: null);
                        o.CommandTimeout(30);
                    }
                ));
        }

        services.AddFluentValidationAutoValidation();

        // Core Services
        services.AddScoped<JwtTokenGenerator>();
        services.AddScoped<ICurrentTenant, CurrentTenant>();
        services.AddScoped<MobileAuthService>();

        // Push Notifications (HttpClient for Expo Push API)
        services.AddHttpClient<PushNotificationService>();
        services.AddScoped<HandySales.Infrastructure.Notifications.Services.NotificationSettingsService>();
        services.AddScoped<OrderNotificationHelper>();
        services.AddScoped<StockNotificationService>();

        // Sync notification bridge (Mobile API → Main API via HTTP)
        var mainApiUrl = config["MainApiUrl"] ?? "http://localhost:1050";
        services.AddHttpClient<SyncNotificationService>(client =>
        {
            client.BaseAddress = new Uri(mainApiUrl);
            client.Timeout = TimeSpan.FromSeconds(5);
        });

        // Usuarios
        services.AddScoped<IUsuarioRepository, UsuarioRepository>();
        services.AddValidatorsFromAssemblyContaining<UsuarioLoginDtoValidator>();

        // Clientes
        services.AddScoped<IClienteRepository, ClienteRepository>();
        services.AddScoped<ClienteService>();
        services.AddValidatorsFromAssemblyContaining<ClienteCreateDtoValidator>();

        // Productos
        services.AddScoped<IProductoRepository, ProductoRepository>();
        services.AddScoped<ProductoService>();

        // Pedidos (Core functionality for mobile)
        services.AddScoped<IPedidoRepository, PedidoRepository>();
        services.AddScoped<PedidoService>();
        services.AddValidatorsFromAssemblyContaining<PedidoCreateDtoValidator>();

        // Visitas (Core functionality for mobile)
        services.AddScoped<IClienteVisitaRepository, ClienteVisitaRepository>();
        services.AddScoped<ClienteVisitaService>();

        // Rutas de Vendedor
        services.AddScoped<IRutaVendedorRepository, RutaVendedorRepository>();
        services.AddScoped<RutaVendedorService>();

        // Device Sessions (for mobile device management)
        services.AddScoped<IDeviceSessionRepository, DeviceSessionRepository>();
        services.AddScoped<DeviceSessionService>();

        // Sync Service (for offline sync)
        services.AddScoped<ISyncRepository, SyncRepository>();
        services.AddScoped<SyncService>();

        // Precios y Listas de Precios
        services.AddScoped<IListaPrecioRepository, ListaPrecioRepository>();
        services.AddScoped<ListaPrecioService>();
        services.AddScoped<IPrecioPorProductoRepository, PrecioPorProductoRepository>();
        services.AddScoped<PrecioPorProductoService>();

        // Descuentos y Promociones
        services.AddScoped<IDescuentoPorCantidadRepository, DescuentoPorCantidadRepository>();
        services.AddScoped<DescuentoPorCantidadService>();
        services.AddScoped<IPromocionRepository, PromocionRepository>();
        services.AddScoped<PromocionService>();

        // Inventario
        services.AddScoped<IInventarioRepository, InventarioRepository>();
        services.AddScoped<InventarioService>();
        services.AddScoped<IMovimientoInventarioRepository, MovimientoInventarioRepository>();
        services.AddScoped<MovimientoInventarioService>();
        services.AddScoped<HandySales.Application.Common.Interfaces.ITransactionManager, HandySales.Infrastructure.Persistence.TransactionManager>();

        // Crash Reports
        services.AddScoped<HandySales.Application.CrashReporting.ICrashReportRepository, HandySales.Infrastructure.Repositories.CrashReportRepository>();

        // Cobranza
        services.AddScoped<ICobroRepository, CobroRepository>();
        services.AddScoped<CobroService>();

        // Catálogos (Zonas, Categorías, Familias)
        services.AddScoped<IZonaRepository, ZonaRepository>();
        services.AddScoped<ZonaService>();
        services.AddScoped<ICategoriaClienteRepository, CategoriaClienteRepository>();
        services.AddScoped<CategoriaClienteService>();
        services.AddScoped<ICategoriaProductoRepository, CategoriaProductoRepository>();
        services.AddScoped<CategoriaProductoService>();
        services.AddScoped<IFamiliaProductoRepository, FamiliaProductoRepository>();
        services.AddScoped<FamiliaProductoService>();

        return services;
    }
}
