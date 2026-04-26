namespace HandySuites.Domain.Common;

/// <summary>
/// Constantes de roles del sistema. Usar siempre estas en vez de literales string,
/// para que un rename llegue a todos los call sites a través del compilador.
/// El valor que se persiste en <c>Usuarios.rol</c> y se emite en el claim JWT <c>role</c>.
/// </summary>
public static class RoleNames
{
    public const string SuperAdmin = "SUPER_ADMIN";
    public const string Admin = "ADMIN";
    public const string Supervisor = "SUPERVISOR";
    public const string Viewer = "VIEWER";
    public const string Vendedor = "VENDEDOR";
}
