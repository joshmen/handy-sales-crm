using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;

public static class HandySalesTestSeeder
{
    public static void SeedTestData(HandySalesDbContext db)
    {
        // Asegura base limpia en SQLite in-memory
        db.Database.EnsureDeleted();
        db.Database.EnsureCreated();

        // Tenant 1 - Principal
        db.Tenants.Add(new Tenant
        {
            Id = 1,
            NombreEmpresa = "Tenant Test"
        });

        // Tenant 2 - Para pruebas de aislamiento multi-tenant
        db.Tenants.Add(new Tenant
        {
            Id = 2,
            NombreEmpresa = "Tenant Secundario"
        });

        db.FamiliasProductos.Add(new FamiliaProducto { Id = 1, Nombre = "Familia Test", TenantId = 1 });
        db.CategoriasProductos.Add(new CategoriaProducto { Id = 1, Nombre = "Categoria Test", TenantId = 1 });
        db.UnidadesMedida.Add(new UnidadMedida { Id = 1, Nombre = "Unidad", Abreviatura = "u", TenantId = 1 });
        db.CategoriasClientes.Add(new CategoriaCliente { Id = 1, Nombre = "Categoria Demo", TenantId = 1 });
        db.Zonas.Add(new Zona { Id = 1, Nombre = "Zona Demo", TenantId = 1 });
        db.ListasPrecios.Add(new ListaPrecio { Id = 1, Descripcion = "Lista Precio Test", Nombre = "Lista Precio Test", TenantId = 1 });

        db.Clientes.Add(new Cliente { Id = 1, Nombre = "Cliente Test", TenantId = 1, CategoriaClienteId = 1, Correo = "cliente@abc.com", Direccion = "Direccion #123", IdZona = 1, RFC = "MISL010581JHY", Telefono = "123123121" });
        db.Productos.Add(new Producto { Id = 1, CategoraId = 1, CodigoBarra = "AVB2131AS", Descripcion = "Producto Test", FamiliaId = 1, Nombre = "Producto Test", PrecioBase = 12, TenantId = 1, UnidadMedidaId = 1 });

        // Additional tenants for ActivityTracking tests (need isolated IDs to avoid FK violations)
        db.Tenants.Add(new Tenant { Id = 9001, NombreEmpresa = "Tenant ActivityTracking 9001" });
        db.Tenants.Add(new Tenant { Id = 9010, NombreEmpresa = "Tenant ActivityTracking 9010" });
        db.Tenants.Add(new Tenant { Id = 9020, NombreEmpresa = "Tenant ActivityTracking 9020" });

        // Usuarios para tenant 1 - IDs 1, 123, 124
        // Roles
        db.Roles.Add(new Role { Id = 1, Nombre = "Admin", Descripcion = "Administrador" });
        db.Roles.Add(new Role { Id = 2, Nombre = "Vendedor", Descripcion = "Vendedor" });
        db.SaveChanges();

        // Usuarios para tenant 1 - IDs 1, 123, 124
        // EmailVerificado=true so login works in tests
        db.Usuarios.Add(new Usuario { Id = 1, Email = "test@user.com", Nombre = "Pedro Picapiedra", EsAdmin = true, RoleId = 1, PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"), Activo = true, CreadoEn = DateTime.Now, TenantId = 1, EmailVerificado = true });
        db.Usuarios.Add(new Usuario { Id = 123, Email = "user123@test.com", Nombre = "Usuario 123", EsAdmin = false, RoleId = 2, PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"), Activo = true, CreadoEn = DateTime.Now, TenantId = 1, EmailVerificado = true });
        db.Usuarios.Add(new Usuario { Id = 124, Email = "user124@test.com", Nombre = "Usuario 124", EsAdmin = false, RoleId = 2, PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"), Activo = true, CreadoEn = DateTime.Now, TenantId = 1, EmailVerificado = true });
        db.Usuarios.Add(new Usuario { Id = 125, Email = "user125@test.com", Nombre = "Usuario 125", EsAdmin = false, RoleId = 2, PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"), Activo = true, CreadoEn = DateTime.Now, TenantId = 2, EmailVerificado = true });

        // Users for ActivityTracking isolated tenants
        db.Usuarios.Add(new Usuario { Id = 9001, Email = "user9001@test.com", Nombre = "Usuario 9001", EsAdmin = false, RoleId = 2, PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"), Activo = true, CreadoEn = DateTime.Now, TenantId = 9001, EmailVerificado = true });
        db.Usuarios.Add(new Usuario { Id = 9002, Email = "user9002@test.com", Nombre = "Usuario 9002", EsAdmin = false, RoleId = 2, PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"), Activo = true, CreadoEn = DateTime.Now, TenantId = 9001, EmailVerificado = true });
        db.Usuarios.Add(new Usuario { Id = 9010, Email = "user9010@test.com", Nombre = "Usuario 9010", EsAdmin = false, RoleId = 2, PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"), Activo = true, CreadoEn = DateTime.Now, TenantId = 9010, EmailVerificado = true });
        db.Usuarios.Add(new Usuario { Id = 9020, Email = "user9020@test.com", Nombre = "Usuario 9020", EsAdmin = false, RoleId = 2, PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"), Activo = true, CreadoEn = DateTime.Now, TenantId = 9020, EmailVerificado = true });

        // GlobalSettings (needed for maintenance mode tests)
        db.GlobalSettings.Add(new GlobalSettings
        {
            Id = 1,
            PlatformName = "Handy Suites Test",
            MaintenanceMode = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        db.SaveChanges();
    }

}
