using HandySales.Application.Rutas.DTOs;
using HandySales.Domain.Entities;

namespace HandySales.Application.Rutas.Interfaces;

public interface IRutaVendedorRepository
{
    // CRUD básico
    Task<int> CrearAsync(RutaVendedor ruta);
    Task<RutaVendedorDto?> ObtenerPorIdAsync(int id);
    Task<bool> ActualizarAsync(RutaVendedor ruta);
    Task<bool> EliminarAsync(int id);

    // Consultas
    Task<(List<RutaListaDto> Items, int TotalCount)> ObtenerPorFiltroAsync(int tenantId, RutaFiltroDto filtro);
    Task<List<RutaVendedorDto>> ObtenerPorUsuarioAsync(int tenantId, int usuarioId);
    Task<RutaVendedorDto?> ObtenerRutaDelDiaAsync(int tenantId, int usuarioId, DateTime? fecha = null);
    Task<List<RutaVendedorDto>> ObtenerRutasPendientesAsync(int tenantId, int usuarioId);

    // Gestión de estado
    Task<bool> IniciarRutaAsync(int id, DateTime horaInicio);
    Task<bool> CompletarRutaAsync(int id, DateTime horaFin, double? kilometrosReales);
    Task<bool> CancelarRutaAsync(int id, string? motivo);

    // Gestión de detalles
    Task<int> AgregarDetalleAsync(RutaDetalle detalle);
    Task<bool> ActualizarDetalleAsync(RutaDetalle detalle);
    Task<bool> EliminarDetalleAsync(int detalleId);
    Task<RutaDetalle?> ObtenerDetalleAsync(int detalleId);
    Task<bool> ReordenarDetallesAsync(int rutaId, List<int> ordenDetalleIds);

    // Gestión de paradas
    Task<bool> LlegarAParadaAsync(int detalleId, DateTime horaLlegada, double latitud, double longitud);
    Task<bool> SalirDeParadaAsync(int detalleId, DateTime horaSalida, int? visitaId, int? pedidoId, string? notas);
    Task<bool> OmitirParadaAsync(int detalleId, string razonOmision);
    Task<RutaDetalleDto?> ObtenerParadaActualAsync(int rutaId);
    Task<RutaDetalleDto?> ObtenerSiguienteParadaAsync(int rutaId);

    // Toggle activo
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);

    // Entidad raw para operaciones
    Task<RutaVendedor?> ObtenerEntidadAsync(int id);

    // === Carga de inventario ===
    Task<List<RutaCargaDto>> ObtenerCargaAsync(int rutaId, int tenantId);
    Task AsignarProductoVentaAsync(int rutaId, int productoId, int cantidad, double precio, int tenantId);
    Task RemoverProductoCargaAsync(int rutaId, int productoId, int tenantId);
    Task<List<RutaPedidoAsignadoDto>> ObtenerPedidosAsignadosAsync(int rutaId, int tenantId);
    Task AsignarPedidoAsync(int rutaId, int pedidoId, int tenantId);
    Task RemoverPedidoAsync(int rutaId, int pedidoId, int tenantId);
    Task ActualizarEfectivoInicialAsync(int rutaId, double monto, string? comentarios, int tenantId);
    Task EnviarACargaAsync(int rutaId, int tenantId);

    // === Cierre de ruta ===
    Task<CierreRutaResumenDto> ObtenerResumenCierreAsync(int rutaId, int tenantId);
    Task<List<RutaRetornoItemDto>> ObtenerRetornoInventarioAsync(int rutaId, int tenantId);
    Task ActualizarRetornoAsync(int rutaId, int productoId, int mermas, int recAlmacen, int cargaVehiculo, int tenantId);
    Task CerrarRutaAsync(int rutaId, double montoRecibido, string cerradoPor, int tenantId);
}
