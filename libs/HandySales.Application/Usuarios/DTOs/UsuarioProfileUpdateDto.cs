namespace HandySales.Application.Usuarios.DTOs;

public class UsuarioProfileUpdateDto
{
    public required string Nombre { get; set; }
    public string? CurrentPassword { get; set; }
    public string? NewPassword { get; set; }
}