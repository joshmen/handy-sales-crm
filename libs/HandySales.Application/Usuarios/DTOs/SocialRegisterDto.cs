public class SocialRegisterDto
{
    public string Email { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string NombreEmpresa { get; set; } = string.Empty;
    public string? RFC { get; set; }
    public string? Contacto { get; set; }
}
