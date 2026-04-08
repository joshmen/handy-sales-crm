namespace HandySuites.Domain.Common;

/// <summary>
/// Interfaz marcadora para entidades que pertenecen a un tenant.
/// Usada para aplicar Global Query Filters automáticamente.
/// </summary>
public interface ITenantEntity
{
    int TenantId { get; set; }
}
