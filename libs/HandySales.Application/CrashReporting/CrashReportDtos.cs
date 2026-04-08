namespace HandySuites.Application.CrashReporting;

public record CrashReportCreateDto(
    string ErrorMessage,
    string? StackTrace,
    string DeviceId,
    string? DeviceName,
    string? AppVersion,
    string? OsVersion,
    string? ComponentName,
    string? Severity,
    int? TenantId,
    int? UserId
);

public record CrashReportDto(
    int Id,
    int? TenantId,
    string? TenantNombre,
    int? UserId,
    string? UserNombre,
    string DeviceId,
    string DeviceName,
    string AppVersion,
    string OsVersion,
    string ErrorMessage,
    string? StackTrace,
    string? ComponentName,
    string Severity,
    bool Resuelto,
    string? NotaResolucion,
    int? ResueltoPor,
    string? ResueltoPorNombre,
    DateTime CreadoEn
);

public record CrashReportEstadisticasDto(
    int TotalHoy,
    int TotalSinResolver,
    int TotalCrashes,
    int TotalErrors,
    int TotalWarnings,
    string? TopDispositivo,
    string? TopVersion
);

public record MarcarResueltoDto(
    string? Nota
);
