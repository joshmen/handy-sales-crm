using System.Text.Json.Serialization;

namespace HandySuites.Domain.Common;

/// <summary>
/// Tipo de evento que generó un ping GPS del vendedor.
/// - Venta/Cobro/Visita: ping disparado por una acción del vendedor.
/// - InicioRuta/FinRuta: ping al inicio/fin de la jornada.
/// - Checkpoint: ping automático cada 15min cuando no hubo otra acción
///   reciente (heartbeat para saber dónde anda el vendedor).
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TipoPingUbicacion
{
    Venta = 0,
    Cobro = 1,
    Visita = 2,
    InicioRuta = 3,
    FinRuta = 4,
    Checkpoint = 5,
}
