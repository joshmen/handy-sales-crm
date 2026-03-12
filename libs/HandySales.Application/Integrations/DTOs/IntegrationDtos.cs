namespace HandySales.Application.Integrations.DTOs;

public record IntegrationCatalogDto(
    int Id,
    string Slug,
    string Nombre,
    string? Descripcion,
    string? Icono,
    string Categoria,
    string TipoPrecio,
    decimal PrecioMXN,
    string Estado,
    bool IsActivated, // Whether current tenant has it active
    DateTime? FechaActivacion
);

public record TenantIntegrationDto(
    int Id,
    int IntegrationId,
    string Slug,
    string Nombre,
    string? Icono,
    string Estado,
    DateTime FechaActivacion,
    string? Configuracion
);

public record ActivateIntegrationRequest(string? Configuracion);
