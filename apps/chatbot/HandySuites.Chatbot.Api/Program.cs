using System.Net.Http.Headers;
using System.Text;
using System.Threading.RateLimiting;
using HandySuites.Chatbot.Api.Data;
using HandySuites.Chatbot.Api.Endpoints;
using HandySuites.Chatbot.Api.Hubs;
using HandySuites.Chatbot.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ──
builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// ── DB handy_chat (pgvector, snake_case) ──
var chatConn = builder.Configuration.GetConnectionString("ChatDb")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__ChatDb")
    ?? "Host=localhost;Port=5432;Database=handy_chat;Username=handy_user;Password=handy_pass;";
builder.Services.AddDbContext<ChatDbContext>(opt =>
    opt.UseNpgsql(chatConn, o => o.UseVector()).UseSnakeCaseNamingConvention());

// ── OpenAI HttpClient ──
var openAiKey = builder.Configuration["Ai:ApiKey"]
    ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? "";
builder.Services.AddHttpClient("OpenAI", c =>
{
    c.BaseAddress = new Uri("https://api.openai.com/");
    if (!string.IsNullOrEmpty(openAiKey))
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", openAiKey);
    c.Timeout = TimeSpan.FromSeconds(60);
});

// ── CORS (publico para el widget, agente para la consola SA) ──
var allowedOrigins = (builder.Configuration["Chat:AllowedOrigins"]
        ?? Environment.GetEnvironmentVariable("CHAT__ALLOWED_ORIGINS") ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options =>
{
    options.AddPolicy("ChatbotPublic", p =>
    {
        if (builder.Environment.IsDevelopment())
            p.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod();
        else if (allowedOrigins.Length > 0)
            p.WithOrigins(allowedOrigins).AllowAnyHeader().WithMethods("GET", "POST");
    });
    options.AddPolicy("ChatbotAgent", p =>
    {
        if (builder.Environment.IsDevelopment())
            p.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        else if (allowedOrigins.Length > 0)
            p.WithOrigins(allowedOrigins).AllowAnyHeader().WithMethods("GET", "POST").AllowCredentials();
    });
});

// ── JWT bearer (mismo secreto compartido que el Main API) + access_token por query para /hubs ──
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "";
if (jwtSecret.Length < 32) jwtSecret = jwtSecret.PadRight(32, '0'); // fallback dev (el env real lo provee)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.MapInboundClaims = false;
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "HandySuites",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "HandySuitesUsers",
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            RoleClaimType = "role",
            ClockSkew = TimeSpan.FromMinutes(1),
        };
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var accessToken = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

// ── Rate limiting (publico por IP + global) ──
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.AddPolicy("chatbot-anonymous", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 200, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddSignalR();

// ── Servicios del chatbot (RAG + KB + canal SSE del visitante + bandeja del agente) ──
builder.Services.AddSingleton<ConversationStreamRegistry>();
builder.Services.AddScoped<OpenAiClient>();
builder.Services.AddScoped<KbIngestService>();
builder.Services.AddScoped<AgentNotifier>();
builder.Services.AddScoped<ChatService>();
builder.Services.AddScoped<AgentService>();
builder.Services.AddHostedService<HandySuites.Chatbot.Api.Workers.BotResumeWorker>();

builder.Services.AddHealthChecks().AddDbContextCheck<ChatDbContext>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ── Auto-migrate (dev / RUN_MIGRATIONS != false) ──
if (!string.Equals(Environment.GetEnvironmentVariable("RUN_MIGRATIONS"), "false", StringComparison.OrdinalIgnoreCase))
{
    try
    {
        using var scope = app.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<ChatDbContext>().Database.Migrate();
    }
    catch (Exception ex)
    {
        Log.Error(ex, "No se pudo aplicar la migracion de handy_chat al arrancar");
    }
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

// Security headers minimos (Fase 0; Fase 1 endurece + CSP del widget).
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapChatbotEndpoints();
app.MapHub<InboxHub>("/hubs/inbox").RequireCors("ChatbotAgent");

app.Run();
