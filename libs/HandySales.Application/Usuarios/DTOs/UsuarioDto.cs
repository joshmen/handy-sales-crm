public class UsuarioDto
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string Nombre { get; set; }
    public int TenantId { get; set; }
    public bool EsAdmin { get; set; }
    public bool EsSuperAdmin { get; set; }
    public string? AvatarUrl { get; set; }
}
