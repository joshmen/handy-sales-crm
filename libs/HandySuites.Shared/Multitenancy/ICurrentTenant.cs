namespace HandySuites.Shared.Multitenancy;

public interface ICurrentTenant
{
    int TenantId { get; }
    string UserId { get; }
    string Role { get; }

    /// <summary>
    /// True si Role es ADMIN, SUPER_ADMIN O SUPERVISOR. Para checks de "usuario
    /// con privilegios elevados" sin distinguir entre niveles.
    ///
    /// Sprint pre-prod #11 audit 2026-06-06: renombrado desde `IsAdmin` (que
    /// daba la impresion incorrecta de "solo Admin estricto"). 30+ endpoints
    /// usaban `!IsAdmin &amp;&amp; !IsSuperAdmin` para gatekeeping y dejaban entrar
    /// SUPERVISOR contradiciendo sus comentarios. Para checks estrictos usar
    /// `IsStrictAdmin` (Admin O SuperAdmin, NO Supervisor).
    /// </summary>
    bool IsAdminOrAbove { get; }

    /// <summary>
    /// True SOLO si Role es ADMIN O SUPER_ADMIN. Excluye SUPERVISOR.
    /// Usar para endpoints donde solo el admin del tenant (o el SA del sistema)
    /// debe operar — ej. PUT /api/company/settings, upload-logo, aprobar/
    /// rechazar prospecto, gestion de billing.
    /// </summary>
    bool IsStrictAdmin { get; }

    bool IsSuperAdmin { get; }
    bool IsSupervisor { get; }

    /// <summary>
    /// Alias historico de IsAdminOrAbove. Marcado como obsoleto en sprint
    /// pre-prod #11 — usar IsAdminOrAbove o IsStrictAdmin segun el caso.
    /// </summary>
    [System.Obsolete("Usa IsAdminOrAbove (incluye SUPERVISOR) o IsStrictAdmin (solo ADMIN/SUPER_ADMIN). Este alias se removera en proximo sprint.", error: false)]
    bool IsAdmin { get; }
}
