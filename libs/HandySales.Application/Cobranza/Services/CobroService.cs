using HandySales.Application.Cobranza.DTOs;
using HandySales.Application.Cobranza.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Cobranza.Services;

public class CobroService
{
    private readonly ICobroRepository _repo;
    private readonly ICurrentTenant _tenant;

    public CobroService(ICobroRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<CobroDto>> ObtenerCobrosAsync(int? clienteId = null, DateTime? desde = null, DateTime? hasta = null, int? usuarioId = null)
        => _repo.ObtenerCobrosAsync(_tenant.TenantId, clienteId, desde, hasta, usuarioId);

    public Task<CobroDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public Task<int> CrearAsync(CobroCreateDto dto)
        => _repo.CrearAsync(dto, _tenant.TenantId, int.Parse(_tenant.UserId));

    public Task<bool> ActualizarAsync(int id, CobroUpdateDto dto)
        => _repo.ActualizarAsync(id, dto, _tenant.TenantId);

    public Task<bool> AnularAsync(int id)
        => _repo.AnularAsync(id, _tenant.TenantId);

    public Task<List<SaldoClienteDto>> ObtenerSaldosAsync(int? clienteId = null)
        => _repo.ObtenerSaldosAsync(_tenant.TenantId, clienteId);

    public Task<ResumenCarteraDto> ObtenerResumenCarteraAsync()
        => _repo.ObtenerResumenCarteraAsync(_tenant.TenantId);

    public Task<EstadoCuentaDto?> ObtenerEstadoCuentaAsync(int clienteId)
        => _repo.ObtenerEstadoCuentaAsync(clienteId, _tenant.TenantId);
}
