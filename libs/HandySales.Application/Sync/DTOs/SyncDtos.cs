namespace HandySales.Application.Sync.DTOs;

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
    public int ConflictsFound { get; set; }
    public int ErrorsFound { get; set; }
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
    public int IdZona { get; set; }
    public int CategoriaClienteId { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
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
    public string? Notas { get; set; }
    public long Version { get; set; }
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

public class SyncRutaDto
{
    public int Id { get; set; }
    public string? LocalId { get; set; }
    public int? ZonaId { get; set; }
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
    public bool Activo { get; set; } = true;
    public long Version { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    public SyncOperation Operation { get; set; } = SyncOperation.Update;
    public bool IsDeleted { get; set; }
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
    public string SKU { get; set; } = string.Empty;
    public decimal Precio { get; set; }
    public int CategoriaProductoId { get; set; }
    public int? FamiliaProductoId { get; set; }
    public int? UnidadMedidaId { get; set; }
    public string? ImagenUrl { get; set; }
    public bool Activo { get; set; } = true;
    public long Version { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    // Products are read-only from mobile, no Operation needed
}

public enum SyncOperation
{
    Create = 0,
    Update = 1,
    Delete = 2
}
