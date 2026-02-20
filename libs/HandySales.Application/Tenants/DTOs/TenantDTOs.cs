namespace HandySales.Application.Tenants.DTOs;

public record TenantListDto(
    int Id,
    string NombreEmpresa,
    string? RFC,
    bool Activo,
    string? PlanTipo,
    int UsuarioCount,
    DateTime? FechaExpiracion,
    bool SuscripcionActiva
);

public record TenantDetailDto(
    int Id,
    string NombreEmpresa,
    string? RFC,
    string? Contacto,
    string? Telefono,
    string? Email,
    string? Direccion,
    string? LogoUrl,
    string? CloudinaryFolder,
    bool Activo,
    string? PlanTipo,
    int MaxUsuarios,
    DateTime? FechaSuscripcion,
    DateTime? FechaExpiracion,
    bool SuscripcionActiva,
    DateTime CreadoEn,
    TenantStatsDto Stats
);

public record TenantStatsDto(
    int Usuarios,
    int Clientes,
    int Productos,
    int Pedidos
);

public record TenantCreateDto(
    string NombreEmpresa,
    string? RFC,
    string? Contacto,
    string? Telefono,
    string? Email,
    string? Direccion,
    string? PlanTipo,
    int MaxUsuarios,
    DateTime? FechaSuscripcion,
    DateTime? FechaExpiracion
);

public record TenantUpdateDto(
    string NombreEmpresa,
    string? RFC,
    string? Contacto,
    string? Telefono,
    string? Email,
    string? Direccion,
    string? LogoUrl,
    string? PlanTipo,
    int MaxUsuarios,
    DateTime? FechaSuscripcion,
    DateTime? FechaExpiracion
);

public record TenantCambiarActivoDto(bool Activo);

public record TenantBatchToggleRequest(List<int> Ids, bool Activo);

public record SystemMetricsDto(
    int TotalTenants,
    int ActiveTenants,
    int TotalUsuarios,
    int TotalClientes,
    int TotalProductos,
    int TotalPedidos,
    decimal TotalVentas,
    List<TenantListDto> TenantsRecientes,
    List<TopTenantDto> TopTenants
);

public record TopTenantDto(
    int Id,
    string NombreEmpresa,
    int Pedidos,
    decimal Ventas
);

public record TenantUserDto(
    int Id,
    string Nombre,
    string Email,
    string Rol,
    bool Activo
);

public record TenantCreateUserDto(
    string Nombre,
    string Email,
    string Password,
    string Rol
);
