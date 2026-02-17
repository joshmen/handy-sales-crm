using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Security;
using Microsoft.EntityFrameworkCore;
using HandySales.Application.ActivityTracking.Services;
using HandySales.Application.CompanySettings.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Linq;

public class AuthService
{
    private readonly HandySalesDbContext _db;
    private readonly JwtTokenGenerator _jwt;
    private readonly IActivityTrackingService _activityTracking;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IServiceProvider _serviceProvider;
    private readonly ICloudinaryService _cloudinaryService;

    public AuthService(
        HandySalesDbContext db, 
        JwtTokenGenerator jwt,
        IActivityTrackingService activityTracking,
        IHttpContextAccessor httpContextAccessor,
        IServiceProvider serviceProvider,
        ICloudinaryService cloudinaryService)
    {
        _db = db;
        _jwt = jwt;
        _activityTracking = activityTracking;
        _httpContextAccessor = httpContextAccessor;
        _serviceProvider = serviceProvider;
        _cloudinaryService = cloudinaryService;
    }

    public async Task<bool> RegisterAsync(UsuarioRegisterDto dto)
    {
        // Verifica si ya existe ese email
        if (await _db.Usuarios.AnyAsync(u => u.Email == dto.Email))
            return false;

        // Crea el Tenant
        var tenant = new Tenant
        {
            NombreEmpresa = dto.NombreEmpresa,
            RFC = dto.RFC ?? string.Empty,
            Contacto = dto.Contacto ?? string.Empty
        };

        _db.Tenants.Add(tenant);
        await _db.SaveChangesAsync(); // Necesitamos el Id del tenant

        // Crear carpeta en Cloudinary para el nuevo tenant
        try
        {
            var tenantFolder = _cloudinaryService.GenerateTenantFolder(tenant.Id, tenant.NombreEmpresa);
            var folderCreated = await _cloudinaryService.CreateFolderAsync(tenantFolder);
            
            if (folderCreated)
            {
                tenant.CloudinaryFolder = tenantFolder;
                _db.Tenants.Update(tenant);
                await _db.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            // Log error pero continuar con el registro
            Console.WriteLine($"Error creando carpeta de Cloudinary: {ex.Message}");
        }

        // Crea el Usuario administrador
        var usuario = new Usuario
        {
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Nombre = dto.Nombre,
            EsAdmin = true,
            TenantId = tenant.Id
        };

        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<object?> LoginAsync(UsuarioLoginDto dto)
    {
        // Bypass global filters for login query - user might not have tenant context yet
        var usuario = await _db.Usuarios.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == dto.email);

        // Verify password using BCrypt
        var loginSuccess = usuario != null && BCrypt.Net.BCrypt.Verify(dto.password, usuario.PasswordHash);

        if (!loginSuccess || usuario is null)
        {
            // Log failed login attempt
            if (usuario != null)
            {
                await LogActivityAsync(usuario.TenantId, usuario.Id, "login", "auth",
                    $"Intento de login fallido para {usuario.Email}", "failed");
            }
            return null;
        }

        var token = _jwt.GenerateTokenWithRoles(usuario.Id.ToString(), usuario.TenantId, usuario.EsAdmin, usuario.EsSuperAdmin);
        
        // Crear refresh token real en la base de datos
        var refreshToken = await CreateRefreshTokenAsync(usuario.Id);
        
        // Log successful login
        await LogActivityAsync(usuario.TenantId, usuario.Id, "login", "auth", 
            $"Usuario {usuario.Email} inició sesión exitosamente");
        
        var role = usuario.EsSuperAdmin ? "SUPER_ADMIN" : (usuario.EsAdmin ? "ADMIN" : "VENDEDOR");
        
        return new 
        {
            user = new 
            {
                id = usuario.Id.ToString(),
                email = usuario.Email,
                name = usuario.Nombre,
                role = role
            },
            token = token,
            refreshToken = refreshToken.Token
        };
    }

    public async Task<object?> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
            return null;

        // Buscar el refresh token en la base de datos
        var tokenEntity = await _db.RefreshTokens
            .Include(rt => rt.Usuario)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken && 
                                     !rt.IsRevoked && 
                                     rt.ExpiresAt > DateTime.UtcNow);

        if (tokenEntity == null)
            return null;

        // Revocar el token actual
        tokenEntity.IsRevoked = true;
        tokenEntity.RevokedAt = DateTime.UtcNow;

        // Crear nuevo access token
        var newAccessToken = _jwt.GenerateToken(tokenEntity.Usuario.Id.ToString(), tokenEntity.Usuario.TenantId);
        
        // Crear nuevo refresh token
        var newRefreshToken = await CreateRefreshTokenAsync(tokenEntity.UserId);
        tokenEntity.ReplacedByToken = newRefreshToken.Token;

        await _db.SaveChangesAsync();

        return new 
        {
            user = new 
            {
                id = tokenEntity.Usuario.Id.ToString(),
                email = tokenEntity.Usuario.Email,
                name = tokenEntity.Usuario.Nombre,
                role = tokenEntity.Usuario.EsAdmin ? "ADMIN" : "VENDEDOR"
            },
            token = newAccessToken,
            refreshToken = newRefreshToken.Token
        };
    }

    private async Task<RefreshToken> CreateRefreshTokenAsync(int userId)
    {
        // Revocar tokens activos anteriores del usuario
        var existingTokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var token in existingTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        // Crear nuevo refresh token
        var refreshToken = new RefreshToken
        {
            Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(30), // Expira en 30 días
            CreatedAt = DateTime.UtcNow
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        return refreshToken;
    }

    private async Task LogActivityAsync(int tenantId, int userId, string activityType, string category, string description, string status = "success")
    {
        try
        {
            // Use a separate scoped DbContext to avoid concurrency issues
            using var scope = _serviceProvider.CreateScope();
            var scopedDb = scope.ServiceProvider.GetRequiredService<HandySalesDbContext>();
            
            var httpContext = _httpContextAccessor.HttpContext;
            var activity = new ActivityLog
            {
                TenantId = tenantId,
                UserId = userId,
                ActivityType = activityType,
                ActivityCategory = category,
                ActivityStatus = status,
                Description = description,
                CreatedAt = DateTime.UtcNow
            };

            if (httpContext != null)
            {
                activity.IpAddress = GetClientIpAddress(httpContext);
                activity.UserAgent = httpContext.Request.Headers["User-Agent"].ToString();
                activity.RequestMethod = httpContext.Request.Method;
                activity.RequestUrl = $"{httpContext.Request.Path}{httpContext.Request.QueryString}";
                
                // Parse User-Agent básico
                var userAgent = activity.UserAgent ?? "";
                if (userAgent.Contains("Chrome")) activity.Browser = "Chrome";
                else if (userAgent.Contains("Firefox")) activity.Browser = "Firefox";
                else if (userAgent.Contains("Safari")) activity.Browser = "Safari";
                else if (userAgent.Contains("Edge")) activity.Browser = "Edge";

                if (userAgent.Contains("Windows")) activity.OperatingSystem = "Windows";
                else if (userAgent.Contains("Mac")) activity.OperatingSystem = "macOS";
                else if (userAgent.Contains("Linux")) activity.OperatingSystem = "Linux";
                else if (userAgent.Contains("Android")) activity.OperatingSystem = "Android";
                else if (userAgent.Contains("iOS") || userAgent.Contains("iPhone")) activity.OperatingSystem = "iOS";

                if (userAgent.Contains("Mobile") || userAgent.Contains("Android") || userAgent.Contains("iPhone"))
                    activity.DeviceType = "mobile";
                else if (userAgent.Contains("iPad") || userAgent.Contains("Tablet"))
                    activity.DeviceType = "tablet";
                else
                    activity.DeviceType = "desktop";
            }

            scopedDb.ActivityLogs.Add(activity);
            await scopedDb.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Log error pero no fallar el proceso principal
            Console.WriteLine($"Error logging activity: {ex.Message}");
        }
    }

    private string GetClientIpAddress(HttpContext context)
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrEmpty(forwarded))
        {
            return forwarded.Split(',').First().Trim();
        }

        var realIp = context.Request.Headers["X-Real-IP"].ToString();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
    }
}
