namespace HandySales.Application.Auth.DTOs;

public record UsuarioDto(
    int Id,
    string Email,
    string Nombre,
    bool EsAdmin,
    int TenantId,
    DateTime CreadoEn,
    bool Activo
);

public record UsuarioCreateDto(
    string Email,
    string Password,
    string Nombre,
    bool EsAdmin,
    int TenantId
);

public record UsuarioUpdateDto(
    string Nombre,
    bool EsAdmin,
    bool Activo
);