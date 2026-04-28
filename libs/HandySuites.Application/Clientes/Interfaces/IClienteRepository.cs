using HandySuites.Application.Clientes.DTOs;

namespace HandySuites.Application.Clientes.Interfaces;

public interface IClienteRepository
{
    Task<int> CrearAsync(ClienteCreateDto dto, int tenantId);
    Task<List<ClienteDto>> ObtenerPorTenantAsync(int tenantId);
    Task<ClienteDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<bool> ActualizarAsync(int id, ClienteCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<ClientePaginatedResult> ObtenerPorFiltroAsync(ClienteFiltroDto filtro, int tenantId, List<int>? filterByVendedorIds = null);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<bool> ExisteNombreEnTenantAsync(string nombre, int tenantId, int? excludeId = null);
    Task<bool> AprobarProspectoAsync(int id, int tenantId);
    Task<bool> RechazarProspectoAsync(int id, int tenantId);
    Task<bool> ExisteZonaEnTenantAsync(int zonaId, int tenantId);
    Task<bool> ExisteCategoriaEnTenantAsync(int categoriaId, int tenantId);
    Task<bool> ExisteListaPreciosEnTenantAsync(int listaId, int tenantId);
    /// <summary>
    /// Devuelve el número de pedidos no terminales (Borrador/Confirmado/EnRuta)
    /// asociados al cliente. Si es > 0 no debería permitirse borrar el cliente
    /// — los pedidos activos perderían contexto al ocultarse el cliente por el
    /// global query filter (EliminadoEn == null).
    /// </summary>
    Task<int> ContarPedidosActivosAsync(int clienteId, int tenantId);
    /// <summary>
    /// Devuelve el saldo pendiente total (Pedido.Total - SUM(Cobros.Monto)) del
    /// cliente. Si es > 0 y se borra el cliente, se "pierde" visibilidad de la
    /// deuda en cartera. Se usa como advertencia al eliminar.
    /// </summary>
    Task<decimal> SaldoPendienteTotalAsync(int clienteId, int tenantId);
}
