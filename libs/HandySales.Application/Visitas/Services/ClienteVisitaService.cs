using HandySales.Shared.Multitenancy;
using HandySales.Application.Pedidos.DTOs;
using HandySales.Application.Visitas.DTOs;
using HandySales.Application.Visitas.Interfaces;

namespace HandySales.Application.Visitas.Services;

public class ClienteVisitaService
{
    private readonly IClienteVisitaRepository _repository;
    private readonly ICurrentTenant _tenant;

    public ClienteVisitaService(IClienteVisitaRepository repository, ICurrentTenant tenant)
    {
        _repository = repository;
        _tenant = tenant;
    }

    // CRUD
    public async Task<int> CrearAsync(ClienteVisitaCreateDto dto)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.CrearAsync(dto, usuarioId, _tenant.TenantId);
    }

    public async Task<ClienteVisitaDto?> ObtenerPorIdAsync(int id)
    {
        return await _repository.ObtenerPorIdAsync(id, _tenant.TenantId);
    }

    public async Task<PaginatedResult<ClienteVisitaListaDto>> ObtenerPorFiltroAsync(ClienteVisitaFiltroDto filtro)
    {
        return await _repository.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);
    }

    public async Task<bool> EliminarAsync(int id)
    {
        return await _repository.EliminarAsync(id, _tenant.TenantId);
    }

    // Check-in / Check-out
    public async Task<bool> CheckInAsync(int visitaId, CheckInDto dto)
    {
        return await _repository.CheckInAsync(visitaId, dto, _tenant.TenantId);
    }

    public async Task<bool> CheckOutAsync(int visitaId, CheckOutDto dto)
    {
        return await _repository.CheckOutAsync(visitaId, dto, _tenant.TenantId);
    }

    // Consultas del vendedor
    public async Task<IEnumerable<ClienteVisitaListaDto>> ObtenerPorClienteAsync(int clienteId)
    {
        return await _repository.ObtenerPorClienteAsync(clienteId, _tenant.TenantId);
    }

    public async Task<IEnumerable<ClienteVisitaListaDto>> ObtenerMisVisitasAsync()
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.ObtenerMisVisitasAsync(usuarioId, _tenant.TenantId);
    }

    public async Task<IEnumerable<ClienteVisitaListaDto>> ObtenerVisitasDelDiaAsync(DateTime? fecha = null)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        var fechaConsulta = fecha ?? DateTime.UtcNow;
        return await _repository.ObtenerVisitasDelDiaAsync(usuarioId, fechaConsulta, _tenant.TenantId);
    }

    public async Task<ClienteVisitaDto?> ObtenerVisitaActivaAsync()
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.ObtenerVisitaActivaAsync(usuarioId, _tenant.TenantId);
    }

    // Consultas por usuario especifico (para admins)
    public async Task<IEnumerable<ClienteVisitaListaDto>> ObtenerPorUsuarioAsync(int usuarioId)
    {
        return await _repository.ObtenerMisVisitasAsync(usuarioId, _tenant.TenantId);
    }

    public async Task<IEnumerable<ClienteVisitaListaDto>> ObtenerVisitasDelDiaPorUsuarioAsync(int usuarioId, DateTime? fecha = null)
    {
        var fechaConsulta = fecha ?? DateTime.UtcNow;
        return await _repository.ObtenerVisitasDelDiaAsync(usuarioId, fechaConsulta, _tenant.TenantId);
    }

    // Reportes
    public async Task<VisitaResumenDiarioDto> ObtenerMiResumenDiarioAsync(DateTime? fecha = null)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        var fechaConsulta = fecha ?? DateTime.UtcNow;
        return await _repository.ObtenerResumenDiarioAsync(usuarioId, fechaConsulta, _tenant.TenantId);
    }

    public async Task<IEnumerable<VisitaResumenDiarioDto>> ObtenerMiResumenSemanalAsync(DateTime? fechaInicio = null)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        var fechaConsulta = fechaInicio ?? DateTime.UtcNow.AddDays(-6);
        return await _repository.ObtenerResumenSemanalAsync(usuarioId, fechaConsulta, _tenant.TenantId);
    }

    public async Task<VisitaResumenDiarioDto> ObtenerResumenDiarioPorUsuarioAsync(int usuarioId, DateTime? fecha = null)
    {
        var fechaConsulta = fecha ?? DateTime.UtcNow;
        return await _repository.ObtenerResumenDiarioAsync(usuarioId, fechaConsulta, _tenant.TenantId);
    }
}
