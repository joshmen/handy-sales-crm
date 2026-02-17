using HandySales.Application.Sync.DTOs;
using HandySales.Domain.Entities;

namespace HandySales.Application.Sync.Interfaces;

public interface ISyncRepository
{
    // Pull changes from server since last sync
    Task<List<Cliente>> GetClientesModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<Producto>> GetProductosModifiedSinceAsync(int tenantId, DateTime? since);
    Task<List<Pedido>> GetPedidosModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
    Task<List<ClienteVisita>> GetVisitasModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);
    Task<List<RutaVendedor>> GetRutasModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since);

    // Push changes from client - Clientes
    Task<(Cliente entity, bool wasConflict)> UpsertClienteAsync(int tenantId, SyncClienteDto dto, string userId);

    // Push changes from client - Pedidos
    Task<(Pedido entity, bool wasConflict)> UpsertPedidoAsync(int tenantId, int usuarioId, SyncPedidoDto dto, string userId);

    // Push changes from client - Visitas
    Task<(ClienteVisita entity, bool wasConflict)> UpsertVisitaAsync(int tenantId, int usuarioId, SyncVisitaDto dto, string userId);

    // Push changes from client - Rutas
    Task<(RutaVendedor entity, bool wasConflict)> UpsertRutaAsync(int tenantId, int usuarioId, SyncRutaDto dto, string userId);

    // Batch operations
    Task<int> SaveChangesAsync();
}
