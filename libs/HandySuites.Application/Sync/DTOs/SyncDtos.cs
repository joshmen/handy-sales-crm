namespace HandySuites.Application.Sync.DTOs;

/// <summary>
/// Paginacion OPCIONAL en el pull. Cuando MaxRecords es null el comportamiento es
/// identico al pull completo actual (sin limite). Cuando se provee, el servidor
/// devuelve como maximo MaxRecords registros por entidad con Id > cursor-de-esa-entidad,
/// y rellena SyncResponseDto.PaginationInfo para que el cliente pueda seguir paginando.
/// </summary>
public class SyncPaginationOptions
{
    /// <summary>Maximo de registros por entidad paginable. Null = sin limite (full pull).</summary>
    public int? MaxRecords { get; set; }

    /// <summary>
    /// Cursor POR ENTIDAD: ultimo Id recibido de cada entidad paginable
    /// ("clientes", "productos", "pedidos"). Solo retorna registros con Id > cursor.
    /// Clave ausente = empezar desde el inicio (Id > 0). Cada entidad tiene su PROPIO
    /// espacio de Id, por eso el cursor NO puede ser un escalar compartido: usar el Id
    /// mas alto de una entidad como cursor de otra se saltaria registros (perdida de datos).
    /// </summary>
    public Dictionary<string, int>? AfterIds { get; set; }
}

/// <summary>
/// Informacion de paginacion devuelta por el servidor en la respuesta pull.
/// Solo se incluye cuando se solicito paginacion (MaxRecords != null).
/// </summary>
public class SyncPullPageInfo
{
    /// <summary>True si CUALQUIER entidad paginable tiene mas registros despues de esta pagina.</summary>
    public bool HasMore { get; set; }

    /// <summary>
    /// Cursor POR ENTIDAD devuelto por el servidor: ultimo Id entregado de cada entidad
    /// paginable en esta pagina. El cliente lo reenvia como AfterIds en la siguiente
    /// solicitud. Se conserva el cursor previo cuando la entidad no devolvio nada en esta
    /// pagina, para que el cursor nunca retroceda. Claves: "clientes", "productos", "pedidos".
    /// </summary>
    public Dictionary<string, int> NextCursors { get; set; } = new();
}

/// <summary>
/// Request to sync data from mobile device
/// </summary>
public class SyncRequestDto
{
    /// <summary>
    /// Last sync timestamp (UTC) for delta sync. If null, full sync is requested.
    /// </summary>
    public DateTime? LastSyncTimestamp { get; set; }

    /// <summary>
    /// Entity types to sync. If null or empty, sync all entities.
    /// </summary>
    public List<string>? EntityTypes { get; set; }

    /// <summary>
    /// Changes from client to push to server
    /// </summary>
    public SyncChangesDto? ClientChanges { get; set; }

    /// <summary>
    /// Paginacion OPCIONAL para el pull. Null = pull completo (comportamiento default).
    /// </summary>
    public SyncPaginationOptions? Pagination { get; set; }
}

/// <summary>
/// Changes to sync (either from client or server)
/// </summary>
public class SyncChangesDto
{
    public List<SyncClienteDto>? Clientes { get; set; }
    public List<SyncPedidoDto>? Pedidos { get; set; }
    public List<SyncVisitaDto>? Visitas { get; set; }
    public List<SyncRutaDto>? Rutas { get; set; }
    public List<SyncProductoDto>? Productos { get; set; }
    public List<SyncCobroDto>? Cobros { get; set; }
    public List<SyncGastoDto>? Gastos { get; set; }
    public List<SyncDevolucionPedidoDto>? DevolucionesPedido { get; set; }
    public List<SyncRutaDetalleDto>? RutaDetalles { get; set; }
    public List<SyncPrecioPorProductoDto>? PreciosPorProducto { get; set; }
    public List<SyncDescuentoDto>? Descuentos { get; set; }
    public List<SyncPromocionDto>? Promociones { get; set; }

    // Catalogos read-only (mobile no los push, solo pull). Antes vivian en React Query
    // memory y se perdian al cerrar sesion — el vendedor tenia que re-loguear para
    // tenerlos. Ahora se persisten en WatermelonDB para offline real (2026-04-28).
    public List<SyncZonaCatalogoDto>? Zonas { get; set; }
    public List<SyncCategoriaClienteCatalogoDto>? CategoriasCliente { get; set; }
    public List<SyncCategoriaProductoCatalogoDto>? CategoriasProducto { get; set; }
    public List<SyncFamiliaProductoCatalogoDto>? FamiliasProducto { get; set; }
    public List<SyncListaPrecioCatalogoDto>? ListasPrecio { get; set; }
    public List<SyncUsuarioCatalogoDto>? Usuarios { get; set; }
    public List<SyncMetaVendedorCatalogoDto>? MetasVendedor { get; set; }
    public SyncDatosEmpresaCatalogoDto? DatosEmpresa { get; set; }
}

/// <summary>
/// Response with sync results
/// </summary>
public class SyncResponseDto
{
    /// <summary>
    /// Current server timestamp for next sync
    /// </summary>
    public DateTime ServerTimestamp { get; set; }

    /// <summary>
    /// Changes from server to pull to client
    /// </summary>
    public SyncChangesDto ServerChanges { get; set; } = new();

    /// <summary>
    /// Conflicts that need resolution
    /// </summary>
    public List<SyncConflictDto> Conflicts { get; set; } = new();

    /// <summary>
    /// Errors during sync
    /// </summary>
    public List<SyncErrorDto> Errors { get; set; } = new();

    /// <summary>
    /// Summary of sync operation
    /// </summary>
    public SyncSummaryDto Summary { get; set; } = new();

    /// <summary>
    /// Mappings of localId → serverId for records created during push
    /// </summary>
    public List<IdMappingDto> CreatedIdMappings { get; set; } = new();

    /// <summary>
    /// True when any errors occurred during sync (for callers to return appropriate HTTP status)
    /// </summary>
    public bool HasErrors => Errors.Count > 0;

    /// <summary>
    /// Informacion de paginacion. Solo presente cuando se solicito paginacion (MaxRecords != null).
    /// Null = pull completo (comportamiento default sin paginacion).
    /// </summary>
    public SyncPullPageInfo? PaginationInfo { get; set; }
}

public class SyncSummaryDto
{
    public int ClientesPulled { get; set; }
    public int ClientesPushed { get; set; }
    public int PedidosPulled { get; set; }
    public int PedidosPushed { get; set; }
    public int VisitasPulled { get; set; }
    public int VisitasPushed { get; set; }
    public int RutasPulled { get; set; }
    public int RutasPushed { get; set; }
    public int ProductosPulled { get; set; }
    public int CobrosPulled { get; set; }
    public int CobrosPushed { get; set; }
    public int GastosPulled { get; set; }
    public int GastosPushed { get; set; }
    public int DevolucionesPulled { get; set; }
    public int DevolucionesPushed { get; set; }
    public int RutaDetallesPushed { get; set; }
    public int ConflictsFound { get; set; }
    public int ErrorsFound { get; set; }
    public int ZonasPulled { get; set; }
    public int CategoriasClientePulled { get; set; }
    public int CategoriasProductoPulled { get; set; }
    public int FamiliasProductoPulled { get; set; }
    public int ListasPrecioPulled { get; set; }
    public int UsuariosPulled { get; set; }
    public int MetasVendedorPulled { get; set; }
    public bool DatosEmpresaPulled { get; set; }
}

/// <summary>
/// Catalogo read-only sincronizado al WatermelonDB local. Mobile NO push estos.
/// </summary>
public class SyncZonaCatalogoDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool Activo { get; set; }
    public DateTime ActualizadoEn { get; set; }
    public bool IsDeleted { get; set; }
}

public class SyncCategoriaClienteCatalogoDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool Activo { get; set; }
    public DateTime ActualizadoEn { get; set; }
    public bool IsDeleted { get; set; }
}

public class SyncCategoriaProductoCatalogoDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool Activo { get; set; }
    public DateTime ActualizadoEn { get; set; }
    public bool IsDeleted { get; set; }
}

public class SyncFamiliaProductoCatalogoDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public DateTime ActualizadoEn { get; set; }
    public bool IsDeleted { get; set; }
}

public class SyncListaPrecioCatalogoDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public DateTime ActualizadoEn { get; set; }
    public bool IsDeleted { get; set; }
}

public class SyncUsuarioCatalogoDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Rol { get; set; }
    public string? AvatarUrl { get; set; }
    public bool Activo { get; set; }
    public DateTime ActualizadoEn { get; set; }
    public bool IsDeleted { get; set; }
}

public class SyncMetaVendedorCatalogoDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UsuarioId { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Periodo { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public bool Activo { get; set; }
    public DateTime ActualizadoEn { get; set; }
    public bool IsDeleted { get; set; }
}

/// <summary>
/// DatosEmpresa es 1:1 por tenant — siempre 1 sola entrada o ninguna.
/// </summary>
public class SyncDatosEmpresaCatalogoDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string? RazonSocial { get; set; }
    public string? IdentificadorFiscal { get; set; }
    public string TipoIdentificadorFiscal { get; set; } = "RFC";
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string? Contacto { get; set; }
    public string? Direccion { get; set; }
    public string? Ciudad { get; set; }
    public string? Estado { get; set; }
    public string? CodigoPostal { get; set; }
    public string? SitioWeb { get; set; }
    public string? Descripcion { get; set; }
    public DateTime ActualizadoEn { get; set; }
}

public class SyncConflictDto
{
    public string EntityType { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public string Field { get; set; } = string.Empty;
    public object? ClientValue { get; set; }
    public object? ServerValue { get; set; }
    public DateTime ClientModified { get; set; }
    public DateTime ServerModified { get; set; }
    public string Resolution { get; set; } = "server_wins"; // server_wins, client_wins, manual
}

public class SyncErrorDto
{
    public string EntityType { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    public string Operation { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Details { get; set; }
}

// Sync-specific entity DTOs with version tracking
public class SyncClienteDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; } // For new entities created offline
    public string Nombre { get; set; } = string.Empty;
    public string RFC { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Direccion { get; set; } = string.Empty;
    // Dirección desglosada
    public string? NumeroExterior { get; set; }
    public string? Colonia { get; set; }
    public string? Ciudad { get; set; }
    public string? CodigoPostal { get; set; }
    public string? Encargado { get; set; }
    public int IdZona { get; set; }
    public int CategoriaClienteId { get; set; }
    public int? VendedorId { get; set; }
    public int? ListaPreciosId { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    // Crédito / comerciales
    public decimal LimiteCredito { get; set; }
    public int DiasCredito { get; set; }
    public decimal Descuento { get; set; }
    public decimal Saldo { get; set; }
    public decimal VentaMinimaEfectiva { get; set; }
    // Reglas de pago
    public string TiposPagoPermitidos { get; set; } = "efectivo";
    public string TipoPagoPredeterminado { get; set; } = "efectivo";
    public bool EsProspecto { get; set; }
    public string? Comentarios { get; set; }
    // Datos fiscales (CFDI)
    public string? RfcFiscal { get; set; }
    public string? RazonSocial { get; set; }
    public string? RegimenFiscal { get; set; }
    public string? UsoCfdi { get; set; }
    public string? CpFiscal { get; set; }
    public bool RequiereFactura { get; set; }
    public bool Activo { get; set; } = true;
    public long Version { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    public SyncOperation Operation { get; set; } = SyncOperation.Update;
    public bool IsDeleted { get; set; }
}

public class SyncPedidoDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; }
    public int ClienteId { get; set; }
    public string? NumeroPedido { get; set; }
    public DateTime FechaPedido { get; set; }
    public DateTime? FechaEntregaEstimada { get; set; }
    public int Estado { get; set; }
    public int TipoVenta { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Impuestos { get; set; }
    public decimal Total { get; set; }
    public string? Notas { get; set; }
    public string? DireccionEntrega { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public int? ListaPrecioId { get; set; }
    public List<SyncDetallePedidoDto>? Detalles { get; set; }
    public bool Activo { get; set; } = true;
    public long Version { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    public SyncOperation Operation { get; set; } = SyncOperation.Update;
    public bool IsDeleted { get; set; }
}

public class SyncDetallePedidoDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; }
    public int ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public decimal PorcentajeDescuento { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }
    public string? Nombre { get; set; }
    public string? Notas { get; set; }
    public long Version { get; set; }
    /// <summary>BOGO: cantidad regalada de esta línea. Default 0.</summary>
    public decimal CantidadBonificada { get; set; }
    /// <summary>BOGO: promo aplicada en esta línea (server valida y recalcula).</summary>
    public int? PromocionId { get; set; }
    public SyncOperation Operation { get; set; } = SyncOperation.Update;
}

public class SyncVisitaDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; }
    public int ClienteId { get; set; }
    public DateTime? FechaProgramada { get; set; }
    public DateTime? FechaHoraInicio { get; set; }
    public DateTime? FechaHoraFin { get; set; }
    public double? LatitudInicio { get; set; }
    public double? LongitudInicio { get; set; }
    public double? LatitudFin { get; set; }
    public double? LongitudFin { get; set; }
    public int Estado { get; set; }
    public string? Notas { get; set; }
    public int? PedidoId { get; set; }
    public string? Resultado { get; set; }
    public string? Fotos { get; set; } // JSON array of photo URLs
    public bool Activo { get; set; } = true;
    public long Version { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    public SyncOperation Operation { get; set; } = SyncOperation.Update;
    public bool IsDeleted { get; set; }
}

public class SyncZonaResumenDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
}

public class SyncRutaDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; }
    public int? UsuarioId { get; set; }
    /// <summary>Legacy: primera zona (compat con apps mobile pre-multi-zona).</summary>
    public int? ZonaId { get; set; }
    /// <summary>Multi-zona: lista de IDs (compat). Apps nuevas usan <see cref="Zonas"/>.</summary>
    public List<int>? ZonaIds { get; set; }
    /// <summary>Multi-zona: lista completa de zonas con id+nombre para que mobile UI muestre chips legibles. 2026-04-27.</summary>
    public List<SyncZonaResumenDto>? Zonas { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public DateTime Fecha { get; set; }
    public TimeSpan? HoraInicioEstimada { get; set; }
    public TimeSpan? HoraFinEstimada { get; set; }
    public DateTime? HoraInicioReal { get; set; }
    public DateTime? HoraFinReal { get; set; }
    public int Estado { get; set; }
    public double? KilometrosEstimados { get; set; }
    public double? KilometrosReales { get; set; }
    public string? Notas { get; set; }
    public List<SyncRutaDetalleDto>? Detalles { get; set; }

    /// <summary>
    /// Pedidos asignados a la ruta (la "carga" del camión, junction RutasPedidos).
    /// Antes el sync no incluía este campo y el vendedor en mobile no veía qué pedidos
    /// llevaba para entregar. Reportado 2026-04-27.
    /// </summary>
    public List<SyncRutaPedidoDto>? Pedidos { get; set; }

    /// <summary>
    /// Productos sueltos cargados en el camión (junction RutasCarga) para venta directa
    /// en ruta — independientes de pedidos asignados.
    /// </summary>
    public List<SyncRutaCargaDto>? Carga { get; set; }

    public bool Activo { get; set; } = true;
    public long Version { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    public SyncOperation Operation { get; set; } = SyncOperation.Update;
    public bool IsDeleted { get; set; }
}

public class SyncRutaPedidoDto
{
    public int Id { get; set; }
    public int RutaId { get; set; }
    public int PedidoId { get; set; }
    public int Estado { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime? CreadoEn { get; set; }
}

public class SyncRutaCargaDto
{
    public int Id { get; set; }
    public int RutaId { get; set; }
    public int ProductoId { get; set; }
    public int CantidadEntrega { get; set; }
    public int CantidadVenta { get; set; }
    public int CantidadTotal { get; set; }
    public double PrecioUnitario { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime? CreadoEn { get; set; }
    // Audit 2026-05-21: estos 2 campos son los CONSUMIDOS (no la capacidad).
    // Faltaban en el pull sync DTO desde la migration 20260506062036, asi que
    // aunque el backend incrementaba CantidadVendida/CantidadEntregada en
    // RutasCarga, el mobile nunca los recibia y la barra "Productos
    // (vendidos + entregados)" siempre se quedaba en 0 (incident vendedor@jeyma).
    public int CantidadVendida { get; set; }
    public int CantidadEntregada { get; set; }
}

public class SyncRutaDetalleDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; }
    public int ClienteId { get; set; }
    public int OrdenVisita { get; set; }
    public TimeSpan? HoraEstimadaLlegada { get; set; }
    public int? DuracionEstimadaMinutos { get; set; }
    public DateTime? HoraLlegadaReal { get; set; }
    public DateTime? HoraSalidaReal { get; set; }
    public double? LatitudLlegada { get; set; }
    public double? LongitudLlegada { get; set; }
    public int Estado { get; set; }
    public string? RazonOmision { get; set; }
    public int? VisitaId { get; set; }
    public int? PedidoId { get; set; }
    public string? Notas { get; set; }
    public long Version { get; set; }
    public SyncOperation Operation { get; set; } = SyncOperation.Update;
}

public class SyncProductoDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    /// <summary>Backward-compat alias de CodigoBarra. Usar CodigoBarra para nuevos consumers.</summary>
    public string SKU { get; set; } = string.Empty;
    public string? CodigoBarra { get; set; }
    public decimal Precio { get; set; }
    public int CategoriaProductoId { get; set; }
    public int? FamiliaProductoId { get; set; }
    public int? UnidadMedidaId { get; set; }
    /// <summary>Nombre de la unidad (ej: "Pieza", "Kg"). Permite a mobile mostrar la unidad sin catálogo separado.</summary>
    public string? UnidadMedidaNombre { get; set; }
    public string? ImagenUrl { get; set; }
    public decimal StockDisponible { get; set; }
    public decimal StockMinimo { get; set; }
    public bool Activo { get; set; } = true;
    public long Version { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    /// <summary>Si true, Precio ya incluye el impuesto. 2026-04-28.</summary>
    public bool PrecioIncluyeIva { get; set; } = true;
    /// <summary>FK a TasaImpuesto. Mobile usa Tasa denormalizada para evitar lookup.</summary>
    public int? TasaImpuestoId { get; set; }
    /// <summary>Tasa decimal denormalizada (0.16, 0.08, 0.00). Resuelta en backend desde TasaImpuesto o default tenant.</summary>
    public decimal Tasa { get; set; } = 0.16m;
    // Products are read-only from mobile, no Operation needed
}

public class SyncCobroDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; }
    public int ClienteId { get; set; }
    public int? PedidoId { get; set; }
    /// <summary>Mobile WDB id del pedido padre cuando aún no tiene ServerId (offline create).</summary>
    public string? PedidoLocalId { get; set; }
    public decimal Monto { get; set; }
    public int MetodoPago { get; set; }
    public DateTime FechaCobro { get; set; }
    public string? Referencia { get; set; }
    public string? Notas { get; set; }
    public bool Activo { get; set; } = true;
    public long Version { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    public SyncOperation Operation { get; set; } = SyncOperation.Create;
    public bool IsDeleted { get; set; }
    /// <summary>
    /// 2026-06-08 PR 4 plan eager-drifting cobros: modo derivado por el mobile mapper
    /// (0=PorPedido, 1=AbonoFifo, 2=Anticipo). Default 0 retrocompat con clientes WDB
    /// que aún no envíen el campo (sincronización con backend pre-PR1).
    /// </summary>
    public int Modo { get; set; } = 0;
}

/// <summary>
/// Sync DTO para Gasto del vendedor. Auto-aprobado al crearse.
/// Comprobante (foto del ticket) se sube via attachments endpoint separado,
/// no en este DTO. Servidor stampa ComprobanteUrl tras upload.
/// </summary>
public class SyncGastoDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; }
    /// <summary>UsuarioId del vendedor que creo el gasto. Critico para que mobile
    /// pueda mapear correctamente el gasto al usuario actual y mostrarlo en lista.
    /// Bug 30/5: faltaba en pull -> mobile asignaba usuario_id=0 -> gastos
    /// desaparecian de la lista al hacer pull sync.</summary>
    public int UsuarioId { get; set; }
    public int? RutaId { get; set; }
    /// <summary>Mobile WDB id de la ruta cuando aún no tiene ServerId (offline create).</summary>
    public string? RutaLocalId { get; set; }
    public DateTime FechaGasto { get; set; }
    public decimal Monto { get; set; }
    public int TipoGasto { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public string? Notas { get; set; }
    public string? ComprobanteUrl { get; set; }
    public string Moneda { get; set; } = "MXN";
    public int Estado { get; set; }
    public bool Activo { get; set; } = true;
    public long Version { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    public SyncOperation Operation { get; set; } = SyncOperation.Create;
    public bool IsDeleted { get; set; }
}

/// <summary>
/// Sync DTO para DevolucionPedido (parent). Embebe lista de detalles para
/// upsert atomico parent+children en una sola transaction. Mirror del patron
/// SyncPedidoDto + SyncDetallePedidoDto.
/// </summary>
public class SyncDevolucionPedidoDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; }
    public int PedidoId { get; set; }
    /// <summary>Mobile WDB id del pedido padre si fue creado offline en mismo batch.</summary>
    public string? PedidoLocalId { get; set; }
    public int ClienteId { get; set; }
    public int? RutaId { get; set; }
    public string? RutaLocalId { get; set; }
    public DateTime FechaDevolucion { get; set; }
    public int Motivo { get; set; }
    public string? Notas { get; set; }
    public int TipoReembolso { get; set; }
    public decimal MontoTotal { get; set; }
    public string? FotoEvidenciaUrl { get; set; }
    public int Estado { get; set; }
    public bool Activo { get; set; } = true;
    public long Version { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    public SyncOperation Operation { get; set; } = SyncOperation.Create;
    public bool IsDeleted { get; set; }
    public List<SyncDetalleDevolucionDto> Detalles { get; set; } = new();
}

/// <summary>
/// Sync DTO para linea individual de devolucion. Children-only — siempre via parent.
/// </summary>
public class SyncDetalleDevolucionDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; }
    public int? DetallePedidoId { get; set; }
    /// <summary>Mobile WDB id del DetallePedido padre si la linea original no tiene ServerId.</summary>
    public string? DetallePedidoLocalId { get; set; }
    public int ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }
}

public class IdMappingDto
{
    public string EntityType { get; set; } = string.Empty;
    public string LocalId { get; set; } = string.Empty;
    public int ServerId { get; set; }
}

// === Pricing catalog DTOs (read-only on mobile) ===

public class SyncPrecioPorProductoDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public int ListaPrecioId { get; set; }
    public decimal Precio { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime? ActualizadoEn { get; set; }
}

public class SyncDescuentoDto
{
    public int Id { get; set; }
    public int? ProductoId { get; set; }
    public decimal CantidadMinima { get; set; }
    public decimal DescuentoPorcentaje { get; set; }
    public string TipoAplicacion { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
    public DateTime? ActualizadoEn { get; set; }
}

public class SyncPromocionDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal DescuentoPorcentaje { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public List<int> ProductoIds { get; set; } = new();
    public bool Activo { get; set; } = true;
    public DateTime? ActualizadoEn { get; set; }
    /// <summary>0=Porcentaje, 1=Regalo (BOGO).</summary>
    public int TipoPromocion { get; set; }
    public decimal? CantidadCompra { get; set; }
    public decimal? CantidadBonificada { get; set; }
    /// <summary>NULL = mismo producto. !=null = regala otro producto distinto.</summary>
    public int? ProductoBonificadoId { get; set; }
}

public enum SyncOperation
{
    Create = 0,
    Update = 1,
    Delete = 2
}
