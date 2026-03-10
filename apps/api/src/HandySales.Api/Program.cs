using System.IO.Compression;
using System.Threading.RateLimiting;
using HandySales.Api.Configuration;
using HandySales.Api.Endpoints;
using HandySales.Api.Hubs;
using HandySales.Api.Middleware;
using HandySales.Api.Workers;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;

// Npgsql 6+ requires UTC DateTimes for 'timestamp with time zone'.
// Enable legacy behavior so Unspecified-Kind DateTimes (from query strings) work.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

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

// Global rate limiting — protects all endpoints from abuse/DDoS
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Anonymous endpoints (login, register, forgot-password): by IP
    options.AddPolicy("anonymous", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 15,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Authenticated endpoints: by user ID (more generous)
    options.AddPolicy("authenticated", context =>
    {
        var userId = context.User?.FindFirst("sub")?.Value
                     ?? context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? context.Connection.RemoteIpAddress?.ToString()
                     ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 120,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });

    // Global fallback: by IP — catches anything not tagged with a specific policy
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 200,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Demasiadas solicitudes. Intenta de nuevo en un momento." },
            cancellationToken);
    };
});

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

// OpenAI HttpClient for AI Gateway
var openAiKey = builder.Configuration["Ai:ApiKey"]
    ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY")
    ?? "";
builder.Services.AddHttpClient("OpenAI", client =>
{
    client.BaseAddress = new Uri("https://api.openai.com/");
    if (!string.IsNullOrEmpty(openAiKey))
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", openAiKey);
    client.Timeout = TimeSpan.FromSeconds(30);
});

// Background workers
builder.Services.AddHostedService<ScheduledActionProcessor>();
builder.Services.AddHostedService<SubscriptionMonitor>();
builder.Services.AddHostedService<AutomationEngine>();

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
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

// Swagger configuration (solo desarrollo)
app.UseSwaggerConfiguration(app.Environment);

app.UseHttpsRedirection();
app.UseCors("HandySalesPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseMiddleware<SessionValidationMiddleware>();
app.UseMiddleware<ViewerReadOnlyMiddleware>();
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
app.MapMetaVendedorEndpoints();
app.MapFamiliasProductosEndpoints();
app.MapCategoriaClienteEndpoints();
app.MapCategoriaProductoEndpoints();
app.MapUnidadMedidaEndpoints();
app.MapRoleEndpoints();
app.MapCompanyEndpoints(app.Services.GetRequiredService<ILogger<Program>>());
app.MapDatosEmpresaEndpoints();
app.MapGlobalSettingsEndpoints();
app.MapUserProfileEndpoints();
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
app.MapGeoEndpoints();
app.MapCobroEndpoints();
app.MapTwoFactorEndpoints();
app.MapAnnouncementEndpoints();
app.MapSubscriptionEndpoints();
app.MapSubscriptionPlanAdminEndpoints();
app.MapStripeWebhookEndpoints();
app.MapInternalEndpoints();
app.MapCrashReportEndpoints();
app.MapActivityLogEndpoints();
app.MapSupervisorEndpoints();
app.MapAutomationEndpoints();
app.MapAiEndpoints();
app.MapSecurityConfigEndpoints();

// SignalR hub
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
public partial class Program { }
