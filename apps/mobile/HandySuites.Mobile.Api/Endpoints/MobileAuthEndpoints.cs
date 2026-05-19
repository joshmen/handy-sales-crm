using HandySuites.Application.Usuarios.DTOs;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Mobile.Api.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileAuthEndpoints
{
    public static void MapMobileAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/auth")
            .WithTags("Auth")
            .WithOpenApi();

        group.MapPost("/login", async (
            UsuarioLoginDto dto,
            IValidator<UsuarioLoginDto> validator,
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(new { success = false, errors = validation.ToDictionary() });

            var deviceId = context.Request.Headers["X-Device-Id"].FirstOrDefault();
            var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();

            var result = await auth.LoginAsync(dto.email, dto.password, deviceId, deviceFingerprint, dto.totpCode);

            if (!result.Success)
            {
                if (result.TotpRequired)
                {
                    return Results.Json(new
                    {
                        success = false,
                        code = "TOTP_REQUIRED",
                        message = result.Message
                    }, statusCode: 401);
                }

                // Audit 2026-05-18: nuevo flow Netflix-style. Cuando user
                // alcanza el límite del plan, devolver 200 con código
                // SESSION_LIMIT_REACHED + lista de sesiones activas. UI
                // muestra picker; user elige una para revocar via
                // /revoke-and-login.
                if (result.SessionLimitReached)
                {
                    return Results.Ok(new
                    {
                        success = false,
                        code = "SESSION_LIMIT_REACHED",
                        message = result.Message,
                        data = result.Data
                    });
                }

                // Legacy DeviceBound (ForceLoginAsync sigue lo usando para
                // back-compat con clients pre-OTA). Nuevo LoginAsync ya no
                // lo devuelve.
                if (result.DeviceBound)
                {
                    return Results.Json(new
                    {
                        success = false,
                        code = "DEVICE_BOUND",
                        message = result.Message
                    }, statusCode: 403);
                }

                if (!string.IsNullOrEmpty(result.Message))
                {
                    return Results.Json(new
                    {
                        success = false,
                        message = result.Message
                    }, statusCode: 401);
                }

                return Results.Unauthorized();
            }

            return Results.Ok(new
            {
                success = true,
                data = result.Data,
                deviceRegistered = !string.IsNullOrEmpty(deviceId)
            });
        })
        .RequireRateLimiting("mobile-auth")
        .WithSummary("Login de vendedor móvil")
        .WithDescription("Autentica un vendedor y devuelve tokens JWT. Si tiene 2FA → 401 TOTP_REQUIRED. Si alcanzó límite de sesiones del plan → 200 SESSION_LIMIT_REACHED con lista de sesiones activas (UI debe mostrar picker).")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status403Forbidden);

        // ──────────────────────────────────────────────────────────
        // POST /revoke-and-login (audit 2026-05-18)
        // Atomic: revoca sesión elegida en picker + crea nueva + emite tokens.
        // Body: { email, password, totpCode?, revokeSessionId }
        // ──────────────────────────────────────────────────────────
        group.MapPost("/revoke-and-login", async (
            RevokeAndLoginDto dto,
            IValidator<UsuarioLoginDto> loginValidator,
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            // Reuso validator de login para email + password.
            var loginDto = new UsuarioLoginDto { email = dto.email, password = dto.password, totpCode = dto.totpCode };
            var validation = await loginValidator.ValidateAsync(loginDto);
            if (!validation.IsValid)
                return Results.BadRequest(new { success = false, errors = validation.ToDictionary() });

            if (dto.revokeSessionId <= 0)
                return Results.BadRequest(new { success = false, message = "revokeSessionId es requerido" });

            var deviceId = context.Request.Headers["X-Device-Id"].FirstOrDefault();
            var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();

            var result = await auth.RevokeAndLoginAsync(
                dto.email, dto.password, dto.revokeSessionId,
                deviceId, deviceFingerprint, dto.totpCode);

            if (!result.Success)
            {
                if (result.TotpRequired)
                {
                    return Results.Json(new { success = false, code = "TOTP_REQUIRED", message = result.Message }, statusCode: 401);
                }
                if (!string.IsNullOrEmpty(result.Message))
                {
                    return Results.Json(new { success = false, message = result.Message }, statusCode: 401);
                }
                return Results.Unauthorized();
            }

            return Results.Ok(new { success = true, data = result.Data });
        })
        .RequireRateLimiting("mobile-auth")
        .WithSummary("Revoke other session + login (picker UX)")
        .WithDescription("Usado tras SESSION_LIMIT_REACHED: user eligió una sesión en el picker UI. Revoca esa sesión + crea nueva en este device + emite tokens. Atomic.")
        .Produces<object>(StatusCodes.Status200OK);

        // ──────────────────────────────────────────────────────────
        // GET /my-sessions (audit 2026-05-18)
        // User ve sus propias sesiones activas. UI mobile "Mis sesiones".
        // ──────────────────────────────────────────────────────────
        group.MapGet("/my-sessions", async (
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            var userIdStr = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                            ?? context.User.FindFirstValue("sub");
            var tenantIdStr = context.User.FindFirstValue("tenant_id");
            var sidStr = context.User.FindFirstValue("sid");

            if (!int.TryParse(userIdStr, out var userId) || !int.TryParse(tenantIdStr, out var tenantId))
                return Results.Unauthorized();

            int? currentSid = int.TryParse(sidStr, out var s) ? s : (int?)null;

            var sessions = await auth.GetMySessionsAsync(userId, tenantId, currentSid);
            return Results.Ok(new { success = true, data = sessions });
        })
        .RequireAuthorization()
        .WithSummary("Mis sesiones activas")
        .WithDescription("Devuelve las sesiones activas del user actual con flag isCurrent para identificar la del JWT actual.");

        // ──────────────────────────────────────────────────────────
        // POST /revoke-session/{sid} (audit 2026-05-18)
        // User revoca una de sus propias sesiones (self-service).
        // Si revoca la actual, equivale a logout.
        // ──────────────────────────────────────────────────────────
        group.MapPost("/revoke-session/{sessionId:int}", async (
            int sessionId,
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            var userIdStr = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                            ?? context.User.FindFirstValue("sub");
            var tenantIdStr = context.User.FindFirstValue("tenant_id");

            if (!int.TryParse(userIdStr, out var userId) || !int.TryParse(tenantIdStr, out var tenantId))
                return Results.Unauthorized();

            var ok = await auth.RevokeMySessionAsync(userId, tenantId, sessionId);
            if (!ok)
                return Results.NotFound(new { success = false, message = "Sesión no encontrada o ya inactiva" });

            return Results.Ok(new { success = true, message = "Sesión revocada" });
        })
        .RequireAuthorization()
        .WithSummary("Revocar mi sesión específica")
        .WithDescription("User revoca una de sus propias sesiones (self-service). Si revoca la actual, su próximo request devolverá 401 SESSION_REVOKED.");

        // Force-login: ignora DEVICE_BOUND y revoca otras sesiones activas.
        // Cliente lo invoca tras confirmar en modal "¿Desconectar otro dispositivo?".
        group.MapPost("/force-login", async (
            UsuarioLoginDto dto,
            IValidator<UsuarioLoginDto> validator,
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(new { success = false, errors = validation.ToDictionary() });

            var deviceId = context.Request.Headers["X-Device-Id"].FirstOrDefault();
            var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();

            var result = await auth.ForceLoginAsync(dto.email, dto.password, deviceId, deviceFingerprint, dto.totpCode);

            if (!result.Success)
            {
                if (result.TotpRequired)
                {
                    return Results.Json(new
                    {
                        success = false,
                        code = "TOTP_REQUIRED",
                        message = result.Message
                    }, statusCode: 401);
                }
                if (!string.IsNullOrEmpty(result.Message))
                {
                    return Results.Json(new { success = false, message = result.Message }, statusCode: 401);
                }
                return Results.Unauthorized();
            }

            return Results.Ok(new
            {
                success = true,
                data = result.Data,
                deviceRegistered = !string.IsNullOrEmpty(deviceId)
            });
        })
        .RequireRateLimiting("mobile-auth")
        .WithSummary("Force-login (cierra otras sesiones)")
        .WithDescription("Login que cierra todas las sesiones activas previas. Solo se debe invocar tras confirmar con el usuario en un modal '¿Desconectar otro dispositivo?'.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/mobile/auth/me — snapshot del usuario actual (avatar, nombre,
        // role) desde JWT claims + DB. El cliente mobile lo invoca al volver al
        // foreground para detectar cambios hechos desde web (foto de perfil).
        group.MapGet("/me", async (
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            var data = await auth.GetMeAsync(userId);
            if (data == null) return Results.NotFound();

            return Results.Ok(new { success = true, data });
        })
        .RequireAuthorization()
        .WithSummary("Snapshot del usuario logueado")
        .WithDescription("Retorna { user: { id, email, name, role, avatarUrl, tenantLogo } } del usuario en el JWT. Usado por el cliente para refrescar avatar al volver al foreground.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // POST /api/mobile/auth/change-password — cambiar contraseña del propio
        // usuario logueado. Forzado al primer login si MustChangePassword=true
        // (vendedor de campo creado por admin con password temporal). También
        // disponible en cualquier momento como cambio voluntario.
        group.MapPost("/change-password", async (
            ChangePasswordDto dto,
            [FromServices] HandySuitesDbContext db,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            // Validación strong password (regex similar al register/crear).
            if (string.IsNullOrEmpty(dto.NewPassword) || dto.NewPassword.Length < 8)
                return Results.BadRequest(new { error = "La nueva contraseña debe tener al menos 8 caracteres." });
            if (!System.Text.RegularExpressions.Regex.IsMatch(dto.NewPassword, @"[a-z]")
                || !System.Text.RegularExpressions.Regex.IsMatch(dto.NewPassword, @"[A-Z]")
                || !System.Text.RegularExpressions.Regex.IsMatch(dto.NewPassword, @"\d"))
            {
                return Results.BadRequest(new { error = "La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número." });
            }
            if (dto.NewPassword == dto.OldPassword)
                return Results.BadRequest(new { error = "La nueva contraseña debe ser distinta a la actual." });

            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == userId);
            if (usuario == null) return Results.NotFound();

            // Validar password actual contra hash. Usamos BCrypt.Verify.
            if (string.IsNullOrEmpty(dto.OldPassword)
                || !BCrypt.Net.BCrypt.Verify(dto.OldPassword, usuario.PasswordHash))
            {
                return Results.BadRequest(new { error = "La contraseña actual es incorrecta." });
            }

            usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            usuario.MustChangePassword = false;

            // Revocar todos los refresh tokens del usuario para forzar re-login con
            // el nuevo password en otros dispositivos. El device actual sigue
            // funcionando con su access token vigente hasta que expire.
            var activeTokens = await db.RefreshTokens
                .Where(t => t.UserId == userId && !t.IsRevoked && t.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();
            foreach (var t in activeTokens)
            {
                t.IsRevoked = true;
                t.RevokedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync();

            return Results.Ok(new { success = true, message = "Contraseña actualizada exitosamente." });
        })
        .RequireAuthorization()
        .WithSummary("Cambiar contraseña del usuario logueado")
        .WithDescription("Valida oldPassword contra hash actual; setea nueva (BCrypt) + MustChangePassword=false. Revoca refresh tokens del usuario en otros devices.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/refresh", async (
            RefreshTokenDto dto,
            [FromServices] MobileAuthService auth) =>
        {
            var result = await auth.RefreshTokenAsync(dto.RefreshToken);
            if (result is null)
                return Results.Unauthorized();

            return Results.Ok(new { success = true, data = result });
        })
        .RequireRateLimiting("mobile-auth")
        .WithSummary("Refrescar token")
        .WithDescription("Obtiene un nuevo access token usando el refresh token.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/logout", async (
            LogoutRequest? request,
            [FromServices] MobileAuthService auth,
            [FromServices] HandySuitesDbContext db,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            var sidClaim = context.User.FindFirst("sid")?.Value;

            if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out var userId))
            {
                // Audit 2026-05-18: nuevo flow per-session. Si el JWT tiene
                // `sid`, revocamos SOLO esa sesión + sus refresh tokens.
                // Otras sesiones del user en otros devices: intactas
                // (key feature del modelo Netflix-style).
                if (!string.IsNullOrEmpty(sidClaim) && int.TryParse(sidClaim, out var sessionId))
                {
                    await auth.LogoutSessionAsync(userId, sessionId);
                }
                else
                {
                    // Fallback legacy (JWT sin sid, pre-rediseño): comportamiento
                    // anterior — revocar todos los refresh tokens del user +
                    // sesión por fingerprint si está. Backward-compat window.
                    if (!string.IsNullOrEmpty(request?.RefreshToken))
                    {
                        var hash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(request.RefreshToken));
                        var tokenHash = Convert.ToBase64String(hash);
                        var token = await db.RefreshTokens
                            .FirstOrDefaultAsync(t => t.Token == tokenHash && !t.IsRevoked);
                        if (token != null)
                        {
                            token.IsRevoked = true;
                            token.RevokedAt = DateTime.UtcNow;
                        }
                    }
                    else
                    {
                        var activeTokens = await db.RefreshTokens
                            .Where(t => t.UserId == userId && !t.IsRevoked && t.ExpiresAt > DateTime.UtcNow)
                            .ToListAsync();
                        foreach (var t in activeTokens)
                        {
                            t.IsRevoked = true;
                            t.RevokedAt = DateTime.UtcNow;
                        }
                    }

                    var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();
                    if (!string.IsNullOrEmpty(deviceFingerprint))
                    {
                        var session = await db.DeviceSessions
                            .IgnoreQueryFilters()
                            .Where(ds => ds.UsuarioId == userId
                                      && ds.DeviceFingerprint == deviceFingerprint
                                      && ds.EliminadoEn == null
                                      && ds.Status == SessionStatus.Active)
                            .OrderByDescending(ds => ds.LastActivity)
                            .FirstOrDefaultAsync();

                        if (session != null)
                        {
                            session.Status = SessionStatus.LoggedOut;
                            session.LoggedOutAt = DateTime.UtcNow;
                            session.LogoutReason = "user_logout_legacy";
                        }
                    }

                    await db.SaveChangesAsync();
                }
            }

            return Results.Ok(new { success = true, message = "Sesión cerrada exitosamente" });
        })
        .RequireAuthorization()
        .WithSummary("Cerrar sesión")
        .WithDescription("Cierra la sesión del vendedor, revoca el refresh token y marca la sesión del dispositivo como cerrada.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapPost("/device-token", async (
            DeviceTokenDto dto,
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(tenantIdClaim))
                return Results.Unauthorized();

            var userId = int.Parse(userIdClaim);
            var tenantId = int.Parse(tenantIdClaim);

            var deviceId = context.Request.Headers["X-Device-Id"].FirstOrDefault();
            var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();

            await auth.RegisterDeviceTokenAsync(userId, tenantId, dto.Token, dto.Platform, dto.DeviceName, deviceId, deviceFingerprint);

            return Results.Ok(new { success = true, message = "Token registrado" });
        })
        .RequireAuthorization()
        .WithSummary("Registrar push token del dispositivo")
        .WithDescription("Registra o actualiza el Expo Push Token para enviar notificaciones push al dispositivo.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/ack-unbind", async (
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(tenantIdClaim))
                return Results.Unauthorized();

            var userId = int.Parse(userIdClaim);
            var tenantId = int.Parse(tenantIdClaim);
            var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();

            await auth.AcknowledgeUnbindAsync(userId, tenantId, deviceFingerprint);

            return Results.Ok(new { success = true, message = "Dispositivo desvinculado exitosamente" });
        })
        .RequireAuthorization()
        .WithSummary("Confirmar desvinculacion de dispositivo")
        .WithDescription("El dispositivo confirma que sincronizo todos los datos y acepta la desvinculacion.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);
    }
}

public record DeviceTokenDto(string Token, string Platform, string DeviceName);

public class LogoutRequest
{
    public string? RefreshToken { get; set; }
}

/// <summary>Payload para POST /api/mobile/auth/change-password.</summary>
public record ChangePasswordDto(string OldPassword, string NewPassword);

/// <summary>Audit 2026-05-18 — payload para POST /api/mobile/auth/revoke-and-login.
/// User llegó aquí desde el picker UI tras SESSION_LIMIT_REACHED en login normal.
/// revokeSessionId = id de la sesión que user eligió cerrar.</summary>
public class RevokeAndLoginDto
{
    public string email { get; set; } = string.Empty;
    public string password { get; set; } = string.Empty;
    public string? totpCode { get; set; }
    public int revokeSessionId { get; set; }
}
