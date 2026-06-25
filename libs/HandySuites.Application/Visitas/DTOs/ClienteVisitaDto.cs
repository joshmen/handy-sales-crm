using HandySuites.Domain.Entities;

namespace HandySuites.Application.Visitas.DTOs;

public class ClienteVisitaDto
{
    public int Id { get; set; }
    public int ClienteId { get; set; }
    public required string ClienteNombre { get; set; }
    public string? ClienteDireccion { get; set; }
    public int UsuarioId { get; set; }
    public required string UsuarioNombre { get; set; }
    public int? PedidoId { get; set; }
    public string? NumeroPedido { get; set; }
    public DateTime? FechaProgramada { get; set; }
    public DateTime? FechaHoraInicio { get; set; }
    public DateTime? FechaHoraFin { get; set; }
    public TipoVisita TipoVisita { get; set; }
    public string TipoVisitaNombre => TipoVisita.ToString();
    public ResultadoVisita Resultado { get; set; }
    public string ResultadoNombre => Resultado.ToString();
    public double? LatitudInicio { get; set; }
    public double? LongitudInicio { get; set; }
    public double? LatitudFin { get; set; }
    public double? LongitudFin { get; set; }
    public double? DistanciaCliente { get; set; }
    public string? Notas { get; set; }
    public string? NotasPrivadas { get; set; }
    public List<string>? Fotos { get; set; }
    public int? DuracionMinutos { get; set; }
    public DateTime CreadoEn { get; set; }
    /// <summary>True si la visita fue planeada (tiene FechaProgramada); false si fue ad-hoc/en campo.</summary>
    public bool EsProgramada => FechaProgramada.HasValue;
}

public class ClienteVisitaListaDto
{
    public int Id { get; set; }
    public int ClienteId { get; set; }
    public required string ClienteNombre { get; set; }
    public string? ClienteDireccion { get; set; }
    public string? VendedorNombre { get; set; }
    public DateTime? FechaProgramada { get; set; }
    public DateTime? FechaHoraInicio { get; set; }
    public DateTime? FechaHoraFin { get; set; }
    public TipoVisita TipoVisita { get; set; }
    public string TipoVisitaNombre => TipoVisita.ToString();
    public ResultadoVisita Resultado { get; set; }
    public string ResultadoNombre => Resultado.ToString();
    public int? DuracionMinutos { get; set; }
    public bool TienePedido { get; set; }
    /// <summary>Distancia (m) entre el check-in y la ubicación del cliente; null si no hubo check-in con GPS.</summary>
    public double? DistanciaCliente { get; set; }
    /// <summary>Total del pedido vinculado a la visita; null si la visita no generó pedido.</summary>
    public decimal? Monto { get; set; }
    /// <summary>True si la visita fue planeada (tiene FechaProgramada); false si fue ad-hoc/en campo.</summary>
    public bool EsProgramada => FechaProgramada.HasValue;
}

public class ClienteVisitaCreateDto
{
    public int ClienteId { get; set; }
    public DateTime? FechaProgramada { get; set; }
    public TipoVisita TipoVisita { get; set; } = TipoVisita.Rutina;
    public string? Notas { get; set; }
}

public class CheckInDto
{
    public double Latitud { get; set; }
    public double Longitud { get; set; }
    public string? Notas { get; set; }
}

public class CheckOutDto
{
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public ResultadoVisita Resultado { get; set; }
    public string? Notas { get; set; }
    public string? NotasPrivadas { get; set; }
    public List<string>? Fotos { get; set; }
    public int? PedidoId { get; set; }
}

public class ClienteVisitaFiltroDto
{
    public int? ClienteId { get; set; }
    public int? UsuarioId { get; set; }
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public TipoVisita? TipoVisita { get; set; }
    public ResultadoVisita? Resultado { get; set; }
    public bool? SoloPendientes { get; set; }
    public int? Pagina { get; set; }
    public int? TamanoPagina { get; set; }
}

/// <summary>
/// Estado de cobertura de un cliente respecto a la frecuencia de visita pactada
/// por su zona. "Vencida" si nunca se le visitó o si pasó más tiempo que el
/// permitido por la frecuencia; "PorVisitar" en caso contrario.
/// </summary>
public class CoberturaClienteDto
{
    public int ClienteId { get; set; }
    public required string ClienteNombre { get; set; }
    public string? ZonaNombre { get; set; }
    public string? VendedorNombre { get; set; }
    public DateTime? UltimaVisita { get; set; }
    public int Frecuencia { get; set; }
    public required string FrecuenciaNombre { get; set; }
    public int? DiasDesdeUltima { get; set; }
    public int DiasVencido { get; set; }
    public required string Estado { get; set; }
}

public class VisitaResumenDiarioDto
{
    public DateTime Fecha { get; set; }
    public int TotalVisitas { get; set; }
    public int VisitasCompletadas { get; set; }
    public int VisitasConVenta { get; set; }
    public int VisitasPendientes { get; set; }
    public int VisitasCanceladas { get; set; }
    public decimal TasaConversion { get; set; }
    /// <summary>Visitas planeadas (con FechaProgramada) del día.</summary>
    public int VisitasProgramadas { get; set; }
    /// <summary>Visitas ad-hoc (sin FechaProgramada, registradas en campo) del día.</summary>
    public int VisitasAdHoc { get; set; }
    /// <summary>Visitas planeadas completadas (con check-out) del día.</summary>
    public int VisitasCompletadasProgramadas { get; set; }
    /// <summary>Visitas ad-hoc completadas (con check-out) del día.</summary>
    public int VisitasCompletadasAdHoc { get; set; }
}
