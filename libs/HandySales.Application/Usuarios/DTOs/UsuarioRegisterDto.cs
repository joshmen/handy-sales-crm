public class UsuarioRegisterDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;

    // Datos para crear el Tenant (empresa)
    public string NombreEmpresa { get; set; } = string.Empty;
    public string? RFC { get; set; }
    public string? Contacto { get; set; }
}
