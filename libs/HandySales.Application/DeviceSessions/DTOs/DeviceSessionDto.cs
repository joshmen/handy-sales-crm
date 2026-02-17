using HandySales.Domain.Entities;

namespace HandySales.Application.DeviceSessions.DTOs;

public class DeviceSessionDto
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public required string UsuarioNombre { get; set; }
    public required string DeviceId { get; set; }
    public string? DeviceName { get; set; }
    public DeviceType DeviceType { get; set; }
    public string DeviceTypeNombre => DeviceType.ToString();
    public string? DeviceModel { get; set; }
    public string? OsVersion { get; set; }
    public string? AppVersion { get; set; }
    public string? IpAddress { get; set; }
    public SessionStatus Status { get; set; }
    public string StatusNombre => Status.ToString();
    public DateTime LastActivity { get; set; }
    public DateTime LoggedInAt { get; set; }
    public DateTime? LoggedOutAt { get; set; }
    public string? LogoutReason { get; set; }
    public bool EsSesionActual { get; set; }
}

public class DeviceSessionListDto
{
    public int Id { get; set; }
    public required string DeviceId { get; set; }
    public string? DeviceName { get; set; }
    public DeviceType DeviceType { get; set; }
    public string DeviceTypeNombre => DeviceType.ToString();
    public string? DeviceModel { get; set; }
    public SessionStatus Status { get; set; }
    public string StatusNombre => Status.ToString();
    public DateTime LastActivity { get; set; }
    public DateTime LoggedInAt { get; set; }
    public bool EsSesionActual { get; set; }
}

public class DeviceSessionCreateDto
{
    public required string DeviceId { get; set; }
    public string? DeviceName { get; set; }
    public DeviceType DeviceType { get; set; } = DeviceType.Unknown;
    public string? DeviceModel { get; set; }
    public string? OsVersion { get; set; }
    public string? AppVersion { get; set; }
    public string? PushToken { get; set; }
}

public class DeviceSessionUpdatePushTokenDto
{
    public required string PushToken { get; set; }
}

public class LogoutDeviceDto
{
    public string? Reason { get; set; }
}

public class LogoutAllDevicesDto
{
    public bool ExcluirSesionActual { get; set; } = true;
    public string? Reason { get; set; }
}

public class DeviceSessionResumenDto
{
    public int TotalDispositivos { get; set; }
    public int DispositivosActivos { get; set; }
    public int DispositivosAndroid { get; set; }
    public int DispositivosIOS { get; set; }
    public int DispositivosWeb { get; set; }
    public DateTime? UltimaActividad { get; set; }
}
