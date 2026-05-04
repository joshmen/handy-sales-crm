/// <summary>
/// DTO de actualización de usuario. Todos los campos son opcionales: solo se
/// aplican los que vienen en el request, los demás conservan el valor actual.
/// Esto permite a la web "Equipo" mandar `{nombre, rol, activo, telefono}` sin
/// tener que reenviar el email del usuario, y al mobile mandar solo `{nombre}`
/// si solo cambia el nombre.
/// </summary>
public class UsuarioUpdateDto
{
    /// <summary>Opcional. Si null/missing, se conserva el email actual.</summary>
    public string? Email { get; set; }

    /// <summary>Nombre completo. Required — mínimo este campo siempre se envía.</summary>
    public required string Nombre { get; set; }

    /// <summary>Opcional. Si null/empty, NO se cambia el password.</summary>
    public string? Password { get; set; }

    /// <summary>
    /// Rol explícito. Valores válidos: SUPER_ADMIN, ADMIN, SUPERVISOR, VIEWER,
    /// VENDEDOR. Validador whitelist contra `RoleNames`.
    /// </summary>
    public string? Rol { get; set; }

    /// <summary>Estado activo/inactivo del usuario. Bool nullable: si null, no cambia.</summary>
    public bool? Activo { get; set; }

    /// <summary>Teléfono de contacto. Formato libre, validador acepta dígitos + separadores.</summary>
    public string? Telefono { get; set; }

    /// <summary>URL absoluta a la foto de perfil (Cloudinary). Normalmente seteada por el endpoint /avatar, pero permitimos sobrescribir vía PUT por completitud.</summary>
    public string? AvatarUrl { get; set; }
}
