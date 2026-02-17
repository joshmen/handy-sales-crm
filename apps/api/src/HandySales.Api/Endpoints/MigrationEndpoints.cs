using HandySales.Application.CompanySettings.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Endpoints;

public static class MigrationEndpoints
{
    public static void MapMigrationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/migration")
            .RequireAuthorization()
            .WithTags("Migration");

        // POST /api/migration/initialize-existing-tenants
        group.MapPost("/initialize-existing-tenants", [Authorize(Roles = "SUPER_ADMIN")] async (
            HandySalesDbContext dbContext,
            ICloudinaryService cloudinaryService) =>
        {
            try
            {
                // Obtener todos los tenants que no tienen carpeta de Cloudinary
                var tenantsWithoutFolder = await dbContext.Tenants
                    .Where(t => string.IsNullOrEmpty(t.CloudinaryFolder))
                    .ToListAsync();

                var results = new List<object>();

                foreach (var tenant in tenantsWithoutFolder)
                {
                    try
                    {
                        // Generar carpeta para el tenant
                        var tenantFolder = cloudinaryService.GenerateTenantFolder(tenant.Id, tenant.NombreEmpresa);
                        
                        // Crear la carpeta en Cloudinary
                        var folderCreated = await cloudinaryService.CreateFolderAsync(tenantFolder);
                        
                        if (folderCreated)
                        {
                            // Actualizar el tenant con la carpeta
                            tenant.CloudinaryFolder = tenantFolder;
                            
                            // Crear configuración de empresa si no existe
                            var existingSettings = await dbContext.CompanySettings
                                .FirstOrDefaultAsync(cs => cs.TenantId == tenant.Id);

                            if (existingSettings == null)
                            {
                                var companySetting = new HandySales.Domain.Entities.CompanySetting
                                {
                                    TenantId = tenant.Id,
                                    CompanyName = tenant.NombreEmpresa,
                                    CloudinaryFolder = tenantFolder,
                                    PrimaryColor = "#007bff",
                                    SecondaryColor = "#6c757d"
                                };
                                
                                dbContext.CompanySettings.Add(companySetting);
                            }
                            else
                            {
                                existingSettings.CloudinaryFolder = tenantFolder;
                            }

                            results.Add(new
                            {
                                tenantId = tenant.Id,
                                tenantName = tenant.NombreEmpresa,
                                status = "success",
                                cloudinaryFolder = tenantFolder
                            });
                        }
                        else
                        {
                            results.Add(new
                            {
                                tenantId = tenant.Id,
                                tenantName = tenant.NombreEmpresa,
                                status = "error",
                                message = "No se pudo crear la carpeta en Cloudinary"
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        results.Add(new
                        {
                            tenantId = tenant.Id,
                            tenantName = tenant.NombreEmpresa,
                            status = "error",
                            message = ex.Message
                        });
                    }
                }

                // Guardar todos los cambios
                await dbContext.SaveChangesAsync();

                return Results.Ok(new
                {
                    message = $"Proceso completado. {results.Count(r => ((dynamic)r).status == "success")} tenants inicializados correctamente.",
                    totalProcessed = results.Count,
                    results = results
                });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error en la migración: {ex.Message}");
            }
        })
        .WithName("InitializeExistingTenants")
        .WithSummary("Inicializar carpetas de Cloudinary para tenants existentes")
        .Produces<object>();

        // GET /api/migration/tenants-status
        group.MapGet("/tenants-status", [Authorize(Roles = "SUPER_ADMIN")] async (
            HandySalesDbContext dbContext) =>
        {
            var tenants = await dbContext.Tenants
                .Select(t => new
                {
                    id = t.Id,
                    name = t.NombreEmpresa,
                    hasCloudinaryFolder = !string.IsNullOrEmpty(t.CloudinaryFolder),
                    cloudinaryFolder = t.CloudinaryFolder,
                    hasCompanySettings = dbContext.CompanySettings.Any(cs => cs.TenantId == t.Id)
                })
                .ToListAsync();

            var summary = new
            {
                total = tenants.Count,
                withCloudinary = tenants.Count(t => t.hasCloudinaryFolder),
                withoutCloudinary = tenants.Count(t => !t.hasCloudinaryFolder),
                withSettings = tenants.Count(t => t.hasCompanySettings),
                withoutSettings = tenants.Count(t => !t.hasCompanySettings)
            };

            return Results.Ok(new { summary, tenants });
        })
        .WithName("GetTenantsStatus")
        .WithSummary("Obtener estado de configuración de todos los tenants")
        .Produces<object>();
    }
}