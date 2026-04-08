using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;

namespace HandySuites.Api.Configuration;

public static class SwaggerConfiguration
{
    public static IServiceCollection AddSwaggerConfiguration(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "HandySuites API - Principal",
                Version = "v1.0.0",
                Description = "API REST principal para el sistema HandySuites CRM - Gestión de clientes, productos, usuarios y ventas",
                Contact = new OpenApiContact
                {
                    Name = "HandySuites Support",
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
                Description = "Ingrese el token JWT en el formato: Bearer {token}"
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
        // Habilitar Swagger en desarrollo, o si ENABLE_SWAGGER=true (temporal para debugging en prod)
        var forceSwagger = Environment.GetEnvironmentVariable("ENABLE_SWAGGER");
        if (!env.IsDevelopment() && forceSwagger != "true")
            return app;

        app.UseSwagger(options =>
        {
            options.RouteTemplate = "swagger/{documentName}/swagger.json";
        });
        
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "HandySuites API v1");
            options.RoutePrefix = "swagger";
            options.DocumentTitle = "HandySuites API Documentation";
            
            // Configuración adicional de UI
            options.EnableDeepLinking();
            options.DisplayRequestDuration();
            options.EnableFilter();
            options.ShowExtensions();
            options.EnableValidator();
            options.EnableTryItOutByDefault();
        });

        return app;
    }
}