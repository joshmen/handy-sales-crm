using HandySuites.Domain.Entities;

namespace HandySuites.Application.Rutas.DTOs;

public class RutaVendedorDto
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    /// <summary>Legacy: primera zona de la ruta. Mantenido para compat con apps mobile viejas. El frontend nuevo usa <see cref="Zonas"/>.</summary>
    public int? ZonaId { get; set; }
    /// <summary>Legacy: nombre de la primera zona.</summary>
    public string? ZonaNombre { get; set; }
    /// <summary>Multi-zona: lista completa de zonas que cubre la ruta. Source of truth nuevo.</summary>
    public List<ZonaResumenDto> Zonas { get; set; } = new();
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

/// <summary>Resumen ligero de zona para usar en DTOs de ruta (multi-zona).</summary>
public class ZonaResumenDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
}

public class RutaVendedorCreateDto
{
    public int UsuarioId { get; set; }
    /// <summary>Legacy: si solo se manda zonaId (sin zonaIds), el service lo convierte a [zonaId]. Apps frontend nuevas deben usar ZonaIds.</summary>
    public int? ZonaId { get; set; }
    /// <summary>Multi-zona: lista de zonas que cubre la ruta. Si está null y ZonaId tiene valor, se usa [ZonaId].</summary>
    public List<int>? ZonaIds { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public DateTime Fecha { get; set; }
    public TimeSpan? HoraInicioEstimada { get; set; }
    public TimeSpan? HoraFinEstimada { get; set; }
    public string? Notas { get; set; }
    public bool EsTemplate { get; set; }
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
    public int? UsuarioId { get; set; }
    /// <summary>Legacy single-zone, ver RutaVendedorCreateDto.</summary>
    public int? ZonaId { get; set; }
    /// <summary>Multi-zona: si se manda, reemplaza completamente el set de zonas de la ruta.</summary>
    public List<int>? ZonaIds { get; set; }
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
    public int? Pagina { get; set; }
    public int? TamanoPagina { get; set; }
}

public class RutaListaDto
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string UsuarioNombre { get; set; } = string.Empty;
    /// <summary>Legacy: primera zona. Listas que muestran todas usan <see cref="Zonas"/>.</summary>
    public string? ZonaNombre { get; set; }
    /// <summary>Multi-zona: lista de zonas para mostrar como chips en la lista.</summary>
    public List<ZonaResumenDto> Zonas { get; set; } = new();
    public DateTime Fecha { get; set; }
    public EstadoRuta Estado { get; set; }
    public string EstadoNombre => Estado.ToString();
    public int TotalParadas { get; set; }
    public int ParadasCompletadas { get; set; }
    public double? KilometrosEstimados { get; set; }
    public TimeSpan? HoraInicioEstimada { get; set; }
    public TimeSpan? HoraFinEstimada { get; set; }
    public bool Activo { get; set; }
    public bool EsTemplate { get; set; }
}

public record RutaCambiarActivoDto(bool Activo);
public record RutaBatchToggleRequest(List<int> Ids, bool Activo);

// === DTOs para Templates de Rutas ===

public class RutaTemplateListaDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? ZonaNombre { get; set; }
    public int? ZonaId { get; set; }
    public int TotalParadas { get; set; }
    public double? KilometrosEstimados { get; set; }
    public bool Activo { get; set; }
    public DateTime CreadoEn { get; set; }
}

public class InstanciarTemplateDto
{
    public int UsuarioId { get; set; }
    public DateTime Fecha { get; set; }
    public TimeSpan? HoraInicioEstimada { get; set; }
    public TimeSpan? HoraFinEstimada { get; set; }
}

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
    /// <summary>Unidades vendidas durante la jornada (venta directa con ruta
    /// activa). Se incrementa en tiempo real. Mobile lo usa para mostrar
    /// progreso "X disponibles / Y cargados" sin esperar al cierre manual.</summary>
    public int CantidadVendida { get; set; }
    /// <summary>Unidades entregadas (de pedidos pre-asignados marcados como
    /// Entregado). Mobile lo usa para mostrar progreso de carga.</summary>
    public int CantidadEntregada { get; set; }
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

public class AsignarPedidosBatchRequest
{
    public List<int> PedidoIds { get; set; } = new();
}

public class AsignarPedidosBatchResultDto
{
    public List<int> Asignados { get; set; } = new();
    public List<AsignarPedidoFalloDto> Fallidos { get; set; } = new();
    public int TotalAsignados => Asignados.Count;
    public int TotalFallidos => Fallidos.Count;
}

public class AsignarPedidoFalloDto
{
    public int PedidoId { get; set; }
    public string Motivo { get; set; } = string.Empty;
}

public class RemoverPedidosBatchRequest
{
    public List<int> PedidoIds { get; set; } = new();
}

public class RemoverPedidosBatchResultDto
{
    public List<int> Removidos { get; set; } = new();
    public List<AsignarPedidoFalloDto> Fallidos { get; set; } = new();
    public int TotalRemovidos => Removidos.Count;
    public int TotalFallidos => Fallidos.Count;
}

public class AgregarParadasBatchRequest
{
    public List<int> ClienteIds { get; set; } = new();
    public int? DuracionEstimadaMinutos { get; set; }
}

public class AgregarParadaFalloDto
{
    public int ClienteId { get; set; }
    public string Motivo { get; set; } = string.Empty;
}

public class AgregarParadasBatchResultDto
{
    public List<int> Agregadas { get; set; } = new(); // IDs de RutaDetalle creadas
    public List<AgregarParadaFalloDto> Fallidas { get; set; } = new();
    public int TotalAgregadas => Agregadas.Count;
    public int TotalFallidas => Fallidas.Count;
}

public class RemoverParadasBatchRequest
{
    public List<int> DetalleIds { get; set; } = new();
}

public class RemoverParadaFalloDto
{
    public int DetalleId { get; set; }
    public string Motivo { get; set; } = string.Empty;
}

public class RemoverParadasBatchResultDto
{
    public List<int> Removidas { get; set; } = new();
    public List<RemoverParadaFalloDto> Fallidas { get; set; } = new();
    public int TotalRemovidas => Removidas.Count;
    public int TotalFallidas => Fallidas.Count;
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
