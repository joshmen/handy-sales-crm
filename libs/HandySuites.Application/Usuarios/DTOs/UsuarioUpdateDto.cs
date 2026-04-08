public class UsuarioUpdateDto
{
    public required string Email { get; set; }
    public required string Nombre { get; set; }
    public string? Password { get; set; }
}