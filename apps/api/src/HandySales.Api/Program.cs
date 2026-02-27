using System.IO.Compression;
using HandySales.Api.Configuration;
using HandySales.Api.Endpoints;
using HandySales.Api.Hubs;
using HandySales.Api.Middleware;
using HandySales.Api.Workers;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;

var builder = WebApplication.CreateBuilder(args);

// CONFIGURACIÓN DE LOGGING
builder.Host.AddCustomLogging();

builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile("appsettings.Test.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

// CONFIGURACIÓN
builder.Services.AddSwaggerConfiguration();
builder.Services.AddCustomCors(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddCustomServices(builder.Configuration);
builder.Services.AddAuthorization();

// SignalR real-time hub (self-hosted, no Azure dependency)
builder.Services.AddSignalR(options =>
{
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
}).AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

// Configure JSON serialization for Minimal APIs
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

// Response compression (gzip + brotli)
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
        new[] { "application/json", "text/json" });
});
builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
    options.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(options =>
    options.Level = CompressionLevel.SmallestSize);

// Background workers
builder.Services.AddHostedService<ScheduledActionProcessor>();
builder.Services.AddHostedService<SubscriptionMonitor>();

var app = builder.Build();

// EF Core Migrations (auto-apply in dev, disabled in prod via RUN_MIGRATIONS=false)
var runMigrations = Environment.GetEnvironmentVariable("RUN_MIGRATIONS") ?? "true";
if (runMigrations.Equals("true", StringComparison.OrdinalIgnoreCase))
{
    var migrationLogger = app.Services.GetRequiredService<ILogger<Program>>();
    await DatabaseMigrator.MigrateAsync(app.Services, migrationLogger);
}

// MIDDLEWARE

// ForwardedHeaders MUST be first — resolves real client IP from reverse proxies (Railway/nginx)
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
    ForwardLimit = 2, // Railway proxy + potential nginx
});

app.UseResponseCompression();
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

// Swagger configuration (habilitado en todos los ambientes)
app.UseSwaggerConfiguration(app.Environment);

app.UseHttpsRedirection();
app.UseCors("HandySalesPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<SessionValidationMiddleware>();
app.UseMiddleware<MaintenanceMiddleware>();

// ENDPOINTS
app.MapAuthEndpoints();
app.MapDashboardEndpoints();
app.MapClienteEndpoints();
app.MapPedidoEndpoints();
app.MapClienteVisitaEndpoints();
app.MapDeviceSessionEndpoints();
app.MapRutaVendedorEndpoints();
app.MapSyncEndpoints();
app.MapUsuarioEndpoints();
app.MapProductoEndpoints();
app.MapInventarioEndpoints();
app.MapMovimientoInventarioEndpoints();
app.MapListaPrecioEndpoints();
app.MapPrecioPorProductoEndpoints();
app.MapDescuentosPorCantidadEndpoints();
app.MapPromocionesEndpoints();
app.MapZonaEndpoints();
app.MapFamiliasProductosEndpoints();
app.MapCategoriaClienteEndpoints();
app.MapCategoriaProductoEndpoints();
app.MapUnidadMedidaEndpoints();
app.MapRoleEndpoints();
app.MapCompanyEndpoints(app.Services.GetRequiredService<ILogger<Program>>());
app.MapDatosEmpresaEndpoints();
app.MapGlobalSettingsEndpoints();
app.MapProfileEndpoints();
app.MapImageUploadEndpoints();
app.MapNotificationPreferencesEndpoints();
app.MapMigrationEndpoints();
app.MapTestEndpoints();
app.MapHealthEndpoints();
app.MapNotificationEndpoints();
app.MapImpersonationEndpoints();
app.MapTenantImpersonationHistoryEndpoints();
app.MapTenantEndpoints();
app.MapImportExportEndpoints();
app.MapReportEndpoints();
app.MapCobroEndpoints();
app.MapTwoFactorEndpoints();
app.MapAnnouncementEndpoints();
app.MapSubscriptionEndpoints();
app.MapSubscriptionPlanAdminEndpoints();
app.MapStripeWebhookEndpoints();
app.MapInternalEndpoints();
app.MapCrashReportEndpoints();
app.MapActivityLogEndpoints();

// SignalR hub
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
public partial class Program { }
