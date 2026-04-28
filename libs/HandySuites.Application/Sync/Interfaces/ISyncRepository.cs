using HandySuites.Application.Sync.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Sync.Interfaces;

public interface ISyncRepository
{
    // Pull changes from server since last sync
    Task<List<Cliente>> GetClientesModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<Producto>> GetProductosModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<Pedido>> GetPedidosModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
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
    Task<bool> UpsertRutaDetalleAsync(int tenantId, int usuarioId, SyncRutaDetalleDto dto);

    // Pull/Push - Cobros
    Task<List<Cobro>> GetCobrosModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
    Task<(Cobro entity, bool wasConflict)> UpsertCobroAsync(int tenantId, int usuarioId, SyncCobroDto dto, string userId);

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
    Task<List<ListaPrecio>> GetListasPrecioModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<Usuario>> GetUsuariosModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<MetaVendedor>> GetMetasVendedorModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
    Task<HandySuites.Domain.Entities.DatosEmpresa?> GetDatosEmpresaIfModifiedAsync(int tenantId, DateTime? since);

    // Batch operations
    Task<int> SaveChangesAsync();
}
