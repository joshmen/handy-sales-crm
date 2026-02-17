namespace HandySales.Application.Usuarios.DTOs;

public class UsuarioSearchDto
{
    public string? Search { get; set; }
    public bool? EsAdmin { get; set; }
    public bool? EsSuperAdmin { get; set; }
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