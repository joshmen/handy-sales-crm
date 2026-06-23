namespace HandySuites.Application.Usuarios.DTOs;

/// <summary>
/// KPIs por miembro para el drawer de perfil en Equipo.
/// Read-only, calculado on-the-fly (sin columnas nuevas / sin migración).
/// </summary>
public record UsuarioKpisDto(
    decimal VentasMes,
    int PedidosMes,
    string? RutaNombre,
    string? ZonaNombre,
    int ClientesAsignados
);
