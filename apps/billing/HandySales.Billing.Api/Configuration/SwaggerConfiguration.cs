using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;

namespace HandySales.Billing.Api.Configuration;

public static class SwaggerConfiguration
{
    public static IServiceCollection AddSwaggerConfiguration(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "HandySales Billing API",
                Version = "v1.0.0",
                Description = @"API REST para facturación electrónica con cumplimiento SAT CFDI.

## Funcionalidades principales:
- **Facturas (CFDI)**: Creación, timbrado, cancelación y consulta de facturas electrónicas
- **Catálogos SAT**: Acceso a catálogos oficiales (formas de pago, usos CFDI, tipos de comprobante)
- **Configuración fiscal**: Gestión de datos fiscales del emisor por tenant
- **Reportes**: Exportación de facturas en PDF y XML

## Autenticación:
Todos los endpoints requieren autenticación JWT. El token debe incluir el tenant_id del usuario.

## Multi-tenant:
La API soporta múltiples empresas (tenants). Cada tenant tiene sus propias facturas y configuración fiscal.",
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
                },
                TermsOfService = new Uri("https://handysales.com/terms")
            });

            // Configuración de seguridad JWT
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

            // Ordenar endpoints por tags
            options.OrderActionsBy((apiDesc) => $"{apiDesc.ActionDescriptor.RouteValues["controller"]}_{apiDesc.HttpMethod}");

            // Tags personalizados
            options.TagActionsBy(api =>
            {
                if (api.GroupName != null)
                    return new[] { api.GroupName };

                var controllerName = api.ActionDescriptor.RouteValues["controller"];
                return controllerName != null ? new[] { controllerName } : new[] { "Default" };
            });

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
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "HandySales Billing API v1");
            options.RoutePrefix = "swagger";
            options.DocumentTitle = "HandySales Billing API Documentation";

            // Configuración adicional de UI
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
