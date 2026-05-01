using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using HandySuites.Application.Ai.Interfaces;
using HandySuites.Application.Geo.Interfaces;
using HandySuites.Infrastructure.Ai.Services;
using HandySuites.Application.SubscriptionPlans.Interfaces;
using HandySuites.Application.CrashReporting;
using HandySuites.Application.Clientes.Interfaces;
using HandySuites.Application.Clientes.Services;
using Microsoft.EntityFrameworkCore;
using HandySuites.Shared.Security;
using HandySuites.Application.Inventario.Services;
using HandySuites.Application.Usuarios.Services;
using HandySuites.Application.Usuarios.Interfaces;
using HandySuites.Application.Descuentos.Services;
using HandySuites.Application.ListasPrecios.Services;
using HandySuites.Application.Precios.Services;
using HandySuites.Application.Productos.Services;
using HandySuites.Application.Promociones.Services;
using HandySuites.Infrastructure.Repositories;
using HandySuites.Application.Zonas.Interfaces;
using HandySuites.Infrastructure.Zonas.Repositories;
using HandySuites.Application.Zonas.Services;
using HandySuites.Application.Metas.Interfaces;
using HandySuites.Infrastructure.Repositories.Metas;
using HandySuites.Application.Metas.Services;
using HandySuites.Application.FamiliasProductos.Interfaces;
using HandySuites.Infrastructure.FamiliasProductos.Repositories;
using HandySuites.Application.FamiliasProductos.Services;
using HandySuites.Application.Inventario.Interfaces;
using HandySuites.Infrastructure.Inventario.Repositories;
using HandySuites.Application.Descuentos.Interfaces;
using HandySuites.Infrastructure.Descuentos.Repositories;
using HandySuites.Application.ListasPrecios.Interfaces;
using HandySuites.Infrastructure.ListasPrecios.Repositories;
using HandySuites.Application.Precios.Interfaces;
using HandySuites.Infrastructure.Precios.Repositories;
using HandySuites.Application.Productos.Interfaces;
using HandySuites.Infrastructure.Productos.Repositories;
using HandySuites.Application.Promociones.Interfaces;
using HandySuites.Infrastructure.Promociones.Repositories;
using HandySuites.Application.CategoriasClientes.Interfaces;
using HandySuites.Infrastructure.CategoriasClientes.Repositories;
using HandySuites.Application.CategoriasClientes.Services;
using HandySuites.Application.CategoriasProductos.Interfaces;
using HandySuites.Infrastructure.CategoriasProductos.Repositories;
using HandySuites.Application.CategoriasProductos.Services;
using HandySuites.Application.UnidadesMedida.Interfaces;
using HandySuites.Infrastructure.UnidadesMedida.Repositories;
using HandySuites.Application.UnidadesMedida.Services;
using HandySuites.Application.Integrations.Interfaces;
using HandySuites.Application.Integrations.Services;
using HandySuites.Infrastructure.Repositories.Integrations;
using FluentValidation;
using FluentValidation.AspNetCore;
using HandySuites.Application.CategoriasClientes.Validators;
using HandySuites.Application.Clientes.Validators;
using HandySuites.Application.CategoriasProductos.Validators;
using HandySuites.Application.Descuentos.Validators;
using HandySuites.Application.Precios.Validators;
using HandySuites.Application.Zonas.Validators;
using HandySuites.Application.FamiliasProductos.Validators;
using HandySuites.Application.Usuarios.Validators;
using HandySuites.Application.ActivityTracking.Services;
using HandySuites.Application.ActivityTracking.Interfaces;
using HandySuites.Infrastructure.ActivityTracking.Repositories;
using HandySuites.Application.Roles.Services;
using HandySuites.Application.Roles.Interfaces;
using HandySuites.Infrastructure.Roles.Repositories;
using HandySuites.Application.CompanySettings.Services;
using HandySuites.Application.CompanySettings.Interfaces;
using HandySuites.Infrastructure.CompanySettings.Repositories;
using HandySuites.Application.DatosFacturacion.Interfaces;
using HandySuites.Infrastructure.DatosFacturacion.Services;
using HandySuites.Infrastructure.Services;
using HandySuites.Application.NotificationPreferences.Interfaces;
using HandySuites.Infrastructure.NotificationPreferences.Services;
using HandySuites.Application.GlobalSettings.Interfaces;
using HandySuites.Application.GlobalSettings.Services;
using HandySuites.Infrastructure.GlobalSettings.Repositories;
using HandySuites.Application.Companies.Interfaces;
using HandySuites.Application.Companies.Services;
using HandySuites.Infrastructure.Companies.Repositories;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Application.Pedidos.Services;
using HandySuites.Infrastructure.Repositories.Pedidos;
using HandySuites.Application.Visitas.Interfaces;
using HandySuites.Application.Visitas.Services;
using HandySuites.Infrastructure.Repositories.Visitas;
using HandySuites.Application.DeviceSessions.Interfaces;
using HandySuites.Application.DeviceSessions.Services;
using HandySuites.Infrastructure.Repositories.DeviceSessions;
using HandySuites.Application.Rutas.Interfaces;
using HandySuites.Application.Rutas.Services;
using HandySuites.Infrastructure.Repositories.Rutas;
using HandySuites.Application.Sync.Interfaces;
using HandySuites.Application.Sync.Services;
using HandySuites.Infrastructure.Repositories.Sync;
using HandySuites.Application.Notifications.Interfaces;
using HandySuites.Application.Notifications.Services;
using HandySuites.Infrastructure.Notifications.Repositories;
using HandySuites.Infrastructure.Notifications.Services;
using HandySuites.Api.Hubs;
using HandySuites.Application.Interfaces;
using HandySuites.Application.Impersonation.Interfaces;
using HandySuites.Application.Impersonation.Services;
using HandySuites.Infrastructure.Impersonation;
using HandySuites.Application.MovimientosInventario.Interfaces;
using HandySuites.Application.MovimientosInventario.Services;
using HandySuites.Application.MovimientosInventario.Validators;
using HandySuites.Infrastructure.MovimientosInventario.Repositories;
using HandySuites.Application.Cobranza.Interfaces;
using HandySuites.Application.Cobranza.Services;
using HandySuites.Application.Cobranza.Validators;
using HandySuites.Infrastructure.Repositories.Cobranza;
using HandySuites.Api.Payments;
using HandySuites.Api.TwoFactor;
using HandySuites.Shared.Email;
using HandySuites.Application.Tenants.Interfaces;
using HandySuites.Infrastructure.Tenants.Services;
using HandySuites.Application.Auth.Validators;
using HandySuites.Application.SubscriptionPlans.Interfaces;
using HandySuites.Infrastructure.Repositories.SubscriptionPlans;
using HandySuites.Application.Automations.Interfaces;
using HandySuites.Application.Automations.Services;
using HandySuites.Infrastructure.Repositories.Automations;
using HandySuites.Api.Automations;
using HandySuites.Api.Automations.Handlers;

namespace HandySuites.Api.Configuration;

public static class ServiceRegistrationExtensions
{
    public static IServiceCollection AddCustomServices(this IServiceCollection services, IConfiguration config)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");

        // HttpContextAccessor es necesario para ITenantContextService
        services.AddHttpContextAccessor();
        services.AddMemoryCache();

        // Servicio de tenant para Global Query Filters
        services.AddScoped<ITenantContextService, TenantContextService>();
        services.AddScoped<HandySuites.Application.Common.Interfaces.ITransactionManager, TransactionManager>();

        if (environment != "Testing")
        {
            // No registrar DbContext aquí: los tests usarán Sqlite desde CustomWebApplicationFactory
            services.AddSingleton<HandySuites.Api.Middleware.SlowQueryInterceptor>();
            services.AddScoped<HandySuites.Infrastructure.Persistence.TenantRlsInterceptor>();
            services.AddDbContext<HandySuitesDbContext>((sp, options) =>
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
                 })
             .AddInterceptors(
                 sp.GetRequiredService<HandySuites.Api.Middleware.SlowQueryInterceptor>(),
                 sp.GetRequiredService<HandySuites.Infrastructure.Persistence.TenantRlsInterceptor>()));
        }
        services.AddFluentValidationAutoValidation();


        services.AddScoped<JwtTokenGenerator>();
        services.AddScoped<ICurrentTenant, CurrentTenant>();
        services.AddScoped<AuthService>();

        services.AddScoped<IClienteRepository, ClienteRepository>();
        services.AddScoped<ClienteService>();
        services.AddValidatorsFromAssemblyContaining<ClienteCreateDtoValidator>();

        services.AddScoped<IUsuarioRepository, UsuarioRepository>();
        services.AddScoped<HandySuites.Application.Usuarios.Services.UsuarioService>();
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
        services.AddScoped<IMetaVendedorRepository, MetaVendedorRepository>();
        services.AddScoped<MetaVendedorService>();
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

        // Catálogo de tasas de impuesto (IVA, IEPS, retenciones)
        services.AddScoped<HandySuites.Application.Impuestos.Interfaces.ITasaImpuestoRepository, HandySuites.Infrastructure.Repositories.Impuestos.TasaImpuestoRepository>();
        services.AddScoped<HandySuites.Application.Impuestos.Services.TasaImpuestoService>();

        // Tracking GPS de vendedores (Fase B)
        services.AddScoped<HandySuites.Application.Tracking.Interfaces.IUbicacionVendedorRepository, HandySuites.Infrastructure.Repositories.Tracking.UbicacionVendedorRepository>();
        services.AddScoped<HandySuites.Application.Tracking.Interfaces.ISubscriptionFeatureGuard, HandySuites.Infrastructure.Subscriptions.SubscriptionFeatureGuard>();
        services.AddScoped<HandySuites.Application.Tracking.Services.UbicacionVendedorService>();

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

        // Datos de Empresa (identidad del negocio)
        services.AddScoped<HandySuites.Application.DatosEmpresa.Interfaces.IDatosEmpresaRepository, DatosEmpresaRepository>();
        services.AddScoped<HandySuites.Application.DatosEmpresa.Interfaces.IDatosEmpresaService, HandySuites.Application.DatosEmpresa.Services.DatosEmpresaService>();

        // Billing sync (replica campos duplicados hacia Billing API — handy_billing)
        services.AddHttpClient<HandySuites.Application.BillingSync.IBillingSyncService,
            HandySuites.Infrastructure.BillingSync.BillingSyncService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });

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
        services.AddScoped<IRealtimePushService, SignalRPushService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<NotificationSettingsService>();

        // Cobranza
        services.AddScoped<ICobroRepository, CobroRepository>();
        services.AddScoped<CobroService>();
        services.AddValidatorsFromAssemblyContaining<CobroCreateDtoValidator>();

        // Tenant Repository (Platform-level)
        services.AddScoped<ITenantRepository, TenantRepository>();

        // Tenant Seed Service (auto-seeding demo data on registration)
        services.AddScoped<ITenantSeedService, TenantSeedService>();

        // Social Register Validator
        services.AddValidatorsFromAssemblyContaining<SocialRegisterDtoValidator>();

        // Impersonation Services (Platform-level, SUPER_ADMIN only)
        services.AddScoped<IImpersonationRepository, ImpersonationRepository>();
        services.AddScoped<IImpersonationService, ImpersonationService>();

        // 2FA TOTP Services — encryption key MUST be configured (no insecure fallback)
        var totpEncryptionKey = config["Totp:EncryptionKey"] ?? config["Jwt:Secret"]
            ?? throw new InvalidOperationException(
                "TOTP encryption key is required. Set 'Totp:EncryptionKey' or 'Jwt:Secret' in configuration.");
        services.AddSingleton(new TotpEncryptionService(totpEncryptionKey));
        services.AddScoped<TotpService>();

        // Pwned Password Check (HIBP k-anonymity)
        services.AddHttpClient<PwnedPasswordService>();

        // reCAPTCHA v3 validation
        services.AddSingleton<RecaptchaService>();

        // Email Service (SendGrid)
        services.AddSingleton<IEmailService, SendGridEmailService>();

        // Stripe Payment Service
        services.AddScoped<IStripeService, StripeService>();

        // Crash Reports (log-level, no service layer needed)
        services.AddScoped<ICrashReportRepository, CrashReportRepository>();

        // Subscription Plans (SuperAdmin CRUD + Enforcement)
        services.AddScoped<ISubscriptionPlanRepository, SubscriptionPlanRepository>();
        services.AddScoped<ISubscriptionEnforcementService, SubscriptionEnforcementService>();

        // Automations
        services.AddScoped<IAutomationRepository, AutomationRepository>();
        services.AddScoped<AutomationAppService>();
        services.AddScoped<IAutomationHandler, StockBajoAlertaHandler>();
        services.AddScoped<IAutomationHandler, ResumenDiarioHandler>();
        services.AddScoped<IAutomationHandler, CobroVencidoRecordatorioHandler>();
        services.AddScoped<IAutomationHandler, BienvenidaClienteHandler>();
        services.AddScoped<IAutomationHandler, InventarioCriticoHandler>();
        services.AddScoped<IAutomationHandler, ClienteInactivoVisitaHandler>();
        services.AddScoped<IAutomationHandler, PedidoRecurrenteHandler>();
        services.AddScoped<IAutomationHandler, RutaSemanalAutoHandler>();
        services.AddScoped<IAutomationHandler, CobroExitosoAvisoHandler>();
        services.AddScoped<IAutomationHandler, MetaNoCumplidaHandler>();
        services.AddScoped<IAutomationHandler, MetaAutoRenovacionHandler>();

        services.AddScoped<IGeoQueryService, GeoQueryService>();
        services.AddScoped<IReportAccessService, ReportAccessService>();

        // Integration Marketplace
        services.AddScoped<IIntegrationRepository, IntegrationRepository>();
        services.AddScoped<IntegrationService>();

        // AI Services
        services.AddScoped<IAiCreditService, AiCreditService>();
        services.AddScoped<IAiGatewayService, AiGatewayService>();
        services.AddScoped<IAiSanitizer, AiSanitizer>();
        services.AddScoped<IAiDataContextBuilder, AiDataContextBuilder>();
        services.AddScoped<IAiActionDetector, AiActionDetector>();
        services.AddScoped<IAiEmbeddingService, AiEmbeddingService>();

        return services;
    }
}
