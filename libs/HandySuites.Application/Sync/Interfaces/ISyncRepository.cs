using HandySuites.Application.Sync.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Sync.Interfaces;

public interface ISyncRepository
{
    // Pull changes from server since last sync
    // maxRecords/afterId: paginacion OPCIONAL. Cuando maxRecords es null el comportamiento
    // es identico al pull completo actual. Cuando se provee, devuelve registros con
    // Id > afterId (cursor) y limita a maxRecords resultados.
    Task<List<Cliente>> GetClientesModifiedSinceAsync(int tenantId, DateTime? since, int? maxRecords = null, int? afterId = null);
    Task<List<Producto>> GetProductosModifiedSinceAsync(int tenantId, DateTime? since, int? maxRecords = null, int? afterId = null);
    /// <summary>
    /// Bug 3 fix 2026-06-25: ids de productos soft-deleted (eliminado_en &gt; since) para
    /// propagar el borrado al móvil (que de otro modo los retiene como fantasmas).
    /// Usa IgnoreQueryFilters porque el filtro global excluye los soft-deleted.
    /// </summary>
    Task<List<int>> GetProductosEliminadosIdsSinceAsync(int tenantId, DateTime since);
    Task<List<Pedido>> GetPedidosModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since, int? maxRecords = null, int? afterId = null);
    Task<List<ClienteVisita>> GetVisitasModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
    Task<List<RutaVendedor>> GetRutasModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
    Task<Dictionary<int, List<RutaCarga>>> GetRutasCargaForRutasAsync(int tenantId, List<int> rutaIds);

    // Push changes from client - Clientes
    Task<(Cliente entity, bool wasConflict)> UpsertClienteAsync(int tenantId, SyncClienteDto dto, string userId);

    // Push changes from client - Pedidos
    Task<(Pedido entity, bool wasConflict)> UpsertPedidoAsync(int tenantId, int usuarioId, SyncPedidoDto dto, string userId);

    // Push changes from client - Visitas
    Task<(ClienteVisita entity, bool wasConflict)> UpsertVisitaAsync(int tenantId, int usuarioId, SyncVisitaDto dto, string userId);

    // Push changes from client - Rutas
    Task<(RutaVendedor entity, bool wasConflict)> UpsertRutaAsync(int tenantId, int usuarioId, SyncRutaDto dto, string userId);

    // Push changes from client - RutaDetalles
    // Retorna (found, entity): found=false cuando la parada no existe (dto.Id<=0 o no
    // pertenece al tenant/usuario). NO hace SaveChangesAsync — el caller (SyncService)
    // guarda una sola vez dentro del savepoint. Ver fix sync de paradas (jun 2026).
    Task<(bool found, RutaDetalle? entity)> UpsertRutaDetalleAsync(int tenantId, int usuarioId, SyncRutaDetalleDto dto, string userId);

    // Pull/Push - Cobros
    Task<List<Cobro>> GetCobrosModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
    Task<(Cobro entity, bool wasConflict)> UpsertCobroAsync(int tenantId, int usuarioId, SyncCobroDto dto, string userId);

    // Pull/Push - Gastos (vendedor expenses con foto opcional)
    Task<List<Gasto>> GetGastosModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
    Task<(Gasto entity, bool wasConflict)> UpsertGastoAsync(int tenantId, int usuarioId, SyncGastoDto dto, string userId);

    // Pull/Push - DevolucionesPedido (devolucion de cliente ligada a Pedido entregado, con children)
    Task<List<DevolucionPedido>> GetDevolucionesModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
    Task<(DevolucionPedido entity, bool wasConflict)> UpsertDevolucionAsync(int tenantId, int usuarioId, SyncDevolucionPedidoDto dto, string userId);

    // Pull - Stock levels
    Task<Dictionary<int, (decimal cantidad, decimal minimo)>> GetStockMapAsync(int tenantId);

    // Pull - Pricing catalogs (read-only on mobile)
    Task<List<SyncPrecioPorProductoDto>> GetPreciosPorProductoAsync(int tenantId, DateTime? since);
    Task<List<SyncDescuentoDto>> GetDescuentosAsync(int tenantId, DateTime? since);
    Task<List<SyncPromocionDto>> GetPromocionesAsync(int tenantId, DateTime? since);

    // Pull - Catalogos basicos (read-only on mobile, sync incluye soft-deleted via IsDeleted)
    Task<List<Zona>> GetZonasModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<CategoriaCliente>> GetCategoriasClienteModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<CategoriaProducto>> GetCategoriasProductoModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<FamiliaProducto>> GetFamiliasProductoModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<TasaImpuesto>> GetTasasImpuestoModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<ListaPrecio>> GetListasPrecioModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<Usuario>> GetUsuariosModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<MetaVendedor>> GetMetasVendedorModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
    Task<HandySuites.Domain.Entities.DatosEmpresa?> GetDatosEmpresaIfModifiedAsync(int tenantId, DateTime? since);

    // Batch operations
    Task<int> SaveChangesAsync();
}
