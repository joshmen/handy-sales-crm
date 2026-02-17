using HandySales.Shared.Multitenancy;
using HandySales.Application.DeviceSessions.DTOs;
using HandySales.Application.DeviceSessions.Interfaces;

namespace HandySales.Application.DeviceSessions.Services;

public class DeviceSessionService
{
    private readonly IDeviceSessionRepository _repository;
    private readonly ICurrentTenant _tenant;

    public DeviceSessionService(IDeviceSessionRepository repository, ICurrentTenant tenant)
    {
        _repository = repository;
        _tenant = tenant;
    }

    // Registro de sesion (llamado durante login)
    public async Task<int> RegistrarSesionAsync(DeviceSessionCreateDto dto, int? refreshTokenId, string? ipAddress, string? userAgent)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.RegistrarSesionAsync(dto, usuarioId, _tenant.TenantId, refreshTokenId, ipAddress, userAgent);
    }

    // Actualizar actividad (puede llamarse en cada request)
    public async Task<bool> ActualizarActividadAsync(int sessionId)
    {
        return await _repository.ActualizarActividadAsync(sessionId, _tenant.TenantId);
    }

    // Actualizar push token
    public async Task<bool> ActualizarPushTokenAsync(int sessionId, string pushToken)
    {
        return await _repository.ActualizarPushTokenAsync(sessionId, pushToken, _tenant.TenantId);
    }

    // Obtener sesion por ID
    public async Task<DeviceSessionDto?> ObtenerPorIdAsync(int id, int? sesionActualId = null)
    {
        return await _repository.ObtenerPorIdAsync(id, _tenant.TenantId, sesionActualId);
    }

    // Obtener sesion por device ID
    public async Task<DeviceSessionDto?> ObtenerPorDeviceIdAsync(string deviceId)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.ObtenerPorDeviceIdAsync(deviceId, usuarioId, _tenant.TenantId);
    }

    // Mis sesiones
    public async Task<IEnumerable<DeviceSessionListDto>> ObtenerMisSesionesAsync(int? sesionActualId = null)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.ObtenerMisSesionesAsync(usuarioId, _tenant.TenantId, sesionActualId);
    }

    // Resumen de mis dispositivos
    public async Task<DeviceSessionResumenDto> ObtenerMiResumenAsync()
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.ObtenerResumenAsync(usuarioId, _tenant.TenantId);
    }

    // Cerrar mi sesion actual
    public async Task<bool> CerrarMiSesionAsync(int sessionId, string? reason = null)
    {
        return await _repository.CerrarSesionAsync(sessionId, _tenant.TenantId, reason);
    }

    // Cerrar sesion remota (cerrar otra de mis sesiones)
    public async Task<bool> CerrarSesionRemotaAsync(int sessionId, string? reason = null)
    {
        // Verificar que la sesion pertenece al usuario actual
        var session = await _repository.ObtenerPorIdAsync(sessionId, _tenant.TenantId);
        if (session == null || session.UsuarioId != int.Parse(_tenant.UserId))
            return false;

        return await _repository.RevocarSesionAsync(sessionId, _tenant.TenantId, false, reason ?? "Cerrada remotamente por el usuario");
    }

    // Cerrar todas mis sesiones excepto la actual
    public async Task<int> CerrarTodasMisSesionesAsync(int? exceptoSessionId = null, string? reason = null)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.CerrarTodasMisSesionesAsync(usuarioId, _tenant.TenantId, exceptoSessionId, reason);
    }

    // ADMIN: Obtener sesiones de un usuario
    public async Task<IEnumerable<DeviceSessionListDto>> ObtenerSesionesPorUsuarioAsync(int usuarioId)
    {
        return await _repository.ObtenerSesionesPorUsuarioAsync(usuarioId, _tenant.TenantId);
    }

    // ADMIN: Obtener todas las sesiones activas
    public async Task<IEnumerable<DeviceSessionListDto>> ObtenerTodasSesionesActivasAsync()
    {
        return await _repository.ObtenerSesionesActivasAsync(_tenant.TenantId);
    }

    // ADMIN: Revocar sesion de cualquier usuario
    public async Task<bool> RevocarSesionAsync(int sessionId, string? reason = null)
    {
        return await _repository.RevocarSesionAsync(sessionId, _tenant.TenantId, true, reason);
    }

    // ADMIN: Cerrar todas las sesiones de un usuario
    public async Task<int> CerrarTodasSesionesUsuarioAsync(int usuarioId, string? reason = null)
    {
        return await _repository.CerrarTodasSesionesUsuarioAsync(usuarioId, _tenant.TenantId, reason);
    }

    // ADMIN: Limpiar sesiones expiradas
    public async Task<int> LimpiarSesionesExpiradasAsync(int diasInactividad = 30)
    {
        return await _repository.LimpiarSesionesExpiradasAsync(diasInactividad);
    }

    // Verificar si sesion es valida
    public async Task<bool> EsSesionValidaAsync(int sessionId)
    {
        return await _repository.EsSesionValidaAsync(sessionId, _tenant.TenantId);
    }
}
