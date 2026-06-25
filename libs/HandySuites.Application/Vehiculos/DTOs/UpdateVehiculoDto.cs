using HandySuites.Domain.Entities;

namespace HandySuites.Application.Vehiculos.DTOs;

public class UpdateVehiculoDto
{
    public int Id { get; set; }
    public string Placa { get; set; } = string.Empty;
    public TipoVehiculo Tipo { get; set; }
    public int CapacidadUnidades { get; set; }
    public int? VendedorId { get; set; }
    public int? Kilometraje { get; set; }
    public EstadoVehiculo Estado { get; set; }
    public bool Activo { get; set; }
}
