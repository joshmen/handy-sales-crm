using HandySuites.Application.ListasPrecios.Interfaces;
using HandySuites.Application.Precios.DTOs;
using HandySuites.Application.Precios.Interfaces;
using HandySuites.Application.Productos.Interfaces;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Precios.Services;

public class PrecioPorProductoService
{
    private readonly IPrecioPorProductoRepository _repo;
    private readonly IProductoRepository _productoRepo;
    private readonly IListaPrecioRepository _listaRepo;
    private readonly ICurrentTenant _tenant;

    public PrecioPorProductoService(
        IPrecioPorProductoRepository repo,
        IProductoRepository productoRepo,
        IListaPrecioRepository listaRepo,
        ICurrentTenant tenant)
    {
        _repo = repo;
        _productoRepo = productoRepo;
        _listaRepo = listaRepo;
        _tenant = tenant;
    }

    public Task<List<PrecioPorProductoDto>> ObtenerPreciosAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<PrecioPorProductoDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public Task<List<PrecioPorProductoDto>> ObtenerPorListaAsync(int listaPrecioId)
        => _repo.ObtenerPorListaAsync(listaPrecioId, _tenant.TenantId);

    public async Task<int> CrearPrecioAsync(PrecioPorProductoCreateDto dto)
    {
        await ValidarFksAsync(dto);
        // Un combo (producto, lista) debe ser único por tenant — permitir duplicados
        // lleva a UX ambigua (¿qué precio gana?) y a reportes inconsistentes.
        if (await _repo.ExisteComboAsync(dto.ProductoId, dto.ListaPrecioId, _tenant.TenantId, excludeId: null))
            throw new InvalidOperationException("Ya existe un precio para este producto en la lista seleccionada. Edítalo en vez de crear uno nuevo.");
        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarPrecioAsync(int id, PrecioPorProductoCreateDto dto)
    {
        await ValidarFksAsync(dto);
        if (await _repo.ExisteComboAsync(dto.ProductoId, dto.ListaPrecioId, _tenant.TenantId, excludeId: id))
            throw new InvalidOperationException("Ya existe otro precio para este producto en la lista seleccionada.");
        return await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    private async Task ValidarFksAsync(PrecioPorProductoCreateDto dto)
    {
        var producto = await _productoRepo.ObtenerPorIdAsync(dto.ProductoId, _tenant.TenantId);
        if (producto is null)
            throw new InvalidOperationException("El producto seleccionado no existe o no pertenece a tu empresa.");
        var lista = await _listaRepo.ObtenerPorIdAsync(dto.ListaPrecioId, _tenant.TenantId);
        if (lista is null)
            throw new InvalidOperationException("La lista de precios seleccionada no existe o no pertenece a tu empresa.");
    }

    public Task<bool> EliminarPrecioAsync(int id)
        => _repo.EliminarAsync(id, _tenant.TenantId);
}
