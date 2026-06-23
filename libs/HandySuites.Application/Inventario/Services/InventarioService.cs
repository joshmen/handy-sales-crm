using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Inventario.DTOs;
using HandySuites.Application.Inventario.Interfaces;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Inventario.Services;

public class InventarioService
{
    private readonly IInventarioRepository _repo;
    private readonly ICurrentTenant _tenant;
    private readonly ITransactionManager _transactionManager;

    public InventarioService(IInventarioRepository repo, ICurrentTenant tenant, ITransactionManager transactionManager)
    {
        _repo = repo;
        _tenant = tenant;
        _transactionManager = transactionManager;
    }

    public Task<List<InventarioDto>> ObtenerInventarioAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<InventarioDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public Task<InventarioDto?> ObtenerPorProductoIdAsync(int productoId)
        => _repo.ObtenerPorProductoIdAsync(productoId, _tenant.TenantId);

    public enum CrearInventarioErrorKind { None, ProductoNoExiste, Duplicado }
    public record CrearInventarioResult(bool Success, int Id = 0, string? Error = null, CrearInventarioErrorKind ErrorKind = CrearInventarioErrorKind.None);

    public async Task<CrearInventarioResult> CrearInventarioAsync(InventarioCreateDto dto)
    {
        // Producto debe existir en el tenant (antes caía en 500 por FK violation).
        if (!await _repo.ExisteProductoEnTenantAsync(dto.ProductoId, _tenant.TenantId))
            return new CrearInventarioResult(false,
                Error: "El producto seleccionado no existe o no pertenece a tu empresa.",
                ErrorKind: CrearInventarioErrorKind.ProductoNoExiste);

        // M-12: serializar check-then-create con advisory lock por producto+tenant para
        // evitar duplicados en carreras concurrentes (oversell del mismo producto en
        // dos requests paralelas). `pg_advisory_xact_lock` se libera al cerrar la
        // transacción; en SQLite/otros providers el lock es no-op silencioso.
        return await _transactionManager.ExecuteInTransactionAsync<CrearInventarioResult>(async () =>
        {
            await _repo.AcquireProductoLockAsync(_tenant.TenantId, dto.ProductoId);

            // Validar que no exista inventario para este producto
            var existente = await _repo.ObtenerPorProductoIdAsync(dto.ProductoId, _tenant.TenantId);
            if (existente != null)
                return new CrearInventarioResult(false,
                    Error: "Este producto ya tiene un registro de inventario. Edítalo en lugar de crear uno nuevo.",
                    ErrorKind: CrearInventarioErrorKind.Duplicado);

            var id = await _repo.CrearAsync(dto, _tenant.TenantId);
            return new CrearInventarioResult(true, id);
        });
    }

    public Task<bool> ActualizarInventarioAsync(int id, InventarioUpdateDto dto)
        => _repo.ActualizarAsync(id, dto, _tenant.TenantId);

    public Task<bool> EliminarInventarioAsync(int id)
        => _repo.EliminarAsync(id, _tenant.TenantId);

    public Task<InventarioPaginatedResult> ObtenerPorFiltroAsync(InventarioFiltroDto filtro)
        => _repo.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);

    public Task<InventarioResumenDto> ObtenerResumenAsync()
        => _repo.ObtenerResumenAsync(_tenant.TenantId);
}
