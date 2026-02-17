using System.Security.Claims;
using HandySales.Application.CompanySettings.Services;
using HandySales.Application.Companies.DTOs;
using HandySales.Application.Companies.Services;
using CompanySettingsDto = HandySales.Application.CompanySettings.DTOs.CompanySettingsDto;
using HandySales.Application.CompanySettings.DTOs;
using HandySales.Application.DatosFacturacion.DTOs;
using HandySales.Application.DatosFacturacion.Interfaces;
using HandySales.Shared.Multitenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints
{
    public static class CompanyEndpoints
    {
        public static void MapCompanyEndpoints(this IEndpointRouteBuilder app, ILogger logger)
        {
            var group = app.MapGroup("/api/company")
                .RequireAuthorization()
                .WithTags("Company Settings");

            // GET /api/company/settings
            group.MapGet("/settings", async (
                HttpContext context,
                [FromServices] ICompanySettingsService companyService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var tenantId = currentTenant.TenantId;
                    var result = await companyService.GetSettingsAsync(tenantId);

                    return result != null
                        ? Results.Ok(result)
                        : Results.NotFound("Configuración no encontrada");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("GetCompanySettings")
            .WithSummary("Obtener configuración de la empresa")
            .Produces<CompanySettingsDto>();

            // PUT /api/company/settings
            group.MapPut("/settings", async (
                UpdateCompanySettingsRequest request,
                HttpContext context,
                [FromServices] ICompanySettingsService companyService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    // Solo ADMIN y SUPER_ADMIN pueden modificar configuración de la empresa
                    if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var tenantId = currentTenant.TenantId;
                    var userIdClaim = context.User.FindFirst("userId")?.Value
                                     ?? context.User.FindFirst("sub")?.Value
                                     ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        return Results.Unauthorized();
                    }

                    var result = await companyService.UpdateSettingsAsync(tenantId, userId, request);

                    return result != null
                        ? Results.Ok(result)
                        : Results.BadRequest("No se pudo actualizar la configuración");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("UpdateCompanySettings")
            .WithSummary("Actualizar configuración de la empresa")
            .Accepts<UpdateCompanySettingsRequest>("application/json")
            .Produces<CompanySettingsDto>();

            // POST /api/company/upload-logo
            group.MapPost("/upload-logo", async (
                HttpContext context,
                [FromServices] ICompanySettingsService companyService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    // Solo ADMIN y SUPER_ADMIN pueden subir logo de la empresa
                    if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var form = await context.Request.ReadFormAsync();
                    var file = form.Files["logo"];

                    if (file == null || file.Length == 0)
                    {
                        return Results.BadRequest(new { error = "No se proporcionó ningún archivo" });
                    }

                    var tenantId = currentTenant.TenantId;
                    var userIdClaim = context.User.FindFirst("userId")?.Value
                                     ?? context.User.FindFirst("sub")?.Value
                                     ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        return Results.Unauthorized();
                    }

                    var result = await companyService.UploadLogoAsync(tenantId, userId, file);

                    return result != null
                        ? Results.Ok(result)
                        : Results.BadRequest("No se pudo subir el logo");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("UploadCompanyLogo")
            .WithSummary("Subir logo de la empresa")
            .Accepts<IFormFile>("multipart/form-data")
            .Produces<UploadLogoResponse>();

            // DELETE /api/company/settings/logo
            group.MapDelete("/settings/logo", async (
                HttpContext context,
                [FromServices] ICompanySettingsService companyService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    // Solo ADMIN y SUPER_ADMIN pueden eliminar logo de la empresa
                    if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var tenantId = currentTenant.TenantId;
                    var userIdClaim = context.User.FindFirst("userId")?.Value
                                     ?? context.User.FindFirst("sub")?.Value
                                     ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        return Results.Unauthorized();
                    }

                    var result = await companyService.DeleteLogoAsync(tenantId, userId);

                    if (result)
                    {
                        // Después de eliminar el logo, obtener la configuración actualizada
                        var updatedSettings = await companyService.GetSettingsAsync(tenantId);
                        return updatedSettings != null
                            ? Results.Ok(updatedSettings)
                            : Results.BadRequest("Logo eliminado pero no se pudo obtener la configuración actualizada");
                    }
                    else
                    {
                        return Results.BadRequest("No se pudo eliminar el logo");
                    }
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("DeleteCompanyLogo")
            .WithSummary("Eliminar logo de la empresa")
            .Produces<CompanySettingsDto>();

            // POST /api/company/initialize-folder
            group.MapPost("/initialize-folder", async (
                HttpContext context,
                [FromServices] ICompanySettingsService companyService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var tenantId = currentTenant.TenantId;
                    var userIdClaim = context.User.FindFirst("userId")?.Value;

                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        return Results.Unauthorized();
                    }

                    // Solo Super Admin o Admin pueden inicializar carpetas
                    if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    // Obtener o crear configuración que automáticamente creará la carpeta
                    var result = await companyService.GetSettingsAsync(tenantId);

                    return result != null
                        ? Results.Ok(new
                        {
                            success = true,
                            message = "Carpeta de empresa inicializada correctamente",
                            cloudinaryFolder = result.CloudinaryFolder
                        })
                        : Results.BadRequest("No se pudo inicializar la carpeta de la empresa");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("InitializeCompanyFolder")
            .WithSummary("Inicializar carpeta específica de la empresa en Cloudinary")
            .Produces<object>();

            // GET /api/company/billing
            group.MapGet("/billing", async (
                HttpContext context,
                [FromServices] IDatosFacturacionService billingService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var tenantId = currentTenant.TenantId;
                    var result = await billingService.GetByTenantAsync(tenantId);

                    return result != null
                        ? Results.Ok(result)
                        : Results.NotFound("Datos de facturación no encontrados");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("GetBillingData")
            .WithSummary("Obtener datos de facturación")
            .Produces<DatosFacturacionDto>();

            // POST /api/company/billing
            group.MapPost("/billing", async (
                CreateDatosFacturacionRequest request,
                HttpContext context,
                [FromServices] IDatosFacturacionService billingService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var tenantId = currentTenant.TenantId;
                    var userIdClaim = context.User.FindFirst("userId")?.Value;

                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        return Results.Unauthorized();
                    }

                    // Solo Super Admin o Admin pueden crear datos de facturación
                    if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var result = await billingService.CreateAsync(tenantId, userId, request);

                    return result != null
                        ? Results.Created($"/api/company/billing", result)
                        : Results.BadRequest("No se pudieron crear los datos de facturación");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("CreateBillingData")
            .WithSummary("Crear datos de facturación")
            .Accepts<CreateDatosFacturacionRequest>("application/json")
            .Produces<DatosFacturacionDto>();

            // PUT /api/company/billing
            group.MapPut("/billing", async (
                UpdateDatosFacturacionRequest request,
                HttpContext context,
                [FromServices] IDatosFacturacionService billingService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var tenantId = currentTenant.TenantId;
                    var userIdClaim = context.User.FindFirst("userId")?.Value;

                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        return Results.Unauthorized();
                    }

                    // Solo Super Admin o Admin pueden actualizar datos de facturación
                    if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var result = await billingService.UpdateAsync(tenantId, userId, request);

                    return result != null
                        ? Results.Ok(result)
                        : Results.BadRequest("No se pudieron actualizar los datos de facturación");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("UpdateBillingData")
            .WithSummary("Actualizar datos de facturación")
            .Accepts<UpdateDatosFacturacionRequest>("application/json")
            .Produces<DatosFacturacionDto>();

            // DELETE /api/company/billing
            group.MapDelete("/billing", async (
                HttpContext context,
                [FromServices] IDatosFacturacionService billingService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var tenantId = currentTenant.TenantId;
                    var userIdClaim = context.User.FindFirst("userId")?.Value;

                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        return Results.Unauthorized();
                    }

                    // Solo Super Admin puede eliminar datos de facturación
                    if (!currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var result = await billingService.DeleteAsync(tenantId, userId);

                    return result
                        ? Results.Ok(new { message = "Datos de facturación eliminados exitosamente" })
                        : Results.BadRequest("No se pudieron eliminar los datos de facturación");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("DeleteBillingData")
            .WithSummary("Eliminar datos de facturación")
            .Produces<object>();

            // Company management endpoints for SUPER_ADMIN
            var companyManagement = app.MapGroup("/api/companies")
                .RequireAuthorization()
                .WithTags("Company Management");

            // GET /api/companies - Solo SUPER_ADMIN puede ver todas las empresas
            companyManagement.MapGet("/", async (
                HttpContext context,
                [FromServices] ICompanyService companyService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    // Solo SUPER_ADMIN puede ver todas las empresas
                    if (!currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var result = await companyService.GetAllAsync();
                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("GetAllCompanies")
            .WithSummary("Obtener todas las empresas")
            .WithDescription("Solo accesible para SUPER_ADMIN")
            .Produces<IEnumerable<CompanyDto>>();

            // GET /api/companies/{id} - SUPER_ADMIN puede ver cualquier empresa, ADMIN solo la suya
            companyManagement.MapGet("/{id:int}", async (
                int id,
                HttpContext context,
                [FromServices] ICompanyService companyService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var company = await companyService.GetByIdAsync(id);

                    if (company == null)
                    {
                        return Results.NotFound("Empresa no encontrada");
                    }

                    // SUPER_ADMIN puede ver cualquier empresa
                    if (currentTenant.IsSuperAdmin)
                    {
                        return Results.Ok(company);
                    }

                    // ADMIN solo puede ver su propia empresa
                    if (currentTenant.IsAdmin && company.TenantId == currentTenant.TenantId)
                    {
                        return Results.Ok(company);
                    }

                    return Results.Forbid();
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("GetCompanyById")
            .WithSummary("Obtener empresa por ID")
            .Produces<CompanyDto>();

            // POST /api/companies - Solo SUPER_ADMIN puede crear empresas
            companyManagement.MapPost("/", async (
                CreateCompanyDto request,
                HttpContext context,
                [FromServices] ICompanyService companyService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    // Solo SUPER_ADMIN puede crear empresas
                    if (!currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var userIdClaim = context.User.FindFirst("userId")?.Value;

                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        return Results.Unauthorized();
                    }

                    var result = await companyService.CreateAsync(userId, request);

                    return result != null
                        ? Results.Created($"/api/companies/{result.Id}", result)
                        : Results.BadRequest("No se pudo crear la empresa");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("CreateCompany")
            .WithSummary("Crear nueva empresa")
            .WithDescription("Solo accesible para SUPER_ADMIN")
            .Accepts<CreateCompanyDto>("application/json")
            .Produces<CompanyDto>();

            // PUT /api/companies/{id} - SUPER_ADMIN puede actualizar cualquier empresa, ADMIN solo la suya
            companyManagement.MapPut("/{id:int}", async (
                int id,
                UpdateCompanyDto request,
                HttpContext context,
                [FromServices] ICompanyService companyService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var company = await companyService.GetByIdAsync(id);

                    if (company == null)
                    {
                        return Results.NotFound("Empresa no encontrada");
                    }

                    var userIdClaim = context.User.FindFirst("userId")?.Value;

                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        return Results.Unauthorized();
                    }

                    // SUPER_ADMIN puede actualizar cualquier empresa
                    if (currentTenant.IsSuperAdmin)
                    {
                        var result = await companyService.UpdateAsync(id, userId, request);
                        return result != null
                            ? Results.Ok(result)
                            : Results.BadRequest("No se pudo actualizar la empresa");
                    }

                    // ADMIN solo puede actualizar su propia empresa
                    if (currentTenant.IsAdmin && company.TenantId == currentTenant.TenantId)
                    {
                        var result = await companyService.UpdateAsync(id, userId, request);
                        return result != null
                            ? Results.Ok(result)
                            : Results.BadRequest("No se pudo actualizar la empresa");
                    }

                    return Results.Forbid();
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("UpdateCompany")
            .WithSummary("Actualizar empresa")
            .Accepts<UpdateCompanyDto>("application/json")
            .Produces<CompanyDto>();

            // DELETE /api/companies/{id} - Solo SUPER_ADMIN puede eliminar empresas
            companyManagement.MapDelete("/{id:int}", async (
                int id,
                HttpContext context,
                [FromServices] ICompanyService companyService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    // Solo SUPER_ADMIN puede eliminar empresas
                    if (!currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var result = await companyService.DeleteAsync(id);

                    return result
                        ? Results.Ok(new { message = "Empresa eliminada exitosamente" })
                        : Results.BadRequest("No se pudo eliminar la empresa");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("DeleteCompany")
            .WithSummary("Eliminar empresa")
            .WithDescription("Solo accesible para SUPER_ADMIN")
            .Produces<object>();
        }
    }
}