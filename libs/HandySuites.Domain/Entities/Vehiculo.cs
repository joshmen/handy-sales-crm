using HandySuites.Domain.Common;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

/// <summary>
/// Tipo de carrocería del vehículo de reparto. Persistido como int.
/// </summary>
public enum TipoVehiculo
{
    Seca = 0,
    Refrigerada = 1
}

/// <summary>
/// Estado operativo del vehículo de la flota. Persistido como int.
/// </summary>
public enum EstadoVehiculo
{
    Disponible = 0,
    EnRuta = 1,
    Mantenimiento = 2,
    Baja = 3
}

[Table("Vehiculos")]
public class Vehiculo : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    /// <summary>Placa del vehículo. Única por tenant (índice filtrado en DbContext).</summary>
    [Column("placa")]
    public string Placa { get; set; } = string.Empty;

    [Column("tipo")]
    public TipoVehiculo Tipo { get; set; } = TipoVehiculo.Seca;

    /// <summary>Capacidad en unidades/cajas que puede transportar.</summary>
    [Column("capacidad_unidades")]
    public int CapacidadUnidades { get; set; }

    /// <summary>
    /// Vendedor (Usuario) asignado como conductor. Opcional: el vehículo puede quedar
    /// sin asignar. FK SET NULL al borrar el usuario.
    /// </summary>
    [Column("vendedor_id")]
    public int? VendedorId { get; set; }

    /// <summary>Odómetro / kilometraje actual del vehículo.</summary>
    [Column("kilometraje")]
    public int? Kilometraje { get; set; }

    [Column("estado")]
    public EstadoVehiculo Estado { get; set; } = EstadoVehiculo.Disponible;

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Usuario? Vendedor { get; set; }
}
