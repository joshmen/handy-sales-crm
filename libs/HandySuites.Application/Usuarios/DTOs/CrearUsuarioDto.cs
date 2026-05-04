namespace HandySuites.Application.Usuarios.DTOs;

/// <summary>
/// Payload para crear un usuario desde el tab Equipo (web) o desde un endpoint
/// admin del mobile API. Soporta dos flujos:
///
/// 1. <b>Invite link (default, recommended)</b>: el caller envía solo
///    Email + Nombre + Rol (+ Telefono opcional). Backend genera password
///    placeholder + envía email de invitación con token 24h. Usuario abre
///    el link y establece SU OWN password en `/set-password`.
///
/// 2. <b>Sin email (fallback)</b>: vendedor de campo MX que no tiene email
///    corporativo. Caller marca <see cref="SinEmail"/>=true y envía
///    <see cref="Password"/> temporal. Backend persiste con
///    `MustChangePassword=true` para que en el primer login mobile se fuerce
///    cambio de contraseña.
///
/// Validador en `CrearUsuarioDtoValidator` aplica reglas condicionales según
/// `SinEmail`. Service `UsuarioService.CrearUsuarioAsync` enforcea
/// `RoleHierarchy.CanCreateRole(callerRole, dto.Rol)`.
/// </summary>
public class CrearUsuarioDto
{
    /// <summary>Email del usuario. Required cuando <see cref="SinEmail"/>=false. Vacío permitido cuando true.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Nombre completo. Required siempre.</summary>
    public string Nombre { get; set; } = string.Empty;

    /// <summary>Rol explícito. Required. Validador whitelist contra <c>RoleNames</c>. Sujeto a RoleHierarchy.</summary>
    public string Rol { get; set; } = string.Empty;

    /// <summary>
    /// Password temporal. SOLO se acepta cuando <see cref="SinEmail"/>=true.
    /// Si SinEmail=false, debe estar null/empty (validador rechaza si viene
    /// password con email — para que el admin no caiga en bad practice).
    /// </summary>
    public string? Password { get; set; }

    /// <summary>Teléfono opcional (E.164 internacional, formato libre).</summary>
    public string? Telefono { get; set; }

    /// <summary>
    /// True = vendedor de campo sin email corporativo. Admin asigna password
    /// temporal en <see cref="Password"/>; el usuario lo cambia en su primer
    /// login. False (default) = invite link al email del usuario.
    /// </summary>
    public bool SinEmail { get; set; } = false;
}
