using HandySuites.Application.Cobranza.DTOs;

namespace HandySuites.Application.Cobranza.Interfaces;

public interface ICobroRepository
{
    Task<List<CobroDto>> ObtenerCobrosAsync(int tenantId, int? clienteId = null, DateTime? desde = null, DateTime? hasta = null, int? usuarioId = null);

    /// <summary>
    /// Agregado del PERIODO con los MISMOS filtros que ObtenerCobrosAsync
    /// (rango sobre FechaCobro + clienteId + usuarioId). CobradoTotal = SUM(Monto)
    /// y Count = COUNT calculados en SQL sobre el set filtrado completo.
    /// `desde`/`hasta` son bounds UTC half-open [desde, hasta) ya convertidos
    /// desde la fecha-local del tenant por el endpoint.
    /// </summary>
    Task<CobroPeriodoResumenDto> ObtenerResumenPeriodoAsync(int tenantId, int? clienteId = null, DateTime? desde = null, DateTime? hasta = null, int? usuarioId = null);

    Task<CobroDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(CobroCreateDto dto, int tenantId, int usuarioId);
    Task<bool> ActualizarAsync(int id, CobroUpdateDto dto, int tenantId);
    Task<bool> AnularAsync(int id, int tenantId);
    Task<List<SaldoClienteDto>> ObtenerSaldosAsync(int tenantId, int? clienteId = null, bool soloConSaldo = true);
    Task<ResumenCarteraDto> ObtenerResumenCarteraAsync(int tenantId);
    Task<EstadoCuentaDto?> ObtenerEstadoCuentaAsync(int clienteId, int tenantId, bool historico = false);
}
