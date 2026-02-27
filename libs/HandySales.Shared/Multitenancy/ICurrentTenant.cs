namespace HandySales.Shared.Multitenancy;

public interface ICurrentTenant
{
    int TenantId { get; }
    string UserId { get; }
    bool IsAdmin { get; }
    bool IsSuperAdmin { get; }
    string Role { get; }
    bool IsSupervisor { get; }
}
