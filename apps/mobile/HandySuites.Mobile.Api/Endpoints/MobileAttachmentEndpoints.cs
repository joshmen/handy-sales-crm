using HandySuites.Application.Common.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileAttachmentEndpoints
{
    public static void MapMobileAttachmentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/mobile/attachments")
            .RequireAuthorization()
            .WithTags("Mobile Attachments");

        // Allowlist de eventType para prevenir abuso (hardening v23).
        var allowedEventTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "pedido", "visita", "cobro", "gasto", "devolucion"
        };

        group.MapPost("/upload", async (
            HttpRequest request,
            IWebHostEnvironment env,
            ILogger<Program> logger,
            IServiceProvider sp,
            ClaimsPrincipal userClaims) =>
        {
            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new { success = false, message = "Expected multipart/form-data" });
            }

            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");

            if (file == null || file.Length == 0)
            {
                return Results.BadRequest(new { success = false, message = "No file provided" });
            }

            var eventType = form["eventType"].ToString();
            var eventLocalId = form["eventLocalId"].ToString();
            var tipo = form["tipo"].ToString();

            if (string.IsNullOrEmpty(eventType) || string.IsNullOrEmpty(eventLocalId) || string.IsNullOrEmpty(tipo))
            {
                return Results.BadRequest(new { success = false, message = "eventType, eventLocalId, and tipo are required" });
            }

            // Hardening: rechazar eventTypes desconocidos.
            if (!allowedEventTypes.Contains(eventType))
            {
                return Results.BadRequest(new { success = false, message = $"Invalid eventType '{eventType}'. Allowed: {string.Join(",", allowedEventTypes)}" });
            }

            // Validate file type
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
            {
                return Results.BadRequest(new { success = false, message = "Only image files are allowed (jpg, png, webp)" });
            }

            // Max 10MB
            if (file.Length > 10 * 1024 * 1024)
            {
                return Results.BadRequest(new { success = false, message = "File too large (max 10MB)" });
            }

            try
            {
                string? resultUrl = null;

                // Try Cloudinary first (required in production)
                var cloudinary = sp.GetService<ICloudinaryService>();
                if (cloudinary != null)
                {
                    resultUrl = await cloudinary.UploadImageAsync(file, $"evidence/{eventType}");
                    logger.LogInformation("Attachment uploaded to Cloudinary: {EventType}/{EventLocalId}/{Tipo} -> {Url}", eventType, eventLocalId, tipo, resultUrl);
                }
                else
                {
                    // Local storage fallback (development only)
                    if (!env.IsDevelopment())
                    {
                        return Results.StatusCode(501);
                    }

                    var uploadsDir = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads", "evidence");
                    Directory.CreateDirectory(uploadsDir);

                    var filename = $"{Guid.NewGuid()}{extension}";
                    var filePath = Path.Combine(uploadsDir, filename);

                    await using var stream = new FileStream(filePath, FileMode.Create);
                    await file.CopyToAsync(stream);

                    resultUrl = $"/uploads/evidence/{filename}";
                    logger.LogInformation("Attachment uploaded locally: {EventType}/{EventLocalId}/{Tipo} -> {Url}", eventType, eventLocalId, tipo, resultUrl);
                }

                // Stamp post-upload: si eventType es 'gasto' o 'devolucion', buscar la
                // entidad por MobileRecordId y stampar la URL para que aparezca el
                // comprobante en web admin sin esperar al proximo sync push. v23 (2026-05-29).
                if (eventType.Equals("gasto", StringComparison.OrdinalIgnoreCase)
                    || eventType.Equals("devolucion", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        var dbContext = sp.GetService<HandySuitesDbContext>();
                        if (dbContext != null && !string.IsNullOrEmpty(resultUrl))
                        {
                            var tenantClaim = userClaims.FindFirst("tenantId")?.Value ?? userClaims.FindFirst("tenant_id")?.Value;
                            if (int.TryParse(tenantClaim, out var tenantId))
                            {
                                if (eventType.Equals("gasto", StringComparison.OrdinalIgnoreCase))
                                {
                                    var gasto = await dbContext.Gastos.IgnoreQueryFilters()
                                        .FirstOrDefaultAsync(g => g.TenantId == tenantId && g.MobileRecordId == eventLocalId);
                                    if (gasto != null)
                                    {
                                        gasto.ComprobanteUrl = resultUrl;
                                        gasto.ActualizadoEn = DateTime.UtcNow;
                                        gasto.Version++;
                                        await dbContext.SaveChangesAsync();
                                    }
                                }
                                else // devolucion
                                {
                                    var dev = await dbContext.DevolucionesPedido.IgnoreQueryFilters()
                                        .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.MobileRecordId == eventLocalId);
                                    if (dev != null)
                                    {
                                        dev.FotoEvidenciaUrl = resultUrl;
                                        dev.ActualizadoEn = DateTime.UtcNow;
                                        dev.Version++;
                                        await dbContext.SaveChangesAsync();
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception stampEx)
                    {
                        // No fallar el upload por error de stamping. Si el gasto/devolucion
                        // aun no se ha sincronizado, el siguiente UpsertGastoAsync podra
                        // hacer lookup orphan (futuro). Por ahora log y seguir.
                        logger.LogWarning(stampEx, "Failed to stamp URL on {EventType}/{EventLocalId} (entity not yet synced?)", eventType, eventLocalId);
                    }
                }

                return Results.Ok(new { success = true, data = new { url = resultUrl } });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to upload attachment");
                return Results.StatusCode(500);
            }
        })
        .DisableAntiforgery()
        .Accepts<IFormFile>("multipart/form-data")
        .Produces(200)
        .Produces(400)
        .WithName("UploadAttachment")
        .WithOpenApi();
    }
}
