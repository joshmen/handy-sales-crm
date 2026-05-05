using FluentAssertions;
using HandySuites.Domain.Common;
using Xunit;

namespace HandySuites.Tests.Application.Usuarios;

/// <summary>
/// Unit tests para `RoleHierarchy.CanCreateRole` — la fuente de verdad de
/// RBAC en `UsuarioService.CrearUsuarioAsync`. Cualquier bypass aquí es un
/// privilege escalation, así que hay que cubrir todas las celdas de la matriz.
/// </summary>
public class RoleHierarchyTests
{
    // ───── SUPER_ADMIN puede crear cualquier rol ─────────────────────────
    [Theory]
    [InlineData(RoleNames.SuperAdmin)]
    [InlineData(RoleNames.Admin)]
    [InlineData(RoleNames.Supervisor)]
    [InlineData(RoleNames.Viewer)]
    [InlineData(RoleNames.Vendedor)]
    public void SuperAdmin_CanCreate_AnyRole(string targetRole)
    {
        RoleHierarchy.CanCreateRole(RoleNames.SuperAdmin, targetRole)
            .Should().BeTrue($"SUPER_ADMIN debe poder crear {targetRole}");
    }

    // ───── ADMIN: NO puede crear ADMIN ni SUPER_ADMIN ────────────────────
    [Theory]
    [InlineData(RoleNames.Supervisor)]
    [InlineData(RoleNames.Viewer)]
    [InlineData(RoleNames.Vendedor)]
    public void Admin_CanCreate_RolesBelow(string targetRole)
    {
        RoleHierarchy.CanCreateRole(RoleNames.Admin, targetRole)
            .Should().BeTrue($"ADMIN debe poder crear {targetRole}");
    }

    [Theory]
    [InlineData(RoleNames.SuperAdmin)]
    [InlineData(RoleNames.Admin)]
    public void Admin_CannotCreate_AdminOrAbove(string targetRole)
    {
        RoleHierarchy.CanCreateRole(RoleNames.Admin, targetRole)
            .Should().BeFalse($"ADMIN NO debe poder crear {targetRole}");
    }

    // ───── SUPERVISOR: solo VENDEDOR / VIEWER ────────────────────────────
    [Theory]
    [InlineData(RoleNames.Vendedor)]
    [InlineData(RoleNames.Viewer)]
    public void Supervisor_CanCreate_LowerRoles(string targetRole)
    {
        RoleHierarchy.CanCreateRole(RoleNames.Supervisor, targetRole)
            .Should().BeTrue($"SUPERVISOR debe poder crear {targetRole}");
    }

    [Theory]
    [InlineData(RoleNames.SuperAdmin)]
    [InlineData(RoleNames.Admin)]
    [InlineData(RoleNames.Supervisor)] // Mismo rol — no permitido
    public void Supervisor_CannotCreate_SameOrAbove(string targetRole)
    {
        RoleHierarchy.CanCreateRole(RoleNames.Supervisor, targetRole)
            .Should().BeFalse($"SUPERVISOR NO debe poder crear {targetRole}");
    }

    // ───── VENDEDOR / VIEWER: no pueden crear nada ───────────────────────
    [Theory]
    [InlineData(RoleNames.Vendedor)]
    [InlineData(RoleNames.Viewer)]
    public void LowestRoles_CannotCreate_AnyRole(string callerRole)
    {
        foreach (var target in new[]
        {
            RoleNames.SuperAdmin,
            RoleNames.Admin,
            RoleNames.Supervisor,
            RoleNames.Viewer,
            RoleNames.Vendedor,
        })
        {
            RoleHierarchy.CanCreateRole(callerRole, target)
                .Should().BeFalse($"{callerRole} NO debe poder crear {target}");
        }
    }

    // ───── Edge cases: null / unknown / case insensitive ─────────────────
    [Fact]
    public void NullCallerRole_ReturnsFalse()
    {
        RoleHierarchy.CanCreateRole(null, RoleNames.Vendedor).Should().BeFalse();
    }

    [Fact]
    public void NullTargetRole_ReturnsFalse()
    {
        RoleHierarchy.CanCreateRole(RoleNames.Admin, null).Should().BeFalse();
    }

    [Fact]
    public void UnknownTargetRole_ReturnsFalse()
    {
        RoleHierarchy.CanCreateRole(RoleNames.SuperAdmin, "GUEST")
            .Should().BeFalse("rol no whitelisted no debe ser asignable ni por SUPER_ADMIN");
    }

    [Theory]
    [InlineData("admin", "vendedor")]
    [InlineData("ADMIN", "VENDEDOR")]
    [InlineData("Admin", "Vendedor")]
    public void CaseInsensitive_Comparison(string callerRole, string targetRole)
    {
        RoleHierarchy.CanCreateRole(callerRole, targetRole)
            .Should().BeTrue("la comparación debe ser case-insensitive");
    }

    // ───── AssignableRoles helper ────────────────────────────────────────
    [Fact]
    public void AssignableRoles_SuperAdmin_ReturnsAll()
    {
        var roles = RoleHierarchy.AssignableRoles(RoleNames.SuperAdmin);
        roles.Should().Contain(new[]
        {
            RoleNames.SuperAdmin,
            RoleNames.Admin,
            RoleNames.Supervisor,
            RoleNames.Viewer,
            RoleNames.Vendedor,
        });
    }

    [Fact]
    public void AssignableRoles_Admin_ExcludesAdminAndSuperAdmin()
    {
        var roles = RoleHierarchy.AssignableRoles(RoleNames.Admin);
        roles.Should().NotContain(RoleNames.SuperAdmin);
        roles.Should().NotContain(RoleNames.Admin);
        roles.Should().Contain(RoleNames.Supervisor);
        roles.Should().Contain(RoleNames.Vendedor);
    }

    [Fact]
    public void AssignableRoles_Vendedor_ReturnsEmpty()
    {
        RoleHierarchy.AssignableRoles(RoleNames.Vendedor).Should().BeEmpty();
    }

    [Fact]
    public void AssignableRoles_Null_ReturnsEmpty()
    {
        RoleHierarchy.AssignableRoles(null).Should().BeEmpty();
    }
}
