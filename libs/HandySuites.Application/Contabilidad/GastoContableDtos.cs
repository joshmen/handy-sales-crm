namespace HandySuites.Application.Contabilidad;

/// <summary>Payload de creacion de un gasto contable. Total se recalcula como Base + Iva.</summary>
public record GastoContableCreateDto(
    DateTime Fecha,
    string Categoria,
    string Descripcion,
    decimal Base,
    decimal Iva,
    string? ProveedorRfc,
    string? ProveedorNombre);

/// <summary>Payload de edicion de un gasto contable. Total se recalcula como Base + Iva.</summary>
public record GastoContableUpdateDto(
    DateTime Fecha,
    string Categoria,
    string Descripcion,
    decimal Base,
    decimal Iva,
    string? ProveedorRfc,
    string? ProveedorNombre);
