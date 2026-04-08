using HandySuites.Application.DatosEmpresa.DTOs;

namespace HandySuites.Application.Tenants.DTOs;

public record TenantListDto(
    int Id,
    string NombreEmpresa,
    string? IdentificadorFiscal,
    bool Activo,
    string? PlanTipo,
    int UsuarioCount,
    DateTime? FechaExpiracion,
    bool SuscripcionActiva
);

public record TenantDetailDto(
    int Id,
    string NombreEmpresa,
    string? CloudinaryFolder,
    bool Activo,
    string? PlanTipo,
    int MaxUsuarios,
    DateTime? FechaSuscripcion,
    DateTime? FechaExpiracion,
    bool SuscripcionActiva,
    DateTime CreadoEn,
    TenantStatsDto Stats,
    DatosEmpresaDto? DatosEmpresa
);

public record TenantStatsDto(
    int Usuarios,
    int Clientes,
    int Productos,
    int Pedidos
);

public record TenantCreateDto(
    string NombreEmpresa,
    string? PlanTipo,
    int MaxUsuarios,
    DateTime? FechaSuscripcion,
    DateTime? FechaExpiracion,
    // Datos de empresa opcionales para crear junto al tenant
    string? IdentificadorFiscal,
    string? TipoIdentificadorFiscal,
    string? Contacto,
    string? Telefono,
    string? Email,
    string? Direccion
);

public record TenantUpdateDto(
    string NombreEmpresa,
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

// --- SuperAdmin: Global User Management ---

public record GlobalUserDto(
    int Id,
    string Nombre,
    string Email,
    string Rol,
    bool Activo,
    int TenantId,
    string TenantNombre,
    DateTime CreadoEn
);

// --- SuperAdmin: System Trends ---

public record SystemTrendsDto(
    List<DailyMetricDto> TenantGrowth,
    List<DailyMetricDto> RevenueByDay,
    List<DailyMetricDto> UserGrowth,
    List<PlanDistributionDto> PlanBreakdown
);

public record DailyMetricDto(string Date, decimal Value);

public record PlanDistributionDto(string Plan, int Count, decimal Percentage);
