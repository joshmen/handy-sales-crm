using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Multitenancy;
using HandySales.Application.Clientes.Interfaces;
using HandySales.Application.Clientes.Services;
using Microsoft.EntityFrameworkCore;
using HandySales.Shared.Security;
using HandySales.Application.Inventario.Services;
using HandySales.Application.Usuarios.Services;
using HandySales.Application.Usuarios.Interfaces;
using HandySales.Application.Descuentos.Services;
using HandySales.Application.ListasPrecios.Services;
using HandySales.Application.Precios.Services;
using HandySales.Application.Productos.Services;
using HandySales.Application.Promociones.Services;
using HandySales.Infrastructure.Repositories;
using HandySales.Application.Zonas.Interfaces;
using HandySales.Infrastructure.Zonas.Repositories;
using HandySales.Application.Zonas.Services;
using HandySales.Application.FamiliasProductos.Interfaces;
using HandySales.Infrastructure.FamiliasProductos.Repositories;
using HandySales.Application.FamiliasProductos.Services;
using HandySales.Application.Inventario.Interfaces;
using HandySales.Infrastructure.Inventario.Repositories;
using HandySales.Application.Descuentos.Interfaces;
using HandySales.Infrastructure.Descuentos.Repositories;
using HandySales.Application.ListasPrecios.Interfaces;
using HandySales.Infrastructure.ListasPrecios.Repositories;
using HandySales.Application.Precios.Interfaces;
using HandySales.Infrastructure.Precios.Repositories;
using HandySales.Application.Productos.Interfaces;
using HandySales.Infrastructure.Productos.Repositories;
using HandySales.Application.Promociones.Interfaces;
using HandySales.Infrastructure.Promociones.Repositories;
using HandySales.Application.CategoriasClientes.Interfaces;
using HandySales.Infrastructure.CategoriasClientes.Repositories;
using HandySales.Application.CategoriasClientes.Services;
using HandySales.Application.CategoriasProductos.Interfaces;
using HandySales.Infrastructure.CategoriasProductos.Repositories;
using HandySales.Application.CategoriasProductos.Services;
using HandySales.Application.UnidadesMedida.Interfaces;
using HandySales.Infrastructure.UnidadesMedida.Repositories;
using HandySales.Application.UnidadesMedida.Services;
using FluentValidation;
using FluentValidation.AspNetCore;
using HandySales.Application.CategoriasClientes.Validators;
using HandySales.Application.Clientes.Validators;
using HandySales.Application.CategoriasProductos.Validators;
using HandySales.Application.Descuentos.Validators;
using HandySales.Application.Precios.Validators;
using HandySales.Application.Zonas.Validators;
using HandySales.Application.FamiliasProductos.Validators;
using HandySales.Application.Usuarios.Validators;
using HandySales.Application.ActivityTracking.Services;
using HandySales.Application.ActivityTracking.Interfaces;
using HandySales.Infrastructure.ActivityTracking.Repositories;
using HandySales.Application.Roles.Services;
using HandySales.Application.Roles.Interfaces;
using HandySales.Infrastructure.Roles.Repositories;
using HandySales.Application.CompanySettings.Services;
using HandySales.Application.CompanySettings.Interfaces;
using HandySales.Infrastructure.CompanySettings.Repositories;
using HandySales.Application.DatosFacturacion.Interfaces;
using HandySales.Infrastructure.DatosFacturacion.Services;
using HandySales.Infrastructure.Services;
using HandySales.Application.NotificationPreferences.Interfaces;
using HandySales.Infrastructure.NotificationPreferences.Services;
using HandySales.Application.GlobalSettings.Interfaces;
using HandySales.Application.GlobalSettings.Services;
using HandySales.Infrastructure.GlobalSettings.Repositories;
using HandySales.Application.Companies.Interfaces;
using HandySales.Application.Companies.Services;
using HandySales.Infrastructure.Companies.Repositories;
using HandySales.Application.Pedidos.Interfaces;
using HandySales.Application.Pedidos.Services;
using HandySales.Infrastructure.Repositories.Pedidos;
using HandySales.Application.Visitas.Interfaces;
using HandySales.Application.Visitas.Services;
using HandySales.Infrastructure.Repositories.Visitas;
using HandySales.Application.DeviceSessions.Interfaces;
using HandySales.Application.DeviceSessions.Services;
using HandySales.Infrastructure.Repositories.DeviceSessions;
using HandySales.Application.Rutas.Interfaces;
using HandySales.Application.Rutas.Services;
using HandySales.Infrastructure.Repositories.Rutas;
using HandySales.Application.Sync.Interfaces;
using HandySales.Application.Sync.Services;
using HandySales.Infrastructure.Repositories.Sync;
using HandySales.Application.Notifications.Interfaces;
using HandySales.Application.Notifications.Services;
using HandySales.Infrastructure.Notifications.Repositories;
using HandySales.Infrastructure.Notifications.Services;
using HandySales.Application.Interfaces;
using HandySales.Application.Impersonation.Interfaces;
using HandySales.Application.Impersonation.Services;
using HandySales.Infrastructure.Impersonation;
using HandySales.Application.MovimientosInventario.Interfaces;
using HandySales.Application.MovimientosInventario.Services;
using HandySales.Application.MovimientosInventario.Validators;
using HandySales.Infrastructure.MovimientosInventario.Repositories;
using HandySales.Application.Cobranza.Interfaces;
using HandySales.Application.Cobranza.Services;
using HandySales.Infrastructure.Repositories.Cobranza;
using HandySales.Api.TwoFactor;

namespace HandySales.Api.Configuration;

public static class ServiceRegistrationExtensions
{
    public static IServiceCollection AddCustomServices(this IServiceCollection services, IConfiguration config)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        Console.WriteLine($"Entorno actual: {environment}");

        // HttpContextAccessor es necesario para ITenantContextService
        services.AddHttpContextAccessor();
        services.AddMemoryCache();

        // Servicio de tenant para Global Query Filters
        services.AddScoped<ITenantContextService, TenantContextService>();

        if (environment != "Testing")
        {
            // No registrar DbContext aquí: los tests usarán Sqlite desde CustomWebApplicationFactory
            services.AddDbContext<HandySalesDbContext>(options =>
             options.UseMySql(
                 config.GetConnectionString("DefaultConnection"),
                 new MySqlServerVersion(new Version(8, 0, 0))
             ));
        }
        services.AddFluentValidationAutoValidation();


        services.AddScoped<JwtTokenGenerator>();
        services.AddScoped<ICurrentTenant, CurrentTenant>();
        services.AddScoped<AuthService>();

        services.AddScoped<IClienteRepository, ClienteRepository>();
        services.AddScoped<ClienteService>();
        services.AddValidatorsFromAssemblyContaining<ClienteCreateDtoValidator>();

        services.AddScoped<IUsuarioRepository, UsuarioRepository>();
        services.AddScoped<HandySales.Application.Usuarios.Services.UsuarioService>();
        services.AddValidatorsFromAssemblyContaining<UsuarioLoginDtoValidator>();
        services.AddValidatorsFromAssemblyContaining<UsuarioRegisterDtoValidator>();

        services.AddScoped<IInventarioRepository, InventarioRepository>();
        services.AddScoped<InventarioService>();
        services.AddValidatorsFromAssemblyContaining<InventarioCreateDtoValidator>();
        services.AddValidatorsFromAssemblyContaining<InventarioUpdateDtoValidator>();

        // Movimientos de Inventario
        services.AddScoped<IMovimientoInventarioRepository, MovimientoInventarioRepository>();
        services.AddScoped<MovimientoInventarioService>();
        services.AddValidatorsFromAssemblyContaining<MovimientoInventarioCreateDtoValidator>();

        services.AddScoped<IDescuentoPorCantidadRepository, DescuentoPorCantidadRepository>();
        services.AddScoped<DescuentoPorCantidadService>();
        services.AddValidatorsFromAssemblyContaining<DescuentoPorCantidadCreateDtoValidator>();

        services.AddScoped<IListaPrecioRepository, ListaPrecioRepository>();
        services.AddScoped<ListaPrecioService>();
        services.AddValidatorsFromAssemblyContaining<ListaPrecioCreateDtoValidator>();

        services.AddScoped<IPrecioPorProductoRepository, PrecioPorProductoRepository>();
        services.AddScoped<PrecioPorProductoService>();
        services.AddValidatorsFromAssemblyContaining<PrecioPorProductoCreateDtoValidator>();

        services.AddScoped<IProductoRepository, ProductoRepository>();
        services.AddScoped<ProductoService>();
        services.AddValidatorsFromAssemblyContaining<ProductoCreateDtoValidator>();

        services.AddScoped<IPromocionRepository, PromocionRepository>();
        services.AddScoped<PromocionService>();
        services.AddValidatorsFromAssemblyContaining<PromocionCreateDtoValidator>();

        services.AddScoped<IZonaRepository, ZonaRepository>();
        services.AddScoped<ZonaService>();
        services.AddValidatorsFromAssemblyContaining<ZonaCreateDtoValidator>();
        services.AddValidatorsFromAssemblyContaining<ZonaUpdateDtoValidator>();

        services.AddScoped<IFamiliaProductoRepository, FamiliaProductoRepository>();
        services.AddScoped<FamiliaProductoService>();
        services.AddValidatorsFromAssemblyContaining<FamiliaProductoCreateDtoValidator>();

        services.AddScoped<ICategoriaClienteRepository, CategoriaClienteRepository>();
        services.AddScoped<CategoriaClienteService>();
        services.AddValidatorsFromAssemblyContaining<CategoriaClienteCreateDtoValidator>();

        services.AddScoped<ICategoriaProductoRepository, CategoriaProductoRepository>();
        services.AddScoped<CategoriaProductoService>();
        services.AddValidatorsFromAssemblyContaining<CategoriaProductoCreateDtoValidator>();

        services.AddScoped<IUnidadMedidaRepository, UnidadMedidaRepository>();
        services.AddScoped<UnidadMedidaService>();
        services.AddValidatorsFromAssemblyContaining<UnidadMedidaCreateDtoValidator>();

        // Activity Tracking
        services.AddScoped<IActivityTrackingRepository, ActivityTrackingRepository>();
        services.AddScoped<IActivityTrackingService, ActivityTrackingService>();
        // HttpContextAccessor ya registrado arriba

        // Roles
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<RoleService>();

        // Company Settings & Cloudinary
        services.AddScoped<ICompanySettingsRepository, CompanySettingsRepository>();
        services.AddScoped<ICompanySettingsService, CompanySettingsService>();
        services.AddScoped<ICloudinaryService, CloudinaryService>();
        services.AddScoped<ICloudinaryFolderService, CloudinaryFolderService>();

        // Billing Data (DatosFacturacion)
        services.AddScoped<IDatosFacturacionService, DatosFacturacionService>();

        // Notification Preferences
        services.AddScoped<INotificationPreferenceService, NotificationPreferenceService>();

        // Global Settings
        services.AddScoped<IGlobalSettingsRepository, GlobalSettingsRepository>();
        services.AddScoped<IGlobalSettingsService, GlobalSettingsService>();

        // Companies
        services.AddScoped<ICompanyRepository, CompanyRepository>();
        services.AddScoped<ICompanyService, CompanyService>();

        // Pedidos
        services.AddScoped<IPedidoRepository, PedidoRepository>();
        services.AddScoped<PedidoService>();

        // Visitas a Clientes
        services.AddScoped<IClienteVisitaRepository, ClienteVisitaRepository>();
        services.AddScoped<ClienteVisitaService>();

        // Device Sessions
        services.AddScoped<IDeviceSessionRepository, DeviceSessionRepository>();
        services.AddScoped<DeviceSessionService>();

        // Rutas de Vendedor
        services.AddScoped<IRutaVendedorRepository, RutaVendedorRepository>();
        services.AddScoped<RutaVendedorService>();

        // Sync Service
        services.AddScoped<ISyncRepository, SyncRepository>();
        services.AddScoped<SyncService>();

        // Notification Services
        services.AddScoped<IFcmService, FcmService>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<INotificationService, NotificationService>();

        // Cobranza
        services.AddScoped<ICobroRepository, CobroRepository>();
        services.AddScoped<CobroService>();

        // Tenant Repository (Platform-level)
        services.AddScoped<ITenantRepository, TenantRepository>();

        // Impersonation Services (Platform-level, SUPER_ADMIN only)
        services.AddScoped<IImpersonationRepository, ImpersonationRepository>();
        services.AddScoped<IImpersonationService, ImpersonationService>();

        // 2FA TOTP Services
        var totpEncryptionKey = config["Totp:EncryptionKey"] ?? config["Jwt:Secret"] ?? "HandySales-Default-TOTP-Key-2026";
        services.AddSingleton(new TotpEncryptionService(totpEncryptionKey));
        services.AddScoped<TotpService>();

        // Pwned Password Check (HIBP k-anonymity)
        services.AddHttpClient<PwnedPasswordService>();

        return services;
    }
}
