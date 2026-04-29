using HandySuites.Application.Impuestos.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Impuestos.Interfaces;

public interface ITasaImpuestoRepository
{
    Task<List<TasaImpuestoDto>> ObtenerTodasAsync(int tenantId, bool incluirInactivas = false);
    Task<TasaImpuestoDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<TasaImpuesto?> ObtenerEntidadAsync(int id, int tenantId);
    Task<TasaImpuesto?> ObtenerDefaultAsync(int tenantId);
    Task<int> CrearAsync(TasaImpuesto tasa);
    Task<bool> ActualizarAsync(TasaImpuesto tasa);
    Task<bool> EliminarAsync(int id, int tenantId);
    /// <summary>Pone EsDefault=false en todas las tasas del tenant excepto la indicada (si !=0).</summary>
    Task UnsetDefaultExceptAsync(int tenantId, int exceptTasaId);

    /// <summary>
    /// Propaga la tasa central a `Producto.Tasa` denormalizado en todos los productos
    /// con `TasaImpuestoId = tasaId`. Usado tras editar una tasa central. Devuelve
    /// la cantidad de productos actualizados.
    /// </summary>
    Task<int> PropagarTasaAProductosAsync(int tenantId, int tasaId, decimal nuevaTasa);

    /// <summary>
    /// Propaga el valor a `Producto.Tasa` para todos los productos con `TasaImpuestoId IS NULL`.
    /// Usado al cambiar la tasa default del tenant o al borrar una tasa.
    /// Devuelve la cantidad de productos actualizados.
    /// </summary>
    Task<int> PropagarTasaADefaultProductosAsync(int tenantId, decimal nuevaTasa);
}
