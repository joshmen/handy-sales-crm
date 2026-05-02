using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using HandySuites.Application.Clientes.Interfaces;
using HandySuites.Application.Clientes.Services;
using Microsoft.EntityFrameworkCore;
using HandySuites.Shared.Security;
using HandySuites.Application.Usuarios.Interfaces;
using HandySuites.Infrastructure.Repositories;
using FluentValidation;
using FluentValidation.AspNetCore;
using HandySuites.Application.Clientes.Validators;
using HandySuites.Application.Usuarios.Validators;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Application.Pedidos.Services;
using HandySuites.Infrastructure.Repositories.Pedidos;
using HandySuites.Application.Pedidos.Validators;
using HandySuites.Application.Visitas.Interfaces;
using HandySuites.Application.Visitas.Services;
using HandySuites.Infrastructure.Repositories.Visitas;
using HandySuites.Application.Productos.Interfaces;
using HandySuites.Application.Productos.Services;
using HandySuites.Infrastructure.Productos.Repositories;
using HandySuites.Application.Rutas.Interfaces;
using HandySuites.Application.Rutas.Services;
using HandySuites.Infrastructure.Repositories.Rutas;
using HandySuites.Application.Sync.Interfaces;
using HandySuites.Application.Sync.Services;
using HandySuites.Infrastructure.Repositories.Sync;
using HandySuites.Application.DeviceSessions.Interfaces;
using HandySuites.Application.DeviceSessions.Services;
using HandySuites.Infrastructure.Repositories.DeviceSessions;
using HandySuites.Application.ListasPrecios.Interfaces;
using HandySuites.Application.ListasPrecios.Services;
using HandySuites.Infrastructure.ListasPrecios.Repositories;
using HandySuites.Application.Precios.Interfaces;
using HandySuites.Application.Precios.Services;
using HandySuites.Infrastructure.Precios.Repositories;
using HandySuites.Application.Descuentos.Interfaces;
using HandySuites.Application.Descuentos.Services;
using HandySuites.Infrastructure.Descuentos.Repositories;
using HandySuites.Application.Promociones.Interfaces;
using HandySuites.Application.Promociones.Services;
using HandySuites.Infrastructure.Promociones.Repositories;
using HandySuites.Application.Inventario.Interfaces;
using HandySuites.Application.Inventario.Services;
using HandySuites.Infrastructure.Inventario.Repositories;
using HandySuites.Application.MovimientosInventario.Interfaces;
using HandySuites.Application.MovimientosInventario.Services;
using HandySuites.Infrastructure.MovimientosInventario.Repositories;
using HandySuites.Application.Cobranza.Interfaces;
using HandySuites.Application.Cobranza.Services;
using HandySuites.Infrastructure.Repositories.Cobranza;
using HandySuites.Application.Zonas.Interfaces;
using HandySuites.Application.Zonas.Services;
using HandySuites.Infrastructure.Zonas.Repositories;
using HandySuites.Application.CategoriasClientes.Interfaces;
using HandySuites.Application.CategoriasClientes.Services;
using HandySuites.Infrastructure.CategoriasClientes.Repositories;
using HandySuites.Application.CategoriasProductos.Interfaces;
using HandySuites.Application.CategoriasProductos.Services;
using HandySuites.Infrastructure.CategoriasProductos.Repositories;
using HandySuites.Application.FamiliasProductos.Interfaces;
using HandySuites.Application.FamiliasProductos.Services;
using HandySuites.Infrastructure.FamiliasProductos.Repositories;
using HandySuites.Application.SubscriptionPlans.Interfaces;
using HandySuites.Infrastructure.Services;
using HandySuites.Mobile.Api.Services;

namespace HandySuites.Mobile.Api.Configuration;

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
            // Interceptor que emite SET app.tenant_id + app.is_super_admin en cada
            // comando para que las policies de PostgreSQL RLS (handy_app role)
            // filtren por tenant. Sin esto, como el user de DB es non-superuser,
            // TODAS las queries regresan 0 filas → login rompía con "user not found".
            services.AddScoped<TenantRlsInterceptor>();

            services.AddDbContext<HandySuitesDbContext>((serviceProvider, options) =>
                options
                    .UseNpgsql(
                        config.GetConnectionString("DefaultConnection"),
                        o =>
                        {
                            o.UseVector();
                            o.EnableRetryOnFailure(
                                maxRetryCount: 3,
                                maxRetryDelay: TimeSpan.FromSeconds(5),
                                errorCodesToAdd: null);
                            o.CommandTimeout(30);
                        })
                    .AddInterceptors(serviceProvider.GetRequiredService<TenantRlsInterceptor>()));
        }

        services.AddFluentValidationAutoValidation();

        // Core Services
        services.AddScoped<JwtTokenGenerator>();
        services.AddScoped<ICurrentTenant, CurrentTenant>();
        services.AddScoped<MobileAuthService>();

        // TOTP verification (compartido con web API). El mobile NO genera
        // secrets ni recovery codes — solo valida códigos durante login.
        // VULN-M03 fix: antes el mobile bypaseaba TOTP completamente.
        var totpEncryptionKey = config["Totp:EncryptionKey"] ?? config["Jwt:Secret"]
            ?? throw new InvalidOperationException(
                "TOTP encryption key is required. Set 'Totp:EncryptionKey' or 'Jwt:Secret' in configuration.");
        services.AddSingleton(new TotpEncryptionService(totpEncryptionKey));
        services.AddScoped<HandySuites.Application.TwoFactor.ITotpVerifier,
                            HandySuites.Infrastructure.TwoFactor.TotpVerifier>();

        // Push Notifications (HttpClient for Expo Push API)
        services.AddHttpClient<PushNotificationService>();
        services.AddScoped<HandySuites.Infrastructure.Notifications.Services.NotificationSettingsService>();
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
        services.AddScoped<HandySuites.Application.Common.Interfaces.ITransactionManager, HandySuites.Infrastructure.Persistence.TransactionManager>();

        // Crash Reports
        services.AddScoped<HandySuites.Application.CrashReporting.ICrashReportRepository, HandySuites.Infrastructure.Repositories.CrashReportRepository>();

        // Subscription Enforcement (for billing limits)
        services.AddScoped<ISubscriptionEnforcementService, SubscriptionEnforcementService>();

        // Cobranza
        services.AddScoped<ICobroRepository, CobroRepository>();
        services.AddScoped<CobroService>();

        // Tracking GPS de vendedores (Fase B)
        services.AddScoped<HandySuites.Application.Tracking.Interfaces.IUbicacionVendedorRepository, HandySuites.Infrastructure.Repositories.Tracking.UbicacionVendedorRepository>();
        services.AddScoped<HandySuites.Application.Tracking.Interfaces.ISubscriptionFeatureGuard, HandySuites.Infrastructure.Subscriptions.SubscriptionFeatureGuard>();
        services.AddScoped<HandySuites.Application.Tracking.Services.UbicacionVendedorService>();

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
