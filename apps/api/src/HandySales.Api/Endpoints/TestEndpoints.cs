using HandySales.Application.CompanySettings.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints
{
    public static class TestEndpoints
    {
        public static void MapTestEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/test")
                .WithTags("Test")
                .AllowAnonymous();

            // Test Cloudinary connection
            group.MapPost("/cloudinary", async (
                IFormFile file,
                [FromServices] ICloudinaryService cloudinaryService) =>
            {
                try
                {
                    if (file == null || file.Length == 0)
                    {
                        return Results.BadRequest(new { 
                            success = false, 
                            message = "No file provided",
                            timestamp = DateTime.UtcNow
                        });
                    }

                    var result = await cloudinaryService.UploadImageAsync(file, "test-uploads");
                    
                    if (result.IsSuccess)
                    {
                        return Results.Ok(new { 
                            success = true,
                            message = "Cloudinary connection successful!",
                            imageUrl = result.SecureUrl,
                            publicId = result.PublicId,
                            fileSize = file.Length,
                            fileName = file.FileName,
                            timestamp = DateTime.UtcNow
                        });
                    }
                    else
                    {
                        return Results.BadRequest(new { 
                            success = false,
                            message = "Upload failed",
                            error = result.ErrorMessage,
                            timestamp = DateTime.UtcNow
                        });
                    }
                }
                catch (Exception ex)
                {
                    return Results.Problem(new { 
                        success = false,
                        message = "Cloudinary connection failed",
                        error = ex.Message,
                        stackTrace = ex.StackTrace,
                        timestamp = DateTime.UtcNow
                    }.ToString());
                }
            })
            .WithName("TestCloudinary")
            .WithSummary("Test Cloudinary connection by uploading a file")
            .Accepts<IFormFile>("multipart/form-data")
            .DisableAntiforgery();

            // Test basic connectivity
            group.MapGet("/ping", () =>
            {
                return Results.Ok(new { 
                    success = true,
                    message = "API is running",
                    timestamp = DateTime.UtcNow,
                    environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown"
                });
            })
            .WithName("TestPing")
            .WithSummary("Basic connectivity test");

            // Test configuration
            group.MapGet("/config", ([FromServices] IConfiguration config) =>
            {
                var cloudinaryUrl = config["Cloudinary:Url"];
                
                return Results.Ok(new { 
                    success = true,
                    message = "Configuration check",
                    cloudinaryConfigured = !string.IsNullOrEmpty(cloudinaryUrl),
                    cloudinaryUrlMasked = string.IsNullOrEmpty(cloudinaryUrl) 
                        ? "Not configured" 
                        : $"{cloudinaryUrl.Substring(0, Math.Min(20, cloudinaryUrl.Length))}***",
                    timestamp = DateTime.UtcNow
                });
            })
            .WithName("TestConfig")
            .WithSummary("Check configuration status");
        }
    }
}