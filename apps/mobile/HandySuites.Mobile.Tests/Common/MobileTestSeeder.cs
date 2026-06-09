using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;

namespace HandySuites.Mobile.Tests.Common;

/// <summary>
/// Seeder minimo para MobileWebApplicationFactory. Crea fixtures
/// deterministicas para tenant 1 + 2 + roles (ADMIN, SUPERVISOR, VENDEDOR1, VENDEDOR2, VIEWER)
/// + supervisores con vendedores asignados (jerarquia para SA branch tests).
/// </summary>
public static class MobileTestSeeder
{
    public const int TenantA = 1;
    public const int TenantB = 2;

    public const int SuperAdminUserId = 100;
    public const int AdminUserId = 101;
    public const int SupervisorAUserId = 200;
    public const int SupervisorBUserId = 250;
    public const int Vendedor1Id = 300;
    public const int Vendedor2Id = 301;
    public const int Vendedor3Id = 302;
    public const int VendedorOtroTenantId = 400;
    public const int ViewerUserId = 201;

    public const int ClienteAId = 1000;
    public const int ClienteBId = 1001;
    public const int ProductoAId = 2000;
    public const int PedidoConfirmadoId = 5000;
    public const int PedidoEntregadoId = 5001;
    public const int PedidoOtroTenantId = 5002;

    public static void Seed(HandySuitesDbContext db)
    {
        db.Tenants.AddRange(
            new Tenant { Id = TenantA, NombreEmpresa = "Tenant A (mobile tests)" },
            new Tenant { Id = TenantB, NombreEmpresa = "Tenant B (mobile cross-tenant)" }
        );

        var hash = BCrypt.Net.BCrypt.HashPassword("Test123!");

        db.Usuarios.AddRange(
            new Usuario { Id = SuperAdminUserId, TenantId = TenantA, Nombre = "Super Admin", Email = "sa@test.com", PasswordHash = hash, RolExplicito = RoleNames.SuperAdmin, Activo = true, EmailVerificado = true },
            new Usuario { Id = AdminUserId, TenantId = TenantA, Nombre = "Tenant Admin", Email = "admin@test.com", PasswordHash = hash, RolExplicito = RoleNames.Admin, Activo = true, EmailVerificado = true },
            new Usuario { Id = SupervisorAUserId, TenantId = TenantA, Nombre = "Supervisor A", Email = "supA@test.com", PasswordHash = hash, RolExplicito = RoleNames.Supervisor, Activo = true, EmailVerificado = true },
            new Usuario { Id = SupervisorBUserId, TenantId = TenantA, Nombre = "Supervisor B", Email = "supB@test.com", PasswordHash = hash, RolExplicito = RoleNames.Supervisor, Activo = true, EmailVerificado = true },
            new Usuario { Id = Vendedor1Id, TenantId = TenantA, Nombre = "Vendedor 1 (sub A)", Email = "v1@test.com", PasswordHash = hash, RolExplicito = RoleNames.Vendedor, Activo = true, EmailVerificado = true, SupervisorId = SupervisorAUserId },
            new Usuario { Id = Vendedor2Id, TenantId = TenantA, Nombre = "Vendedor 2 (sub A)", Email = "v2@test.com", PasswordHash = hash, RolExplicito = RoleNames.Vendedor, Activo = true, EmailVerificado = true, SupervisorId = SupervisorAUserId },
            new Usuario { Id = Vendedor3Id, TenantId = TenantA, Nombre = "Vendedor 3 (sub B)", Email = "v3@test.com", PasswordHash = hash, RolExplicito = RoleNames.Vendedor, Activo = true, EmailVerificado = true, SupervisorId = SupervisorBUserId },
            new Usuario { Id = ViewerUserId, TenantId = TenantA, Nombre = "Viewer", Email = "viewer@test.com", PasswordHash = hash, RolExplicito = RoleNames.Viewer, Activo = true, EmailVerificado = true },
            new Usuario { Id = VendedorOtroTenantId, TenantId = TenantB, Nombre = "Vendedor Tenant B", Email = "vb@test.com", PasswordHash = hash, RolExplicito = RoleNames.Vendedor, Activo = true, EmailVerificado = true }
        );

        // CompanySettings minimas — el TZ resolver y otros endpoints lo necesitan
        db.CompanySettings.AddRange(
            new CompanySetting { Id = 1, TenantId = TenantA, Timezone = "America/Mexico_City" },
            new CompanySetting { Id = 2, TenantId = TenantB, Timezone = "America/Mexico_City" }
        );

        // Cliente con required members satisfied
        db.Clientes.AddRange(
            new Cliente { Id = ClienteAId, TenantId = TenantA, Nombre = "Cliente A", RFC = "XAXX010101000", Correo = "ca@test.com", Telefono = "5551234567", Direccion = "Calle 123", VendedorId = Vendedor1Id },
            new Cliente { Id = ClienteBId, TenantId = TenantB, Nombre = "Cliente B", RFC = "XAXX010101000", Correo = "cb@test.com", Telefono = "5559876543", Direccion = "Calle 456" }
        );

        // SubscriptionPlan + Tenant.SubscriptionPlanId (necesario para feature guard)
        db.SubscriptionPlans.Add(new SubscriptionPlan
        {
            Id = 1, Codigo = "PRO", Nombre = "Plan Profesional",
            PrecioMensual = 499m, PrecioAnual = 4990m,
            MaxUsuarios = 10, MaxProductos = 500, IncluyeTrackingVendedor = true,
            Activo = true, Orden = 1
        });

        db.SaveChanges();
    }
}
