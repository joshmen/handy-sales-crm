namespace HandySales.Application.Roles.DTOs;

public record RoleDto
{
    public int Id { get; init; }
    public string Nombre { get; init; } = string.Empty;
    public string? Descripcion { get; init; }
    public bool Activo { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public DateTime CreadoEn { get; init; }
    public DateTime? ActualizadoEn { get; init; }
    public string? CreadoPor { get; init; }
    public string? ActualizadoPor { get; init; }
}

public record CreateRoleDto
{
    public string Nombre { get; init; } = string.Empty;
    public string? Descripcion { get; init; }
    public bool Activo { get; init; } = true;
}

public record UpdateRoleDto
{
    public string Nombre { get; init; } = string.Empty;
    public string? Descripcion { get; init; }
    public bool Activo { get; init; } = true;
}