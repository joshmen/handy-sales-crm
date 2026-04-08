using HandySuites.Application.CrashReporting;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories;

public class CrashReportRepository : ICrashReportRepository
{
    private readonly HandySuitesDbContext _db;

    public CrashReportRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<CrashReport> CreateAsync(CrashReport report)
    {
        _db.CrashReports.Add(report);
        await _db.SaveChangesAsync();
        return report;
    }

    public async Task<(List<CrashReport> Items, int Total)> GetAllAsync(
        int page, int pageSize,
        string? severity = null,
        bool? resuelto = null,
        int? tenantId = null,
        string? appVersion = null)
    {
        var query = _db.CrashReports
            .AsNoTracking()
            .Include(c => c.Tenant)
            .Include(c => c.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(severity))
            query = query.Where(c => c.Severity == severity);

        if (resuelto.HasValue)
            query = query.Where(c => c.Resuelto == resuelto.Value);

        if (tenantId.HasValue)
            query = query.Where(c => c.TenantId == tenantId.Value);

        if (!string.IsNullOrEmpty(appVersion))
            query = query.Where(c => c.AppVersion == appVersion);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(c => c.CreadoEn)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<CrashReport?> GetByIdAsync(int id)
    {
        return await _db.CrashReports
            .AsNoTracking()
            .Include(c => c.Tenant)
            .Include(c => c.User)
            .Include(c => c.ResueltoByUsuario)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<bool> MarcarResueltoAsync(int id, string? nota, int userId)
    {
        var report = await _db.CrashReports.FindAsync(id);
        if (report == null) return false;

        report.Resuelto = true;
        report.NotaResolucion = nota;
        report.ResueltoPor = userId;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<CrashReportEstadisticasDto> GetEstadisticasAsync()
    {
        var hoy = DateTime.UtcNow.Date;

        var stats = await _db.CrashReports
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new
            {
                TotalHoy = g.Count(c => c.CreadoEn >= hoy),
                TotalSinResolver = g.Count(c => !c.Resuelto),
                TotalCrashes = g.Count(c => c.Severity == "CRASH"),
                TotalErrors = g.Count(c => c.Severity == "ERROR"),
                TotalWarnings = g.Count(c => c.Severity == "WARNING"),
            })
            .FirstOrDefaultAsync();

        // Top dispositivo afectado (últimos 7 días)
        var hace7Dias = DateTime.UtcNow.AddDays(-7);
        var topDevice = await _db.CrashReports
            .AsNoTracking()
            .Where(c => c.CreadoEn >= hace7Dias)
            .GroupBy(c => c.DeviceName)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .FirstOrDefaultAsync();

        var topVersion = await _db.CrashReports
            .AsNoTracking()
            .Where(c => c.CreadoEn >= hace7Dias)
            .GroupBy(c => c.AppVersion)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .FirstOrDefaultAsync();

        return new CrashReportEstadisticasDto(
            TotalHoy: stats?.TotalHoy ?? 0,
            TotalSinResolver: stats?.TotalSinResolver ?? 0,
            TotalCrashes: stats?.TotalCrashes ?? 0,
            TotalErrors: stats?.TotalErrors ?? 0,
            TotalWarnings: stats?.TotalWarnings ?? 0,
            TopDispositivo: topDevice,
            TopVersion: topVersion
        );
    }
}
