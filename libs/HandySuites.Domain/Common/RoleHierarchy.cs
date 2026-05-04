namespace HandySuites.Domain.Common;

/// <summary>
/// Reglas de jerarquía de roles para crear/asignar usuarios.
/// Aplicado tanto en el frontend (filtrar dropdown de roles) como en el
/// backend (`UsuarioService.CrearUsuarioAsync`) — la lógica server-side es
/// la fuente de verdad por seguridad.
///
/// Reglas (decididas con owner 2026-05-04):
/// - SUPER_ADMIN puede asignar cualquier rol.
/// - ADMIN puede asignar SUPERVISOR, VIEWER, VENDEDOR. NO ADMIN ni SUPER_ADMIN.
///   (Decisión más restrictiva que la industria. Si owner necesita otro
///   ADMIN, debe pedirlo a SUPER_ADMIN.)
/// - SUPERVISOR puede asignar VENDEDOR, VIEWER.
/// - VIEWER y VENDEDOR no pueden crear usuarios (rechazado en endpoint).
///
/// Referencias:
/// - NIST SP 800-63B Rev. 4 §3.1.1.2 (initial-secret rotation)
/// - OWASP ASVS 5.0 V6 Authentication
/// </summary>
public static class RoleHierarchy
{
    /// <summary>
    /// Devuelve true si un usuario con rol <paramref name="callerRole"/> puede
    /// crear o asignar un usuario con rol <paramref name="targetRole"/>.
    /// Comparación case-insensitive contra <see cref="RoleNames"/>.
    /// </summary>
    public static bool CanCreateRole(string? callerRole, string? targetRole)
    {
        if (string.IsNullOrWhiteSpace(callerRole) || string.IsNullOrWhiteSpace(targetRole))
            return false;

        var caller = callerRole.ToUpperInvariant();
        var target = targetRole.ToUpperInvariant();

        // Validar que el target sea un rol conocido
        if (target != RoleNames.SuperAdmin
            && target != RoleNames.Admin
            && target != RoleNames.Supervisor
            && target != RoleNames.Viewer
            && target != RoleNames.Vendedor)
        {
            return false;
        }

        return caller switch
        {
            RoleNames.SuperAdmin => true, // todos los roles
            RoleNames.Admin => target == RoleNames.Supervisor
                            || target == RoleNames.Viewer
                            || target == RoleNames.Vendedor,
            RoleNames.Supervisor => target == RoleNames.Vendedor
                                 || target == RoleNames.Viewer,
            _ => false, // Viewer, Vendedor, o cualquier otro: no pueden crear
        };
    }

    /// <summary>
    /// Lista de roles que <paramref name="callerRole"/> puede asignar. Útil para
    /// poblar dropdowns en frontend (mirror del filtro client-side, pero la
    /// fuente de verdad sigue siendo CanCreateRole en el backend).
    /// </summary>
    public static IReadOnlyList<string> AssignableRoles(string? callerRole)
    {
        if (string.IsNullOrWhiteSpace(callerRole)) return Array.Empty<string>();

        return callerRole.ToUpperInvariant() switch
        {
            RoleNames.SuperAdmin => new[]
            {
                RoleNames.SuperAdmin,
                RoleNames.Admin,
                RoleNames.Supervisor,
                RoleNames.Viewer,
                RoleNames.Vendedor,
            },
            RoleNames.Admin => new[]
            {
                RoleNames.Supervisor,
                RoleNames.Viewer,
                RoleNames.Vendedor,
            },
            RoleNames.Supervisor => new[]
            {
                RoleNames.Vendedor,
                RoleNames.Viewer,
            },
            _ => Array.Empty<string>(),
        };
    }
}
