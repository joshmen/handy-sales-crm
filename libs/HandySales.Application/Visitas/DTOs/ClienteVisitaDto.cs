using HandySales.Domain.Entities;

namespace HandySales.Application.Visitas.DTOs;

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
}

public class ClienteVisitaListaDto
{
    public int Id { get; set; }
    public int ClienteId { get; set; }
    public required string ClienteNombre { get; set; }
    public string? ClienteDireccion { get; set; }
    public DateTime? FechaProgramada { get; set; }
    public DateTime? FechaHoraInicio { get; set; }
    public DateTime? FechaHoraFin { get; set; }
    public TipoVisita TipoVisita { get; set; }
    public string TipoVisitaNombre => TipoVisita.ToString();
    public ResultadoVisita Resultado { get; set; }
    public string ResultadoNombre => Resultado.ToString();
    public int? DuracionMinutos { get; set; }
    public bool TienePedido { get; set; }
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
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 20;
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
}
