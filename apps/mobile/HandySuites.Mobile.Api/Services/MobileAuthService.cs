using System.Security.Cryptography;
using HandySuites.Application.TwoFactor;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Security;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Services;

/// <summary>Login result to distinguish between auth failure and device binding rejection.</summary>
public class LoginResult
{
    public bool Success { get; init; }
    /// <summary>Legacy: true cuando el viejo flow detecta DeviceBound. Mantenido
    /// para back-compat con ForceLoginAsync. El nuevo flow usa SessionLimitReached
    /// (audit 2026-05-18). Cuando ambos están en false y Success en false, es
    /// un fallo de credenciales puro.</summary>
    public bool DeviceBound { get; init; }
    /// <summary>True cuando el usuario tiene 2FA habilitado y el cliente debe
    /// llamar a /verify-totp con el código antes de obtener tokens.</summary>
    public bool TotpRequired { get; init; }
    /// <summary>Audit 2026-05-18: true cuando el user alcanzó el límite de
    /// sesiones concurrentes de su plan Y el plan permite picker (Netflix-style).
    /// En este caso Data incluye `activeSessions` (lista para que UI muestre picker)
    /// y `maxSessions`. User debe revocar una via /revoke-and-login para entrar.</summary>
    public bool SessionLimitReached { get; init; }
    /// <summary>Fix prod 2026-06-03: true cuando el user alcanzó el límite Y el plan
    /// tiene <c>ForceSingleSession=true</c> (default). El nuevo login se BLOQUEA con
    /// 409 — el device existente NO se ve afectado, user debe cerrar sesión manualmente
    /// allí. Data incluye `activeDevice` (info del device que tiene la sesión actual)
    /// para que UI pueda mostrar "Ya tienes sesión activa en POCO X7 desde hace 2h".</summary>
    public bool SessionBlocked { get; init; }
    public string? Message { get; init; }
    public object? Data { get; init; }
}

public class MobileAuthService
{
    private readonly HandySuitesDbContext _db;
    private readonly JwtTokenGenerator _jwt;
    private readonly ITotpVerifier _totpVerifier;

    public MobileAuthService(HandySuitesDbContext db, JwtTokenGenerator jwt, ITotpVerifier totpVerifier)
    {
        _db = db;
        _jwt = jwt;
        _totpVerifier = totpVerifier;
    }

    public async Task<LoginResult> LoginAsync(string email, string password, string? deviceId = null, string? deviceFingerprint = null, string? totpCode = null, string? deviceName = null)
    {
        // ---- 1. Credenciales + estado de cuenta ----
        var (usuario, authResult) = await AuthenticateCredsAsync(email, password, totpCode);
        if (authResult != null) return authResult; // login failure (creds, totp, deactivated)
        // usuario garantizado no-null aquí

        // ---- 2. Check concurrent session limit (Netflix-style) ----
        // Reusar sesión Active existente del mismo device si la hay (mismo
        // fingerprint o mismo deviceId). NO cuenta para el limit porque es
        // el mismo device físico re-logging.
        var existingSessionSameDevice = await FindExistingSessionForDeviceAsync(usuario!.Id, usuario.TenantId, deviceFingerprint, deviceId);

        var (maxSessions, forceSingleSession) = await GetSessionPolicyAsync(usuario.TenantId);
        var activeCount = await CountActiveSessionsAsync(usuario.Id, usuario.TenantId, excludeSessionId: existingSessionSameDevice?.Id);

        if (activeCount >= maxSessions)
        {
            var activeSessions = await GetActiveSessionsDtoAsync(usuario.Id, usuario.TenantId);

            if (forceSingleSession)
            {
                // Fix prod 2026-06-03: política estricta. Bloquear el nuevo login
                // sin revocar la sesión existente. UI muestra error con info del
                // device activo; user debe cerrar sesión allá manualmente (o admin
                // via /dispositivos/admin) antes de entrar acá.
                var activeDevice = activeSessions.FirstOrDefault();
                return new LoginResult
                {
                    Success = false,
                    SessionBlocked = true,
                    Message = "Ya tienes una sesión activa en otro dispositivo. Cierra esa sesión primero o contacta a tu administrador.",
                    Data = new
                    {
                        maxSessions,
                        currentCount = activeCount,
                        activeDevice,
                        activeSessions
                    }
                };
            }

            // Netflix-style: devolver lista de sesiones para que cliente muestre picker.
            // NO crear sesión nueva ni emitir tokens.
            return new LoginResult
            {
                Success = false,
                SessionLimitReached = true,
                Message = $"Has alcanzado el límite de {maxSessions} sesión{(maxSessions == 1 ? "" : "es")} activa{(maxSessions == 1 ? "" : "s")}. Elige una para cerrarla y continuar aquí.",
                Data = new
                {
                    maxSessions,
                    currentCount = activeCount,
                    activeSessions
                }
            };
        }

        // ---- 3. Create/reuse session + emit tokens ----
        return await CreateSessionAndTokensAsync(usuario, existingSessionSameDevice, deviceId, deviceFingerprint, deviceName);
    }

    /// <summary>
    /// Audit 2026-05-18: nuevo flow. El user llegó aquí porque su login tocó
    /// el límite de sesiones (SESSION_LIMIT_REACHED) y eligió en el picker
    /// qué sesión revocar. Atomic: verifica creds + TOTP + revoca la sesión
    /// elegida + crea nueva + emite tokens.
    /// </summary>
    public async Task<LoginResult> RevokeAndLoginAsync(string email, string password, int revokeSessionId, string? deviceId = null, string? deviceFingerprint = null, string? totpCode = null, string? deviceName = null)
    {
        var (usuario, authResult) = await AuthenticateCredsAsync(email, password, totpCode);
        if (authResult != null) return authResult;

        // Verificar que la sesión a revocar pertenece a este usuario.
        var sessionToRevoke = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ds => ds.Id == revokeSessionId &&
                                       ds.UsuarioId == usuario!.Id &&
                                       ds.TenantId == usuario.TenantId &&
                                       ds.EliminadoEn == null);

        if (sessionToRevoke == null)
        {
            return new LoginResult
            {
                Success = false,
                Message = "La sesión seleccionada ya no existe."
            };
        }

        // Revocar la sesión elegida + sus refresh tokens.
        await RevokeSessionInternalAsync(sessionToRevoke, reason: "limit_picker");

        // Reuso sesión existente del mismo device si la hay (post-revoke).
        var existingSessionSameDevice = await FindExistingSessionForDeviceAsync(usuario!.Id, usuario.TenantId, deviceFingerprint, deviceId);

        return await CreateSessionAndTokensAsync(usuario, existingSessionSameDevice, deviceId, deviceFingerprint, deviceName);
    }

    // ──────────────────────────────────────────────────────────────
    // Helpers privados — extracción de duplicación cross LoginAsync,
    // ForceLoginAsync, RevokeAndLoginAsync.
    // ──────────────────────────────────────────────────────────────

    private async Task<(Usuario? usuario, LoginResult? failure)> AuthenticateCredsAsync(string email, string password, string? totpCode)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);
        var loginSuccess = usuario != null && BCrypt.Net.BCrypt.Verify(password, usuario.PasswordHash);

        if (!loginSuccess || usuario == null)
            return (null, new LoginResult { Success = false });

        if (!usuario.Activo)
            return (usuario, new LoginResult { Success = false, Message = "Cuenta desactivada" });

        // VULN-M03 fix: 2FA enforcement.
        if (usuario.TotpEnabled)
        {
            if (string.IsNullOrEmpty(totpCode))
            {
                return (usuario, new LoginResult
                {
                    Success = false,
                    TotpRequired = true,
                    Message = "Se requiere código de autenticación 2FA"
                });
            }

            var totpOk = await _totpVerifier.VerifyLoginCodeAsync(usuario.Id, totpCode);
            if (!totpOk)
            {
                var recoveryOk = await _totpVerifier.UseRecoveryCodeAsync(usuario.Id, totpCode);
                if (!recoveryOk)
                {
                    return (usuario, new LoginResult
                    {
                        Success = false,
                        TotpRequired = true,
                        Message = "Código 2FA inválido"
                    });
                }
            }
        }

        return (usuario, null);
    }

    private async Task<DeviceSession?> FindExistingSessionForDeviceAsync(int usuarioId, int tenantId, string? deviceFingerprint, string? deviceId)
    {
        if (string.IsNullOrEmpty(deviceFingerprint) && string.IsNullOrEmpty(deviceId))
            return null;

        return await _db.DeviceSessions
            .IgnoreQueryFilters()
            .Where(ds => ds.UsuarioId == usuarioId &&
                         ds.TenantId == tenantId &&
                         ds.EliminadoEn == null &&
                         ds.Status == SessionStatus.Active)
            .OrderByDescending(ds => ds.LastActivity)
            .FirstOrDefaultAsync(ds =>
                (!string.IsNullOrEmpty(deviceFingerprint) && ds.DeviceFingerprint == deviceFingerprint) ||
                (!string.IsNullOrEmpty(deviceId) && ds.DeviceId == deviceId));
    }

    private async Task<int> GetMaxConcurrentSessionsAsync(int tenantId)
    {
        // Compat wrapper alrededor de GetSessionPolicyAsync (callers viejos).
        var (max, _) = await GetSessionPolicyAsync(tenantId);
        return max;
    }

    /// <summary>
    /// Política de sesiones del plan: (maxSessions, forceSingleSession).
    /// Fix prod 2026-06-03: leer también ForceSingleSession para decidir entre
    /// bloqueo estricto (default true) vs. picker Netflix-style (false legacy).
    /// Fallback (1, true) si el tenant no tiene plan asignado — política
    /// más conservadora.
    /// </summary>
    private async Task<(int MaxSessions, bool ForceSingleSession)> GetSessionPolicyAsync(int tenantId)
    {
        var policy = await _db.Tenants
            .AsNoTracking()
            .Where(t => t.Id == tenantId)
            .Join(_db.SubscriptionPlans.AsNoTracking(),
                  t => t.SubscriptionPlanId,
                  p => p.Id,
                  (t, p) => new { p.MaxConcurrentSessions, p.ForceSingleSession })
            .FirstOrDefaultAsync();

        if (policy == null)
        {
            return (1, true);
        }
        var max = policy.MaxConcurrentSessions > 0 ? policy.MaxConcurrentSessions : 1;
        return (max, policy.ForceSingleSession);
    }

    private async Task<int> CountActiveSessionsAsync(int usuarioId, int tenantId, int? excludeSessionId = null)
    {
        var query = _db.DeviceSessions
            .IgnoreQueryFilters()
            .Where(ds => ds.UsuarioId == usuarioId &&
                         ds.TenantId == tenantId &&
                         ds.EliminadoEn == null &&
                         ds.Status == SessionStatus.Active);

        if (excludeSessionId.HasValue)
            query = query.Where(ds => ds.Id != excludeSessionId.Value);

        return await query.CountAsync();
    }

    private async Task<List<object>> GetActiveSessionsDtoAsync(int usuarioId, int tenantId, int? currentSessionId = null)
    {
        var sessions = await _db.DeviceSessions
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(ds => ds.UsuarioId == usuarioId &&
                         ds.TenantId == tenantId &&
                         ds.EliminadoEn == null &&
                         ds.Status == SessionStatus.Active)
            .OrderByDescending(ds => ds.LastActivity)
            .Select(ds => new
            {
                id = ds.Id,
                deviceName = ds.DeviceName ?? ds.DeviceModel ?? "Dispositivo desconocido",
                deviceType = ds.DeviceType.ToString(),
                lastActivity = ds.LastActivity,
                loggedInAt = ds.LoggedInAt,
                appVersion = ds.AppVersion ?? "",
                osVersion = ds.OsVersion ?? "",
                ipCity = "", // futuro: geo-IP lookup
                isCurrent = currentSessionId.HasValue && ds.Id == currentSessionId.Value
            })
            .ToListAsync();

        return sessions.Cast<object>().ToList();
    }

    private async Task RevokeSessionInternalAsync(DeviceSession session, string reason)
    {
        var now = DateTime.UtcNow;
        session.Status = SessionStatus.RevokedByUser;
        session.LoggedOutAt = now;
        session.LogoutReason = reason;
        session.ActualizadoEn = now;

        // Revocar refresh tokens vinculados a esta sesión específica.
        var linkedTokens = await _db.RefreshTokens
            .Where(rt => rt.DeviceSessionId == session.Id && !rt.IsRevoked)
            .ToListAsync();

        foreach (var token in linkedTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = now;
        }
        // NO llamamos SaveChangesAsync — caller decide cuándo persistir.
    }

    private async Task<LoginResult> CreateSessionAndTokensAsync(Usuario usuario, DeviceSession? existingSession, string? deviceId, string? deviceFingerprint, string? deviceName)
    {
        DeviceSession session;
        if (existingSession != null)
        {
            existingSession.DeviceFingerprint = deviceFingerprint ?? existingSession.DeviceFingerprint;
            existingSession.DeviceId = deviceId ?? existingSession.DeviceId;
            existingSession.DeviceName = deviceName ?? existingSession.DeviceName;
            existingSession.LastActivity = DateTime.UtcNow;
            existingSession.Status = SessionStatus.Active;
            session = existingSession;
        }
        else
        {
            session = new DeviceSession
            {
                TenantId = usuario.TenantId,
                UsuarioId = usuario.Id,
                DeviceId = deviceId ?? Guid.NewGuid().ToString(),
                DeviceFingerprint = deviceFingerprint,
                DeviceName = deviceName,
                DeviceType = DeviceType.Unknown,
                Status = SessionStatus.Active,
                LastActivity = DateTime.UtcNow,
                LoggedInAt = DateTime.UtcNow
            };
            _db.DeviceSessions.Add(session);
        }

        // SaveChanges para obtener session.Id si es nueva.
        await _db.SaveChangesAsync();

        // Crear refresh token VINCULADO a esta DeviceSession específica (1:1)
        var (_, plainRefreshToken) = await CreateRefreshTokenAsync(usuario.Id, session.Id);

        // JWT con sid claim para que el middleware pueda validar por-sesión.
        var token = _jwt.GenerateTokenWithRoles(usuario.Id.ToString(), usuario.TenantId, usuario.Rol, sessionId: session.Id);

        var companyLogo = await _db.CompanySettings
            .AsNoTracking()
            .Where(cs => cs.TenantId == usuario.TenantId)
            .Select(cs => cs.LogoUrl)
            .FirstOrDefaultAsync();

        return new LoginResult
        {
            Success = true,
            Data = new
            {
                user = new
                {
                    id = usuario.Id.ToString(),
                    email = usuario.Email,
                    name = usuario.Nombre,
                    role = usuario.Rol,
                    avatarUrl = usuario.AvatarUrl,
                    tenantLogo = companyLogo ?? "",
                    mustChangePassword = usuario.MustChangePassword
                },
                token = token,
                refreshToken = plainRefreshToken,
                sessionId = session.Id
            }
        };
    }

    public async Task<object?> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
            return null;

        // Hash incoming token to compare with stored hash. AsTracking() es
        // necesario para que el concurrency token (xmin) se compare en el UPDATE.
        var tokenHash = HashToken(refreshToken);
        var tokenEntity = await _db.RefreshTokens
            .Include(rt => rt.Usuario)
            .FirstOrDefaultAsync(rt => rt.Token == tokenHash &&
                                     !rt.IsRevoked &&
                                     rt.ExpiresAt > DateTime.UtcNow);

        if (tokenEntity == null)
            return null;

        // Block deactivated users from refreshing tokens
        if (!tokenEntity.Usuario.Activo)
        {
            tokenEntity.IsRevoked = true;
            tokenEntity.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return null;
        }

        // 2FA enforcement on refresh: si el user habilitó 2FA POSTERIOR a la
        // creación del refresh token, invalidamos el token. El user tendrá que
        // hacer re-login (que ahora SÍ enforce TOTP — ver LoginAsync). Esto
        // cierra la ventana donde un token capturado antes del 2FA-enable
        // seguiría funcionando indefinidamente.
        if (tokenEntity.Usuario.TotpEnabled &&
            tokenEntity.Usuario.TotpEnabledAt.HasValue &&
            tokenEntity.Usuario.TotpEnabledAt.Value > tokenEntity.CreatedAt)
        {
            tokenEntity.IsRevoked = true;
            tokenEntity.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return null;
        }

        tokenEntity.IsRevoked = true;
        tokenEntity.RevokedAt = DateTime.UtcNow;

        var newAccessToken = _jwt.GenerateTokenWithRoles(
            tokenEntity.Usuario.Id.ToString(), tokenEntity.Usuario.TenantId,
            tokenEntity.Usuario.Rol,
            sessionId: tokenEntity.DeviceSessionId);

        // Audit 2026-05-19: pasar DeviceSessionId preserva el linkage 1:1 que
        // armamos en el redesign. Sin esto, los refresh tokens post-login
        // quedaban con sid=NULL (visible en datos prod 1026/1027/1029) y
        // CreateRefreshTokenAsync revocaba TODOS los tokens del user, no solo
        // los de esta sesión. También: en CreateRefreshTokenAsync el filtro
        // .Where(rt => rt.DeviceSessionId == sid) reduce el alcance del UPDATE
        // y minimiza la ventana de race.
        (RefreshToken newTokenEntity, string newPlainToken) newToken;
        try
        {
            newToken = await CreateRefreshTokenAsync(tokenEntity.UserId, tokenEntity.DeviceSessionId);
            tokenEntity.ReplacedByToken = newToken.newTokenEntity.Token;
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // Otra request paralela ya rotó este mismo refresh token (xmin mismatch).
            // El cliente debe reintentar con el token nuevo que la otra call ya
            // emitió. Devolvemos null → endpoint /refresh responde 401 → interceptor
            // del cliente reintenta (con el nuevo token que ya guardó). Esto evita
            // el orphan token problem que vimos en prod (vendedor@jeyma 2026-05-19).
            return null;
        }

        // Fetch company logo for the tenant (nullable)
        var companyLogo = await _db.CompanySettings
            .AsNoTracking()
            .Where(cs => cs.TenantId == tokenEntity.Usuario.TenantId)
            .Select(cs => cs.LogoUrl)
            .FirstOrDefaultAsync();

        return new
        {
            user = new
            {
                id = tokenEntity.Usuario.Id.ToString(),
                email = tokenEntity.Usuario.Email,
                name = tokenEntity.Usuario.Nombre,
                role = tokenEntity.Usuario.Rol,
                avatarUrl = tokenEntity.Usuario.AvatarUrl,
                tenantLogo = companyLogo ?? "",
                mustChangePassword = tokenEntity.Usuario.MustChangePassword
            },
            token = newAccessToken,
            refreshToken = newToken.newPlainToken
        };
    }

    /// <summary>
    /// Devuelve el snapshot del usuario logueado a partir de las claims del JWT.
    /// Usado por el cliente mobile para refrescar avatar/nombre/role cuando se
    /// vuelve al foreground (p. ej. el admin actualizó la foto desde web).
    /// SIEMPRE retorna SOLO los datos del usuario en el token — nunca otro id.
    /// </summary>
    public async Task<object?> GetMeAsync(int userId)
    {
        var usuario = await _db.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (usuario == null) return null;

        var companyLogo = await _db.CompanySettings
            .AsNoTracking()
            .Where(cs => cs.TenantId == usuario.TenantId)
            .Select(cs => cs.LogoUrl)
            .FirstOrDefaultAsync();

        return new
        {
            user = new
            {
                id = usuario.Id.ToString(),
                email = usuario.Email,
                name = usuario.Nombre,
                role = usuario.Rol,
                avatarUrl = usuario.AvatarUrl,
                tenantLogo = companyLogo ?? "",
                mustChangePassword = usuario.MustChangePassword
            }
        };
    }

    public async Task RegisterDeviceTokenAsync(int userId, int tenantId, string pushToken, string platform, string deviceName, string? deviceId, string? deviceFingerprint)
    {
        var deviceType = platform.ToLowerInvariant() switch
        {
            "android" => DeviceType.Android,
            "ios" => DeviceType.iOS,
            _ => DeviceType.Unknown
        };

        // Find existing session for this user (prefer by fingerprint, then by deviceId, then by push token)
        var existingSession = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ds =>
                ds.UsuarioId == userId &&
                ds.TenantId == tenantId &&
                ds.EliminadoEn == null &&
                ds.Status == SessionStatus.Active &&
                ((!string.IsNullOrEmpty(deviceFingerprint) && ds.DeviceFingerprint == deviceFingerprint) ||
                 (!string.IsNullOrEmpty(deviceId) && ds.DeviceId == deviceId) ||
                 ds.PushToken == pushToken));

        if (existingSession != null)
        {
            existingSession.LastActivity = DateTime.UtcNow;
            existingSession.DeviceName = deviceName;
            existingSession.DeviceType = deviceType;
            existingSession.PushToken = pushToken;
            existingSession.Status = SessionStatus.Active;
            if (!string.IsNullOrEmpty(deviceId))
                existingSession.DeviceId = deviceId;
            if (!string.IsNullOrEmpty(deviceFingerprint))
                existingSession.DeviceFingerprint = deviceFingerprint;
        }
        else
        {
            var session = new DeviceSession
            {
                TenantId = tenantId,
                UsuarioId = userId,
                DeviceId = deviceId ?? Guid.NewGuid().ToString(),
                DeviceFingerprint = deviceFingerprint,
                DeviceName = deviceName,
                DeviceType = deviceType,
                PushToken = pushToken,
                Status = SessionStatus.Active,
                LastActivity = DateTime.UtcNow,
                LoggedInAt = DateTime.UtcNow
            };
            _db.DeviceSessions.Add(session);
        }

        await _db.SaveChangesAsync();
    }

    public async Task AcknowledgeUnbindAsync(int userId, int tenantId, string? deviceFingerprint)
    {
        // Find the PendingUnbind session for this user
        var session = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ds =>
                ds.UsuarioId == userId &&
                ds.TenantId == tenantId &&
                ds.EliminadoEn == null &&
                ds.Status == SessionStatus.PendingUnbind);

        if (session != null)
        {
            session.Status = SessionStatus.Unbound;
            session.LoggedOutAt = DateTime.UtcNow;
            session.LogoutReason = "Desvinculado por administrador (sync completado)";
        }

        // Revoke all refresh tokens for this user
        var tokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Crea refresh token. Audit 2026-05-18:
    /// - Si `deviceSessionId` está, revoca SOLO tokens previos de ESA sesión
    ///   (1:1 nuevo modelo). Otras sesiones del user no se ven afectadas.
    /// - Si `deviceSessionId` es null (legacy callers como RefreshTokenAsync
    ///   sin sid), revoca todos los tokens del user (comportamiento viejo).
    /// </summary>
    private async Task<(RefreshToken Entity, string PlainToken)> CreateRefreshTokenAsync(int userId, int? deviceSessionId = null)
    {
        IQueryable<RefreshToken> existingQuery = _db.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow);

        if (deviceSessionId.HasValue)
        {
            existingQuery = existingQuery.Where(rt => rt.DeviceSessionId == deviceSessionId.Value);
        }

        var existingTokens = await existingQuery.ToListAsync();

        foreach (var token in existingTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        var plainToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        var refreshToken = new RefreshToken
        {
            Token = HashToken(plainToken),
            UserId = userId,
            DeviceSessionId = deviceSessionId,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        return (refreshToken, plainToken);
    }

    /// <summary>
    /// Audit 2026-05-18: lista sesiones activas del usuario actual. UI mobile
    /// usa esto en pantalla "Mis sesiones" para gestión por el propio user.
    /// `currentSessionId` viene del JWT sid claim para marcar cuál es esta.
    /// </summary>
    public async Task<List<object>> GetMySessionsAsync(int userId, int tenantId, int? currentSessionId)
    {
        return await GetActiveSessionsDtoAsync(userId, tenantId, currentSessionId);
    }

    /// <summary>
    /// Audit 2026-05-18: revoca una sesión específica del usuario (self-service).
    /// Si el sid es el del request actual, equivale a logout. Si es otro,
    /// es un "logout remoto" desde mobile.
    /// </summary>
    public async Task<bool> RevokeMySessionAsync(int userId, int tenantId, int sessionIdToRevoke)
    {
        var session = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ds => ds.Id == sessionIdToRevoke &&
                                       ds.UsuarioId == userId &&
                                       ds.TenantId == tenantId &&
                                       ds.EliminadoEn == null);

        if (session == null || session.Status != SessionStatus.Active)
            return false;

        await RevokeSessionInternalAsync(session, reason: "user_revoke");
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Audit 2026-05-18: logout per-session (no más logout que revoca todos los
    /// tokens del user). Marca la sesión del `sid` del JWT actual como
    /// RevokedByUser + revoca solo sus refresh tokens. Otras sessions del
    /// user en otros devices: intactas.
    /// </summary>
    public async Task LogoutSessionAsync(int userId, int sessionId)
    {
        var session = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ds => ds.Id == sessionId &&
                                       ds.UsuarioId == userId &&
                                       ds.EliminadoEn == null);

        if (session != null && session.Status == SessionStatus.Active)
        {
            await RevokeSessionInternalAsync(session, reason: "logout");
            await _db.SaveChangesAsync();
        }
    }

    private static string HashToken(string token)
    {
        var hash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hash);
    }

    /// <summary>
    /// Login forzado: ignora el check DEVICE_BOUND y revoca todas las sesiones
    /// activas del usuario excepto la que se va a crear. El cliente lo invoca
    /// solo despues de que el usuario confirma en un modal "Continuar aqui"
    /// tras recibir DEVICE_BOUND en el login normal. TOTP también se enforce
    /// aquí (VULN-M03) — force-login no puede ser un bypass del 2FA.
    /// </summary>
    public async Task<LoginResult> ForceLoginAsync(string email, string password, string? deviceId = null, string? deviceFingerprint = null, string? totpCode = null)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);
        var loginSuccess = usuario != null && BCrypt.Net.BCrypt.Verify(password, usuario.PasswordHash);
        if (!loginSuccess || usuario == null)
            return new LoginResult { Success = false };
        if (!usuario.Activo)
            return new LoginResult { Success = false, Message = "Cuenta desactivada" };

        // Mismo enforcement TOTP que LoginAsync — force-login NO debe bypass.
        if (usuario.TotpEnabled)
        {
            if (string.IsNullOrEmpty(totpCode))
            {
                return new LoginResult
                {
                    Success = false,
                    TotpRequired = true,
                    Message = "Se requiere código de autenticación 2FA"
                };
            }
            var totpOk = await _totpVerifier.VerifyLoginCodeAsync(usuario.Id, totpCode);
            if (!totpOk)
            {
                var recoveryOk = await _totpVerifier.UseRecoveryCodeAsync(usuario.Id, totpCode);
                if (!recoveryOk)
                {
                    return new LoginResult
                    {
                        Success = false,
                        TotpRequired = true,
                        Message = "Código 2FA inválido"
                    };
                }
            }
        }

        // Revocar TODAS las sesiones Active del usuario (incluida la actual si la
        // hubiera con otro fingerprint). El cliente las re-creara via la nueva.
        var activeSessions = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .Where(ds => ds.UsuarioId == usuario.Id &&
                         ds.TenantId == usuario.TenantId &&
                         ds.EliminadoEn == null &&
                         ds.Status == SessionStatus.Active)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var s in activeSessions)
        {
            s.Status = SessionStatus.RevokedByUser;
            s.LoggedOutAt = now;
            s.ActualizadoEn = now;
        }

        // Crear nueva sesion para el device actual (si tiene identificador).
        if (!string.IsNullOrEmpty(deviceId) || !string.IsNullOrEmpty(deviceFingerprint))
        {
            _db.DeviceSessions.Add(new DeviceSession
            {
                TenantId = usuario.TenantId,
                UsuarioId = usuario.Id,
                DeviceId = deviceId ?? string.Empty,
                DeviceFingerprint = deviceFingerprint,
                DeviceName = null,
                DeviceType = DeviceType.Unknown,
                Status = SessionStatus.Active,
                LastActivity = now,
                LoggedInAt = now
            });
        }

        await _db.SaveChangesAsync();

        var token = _jwt.GenerateTokenWithRoles(usuario.Id.ToString(), usuario.TenantId, usuario.Rol);
        var (_, plainRefreshToken) = await CreateRefreshTokenAsync(usuario.Id);

        var companyLogo = await _db.CompanySettings
            .AsNoTracking()
            .Where(cs => cs.TenantId == usuario.TenantId)
            .Select(cs => cs.LogoUrl)
            .FirstOrDefaultAsync();

        return new LoginResult
        {
            Success = true,
            Data = new
            {
                user = new
                {
                    id = usuario.Id.ToString(),
                    email = usuario.Email,
                    name = usuario.Nombre,
                    role = usuario.Rol,
                    avatarUrl = usuario.AvatarUrl,
                    tenantLogo = companyLogo ?? "",
                    mustChangePassword = usuario.MustChangePassword
                },
                token = token,
                refreshToken = plainRefreshToken
            }
        };
    }
}
