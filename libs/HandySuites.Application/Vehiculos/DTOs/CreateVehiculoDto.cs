using HandySuites.Domain.Entities;

namespace HandySuites.Application.Vehiculos.DTOs;

public class CreateVehiculoDto
{
    public string Placa { get; set; } = string.Empty;
    public TipoVehiculo Tipo { get; set; } = TipoVehiculo.Seca;
    public int CapacidadUnidades { get; set; }
    public int? VendedorId { get; set; }
    public int? Kilometraje { get; set; }
    public EstadoVehiculo Estado { get; set; } = EstadoVehiculo.Disponible;
}
