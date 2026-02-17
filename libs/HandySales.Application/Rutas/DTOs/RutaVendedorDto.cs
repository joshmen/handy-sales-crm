using HandySales.Domain.Entities;

namespace HandySales.Application.Rutas.DTOs;

public class RutaVendedorDto
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public int? ZonaId { get; set; }
    public string? ZonaNombre { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public DateTime Fecha { get; set; }
    public TimeSpan? HoraInicioEstimada { get; set; }
    public TimeSpan? HoraFinEstimada { get; set; }
    public DateTime? HoraInicioReal { get; set; }
    public DateTime? HoraFinReal { get; set; }
    public EstadoRuta Estado { get; set; }
    public string EstadoNombre => Estado.ToString();
    public double? KilometrosEstimados { get; set; }
    public double? KilometrosReales { get; set; }
    public string? Notas { get; set; }
    public double? EfectivoInicial { get; set; }
    public string? ComentariosCarga { get; set; }
    public double? MontoRecibido { get; set; }
    public int TotalParadas { get; set; }
    public int ParadasCompletadas { get; set; }
    public int ParadasPendientes { get; set; }
    public List<RutaDetalleDto> Detalles { get; set; } = new();
    public DateTime CreadoEn { get; set; }
}

public class RutaDetalleDto
{
    public int Id { get; set; }
    public int RutaId { get; set; }
    public int ClienteId { get; set; }
    public string ClienteNombre { get; set; } = string.Empty;
    public string? ClienteDireccion { get; set; }
    public double? ClienteLatitud { get; set; }
    public double? ClienteLongitud { get; set; }
    public int OrdenVisita { get; set; }
    public TimeSpan? HoraEstimadaLlegada { get; set; }
    public int? DuracionEstimadaMinutos { get; set; }
    public DateTime? HoraLlegadaReal { get; set; }
    public DateTime? HoraSalidaReal { get; set; }
    public EstadoParada Estado { get; set; }
    public string EstadoNombre => Estado.ToString();
    public int? VisitaId { get; set; }
    public int? PedidoId { get; set; }
    public string? Notas { get; set; }
    public string? RazonOmision { get; set; }
    public double? DistanciaDesdeAnterior { get; set; }
}

public class RutaVendedorCreateDto
{
    public int UsuarioId { get; set; }
    public int? ZonaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public DateTime Fecha { get; set; }
    public TimeSpan? HoraInicioEstimada { get; set; }
    public TimeSpan? HoraFinEstimada { get; set; }
    public string? Notas { get; set; }
    public List<RutaDetalleCreateDto>? Detalles { get; set; }
}

public class RutaDetalleCreateDto
{
    public int ClienteId { get; set; }
    public int OrdenVisita { get; set; }
    public TimeSpan? HoraEstimadaLlegada { get; set; }
    public int? DuracionEstimadaMinutos { get; set; }
    public string? Notas { get; set; }
}

public class RutaVendedorUpdateDto
{
    public int? ZonaId { get; set; }
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
    public DateTime? Fecha { get; set; }
    public TimeSpan? HoraInicioEstimada { get; set; }
    public TimeSpan? HoraFinEstimada { get; set; }
    public string? Notas { get; set; }
}

public class RutaFiltroDto
{
    public int? UsuarioId { get; set; }
    public int? ZonaId { get; set; }
    public EstadoRuta? Estado { get; set; }
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public string? Busqueda { get; set; }
    public bool? MostrarInactivos { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 20;
}

public class RutaListaDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string UsuarioNombre { get; set; } = string.Empty;
    public string? ZonaNombre { get; set; }
    public DateTime Fecha { get; set; }
    public EstadoRuta Estado { get; set; }
    public string EstadoNombre => Estado.ToString();
    public int TotalParadas { get; set; }
    public int ParadasCompletadas { get; set; }
    public double? KilometrosEstimados { get; set; }
    public bool Activo { get; set; }
}

public record RutaCambiarActivoDto(bool Activo);
public record RutaBatchToggleRequest(List<int> Ids, bool Activo);

public class IniciarRutaDto
{
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
}

public class LlegarParadaDto
{
    public double Latitud { get; set; }
    public double Longitud { get; set; }
}

public class SalirParadaDto
{
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public int? VisitaId { get; set; }
    public int? PedidoId { get; set; }
    public string? Notas { get; set; }
}

public class OmitirParadaDto
{
    public string RazonOmision { get; set; } = string.Empty;
}

public class ReordenarParadasDto
{
    public List<int> OrdenDetalleIds { get; set; } = new();
}

// === DTOs para Carga de Inventario ===

public class RutaCargaDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string? ProductoSku { get; set; }
    public int CantidadEntrega { get; set; }
    public int CantidadVenta { get; set; }
    public int CantidadTotal { get; set; }
    public double PrecioUnitario { get; set; }
    public double MontoTotal => CantidadTotal * PrecioUnitario;
    public int? Disponible { get; set; }
}

public class AsignarProductoVentaRequest
{
    public int ProductoId { get; set; }
    public int Cantidad { get; set; }
    public double? PrecioUnitario { get; set; }
}

public class AsignarPedidoRequest
{
    public int PedidoId { get; set; }
}

public class ActualizarEfectivoRequest
{
    public double Monto { get; set; }
    public string? Comentarios { get; set; }
}

public class RutaPedidoAsignadoDto
{
    public int Id { get; set; }
    public int PedidoId { get; set; }
    public string ClienteNombre { get; set; } = string.Empty;
    public DateTime FechaPedido { get; set; }
    public double MontoTotal { get; set; }
    public int TotalProductos { get; set; }
    public int Estado { get; set; }
    public string EstadoNombre { get; set; } = string.Empty;
}

// === DTOs para Cierre de Ruta ===

public class CierreRutaResumenDto
{
    // Efectivo entrante
    public double VentasContado { get; set; }
    public int VentasContadoCount { get; set; }
    public double EntregasCobradas { get; set; }
    public int EntregasCobradasCount { get; set; }
    public double CobranzaAdeudos { get; set; }
    public int CobranzaAdeudosCount { get; set; }

    // Movimientos a saldo
    public double VentasCredito { get; set; }
    public int VentasCreditoCount { get; set; }
    public double EntregasCredito { get; set; }
    public int EntregasCreditoCount { get; set; }
    public double EntregasContadoSaldoFavor { get; set; }
    public int EntregasContadoSaldoFavorCount { get; set; }

    // Otros movimientos
    public double PedidosPreventa { get; set; }
    public int PedidosPreventaCount { get; set; }
    public double Devoluciones { get; set; }
    public int DevolucionesCount { get; set; }

    // Al inicio
    public double ValorRuta { get; set; }
    public double EfectivoInicial { get; set; }

    // Al cierre
    public double ARecibir { get; set; }
    public double? Recibido { get; set; }
    public double? Diferencia { get; set; }
}

public class RutaRetornoItemDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string? ProductoSku { get; set; }
    public double VentasMonto { get; set; }
    public int CantidadInicial { get; set; }
    public int Vendidos { get; set; }
    public int Entregados { get; set; }
    public int Devueltos { get; set; }
    public int Mermas { get; set; }
    public int RecAlmacen { get; set; }
    public int CargaVehiculo { get; set; }
    public int Diferencia { get; set; }
}

public class ActualizarRetornoRequest
{
    public int Mermas { get; set; }
    public int RecAlmacen { get; set; }
    public int CargaVehiculo { get; set; }
}

public class CerrarRutaRequest
{
    public double MontoRecibido { get; set; }
    public List<RetornoItemRequest>? Retornos { get; set; }
}

public class RetornoItemRequest
{
    public int ProductoId { get; set; }
    public int Mermas { get; set; }
    public int RecAlmacen { get; set; }
    public int CargaVehiculo { get; set; }
}
