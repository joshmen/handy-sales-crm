using HandySales.Mobile.Api.Configuration;
using HandySales.Mobile.Api.Endpoints;
using HandySales.Mobile.Api.Middleware;

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

var app = builder.Build();

// MIDDLEWARE
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

// Swagger configuration
app.UseSwaggerConfiguration(app.Environment);

app.UseHttpsRedirection();
app.UseCors("MobilePolicy");
app.UseAuthentication();
app.UseAuthorization();

// MOBILE-SPECIFIC ENDPOINTS
app.MapMobileAuthEndpoints();
app.MapMobilePedidoEndpoints();
app.MapMobileVisitaEndpoints();
app.MapMobileClienteEndpoints();
app.MapMobileProductoEndpoints();
app.MapMobileSyncEndpoints();
app.MapMobileRutaEndpoints();
app.MapHealthEndpoints();

app.Run();

public partial class Program { }
