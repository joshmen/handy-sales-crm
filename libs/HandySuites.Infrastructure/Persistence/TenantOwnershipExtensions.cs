using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Persistence;

/// <summary>
/// Sprint pre-prod #15 audit 2026-06-06: helpers para verificar que un ID
/// recibido del cliente (mobile DTO, request body) pertenece efectivamente
/// al tenant del caller. Defensa contra IDOR cross-tenant en sync.
///
/// Por que esto es necesario aunque exista global query filter:
/// el global query filter de EF Core agrega WHERE tenant_id = X a queries SELECT,
/// pero NO valida INSERTS. Si UpsertPedido recibe `ClienteId = 5` del DTO y hace
/// `db.Pedidos.Add(new Pedido { ClienteId = 5, TenantId = currentTenant })`, la
/// FK constraint en PG solo verifica que `5 EXISTS in Clientes`, no que
/// `Clientes(5).TenantId == pedido.TenantId`. Resultado: vendedor del tenant A
/// inserta Pedido referenciando cliente del tenant B, y al timbrar CFDI futuro
/// el RFC sale del tenant equivocado.
///
/// Uso:
///   await db.EnsureClienteBelongsToTenantAsync(dto.ClienteId, tenantId);
///   foreach (var det in dto.Detalles)
///     await db.EnsureProductoBelongsToTenantAsync(det.ProductoId, tenantId);
///
/// Performance: cada Ensure agrega 1 query. Para syncs con muchos detalles,
/// el caller debe batch-validar con `AnyBatchTenantAsync` (futuro).
/// </summary>
public static class TenantOwnershipExtensions
{
    /// <summary>
    /// True si el cliente con ese Id existe Y pertenece al tenant indicado.
    /// IgnoreQueryFilters() para evitar que el global filter enmascare la
    /// validacion (queremos saber si CRUZA tenants, no si esta accesible).
    /// </summary>
    public static Task<bool> ClienteBelongsToTenantAsync(
        this HandySuitesDbContext db, int clienteId, int tenantId) =>
        db.Clientes.IgnoreQueryFilters()
            .AnyAsync(c => c.Id == clienteId && c.TenantId == tenantId);

    public static Task<bool> ProductoBelongsToTenantAsync(
        this HandySuitesDbContext db, int productoId, int tenantId) =>
        db.Productos.IgnoreQueryFilters()
            .AnyAsync(p => p.Id == productoId && p.TenantId == tenantId);

    public static Task<bool> PedidoBelongsToTenantAsync(
        this HandySuitesDbContext db, int pedidoId, int tenantId) =>
        db.Pedidos.IgnoreQueryFilters()
            .AnyAsync(p => p.Id == pedidoId && p.TenantId == tenantId);

    public static Task<bool> ListaPrecioBelongsToTenantAsync(
        this HandySuitesDbContext db, int listaPrecioId, int tenantId) =>
        db.ListasPrecios.IgnoreQueryFilters()
            .AnyAsync(l => l.Id == listaPrecioId && l.TenantId == tenantId);

    // ─── Ensure variants — throw UnauthorizedAccessException si la verificacion falla ───

    public static async Task EnsureClienteBelongsToTenantAsync(
        this HandySuitesDbContext db, int clienteId, int tenantId)
    {
        if (!await db.ClienteBelongsToTenantAsync(clienteId, tenantId))
        {
            throw new UnauthorizedAccessException(
                $"Cliente {clienteId} no pertenece al tenant {tenantId} (IDOR bloqueado).");
        }
    }

    public static async Task EnsureProductoBelongsToTenantAsync(
        this HandySuitesDbContext db, int productoId, int tenantId)
    {
        if (!await db.ProductoBelongsToTenantAsync(productoId, tenantId))
        {
            throw new UnauthorizedAccessException(
                $"Producto {productoId} no pertenece al tenant {tenantId} (IDOR bloqueado).");
        }
    }

    public static async Task EnsurePedidoBelongsToTenantAsync(
        this HandySuitesDbContext db, int pedidoId, int tenantId)
    {
        if (!await db.PedidoBelongsToTenantAsync(pedidoId, tenantId))
        {
            throw new UnauthorizedAccessException(
                $"Pedido {pedidoId} no pertenece al tenant {tenantId} (IDOR bloqueado).");
        }
    }

    public static async Task EnsureListaPrecioBelongsToTenantAsync(
        this HandySuitesDbContext db, int listaPrecioId, int tenantId)
    {
        if (!await db.ListaPrecioBelongsToTenantAsync(listaPrecioId, tenantId))
        {
            throw new UnauthorizedAccessException(
                $"ListaPrecio {listaPrecioId} no pertenece al tenant {tenantId} (IDOR bloqueado).");
        }
    }

    /// <summary>
    /// Batch variant — verifica que TODOS los IDs en la lista pertenezcan al tenant.
    /// Mas eficiente que llamar EnsureProductoBelongsToTenantAsync en loop (1 query vs N).
    /// </summary>
    public static async Task EnsureAllProductosBelongToTenantAsync(
        this HandySuitesDbContext db, IEnumerable<int> productoIds, int tenantId)
    {
        var ids = productoIds.Distinct().ToList();
        if (ids.Count == 0) return;

        var found = await db.Productos.IgnoreQueryFilters()
            .Where(p => ids.Contains(p.Id) && p.TenantId == tenantId)
            .Select(p => p.Id)
            .ToListAsync();

        if (found.Count != ids.Count)
        {
            var foreign = ids.Except(found).ToList();
            throw new UnauthorizedAccessException(
                $"Productos {string.Join(",", foreign)} no pertenecen al tenant {tenantId} (IDOR bloqueado).");
        }
    }
}
