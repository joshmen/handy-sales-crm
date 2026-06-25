using HandySuites.Application.Rutas.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Rutas.Interfaces;

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
    Task<List<RutaVendedorDto>> ObtenerRutasActivasParaMapaAsync(int tenantId, int? usuarioId);

    // Gestión de estado
    Task<bool> IniciarRutaAsync(int id, DateTime horaInicio);
    Task<bool> AceptarRutaAsync(int id, DateTime aceptadaEn);
    Task<bool> CompletarRutaAsync(int id, DateTime horaFin, double? kilometrosReales);
    Task<bool> CancelarRutaAsync(int id, string? motivo);

    /// <summary>
    /// Vincula a una ruta los pedidos VentaDirecta+Entregado del mismo usuario y
    /// día (DATE(fecha_pedido)=DATE(ruta.fecha)) que aún no tengan link en
    /// RutasPedidos. Idempotente — segundo run no duplica. Incrementa
    /// RutasCarga.CantidadVendida por producto. Retorna conteo + unidades para
    /// feedback al caller. Caso de uso: vendedor empieza a vender pre-ruta y
    /// admin le asigna ruta después (escenario reportado prod 2026-05-26).
    /// </summary>
    Task<VinculacionHuerfanosResult> VincularPedidosHuerfanosAsync(int rutaId, int tenantId);

    /// <summary>
    /// Vincula a una ruta los Gastos del mismo vendedor y dia
    /// (DATE(fecha_gasto)=DATE(ruta.fecha)) con ruta_id=NULL. Idempotente.
    /// Caso de uso: vendedor registra gastos antes de aceptar la ruta (ej.
    /// gasolina en la manana antes de pasar al almacen por la carga).
    /// Sin esto el gasto queda "huerfano" sin imputarse al cierre. Agregado v23.
    /// </summary>
    Task<VinculacionGastosHuerfanosResult> VincularGastosHuerfanosAsync(int rutaId, int tenantId);

    /// <summary>
    /// Genera un codigo unico para una ruta. Formato:
    /// - Ruta normal: "RT-YYYYMMDD-NNNN" — secuencia por (tenant, dia).
    /// - Template:    "TPL-NNNN"        — secuencia por tenant (sin fecha).
    /// La secuencia es next-available basada en max(codigo) del prefijo correspondiente.
    /// Idempotente bajo retry: el caller debe atrapar 23505 (unique violation) y reintentar.
    /// </summary>
    Task<string> GenerarCodigoRutaAsync(int tenantId, DateTime fecha, bool esTemplate);

    /// <summary>Reemplaza las zonas de una ruta por la lista dada (delete-then-insert idempotente).</summary>
    Task ReemplazarZonasAsync(int rutaId, List<int> zonaIds, int tenantId);

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

    // Templates
    Task<List<RutaTemplateListaDto>> ObtenerTemplatesAsync(int tenantId);
    Task<RutaVendedor?> ObtenerTemplateConDetallesAsync(int templateId, int tenantId);

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
    Task EnviarACargaAsync(int rutaId, int tenantId, List<int>? pedidoIdsToTransition = null);

    // === Cierre de ruta ===
    Task<CierreRutaResumenDto> ObtenerResumenCierreAsync(int rutaId, int tenantId);
    Task<List<RutaRetornoItemDto>> ObtenerRetornoInventarioAsync(int rutaId, int tenantId);
    Task ActualizarRetornoAsync(int rutaId, int productoId, int mermas, int recAlmacen, int cargaVehiculo, int recargaExterna, int tenantId);
    Task CerrarRutaAsync(int rutaId, double montoRecibido, string cerradoPor, int tenantId);

    // === Existence checks ===
    Task<bool> ExisteUsuarioEnTenantAsync(int usuarioId, int tenantId);
    Task<bool> ExisteZonaEnTenantAsync(int zonaId, int tenantId);
    Task<bool> ExisteVehiculoEnTenantAsync(int vehiculoId, int tenantId);
}
