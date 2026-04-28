namespace HandySuites.Application.Usuarios.DTOs;

public class UsuarioProfileDto
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string Nombre { get; set; }
    public int TenantId { get; set; }
    /// <summary>Rol del usuario. Valores: SUPER_ADMIN, ADMIN, SUPERVISOR, VIEWER, VENDEDOR.</summary>
    public string Rol { get; set; } = "VENDEDOR";
    public string? AvatarUrl { get; set; }
    public int? RoleId { get; set; }
    public string? RoleName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}