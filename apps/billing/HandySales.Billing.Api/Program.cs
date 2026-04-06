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
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers();

// Swagger configuration (centralized)
builder.Services.AddSwaggerConfiguration();

// Database configuration
builder.Services.AddDbContext<BillingDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("BillingConnection");
    options.UseNpgsql(connectionString, o =>
        {
            o.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorCodesToAdd: null);
            o.CommandTimeout(30);
        })
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
                "https://handy-sales-crm.vercel.app", // Vercel production deployment
                "https://handysales.vercel.app",   // Legacy Vercel domain
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
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"] ??
                    throw new InvalidOperationException("Jwt:Secret not configured")))
        };
    });

builder.Services.AddAuthorization();

// Rate limiting (protect PAC timbrado and email endpoints from abuse)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = System.Threading.RateLimiting.PartitionedRateLimiter.Create<HttpContext, string>(context =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// AWS S3 Storage (CFDI XMLs and PDFs)
var awsRegion = builder.Configuration["AWS_S3_REGION"] ?? "us-east-1";
builder.Services.AddSingleton<Amazon.S3.IAmazonS3>(sp =>
{
    var config = new Amazon.S3.AmazonS3Config
    {
        RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(awsRegion)
    };
    var accessKey = builder.Configuration["AWS_ACCESS_KEY_ID"] ?? "";
    var secretKey = builder.Configuration["AWS_SECRET_ACCESS_KEY"] ?? "";
    return new Amazon.S3.AmazonS3Client(accessKey, secretKey, config);
});
builder.Services.AddSingleton<IBlobStorageService, S3BlobStorageService>();

builder.Services.AddHttpClient("LogoClient", client =>
{
    client.Timeout = TimeSpan.FromSeconds(5);
});

// Certificate encryption service (AES-GCM + PBKDF2) — legacy, kept for backward compat
var encKey = builder.Configuration["BILLING_ENCRYPTION_KEY"];
if (string.IsNullOrEmpty(encKey))
    throw new InvalidOperationException("BILLING_ENCRYPTION_KEY env var is required. Generate with: openssl rand -base64 32");
builder.Services.AddSingleton<ICertificateEncryptionService, CertificateEncryptionService>();

// KMS envelope encryption (per-tenant DEK) — if CMK ARN configured, use KMS; otherwise legacy adapter
var cmkArn = builder.Configuration["KMS_CMK_ARN"];
if (!string.IsNullOrEmpty(cmkArn))
{
    builder.Services.AddSingleton<Amazon.KeyManagementService.IAmazonKeyManagementService>(sp =>
    {
        var kmsConfig = new Amazon.KeyManagementService.AmazonKeyManagementServiceConfig
        {
            RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(awsRegion)
        };
        var accessKey = builder.Configuration["AWS_ACCESS_KEY_ID"] ?? "";
        var secretKey = builder.Configuration["AWS_SECRET_ACCESS_KEY"] ?? "";
        return new Amazon.KeyManagementService.AmazonKeyManagementServiceClient(accessKey, secretKey, kmsConfig);
    });
    builder.Services.AddMemoryCache();
    builder.Services.AddSingleton<ITenantEncryptionService, KmsEnvelopeEncryptionService>();
}
else
{
    builder.Services.AddSingleton<ITenantEncryptionService, LegacyEncryptionAdapter>();
}

// CFDI 4.0 services (XML generation, signing, PAC timbrado)
builder.Services.AddSingleton<ICfdiXmlBuilder, CfdiXmlBuilder>();
builder.Services.AddSingleton<ICfdiSigner, CfdiSigner>();
builder.Services.AddHttpClient<IPacService, FinkokPacService>();

// PDF generation service
builder.Services.AddSingleton<IInvoicePdfService, InvoicePdfService>();

// Company logo service (reads from main DB to get company logo for PDF)
builder.Services.AddSingleton<ICompanyLogoService, CompanyLogoService>();

// Order reader service (reads pedido data from main DB for invoice creation)
builder.Services.AddSingleton<IOrderReaderService, OrderReaderService>();

// Fiscal code resolver (resolves SAT codes via mapping → product → defaults → fallback)
builder.Services.AddScoped<FiscalCodeResolver>();

// Email service (SendGrid)
builder.Services.AddSingleton<IBillingEmailService, BillingEmailService>();

// Timbre enforcement (calls Main API to check/register stamp usage)
var mainApiUrl = builder.Configuration["MAIN_API_URL"] ?? "http://localhost:1050";
builder.Services.AddHttpClient<ITimbreEnforcementService, TimbreEnforcementService>(client =>
{
    client.BaseAddress = new Uri(mainApiUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
});

// Health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<BillingDbContext>("database");

var app = builder.Build();

// Configure the HTTP request pipeline - Swagger (dev only — not exposed in production)
if (app.Environment.IsDevelopment())
{
    app.UseSwaggerConfiguration(app.Environment);
}

// Global exception handler — maps known exceptions to proper HTTP status codes
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var ex = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        var (statusCode, message) = ex switch
        {
            UnauthorizedAccessException => (401, ex.Message),
            InvalidOperationException => (400, !string.IsNullOrEmpty(ex.Message) ? ex.Message : "Operación no válida"),
            ArgumentException => (400, !string.IsNullOrEmpty(ex.Message) ? ex.Message : "Parámetros inválidos"),
            KeyNotFoundException => (404, "Recurso no encontrado"),
            _ => (500, "Error interno del servidor")
        };
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { error = message });
    });
});

// Middleware pipeline
app.UseHttpsRedirection();
app.UseCors("BillingApiPolicy");
app.UseRateLimiter();
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
