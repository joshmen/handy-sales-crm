public static class PresenceConstants
{
    public const int OnlineThresholdMinutes = 5;
}

public class UsuarioDto
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string Nombre { get; set; }
    public int TenantId { get; set; }
    public bool EsAdmin { get; set; }
    public bool EsSuperAdmin { get; set; }
    public string Rol { get; set; } = "VENDEDOR";
    public string? AvatarUrl { get; set; }

    public bool Activo { get; set; }

    // Session/presence info
    public bool IsOnline { get; set; }
    public int ActiveSessionCount { get; set; }
    public DateTime? LastActivity { get; set; }
}

public class UsuarioUbicacionDto
{
    public int UsuarioId { get; set; }
    public required string Nombre { get; set; }
    public string? AvatarUrl { get; set; }
    public double Latitud { get; set; }
    public double Longitud { get; set; }
    public DateTime? FechaUbicacion { get; set; }
    public string? ClienteNombre { get; set; }
}
