namespace HandySales.Application.Usuarios.DTOs;

public class UsuarioProfileDto
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string Nombre { get; set; }
    public int TenantId { get; set; }
    public bool EsAdmin { get; set; }
    public bool EsSuperAdmin { get; set; }
    public string? AvatarUrl { get; set; }
    public int? RoleId { get; set; }
    public string? RoleName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}