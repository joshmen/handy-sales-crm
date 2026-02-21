using HandySales.Application.CompanySettings.Interfaces;
using HandySales.Shared.Email;
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

            // Test SendGrid email
            group.MapPost("/email", async (
                [FromBody] TestEmailRequest dto,
                [FromServices] IEmailService emailService) =>
            {
                try
                {
                    var apiKey = Environment.GetEnvironmentVariable("SENDGRID_API_KEY");
                    var fromEmail = Environment.GetEnvironmentVariable("SENDGRID_FROM_EMAIL");

                    if (string.IsNullOrEmpty(apiKey))
                    {
                        return Results.Ok(new
                        {
                            success = false,
                            message = "SENDGRID_API_KEY not configured — running in dry-run mode",
                            fromEmail,
                            timestamp = DateTime.UtcNow
                        });
                    }

                    var template = dto.Template?.ToLower() switch
                    {
                        "welcome" => EmailTemplates.WelcomeNewTenant("Empresa Test", "Admin Test"),
                        "expired" => EmailTemplates.SubscriptionExpired("Empresa Test"),
                        "deactivated" => EmailTemplates.TenantDeactivated("Empresa Test"),
                        "warning" => EmailTemplates.SubscriptionExpiringWarning("Empresa Test", 3, DateTime.UtcNow.AddDays(3)),
                        "payment_failed" => EmailTemplates.PaymentFailed("Empresa Test", "4242"),
                        "payment_success" => EmailTemplates.PaymentSuccessful("Empresa Test", "Pro", 999),
                        "password_reset" => EmailTemplates.PasswordReset("Admin Test", "https://app.handysales.com/reset-password?token=test123"),
                        _ => EmailTemplates.WelcomeNewTenant("Empresa Test", "Admin Test")
                    };

                    var subject = dto.Template?.ToLower() switch
                    {
                        "welcome" => "Bienvenido a HandySales",
                        "expired" => "Su suscripción ha expirado",
                        "deactivated" => "Cuenta Desactivada",
                        "warning" => "Su suscripción está por vencer",
                        "payment_failed" => "Error en el pago",
                        "payment_success" => "Pago recibido",
                        "password_reset" => "Restablecer Contraseña - HandySales",
                        _ => "Bienvenido a HandySales"
                    };

                    await emailService.SendAsync(dto.To, subject, template);

                    return Results.Ok(new
                    {
                        success = true,
                        message = $"Email sent to {dto.To}",
                        template = dto.Template ?? "welcome",
                        fromEmail,
                        timestamp = DateTime.UtcNow
                    });
                }
                catch (Exception ex)
                {
                    return Results.Ok(new
                    {
                        success = false,
                        message = "Failed to send email",
                        error = ex.Message,
                        timestamp = DateTime.UtcNow
                    });
                }
            })
            .WithName("TestEmail")
            .WithSummary("Send a test email via SendGrid");
        }
    }

    public record TestEmailRequest(string To, string? Template);
}