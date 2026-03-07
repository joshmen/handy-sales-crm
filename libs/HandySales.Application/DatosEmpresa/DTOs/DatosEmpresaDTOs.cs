namespace HandySales.Application.DatosEmpresa.DTOs;

public record DatosEmpresaDto(
    int Id,
    int TenantId,
    string? RazonSocial,
    string? IdentificadorFiscal,
    string? TipoIdentificadorFiscal,
    string? Telefono,
    string? Email,
    string? Contacto,
    string? Direccion,
    string? Ciudad,
    string? Estado,
    string? CodigoPostal,
    string? SitioWeb,
    string? Descripcion);

public record DatosEmpresaUpdateDto(
    string? RazonSocial,
    string? IdentificadorFiscal,
    string? TipoIdentificadorFiscal,
    string? Telefono,
    string? Email,
    string? Contacto,
    string? Direccion,
    string? Ciudad,
    string? Estado,
    string? CodigoPostal,
    string? SitioWeb,
    string? Descripcion);
