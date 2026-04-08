namespace HandySuites.Application.SubscriptionPlans.Interfaces;

public interface IReportAccessService
{
    Task<ReportAccessResult> CanAccessReportAsync(int tenantId, string reportSlug);
    Task<ReportTierInfo> GetReportTierInfoAsync(int tenantId);
}

public record ReportAccessResult(
    bool Allowed,
    string? Message = null,
    string? RequiredTier = null
);

public record ReportTierInfo(
    string CurrentTier,
    List<string> AllowedReports,
    int? MaxDateRangeDays
);
