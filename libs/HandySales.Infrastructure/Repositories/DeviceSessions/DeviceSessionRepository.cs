using HandySales.Application.DeviceSessions.DTOs;
using HandySales.Application.DeviceSessions.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Repositories.DeviceSessions;

public class DeviceSessionRepository : IDeviceSessionRepository
{
    private readonly HandySalesDbContext _db;

    public DeviceSessionRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<int> RegistrarSesionAsync(DeviceSessionCreateDto dto, int usuarioId, int tenantId, int? refreshTokenId, string? ipAddress, string? userAgent)
    {
        // Verificar si ya existe una sesion para este dispositivo
        var existente = await _db.DeviceSessions
            .FirstOrDefaultAsync(ds => ds.DeviceId == dto.DeviceId && ds.UsuarioId == usuarioId && ds.TenantId == tenantId && ds.Status == SessionStatus.Active);

        if (existente != null)
        {
            // Actualizar sesion existente
            existente.DeviceName = dto.DeviceName ?? existente.DeviceName;
            existente.DeviceModel = dto.DeviceModel ?? existente.DeviceModel;
            existente.OsVersion = dto.OsVersion ?? existente.OsVersion;
            existente.AppVersion = dto.AppVersion ?? existente.AppVersion;
            existente.PushToken = dto.PushToken ?? existente.PushToken;
            existente.RefreshTokenId = refreshTokenId ?? existente.RefreshTokenId;
            existente.IpAddress = ipAddress ?? existente.IpAddress;
            existente.UserAgent = userAgent ?? existente.UserAgent;
            existente.LastActivity = DateTime.UtcNow;
            existente.ActualizadoEn = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return existente.Id;
        }

        // Crear nueva sesion
        var session = new DeviceSession
        {
            TenantId = tenantId,
            UsuarioId = usuarioId,
            DeviceId = dto.DeviceId,
            DeviceName = dto.DeviceName,
            DeviceType = dto.DeviceType,
            DeviceModel = dto.DeviceModel,
            OsVersion = dto.OsVersion,
            AppVersion = dto.AppVersion,
            PushToken = dto.PushToken,
            RefreshTokenId = refreshTokenId,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            Status = SessionStatus.Active,
            LoggedInAt = DateTime.UtcNow,
            LastActivity = DateTime.UtcNow,
            Activo = true,
            CreadoEn = DateTime.UtcNow
        };

        _db.DeviceSessions.Add(session);
        await _db.SaveChangesAsync();

        return session.Id;
    }

    public async Task<bool> ActualizarActividadAsync(int sessionId, int tenantId)
    {
        var session = await _db.DeviceSessions
            .FirstOrDefaultAsync(ds => ds.Id == sessionId && ds.TenantId == tenantId && ds.Status == SessionStatus.Active);

        if (session == null) return false;

        session.LastActivity = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ActualizarPushTokenAsync(int sessionId, string pushToken, int tenantId)
    {
        var session = await _db.DeviceSessions
            .FirstOrDefaultAsync(ds => ds.Id == sessionId && ds.TenantId == tenantId && ds.Status == SessionStatus.Active);

        if (session == null) return false;

        session.PushToken = pushToken;
        session.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<DeviceSessionDto?> ObtenerPorIdAsync(int id, int tenantId, int? sesionActualId = null)
    {
        return await _db.DeviceSessions
            .AsNoTracking()
            .Where(ds => ds.Id == id && ds.TenantId == tenantId && ds.Activo)
            .Select(ds => new DeviceSessionDto
            {
                Id = ds.Id,
                UsuarioId = ds.UsuarioId,
                UsuarioNombre = ds.Usuario.Nombre,
                DeviceId = ds.DeviceId,
                DeviceName = ds.DeviceName,
                DeviceType = ds.DeviceType,
                DeviceModel = ds.DeviceModel,
                OsVersion = ds.OsVersion,
                AppVersion = ds.AppVersion,
                IpAddress = ds.IpAddress,
                Status = ds.Status,
                LastActivity = ds.LastActivity,
                LoggedInAt = ds.LoggedInAt,
                LoggedOutAt = ds.LoggedOutAt,
                LogoutReason = ds.LogoutReason,
                EsSesionActual = sesionActualId.HasValue && ds.Id == sesionActualId.Value
            })
            .FirstOrDefaultAsync();
    }

    public async Task<DeviceSessionDto?> ObtenerPorDeviceIdAsync(string deviceId, int usuarioId, int tenantId)
    {
        return await _db.DeviceSessions
            .AsNoTracking()
            .Where(ds => ds.DeviceId == deviceId && ds.UsuarioId == usuarioId && ds.TenantId == tenantId && ds.Activo && ds.Status == SessionStatus.Active)
            .Select(ds => new DeviceSessionDto
            {
                Id = ds.Id,
                UsuarioId = ds.UsuarioId,
                UsuarioNombre = ds.Usuario.Nombre,
                DeviceId = ds.DeviceId,
                DeviceName = ds.DeviceName,
                DeviceType = ds.DeviceType,
                DeviceModel = ds.DeviceModel,
                OsVersion = ds.OsVersion,
                AppVersion = ds.AppVersion,
                IpAddress = ds.IpAddress,
                Status = ds.Status,
                LastActivity = ds.LastActivity,
                LoggedInAt = ds.LoggedInAt,
                LoggedOutAt = ds.LoggedOutAt,
                LogoutReason = ds.LogoutReason,
                EsSesionActual = false
            })
            .FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<DeviceSessionListDto>> ObtenerMisSesionesAsync(int usuarioId, int tenantId, int? sesionActualId = null)
    {
        return await _db.DeviceSessions
            .AsNoTracking()
            .Where(ds => ds.UsuarioId == usuarioId && ds.TenantId == tenantId && ds.Activo)
            .OrderByDescending(ds => ds.LastActivity)
            .Select(ds => new DeviceSessionListDto
            {
                Id = ds.Id,
                DeviceId = ds.DeviceId,
                DeviceName = ds.DeviceName,
                DeviceType = ds.DeviceType,
                DeviceModel = ds.DeviceModel,
                Status = ds.Status,
                LastActivity = ds.LastActivity,
                LoggedInAt = ds.LoggedInAt,
                EsSesionActual = sesionActualId.HasValue && ds.Id == sesionActualId.Value
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<DeviceSessionListDto>> ObtenerSesionesPorUsuarioAsync(int usuarioId, int tenantId)
    {
        return await _db.DeviceSessions
            .AsNoTracking()
            .Where(ds => ds.UsuarioId == usuarioId && ds.TenantId == tenantId && ds.Activo)
            .OrderByDescending(ds => ds.LastActivity)
            .Select(ds => new DeviceSessionListDto
            {
                Id = ds.Id,
                DeviceId = ds.DeviceId,
                DeviceName = ds.DeviceName,
                DeviceType = ds.DeviceType,
                DeviceModel = ds.DeviceModel,
                Status = ds.Status,
                LastActivity = ds.LastActivity,
                LoggedInAt = ds.LoggedInAt,
                EsSesionActual = false
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<DeviceSessionListDto>> ObtenerSesionesActivasAsync(int tenantId)
    {
        return await _db.DeviceSessions
            .AsNoTracking()
            .Where(ds => ds.TenantId == tenantId && ds.Activo && ds.Status == SessionStatus.Active)
            .OrderByDescending(ds => ds.LastActivity)
            .Select(ds => new DeviceSessionListDto
            {
                Id = ds.Id,
                DeviceId = ds.DeviceId,
                DeviceName = ds.DeviceName,
                DeviceType = ds.DeviceType,
                DeviceModel = ds.DeviceModel,
                Status = ds.Status,
                LastActivity = ds.LastActivity,
                LoggedInAt = ds.LoggedInAt,
                EsSesionActual = false
            })
            .ToListAsync();
    }

    public async Task<DeviceSessionResumenDto> ObtenerResumenAsync(int usuarioId, int tenantId)
    {
        var sessions = await _db.DeviceSessions
            .AsNoTracking()
            .Where(ds => ds.UsuarioId == usuarioId && ds.TenantId == tenantId && ds.Activo)
            .ToListAsync();

        return new DeviceSessionResumenDto
        {
            TotalDispositivos = sessions.Count,
            DispositivosActivos = sessions.Count(s => s.Status == SessionStatus.Active),
            DispositivosAndroid = sessions.Count(s => s.DeviceType == DeviceType.Android && s.Status == SessionStatus.Active),
            DispositivosIOS = sessions.Count(s => s.DeviceType == DeviceType.iOS && s.Status == SessionStatus.Active),
            DispositivosWeb = sessions.Count(s => s.DeviceType == DeviceType.Web && s.Status == SessionStatus.Active),
            UltimaActividad = sessions.Where(s => s.Status == SessionStatus.Active).Max(s => (DateTime?)s.LastActivity)
        };
    }

    public async Task<bool> CerrarSesionAsync(int sessionId, int tenantId, string? reason = null)
    {
        var session = await _db.DeviceSessions
            .FirstOrDefaultAsync(ds => ds.Id == sessionId && ds.TenantId == tenantId && ds.Status == SessionStatus.Active);

        if (session == null) return false;

        session.Status = SessionStatus.LoggedOut;
        session.LoggedOutAt = DateTime.UtcNow;
        session.LogoutReason = reason ?? "Cierre de sesion voluntario";
        session.ActualizadoEn = DateTime.UtcNow;

        // Invalidar el refresh token asociado
        if (session.RefreshTokenId.HasValue)
        {
            var refreshToken = await _db.RefreshTokens.FindAsync(session.RefreshTokenId.Value);
            if (refreshToken != null)
            {
                refreshToken.IsRevoked = true;
            }
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> CerrarTodasMisSesionesAsync(int usuarioId, int tenantId, int? exceptoSessionId = null, string? reason = null)
    {
        var sessions = await _db.DeviceSessions
            .Where(ds => ds.UsuarioId == usuarioId && ds.TenantId == tenantId && ds.Status == SessionStatus.Active)
            .Where(ds => !exceptoSessionId.HasValue || ds.Id != exceptoSessionId.Value)
            .ToListAsync();

        var logoutReason = reason ?? "Cierre de todas las sesiones";

        foreach (var session in sessions)
        {
            session.Status = SessionStatus.LoggedOut;
            session.LoggedOutAt = DateTime.UtcNow;
            session.LogoutReason = logoutReason;
            session.ActualizadoEn = DateTime.UtcNow;

            // Invalidar refresh token
            if (session.RefreshTokenId.HasValue)
            {
                var refreshToken = await _db.RefreshTokens.FindAsync(session.RefreshTokenId.Value);
                if (refreshToken != null)
                {
                    refreshToken.IsRevoked = true;
                }
            }
        }

        await _db.SaveChangesAsync();
        return sessions.Count;
    }

    public async Task<int> CerrarTodasSesionesUsuarioAsync(int usuarioId, int tenantId, string? reason = null)
    {
        return await CerrarTodasMisSesionesAsync(usuarioId, tenantId, null, reason ?? "Sesiones cerradas por administrador");
    }

    public async Task<bool> RevocarSesionAsync(int sessionId, int tenantId, bool porAdmin, string? reason = null)
    {
        var session = await _db.DeviceSessions
            .FirstOrDefaultAsync(ds => ds.Id == sessionId && ds.TenantId == tenantId && ds.Status == SessionStatus.Active);

        if (session == null) return false;

        session.Status = porAdmin ? SessionStatus.RevokedByAdmin : SessionStatus.RevokedByUser;
        session.LoggedOutAt = DateTime.UtcNow;
        session.LogoutReason = reason ?? (porAdmin ? "Sesion revocada por administrador" : "Sesion revocada remotamente");
        session.ActualizadoEn = DateTime.UtcNow;

        // Invalidar el refresh token asociado
        if (session.RefreshTokenId.HasValue)
        {
            var refreshToken = await _db.RefreshTokens.FindAsync(session.RefreshTokenId.Value);
            if (refreshToken != null)
            {
                refreshToken.IsRevoked = true;
            }
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EsSesionValidaAsync(int sessionId, int tenantId)
    {
        return await _db.DeviceSessions
            .AsNoTracking()
            .AnyAsync(ds => ds.Id == sessionId && ds.TenantId == tenantId && ds.Status == SessionStatus.Active && ds.Activo);
    }

    public async Task<bool> ExisteDispositivoAsync(string deviceId, int usuarioId, int tenantId)
    {
        return await _db.DeviceSessions
            .AsNoTracking()
            .AnyAsync(ds => ds.DeviceId == deviceId && ds.UsuarioId == usuarioId && ds.TenantId == tenantId && ds.Status == SessionStatus.Active);
    }

    public async Task<int> LimpiarSesionesExpiradasAsync(int diasInactividad = 30)
    {
        var fechaLimite = DateTime.UtcNow.AddDays(-diasInactividad);

        var sesionesExpiradas = await _db.DeviceSessions
            .Where(ds => ds.Status == SessionStatus.Active && ds.LastActivity < fechaLimite)
            .ToListAsync();

        foreach (var session in sesionesExpiradas)
        {
            session.Status = SessionStatus.Expired;
            session.LoggedOutAt = DateTime.UtcNow;
            session.LogoutReason = $"Sesion expirada por inactividad ({diasInactividad} dias)";
            session.ActualizadoEn = DateTime.UtcNow;

            // Invalidar refresh token
            if (session.RefreshTokenId.HasValue)
            {
                var refreshToken = await _db.RefreshTokens.FindAsync(session.RefreshTokenId.Value);
                if (refreshToken != null)
                {
                    refreshToken.IsRevoked = true;
                }
            }
        }

        await _db.SaveChangesAsync();
        return sesionesExpiradas.Count;
    }
}
