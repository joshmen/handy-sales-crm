using HandySales.Application.Pedidos.DTOs;
using HandySales.Application.Visitas.DTOs;
using HandySales.Domain.Entities;

namespace HandySales.Application.Visitas.Interfaces;

public interface IClienteVisitaRepository
{
    // CRUD
    Task<int> CrearAsync(ClienteVisitaCreateDto dto, int usuarioId, int tenantId);
    Task<ClienteVisitaDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<PaginatedResult<ClienteVisitaListaDto>> ObtenerPorFiltroAsync(ClienteVisitaFiltroDto filtro, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);

    // Check-in / Check-out
    Task<bool> CheckInAsync(int visitaId, CheckInDto dto, int tenantId);
    Task<bool> CheckOutAsync(int visitaId, CheckOutDto dto, int tenantId);

    // Consultas especificas
    Task<IEnumerable<ClienteVisitaListaDto>> ObtenerPorClienteAsync(int clienteId, int tenantId);
    Task<IEnumerable<ClienteVisitaListaDto>> ObtenerMisVisitasAsync(int usuarioId, int tenantId);
    Task<IEnumerable<ClienteVisitaListaDto>> ObtenerVisitasDelDiaAsync(int usuarioId, DateTime fecha, int tenantId);
    Task<ClienteVisitaDto?> ObtenerVisitaActivaAsync(int usuarioId, int tenantId);

    // Reportes
    Task<VisitaResumenDiarioDto> ObtenerResumenDiarioAsync(int usuarioId, DateTime fecha, int tenantId);
    Task<IEnumerable<VisitaResumenDiarioDto>> ObtenerResumenSemanalAsync(int usuarioId, DateTime fechaInicio, int tenantId);
}
