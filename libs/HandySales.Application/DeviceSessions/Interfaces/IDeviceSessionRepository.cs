using HandySales.Application.DeviceSessions.DTOs;
using HandySales.Domain.Entities;

namespace HandySales.Application.DeviceSessions.Interfaces;

public interface IDeviceSessionRepository
{
    // Registro y actualizacion de sesion
    Task<int> RegistrarSesionAsync(DeviceSessionCreateDto dto, int usuarioId, int tenantId, int? refreshTokenId, string? ipAddress, string? userAgent);
    Task<bool> ActualizarActividadAsync(int sessionId, int tenantId);
    Task<bool> ActualizarPushTokenAsync(int sessionId, string pushToken, int tenantId);

    // Consultas
    Task<DeviceSessionDto?> ObtenerPorIdAsync(int id, int tenantId, int? sesionActualId = null);
    Task<DeviceSessionDto?> ObtenerPorDeviceIdAsync(string deviceId, int usuarioId, int tenantId);
    Task<IEnumerable<DeviceSessionListDto>> ObtenerMisSesionesAsync(int usuarioId, int tenantId, int? sesionActualId = null);
    Task<IEnumerable<DeviceSessionListDto>> ObtenerSesionesPorUsuarioAsync(int usuarioId, int tenantId);
    Task<IEnumerable<DeviceSessionListDto>> ObtenerSesionesActivasAsync(int tenantId);
    Task<DeviceSessionResumenDto> ObtenerResumenAsync(int usuarioId, int tenantId);

    // Logout
    Task<bool> CerrarSesionAsync(int sessionId, int tenantId, string? reason = null);
    Task<int> CerrarTodasMisSesionesAsync(int usuarioId, int tenantId, int? exceptoSessionId = null, string? reason = null);
    Task<int> CerrarTodasSesionesUsuarioAsync(int usuarioId, int tenantId, string? reason = null);
    Task<bool> RevocarSesionAsync(int sessionId, int tenantId, bool porAdmin, string? reason = null);

    // Verificacion
    Task<bool> EsSesionValidaAsync(int sessionId, int tenantId);
    Task<bool> ExisteDispositivoAsync(string deviceId, int usuarioId, int tenantId);

    // Limpieza
    Task<int> LimpiarSesionesExpiradasAsync(int diasInactividad = 30);
}
