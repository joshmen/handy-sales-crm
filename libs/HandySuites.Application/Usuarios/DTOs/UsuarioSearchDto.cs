namespace HandySuites.Application.Usuarios.DTOs;

public class UsuarioSearchDto
{
    public string? Search { get; set; }
    /// <summary>Filtra por rol exacto: SUPER_ADMIN, ADMIN, SUPERVISOR, VIEWER, VENDEDOR.</summary>
    public string? Rol { get; set; }
    public bool? Activo { get; set; }
    public int? RoleId { get; set; }
    public int? TenantId { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public string? SortBy { get; set; } = "Nombre";
    public string? SortDirection { get; set; } = "asc";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}