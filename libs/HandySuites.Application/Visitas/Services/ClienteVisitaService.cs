using HandySuites.Shared.Multitenancy;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Visitas.DTOs;
using HandySuites.Application.Visitas.Interfaces;

namespace HandySuites.Application.Visitas.Services;

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
        // Cliente debe existir en el tenant (antes: cliente inexistente → 500 FK,
        // cliente de OTRO tenant → 201 con cross-tenant leak).
        if (!await _repository.ExisteClienteEnTenantAsync(dto.ClienteId, _tenant.TenantId))
            throw new InvalidOperationException("El cliente especificado no existe o no pertenece a tu empresa.");

        // La visita agendada se asigna al vendedor dueño de la cartera del cliente, para
        // que le aparezca en su app móvil (el sync mobile filtra por UsuarioId). Si el
        // cliente no tiene vendedor asignado, cae al usuario actual.
        var vendedorCliente = await _repository.ObtenerVendedorIdDeClienteAsync(dto.ClienteId, _tenant.TenantId);
        var usuarioId = vendedorCliente ?? int.Parse(_tenant.UserId);
        return await _repository.CrearAsync(dto, usuarioId, _tenant.TenantId);
    }

    public async Task<ClienteVisitaDto?> ObtenerPorIdAsync(int id)
    {
        return await _repository.ObtenerPorIdAsync(id, _tenant.TenantId);
    }

    public async Task<PaginatedResult<ClienteVisitaListaDto>> ObtenerPorFiltroAsync(ClienteVisitaFiltroDto filtro)
    {
        AplicarRbacFiltro(filtro);
        return await _repository.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);
    }

    /// <summary>
    /// Lista paginada + KPIs del MISMO set filtrado en un solo paso. El resumen se
    /// calcula sobre todo el rango (FechaDesde/FechaHasta + filtros), no sobre la página,
    /// aplicando el mismo RBAC (vendedor solo ve sus visitas) que la lista.
    /// </summary>
    public async Task<(PaginatedResult<ClienteVisitaListaDto> Lista, VisitaResumenDto Resumen)> ObtenerPorFiltroConResumenAsync(ClienteVisitaFiltroDto filtro)
    {
        AplicarRbacFiltro(filtro);
        var lista = await _repository.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);
        var resumen = await _repository.ObtenerResumenPorFiltroAsync(filtro, _tenant.TenantId);
        return (lista, resumen);
    }

    // RBAC: Vendedor/Viewer solo ve sus propias visitas → forzar UsuarioId al usuario actual.
    private void AplicarRbacFiltro(ClienteVisitaFiltroDto filtro)
    {
        if (!_tenant.IsAdminOrAbove && !_tenant.IsSuperAdmin)
        {
            if (int.TryParse(_tenant.UserId, out var vendedorId))
                filtro.UsuarioId = vendedorId;
        }
    }

    public async Task<bool> EliminarAsync(int id)
    {
        return await _repository.EliminarAsync(id, _tenant.TenantId);
    }

    // Check-in / Check-out
    public async Task<bool> CheckInAsync(int visitaId, CheckInDto dto)
    {
        await EnsureVisitaOwnedOrAdminAsync(visitaId);
        return await _repository.CheckInAsync(visitaId, dto, _tenant.TenantId);
    }

    public async Task<bool> CheckOutAsync(int visitaId, CheckOutDto dto)
    {
        await EnsureVisitaOwnedOrAdminAsync(visitaId);
        return await _repository.CheckOutAsync(visitaId, dto, _tenant.TenantId);
    }

    // RBAC: vendedor/viewer sólo puede hacer check-in/check-out de sus propias visitas.
    private async Task EnsureVisitaOwnedOrAdminAsync(int visitaId)
    {
        if (_tenant.IsAdminOrAbove || _tenant.IsSuperAdmin || _tenant.IsSupervisor) return;
        if (!int.TryParse(_tenant.UserId, out var currentUserId)) return;

        var visita = await _repository.ObtenerPorIdAsync(visitaId, _tenant.TenantId);
        if (visita == null) return; // Repo regresará false y el endpoint traducirá a 400/404.
        if (visita.UsuarioId != currentUserId)
            throw new UnauthorizedAccessException("Solo el vendedor asignado puede operar esta visita.");
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

    // Cobertura — estado de visita de los clientes activos con zona vs su frecuencia.
    public async Task<List<CoberturaClienteDto>> ObtenerCoberturaAsync()
    {
        return await _repository.ObtenerCoberturaAsync(_tenant.TenantId, DateTime.UtcNow);
    }
}
