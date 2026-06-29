using HandySuites.Application.Cobros.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Cobros.Interfaces;

public interface ICobranzaRepository
{
    Task<CobranzaResumenDto> GetResumenAsync();
    Task<CobranzaDto?> GetByIdAsync(int id);
    Task<CobranzaSuscripcion?> GetEntityByIdAsync(int id);
    Task<int> CreateAsync(CobranzaSuscripcion cobranza);
    Task<bool> UpdateAsync(CobranzaSuscripcion cobranza);
}
