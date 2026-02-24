using Microsoft.AspNetCore.Mvc;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileAttachmentEndpoints
{
    public static void MapMobileAttachmentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/mobile/attachments")
            .RequireAuthorization()
            .WithTags("Mobile Attachments");

        group.MapPost("/upload", async (
            HttpRequest request,
            IWebHostEnvironment env,
            ILogger<Program> logger) =>
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
                var uploadsDir = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads", "evidence");
                Directory.CreateDirectory(uploadsDir);

                var filename = $"{Guid.NewGuid()}{extension}";
                var filePath = Path.Combine(uploadsDir, filename);

                await using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);

                var url = $"/uploads/evidence/{filename}";

                logger.LogInformation("Attachment uploaded: {EventType}/{EventLocalId}/{Tipo} -> {Url}", eventType, eventLocalId, tipo, url);

                return Results.Ok(new
                {
                    success = true,
                    data = new { url }
                });
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
