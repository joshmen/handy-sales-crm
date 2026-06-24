namespace HandySuites.Application.Contabilidad;

/// <summary>
/// CORE contable (partida doble) ON-DEMAND. Genera asientos a partir de
/// operaciones reales (pedidos, cobros, gastos contables) en un rango y deriva
/// balanza, estado de resultados, balance general, reporte de IVA y DIOT.
/// No persiste polizas; el catalogo de cuentas vive en codigo.
/// </summary>
public interface IContabilidadService
{
    /// <summary>
    /// Genera la lista de asientos balanceados del tenant en el rango dado.
    /// Cada asiento cumple sum(Debe) == sum(Haber).
    /// </summary>
    Task<IReadOnlyList<Asiento>> GenerarAsientosAsync(int tenantId, DateTime desde, DateTime hasta);

    Task<BalanzaResult> GenerarBalanzaAsync(int tenantId, DateTime desde, DateTime hasta);

    Task<EstadoResultadosResult> GenerarEstadoResultadosAsync(int tenantId, DateTime desde, DateTime hasta);

    /// <summary>Balance General al corte. desde = inicio de tiempo, hasta = corte.</summary>
    Task<BalanceGeneralResult> GenerarBalanceGeneralAsync(int tenantId, DateTime hasta);

    Task<ReporteIvaResult> GenerarReporteIvaAsync(int tenantId, DateTime desde, DateTime hasta);

    Task<DiotResult> GenerarDiotAsync(int tenantId, DateTime desde, DateTime hasta);
}
