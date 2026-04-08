using HandySuites.Domain.Entities;

namespace HandySuites.Application.CrashReporting;

public interface ICrashReportRepository
{
    Task<CrashReport> CreateAsync(CrashReport report);
    Task<(List<CrashReport> Items, int Total)> GetAllAsync(
        int page, int pageSize,
        string? severity = null,
        bool? resuelto = null,
        int? tenantId = null,
        string? appVersion = null);
    Task<CrashReport?> GetByIdAsync(int id);
    Task<bool> MarcarResueltoAsync(int id, string? nota, int userId);
    Task<CrashReportEstadisticasDto> GetEstadisticasAsync();
}
