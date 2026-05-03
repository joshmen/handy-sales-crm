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
    options.AddPolicy("crash-reports", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    // Política específica para login móvil: 5 intentos/min por IP. Sin esto el
    // global limiter (120/min) permite ~2 intentos/seg, suficiente para brute
    // force con diccionarios. Aplicar via .RequireRateLimiting("mobile-auth")
    // en endpoints sensibles (login, force-login).
    options.AddPolicy("mobile-auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    // Tracking GPS batch: 60 batches/min/user. Suficiente para checkpoint
    // cada 15min + bursts post-offline; previene un token comprometido
    // inflando la tabla GPS. Audit MED.
    options.AddPolicy("mobile-tracking", context =>
    {
        var userId = context.User?.FindFirst("sub")?.Value
                     ?? context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? context.Connection.RemoteIpAddress?.ToString()
                     ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
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
// Security headers — OWASP defense-in-depth. Aplicar antes de UseCors para
// que estén presentes en respuestas preflight también.
app.UseMiddleware<HandySuites.Mobile.Api.Middleware.SecurityHeadersMiddleware>();

// Swagger configuration
app.UseSwaggerConfiguration(app.Environment);

app.UseHttpsRedirection();
app.UseCors("MobilePolicy");

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<MobileSessionValidationMiddleware>();

// Static files para evidence uploads. Solo en Development — en prod los
// uploads se sirven desde Cloudinary (MobileAttachmentEndpoints retorna 501
// en non-dev). En dev queremos enviar a través de un endpoint que valide
// auth + tenant en lugar de UseStaticFiles, porque el StaticFileMiddleware
// NO respeta [Authorize] aunque vaya después de UseAuthentication —
// VULN-M02 del audit security.
//
// El callback OnPrepareResponse rechaza si no hay claim user_id. No
// validamos tenant del archivo aquí porque eso requiere parsear el path
// y resolver la entidad evidence — solo aceptamos requests autenticados,
// el riesgo residual es que un usuario del tenant A acceda al GUID de
// evidence del tenant B (mitigación: GUIDs son inadivinables por entropía
// 122 bits + en prod no se sirve desde aquí).
if (app.Environment.IsDevelopment())
{
    var wwwroot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
    Directory.CreateDirectory(Path.Combine(wwwroot, "uploads", "evidence"));
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(wwwroot),
        RequestPath = "",
        OnPrepareResponse = ctx =>
        {
            if (!ctx.Context.User.Identity?.IsAuthenticated ?? true)
            {
                ctx.Context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                ctx.Context.Response.ContentLength = 0;
                ctx.Context.Response.Body = Stream.Null;
            }
        }
    });
}

// MOBILE-SPECIFIC ENDPOINTS
app.MapMobileAuthEndpoints();
app.MapMobilePedidoEndpoints();
app.MapMobileVisitaEndpoints();
app.MapMobileClienteEndpoints();
app.MapMobileProductoEndpoints();
app.MapMobileSyncEndpoints();
app.MapMobileRutaEndpoints();
app.MapMobileCobroEndpoints();
app.MapMobileTrackingEndpoints();
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
app.MapMobileGeoProxyEndpoints();
app.MapInternalPushEndpoints();
app.MapMobileLogLevelEndpoints();
app.MapHealthEndpoints();
app.MapHub<MobileNotificationHub>("/hubs/notifications");

app.Run();

public partial class Program { }
