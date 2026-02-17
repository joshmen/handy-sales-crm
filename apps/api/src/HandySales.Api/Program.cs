using HandySales.Api.Configuration;
using HandySales.Api.Endpoints;
using HandySales.Api.Middleware;

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

// Configure JSON serialization for Minimal APIs
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});


var app = builder.Build();

// MIDDLEWARE
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

// Swagger configuration (habilitado en todos los ambientes)
app.UseSwaggerConfiguration(app.Environment);

app.UseHttpsRedirection();
app.UseCors("HandySalesPolicy");
app.UseAuthentication();
app.UseAuthorization();

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
app.MapGlobalSettingsEndpoints();
app.MapProfileEndpoints();
app.MapImageUploadEndpoints();
app.MapNotificationPreferencesEndpoints();
app.MapMigrationEndpoints();
app.MapTestEndpoints();
app.MapHealthEndpoints();
app.MapNotificationEndpoints();
app.MapImpersonationEndpoints();
app.MapImportExportEndpoints();
app.MapReportEndpoints();
app.MapCobroEndpoints();

app.Run();
public partial class Program { }
