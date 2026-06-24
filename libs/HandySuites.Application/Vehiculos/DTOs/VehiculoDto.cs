using HandySuites.Domain.Entities;

namespace HandySuites.Application.Vehiculos.DTOs;

public class VehiculoDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Placa { get; set; } = string.Empty;
    public TipoVehiculo Tipo { get; set; }
    public string TipoNombre => Tipo.ToString();
    public int CapacidadUnidades { get; set; }
    public int? VendedorId { get; set; }
    public string? VendedorNombre { get; set; }
    public int? Kilometraje { get; set; }
    public EstadoVehiculo Estado { get; set; }
    public string EstadoNombre => Estado.ToString();
    public bool Activo { get; set; }
}
