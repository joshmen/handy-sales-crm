using HandySales.Application.Cobranza.DTOs;

namespace HandySales.Application.Cobranza.Interfaces;

public interface ICobroRepository
{
    Task<List<CobroDto>> ObtenerCobrosAsync(int tenantId, int? clienteId = null, DateTime? desde = null, DateTime? hasta = null, int? usuarioId = null);
    Task<CobroDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(CobroCreateDto dto, int tenantId, int usuarioId);
    Task<bool> ActualizarAsync(int id, CobroUpdateDto dto, int tenantId);
    Task<bool> AnularAsync(int id, int tenantId);
    Task<List<SaldoClienteDto>> ObtenerSaldosAsync(int tenantId, int? clienteId = null);
    Task<ResumenCarteraDto> ObtenerResumenCarteraAsync(int tenantId);
    Task<EstadoCuentaDto?> ObtenerEstadoCuentaAsync(int clienteId, int tenantId);
}
