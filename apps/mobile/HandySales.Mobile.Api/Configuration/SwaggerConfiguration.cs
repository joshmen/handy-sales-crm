using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;

namespace HandySales.Mobile.Api.Configuration;

public static class SwaggerConfiguration
{
    public static IServiceCollection AddSwaggerConfiguration(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "HandySales Mobile API",
                Version = "v1.0.0",
                Description = @"API REST optimizada para la aplicación móvil de vendedores.

## Funcionalidades principales:
- **Autenticación**: Login, refresh tokens y gestión de sesiones móviles
- **Clientes**: Listado, búsqueda, filtrado por zona y ubicación GPS
- **Productos**: Catálogo con precios, stock y búsqueda por código de barras
- **Pedidos**: Creación, modificación y seguimiento de pedidos
- **Visitas**: Registro de visitas a clientes con check-in/check-out GPS
- **Rutas**: Gestión de rutas de vendedores y secuencia de visitas
- **Sincronización**: Soporte para trabajo offline con sync incremental

## Headers especiales:
- `X-Device-Id`: Identificador único del dispositivo móvil
- `X-App-Version`: Versión de la aplicación móvil

## Multi-tenant:
Cada vendedor pertenece a un tenant específico. Los datos se filtran automáticamente.",
                Contact = new OpenApiContact
                {
                    Name = "HandySales Support",
                    Email = "support@handysales.com",
                    Url = new Uri("https://handysales.com/support")
                },
                License = new OpenApiLicense
                {
                    Name = "MIT",
                    Url = new Uri("https://opensource.org/licenses/MIT")
                }
            });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = JwtBearerDefaults.AuthenticationScheme,
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = @"JWT Authorization header usando el esquema Bearer.

Ingrese el token en el formato: **Bearer {token}**

Ejemplo: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`"
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        },
                        Scheme = "oauth2",
                        Name = "Bearer",
                        In = ParameterLocation.Header
                    },
                    new List<string>()
                }
            });

            options.OrderActionsBy((apiDesc) => $"{apiDesc.ActionDescriptor.RouteValues["controller"]}_{apiDesc.HttpMethod}");

            // Incluir comentarios XML si existen
            var xmlFilename = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
            if (File.Exists(xmlPath))
            {
                options.IncludeXmlComments(xmlPath);
            }
        });

        return services;
    }

    public static IApplicationBuilder UseSwaggerConfiguration(this IApplicationBuilder app, IWebHostEnvironment env)
    {
        app.UseSwagger(options =>
        {
            options.RouteTemplate = "swagger/{documentName}/swagger.json";
        });

        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "HandySales Mobile API v1");
            options.RoutePrefix = "swagger";
            options.DocumentTitle = "HandySales Mobile API Documentation";

            options.EnableDeepLinking();
            options.DisplayRequestDuration();
            options.EnableFilter();
            options.ShowExtensions();
            options.EnableValidator();

            if (env.IsDevelopment())
            {
                options.EnableTryItOutByDefault();
            }
        });

        return app;
    }
}
