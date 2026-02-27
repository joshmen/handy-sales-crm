using Microsoft.EntityFrameworkCore;
using HandySales.Billing.Api.Data;
using HandySales.Billing.Api.Configuration;
using HandySales.Billing.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using QuestPDF.Infrastructure;

// QuestPDF Community License (free for <$1M annual revenue)
QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog logging (Seq for dev, Application Insights for prod)
builder.Host.AddCustomLogging();

// Add services to the container
builder.Services.AddControllers();

// Swagger configuration (centralized)
builder.Services.AddSwaggerConfiguration();

// Database configuration
builder.Services.AddDbContext<BillingDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("BillingConnection");
    var serverVersion = new MySqlServerVersion(new Version(8, 0, 0));
    options.UseMySql(connectionString, serverVersion)
        .UseSnakeCaseNamingConvention();
});

// CORS configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("BillingApiPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",           // Next.js dev
                "https://localhost:3000",
                "http://localhost:1083",           // Next.js dev (HandySales port)
                "http://localhost:3001",           // Alternative port
                "https://*.vercel.app",            // Vercel deployments
                "https://handysales.vercel.app",   // Your production domain
                "https://handysales.com",          // Your custom domain
                "https://www.handysales.com"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
    });
});

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JWT:Issuer"],
            ValidAudience = builder.Configuration["JWT:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"] ??
                    throw new InvalidOperationException("Jwt:Secret not configured")))
        };
    });

builder.Services.AddAuthorization();

// PDF generation service
builder.Services.AddSingleton<IInvoicePdfService, InvoicePdfService>();

// Email service (SendGrid)
builder.Services.AddSingleton<IBillingEmailService, BillingEmailService>();

// Health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<BillingDbContext>("database");

var app = builder.Build();

// Configure the HTTP request pipeline - Swagger (centralized configuration)
app.UseSwaggerConfiguration(app.Environment);

// Middleware pipeline
app.UseHttpsRedirection();
app.UseCors("BillingApiPolicy");
app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint
app.MapHealthChecks("/health");

// Controllers
app.MapControllers();

// Root endpoint
app.MapGet("/", () => new
{
    service = "HandySales Billing API",
    version = "1.0.0",
    status = "running",
    documentation = "/swagger"
});

// Ensure database tables exist on startup (all environments)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<BillingDbContext>();
    try
    {
        dbContext.Database.EnsureCreated();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Database initialization check — tables may already exist from SQL scripts");
    }
}

app.Run();
