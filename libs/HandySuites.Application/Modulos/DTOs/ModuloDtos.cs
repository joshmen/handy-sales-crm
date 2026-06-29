namespace HandySuites.Application.Modulos.DTOs;

/// <summary>
/// Fila de la matriz de feature flags por modulo, incluyendo la disponibilidad
/// por tier y la cantidad de overrides por tenant aplicados.
/// </summary>
public class ModuloMatrizDto
{
    public int Id { get; set; }
    public string Clave { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool DisponibleBasico { get; set; }
    public bool DisponiblePro { get; set; }
    public bool DisponibleEnterprise { get; set; }
    public int Orden { get; set; }
    public bool Activo { get; set; }
    public int OverridesCount { get; set; }
}

public class ModuloDto
{
    public int Id { get; set; }
    public string Clave { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool DisponibleBasico { get; set; }
    public bool DisponiblePro { get; set; }
    public bool DisponibleEnterprise { get; set; }
    public int Orden { get; set; }
    public bool Activo { get; set; }
    public List<ModuloOverrideDto> Overrides { get; set; } = new();
}

public record CrearModuloDto(
    string Clave,
    string Nombre,
    string? Descripcion,
    bool DisponibleBasico,
    bool DisponiblePro,
    bool DisponibleEnterprise,
    int Orden
);

public record ActualizarModuloDto(
    bool DisponibleBasico,
    bool DisponiblePro,
    bool DisponibleEnterprise,
    string Nombre,
    string? Descripcion
);

public class ModuloOverrideDto
{
    public int Id { get; set; }
    public int ModuloPlataformaId { get; set; }
    public int TenantId { get; set; }
    public bool Habilitado { get; set; }
    public string? Motivo { get; set; }
}

public record CrearOverrideDto(
    int ModuloPlataformaId,
    int TenantId,
    bool Habilitado,
    string? Motivo
);
