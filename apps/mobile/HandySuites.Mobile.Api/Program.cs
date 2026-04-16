using System.Threading.RateLimiting;
using HandySuites.Mobile.Api.Configuration;
using HandySuites.Mobile.Api.Endpoints;
using HandySuites.Mobile.Api.Hubs;
using HandySuites.Mobile.Api.Middleware;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// CONFIGURACIÓN DE LOGGING
builder.Host.AddCustomLogging();

builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

// CONFIGURACIÓN
builder.Services.AddSwaggerConfiguration();
builder.Services.AddCustomCors(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddMobileServices(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddMemoryCache();

// HTTP client for cross-API notifications to Main API's SignalR hub
var mainApiUrl = builder.Configuration["MAIN_API_URL"] ?? "http://localhost:1050";
builder.Services.AddHttpClient("MainApi", client =>
{
    client.BaseAddress = new Uri(mainApiUrl);
    client.Timeout = TimeSpan.FromSeconds(5);
});

// HTTP client for Billing API (CFDI invoicing)
var billingApiUrl = builder.Configuration["BILLING_API_URL"] ?? "http://localhost:5001";
builder.Services.AddHttpClient("BillingApi", client =>
{
    client.BaseAddress = new Uri(billingApiUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

// SignalR for real-time events to web backoffice
builder.Services.AddSignalR(options =>
{
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
}).AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

// Global rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.AddFixedWindowLimiter("crash-reports", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Demasiadas solicitudes. Intenta de nuevo en un momento." },
            cancellationToken);
    };
});

var app = builder.Build();

// MIDDLEWARE
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

// Swagger configuration
app.UseSwaggerConfiguration(app.Environment);

app.UseHttpsRedirection();
app.UseCors("MobilePolicy");

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<MobileSessionValidationMiddleware>();

// Ensure wwwroot/uploads exists for static file serving (evidence uploads)
// Placed AFTER auth middleware so static files require authentication
var wwwroot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(Path.Combine(wwwroot, "uploads", "evidence"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(wwwroot),
    RequestPath = ""
});

// MOBILE-SPECIFIC ENDPOINTS
app.MapMobileAuthEndpoints();
app.MapMobilePedidoEndpoints();
app.MapMobileVisitaEndpoints();
app.MapMobileClienteEndpoints();
app.MapMobileProductoEndpoints();
app.MapMobileSyncEndpoints();
app.MapMobileRutaEndpoints();
app.MapMobileCobroEndpoints();
app.MapMobileCatalogosEndpoints();
app.MapMobileNotificationEndpoints();
app.MapMobileAttachmentEndpoints();
app.MapMobileVentaDirectaEndpoints();
app.MapMobileSupervisorEndpoints();
app.MapMobileEmpresaEndpoints();
app.MapMobileCrashReportEndpoints();
app.MapMobileAnnouncementEndpoints();
app.MapMobileMetasEndpoints();
app.MapMobileFacturaEndpoints();
app.MapInternalPushEndpoints();
app.MapMobileLogLevelEndpoints();
app.MapHealthEndpoints();
app.MapHub<MobileNotificationHub>("/hubs/notifications");

app.Run();

public partial class Program { }
