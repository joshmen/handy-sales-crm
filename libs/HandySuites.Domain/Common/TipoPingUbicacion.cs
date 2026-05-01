using System.Text.Json.Serialization;

namespace HandySuites.Domain.Common;

/// <summary>
/// Tipo de evento que generó un ping GPS del vendedor.
/// - Venta/Cobro/Visita: ping disparado por una acción del vendedor.
/// - InicioRuta/FinRuta: ping al iniciar/completar una RutaVendedor (preventa con paradas).
/// - InicioJornada/FinJornada: ping al iniciar/finalizar la jornada manualmente
///   desde el botón en home (cuando NO hay ruta asignada o el vendedor decidió
///   marcar inicio/fin antes/después de la ruta).
/// - StopAutomatico: ping cuando el watcher de horario laboral cierra la jornada
///   automáticamente al salir del rango configurado en CompanySetting.
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
    InicioJornada = 6,
    FinJornada = 7,
    StopAutomatico = 8,
}
