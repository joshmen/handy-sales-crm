using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Security;
using Microsoft.EntityFrameworkCore;
using HandySales.Application.ActivityTracking.Services;
using HandySales.Application.CompanySettings.Interfaces;
using HandySales.Api.TwoFactor;
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
    private readonly TotpService _totp;
    private readonly PwnedPasswordService _pwnedPasswords;

    public AuthService(
        HandySalesDbContext db,
        JwtTokenGenerator jwt,
        IActivityTrackingService activityTracking,
        IHttpContextAccessor httpContextAccessor,
        IServiceProvider serviceProvider,
        ICloudinaryService cloudinaryService,
        TotpService totp,
        PwnedPasswordService pwnedPasswords)
    {
        _db = db;
        _jwt = jwt;
        _activityTracking = activityTracking;
        _httpContextAccessor = httpContextAccessor;
        _serviceProvider = serviceProvider;
        _cloudinaryService = cloudinaryService;
        _totp = totp;
        _pwnedPasswords = pwnedPasswords;
    }

    public async Task<bool> RegisterAsync(UsuarioRegisterDto dto)
    {
        // Block disposable email domains
        if (DisposableEmailService.IsDisposable(dto.Email))
            throw new InvalidOperationException("No se permiten correos electrónicos temporales o desechables.");

        // Check password against known breaches (k-anonymity, safe)
        if (await _pwnedPasswords.IsCompromisedAsync(dto.Password))
            throw new InvalidOperationException("Esta contraseña fue encontrada en filtraciones de datos. Por favor elige una contraseña diferente.");

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

        // Check if 2FA is enabled
        if (usuario.TotpEnabled)
        {
            // Check for active sessions to include in the response
            var hasActiveSession = false;
            string? activeDevice = null;
            string? lastActivity = null;
            string? maskedIp = null;

            if (!usuario.EsSuperAdmin)
            {
                var latestSession = await _db.DeviceSessions
                    .IgnoreQueryFilters()
                    .Where(ds => ds.UsuarioId == usuario.Id && ds.Status == SessionStatus.Active)
                    .OrderByDescending(ds => ds.LastActivity)
                    .FirstOrDefaultAsync();

                if (latestSession != null)
                {
                    hasActiveSession = true;
                    activeDevice = ParseDeviceInfo(latestSession.UserAgent ?? "");
                    var minutesAgo = (int)(DateTime.UtcNow - latestSession.LastActivity).TotalMinutes;
                    lastActivity = minutesAgo <= 1 ? "Hace un momento" : $"Hace {minutesAgo} minutos";
                    maskedIp = MaskIpAddress(latestSession.IpAddress);
                }
            }

            var tempToken = _jwt.GenerateTempToken(
                usuario.Id.ToString(), usuario.TenantId,
                usuario.EsAdmin, usuario.EsSuperAdmin);

            return new
            {
                requires2FA = true,
                tempToken = tempToken,
                sessionConflict = hasActiveSession,
                activeDevice = activeDevice,
                lastActivity = lastActivity,
                ip = maskedIp
            };
        }

        // Check for active sessions (single session enforcement)
        // SuperAdmin is exempt from single session restriction
        if (!usuario.EsSuperAdmin)
        {
            var activeSessions = await _db.DeviceSessions
                .IgnoreQueryFilters()
                .Where(ds => ds.UsuarioId == usuario.Id && ds.Status == SessionStatus.Active)
                .OrderByDescending(ds => ds.LastActivity)
                .ToListAsync();

            if (activeSessions.Any())
            {
                var latestSession = activeSessions.First();
                var deviceInfo = ParseDeviceInfo(latestSession.UserAgent ?? "");
                var minutesAgo = (int)(DateTime.UtcNow - latestSession.LastActivity).TotalMinutes;

                return new
                {
                    code = "ACTIVE_SESSION_EXISTS",
                    activeDevice = deviceInfo,
                    lastActivity = minutesAgo <= 1 ? "Hace un momento" : $"Hace {minutesAgo} minutos",
                    ip = MaskIpAddress(latestSession.IpAddress),
                    suggest2FA = !usuario.TotpEnabled
                };
            }
        }

        return await CompleteLogin(usuario);
    }

    /// <summary>
    /// Verify 2FA code during login flow. The tempToken identifies the user.
    /// Handles session conflicts by closing old sessions.
    /// </summary>
    public async Task<object?> Verify2FAAsync(int userId, string code)
    {
        var usuario = await _db.Usuarios.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
        if (usuario == null || !usuario.TotpEnabled)
            return null;

        // Try TOTP code first, then recovery code
        var isValid = await _totp.VerifyLoginCodeAsync(userId, code);
        var usedRecoveryCode = false;

        if (!isValid)
        {
            // Try recovery code
            isValid = await _totp.UseRecoveryCodeAsync(userId, code);
            usedRecoveryCode = isValid;
        }

        if (!isValid)
            return null;

        // Close existing sessions (2FA verification acts as the authorization)
        await CloseAllActiveSessions(usuario, "Sesión cerrada por verificación 2FA desde otro dispositivo");

        await LogActivityAsync(usuario.TenantId, usuario.Id, "login_2fa", "auth",
            $"Usuario {usuario.Email} verificó 2FA" + (usedRecoveryCode ? " (código de recuperación)" : ""));

        var loginResult = await CompleteLogin(usuario);

        // If recovery code was used, include warning in response
        if (usedRecoveryCode)
        {
            var remaining = await _db.Set<TwoFactorRecoveryCode>()
                .CountAsync(rc => rc.UsuarioId == userId && rc.UsedAt == null);

            return new
            {
                ((dynamic)loginResult).user,
                ((dynamic)loginResult).token,
                ((dynamic)loginResult).refreshToken,
                recoveryCodeUsed = true,
                remainingRecoveryCodes = remaining
            };
        }

        return loginResult;
    }

    /// <summary>
    /// Force login: closes all existing sessions and creates a new one.
    /// Used when user confirms they want to take over from another device (users WITHOUT 2FA).
    /// </summary>
    public async Task<object?> ForceLoginAsync(UsuarioLoginDto dto)
    {
        var usuario = await _db.Usuarios.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == dto.email);

        if (usuario == null || !BCrypt.Net.BCrypt.Verify(dto.password, usuario.PasswordHash))
            return null;

        // If user has 2FA, force-login is not allowed — they must use verify-2fa
        if (usuario.TotpEnabled)
            return new { error = "2FA_REQUIRED", message = "Usa la verificación 2FA para tomar la sesión" };

        await CloseAllActiveSessions(usuario, "Sesión cerrada por login desde otro dispositivo");

        await LogActivityAsync(usuario.TenantId, usuario.Id, "force_login", "auth",
            $"Usuario {usuario.Email} forzó cierre de sesiones previas e inició nueva sesión");

        return await CompleteLogin(usuario);
    }

    /// <summary>
    /// Closes all active sessions and revokes all refresh tokens for a user.
    /// </summary>
    private async Task CloseAllActiveSessions(Usuario usuario, string reason)
    {
        // Increment session version (invalidates all existing JWTs)
        usuario.SessionVersion++;

        // Close all active sessions
        var activeSessions = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .Where(ds => ds.UsuarioId == usuario.Id && ds.Status == SessionStatus.Active)
            .ToListAsync();

        foreach (var session in activeSessions)
        {
            session.Status = SessionStatus.RevokedByUser;
            session.LoggedOutAt = DateTime.UtcNow;
            session.LogoutReason = reason;
        }

        // Revoke all refresh tokens
        var activeTokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == usuario.Id && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var token in activeTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Logout: properly revokes refresh token, closes device session, and increments session version.
    /// </summary>
    public async Task<bool> LogoutAsync(int userId, string? refreshToken)
    {
        var usuario = await _db.Usuarios.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
        if (usuario == null) return false;

        // Increment session version to invalidate all JWTs
        usuario.SessionVersion++;

        // Revoke the specific refresh token
        if (!string.IsNullOrEmpty(refreshToken))
        {
            var tokenEntity = await _db.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken && rt.UserId == userId && !rt.IsRevoked);
            if (tokenEntity != null)
            {
                tokenEntity.IsRevoked = true;
                tokenEntity.RevokedAt = DateTime.UtcNow;
            }
        }

        // Close all active device sessions for this user
        var activeSessions = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .Where(ds => ds.UsuarioId == userId && ds.Status == SessionStatus.Active)
            .ToListAsync();

        foreach (var session in activeSessions)
        {
            session.Status = SessionStatus.LoggedOut;
            session.LoggedOutAt = DateTime.UtcNow;
            session.LogoutReason = "Logout voluntario";
        }

        await _db.SaveChangesAsync();

        await LogActivityAsync(usuario.TenantId, usuario.Id, "logout", "auth",
            $"Usuario {usuario.Email} cerró sesión");

        return true;
    }

    /// <summary>
    /// Social login: verifies user exists by email, returns tokens.
    /// Called from NextAuth server-side after Google/Microsoft OAuth verifies identity.
    /// </summary>
    public async Task<object?> SocialLoginAsync(string email, string provider)
    {
        var usuario = await _db.Usuarios.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == email);
        if (usuario == null || !usuario.Activo)
            return null; // User not registered — only pre-registered users can use social login

        // If user has 2FA enabled, social login still needs 2FA verification
        if (usuario.TotpEnabled)
        {
            var tempToken = _jwt.GenerateTempToken(
                usuario.Id.ToString(),
                usuario.TenantId,
                usuario.EsAdmin,
                usuario.EsSuperAdmin);

            return new
            {
                requires2FA = true,
                tempToken,
                sessionConflict = false,
                activeDevice = (string?)null,
                lastActivity = (string?)null,
                ip = (string?)null
            };
        }

        // Close existing sessions (single session enforcement)
        await CloseAllActiveSessions(usuario, $"Sesión cerrada por social login ({provider})");

        await LogActivityAsync(usuario.TenantId, usuario.Id, "social_login", "auth",
            $"Usuario {usuario.Email} inició sesión con {provider}");

        return await CompleteLogin(usuario);
    }

    private async Task<object> CompleteLogin(Usuario usuario)
    {
        var token = _jwt.GenerateTokenWithRoles(
            usuario.Id.ToString(), usuario.TenantId,
            usuario.EsAdmin, usuario.EsSuperAdmin,
            usuario.SessionVersion);

        var refreshToken = await CreateRefreshTokenAsync(usuario.Id);

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

    private static string ParseDeviceInfo(string userAgent)
    {
        var browser = "Navegador desconocido";
        var os = "Sistema desconocido";

        if (userAgent.Contains("Edg")) browser = "Edge";
        else if (userAgent.Contains("Chrome")) browser = "Chrome";
        else if (userAgent.Contains("Firefox")) browser = "Firefox";
        else if (userAgent.Contains("Safari")) browser = "Safari";

        if (userAgent.Contains("Windows")) os = "Windows";
        else if (userAgent.Contains("Mac")) os = "macOS";
        else if (userAgent.Contains("Linux")) os = "Linux";
        else if (userAgent.Contains("Android")) os = "Android";
        else if (userAgent.Contains("iPhone") || userAgent.Contains("iOS")) os = "iOS";

        return $"{browser} en {os}";
    }

    private static string? MaskIpAddress(string? ip)
    {
        if (string.IsNullOrEmpty(ip)) return null;
        var parts = ip.Split('.');
        if (parts.Length == 4)
            return $"{parts[0]}.{parts[1]}.{parts[2]}.x";
        return ip;
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

        // Crear nuevo access token (include session version)
        var newAccessToken = _jwt.GenerateTokenWithRoles(
            tokenEntity.Usuario.Id.ToString(), tokenEntity.Usuario.TenantId,
            tokenEntity.Usuario.EsAdmin, tokenEntity.Usuario.EsSuperAdmin,
            tokenEntity.Usuario.SessionVersion);
        
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
