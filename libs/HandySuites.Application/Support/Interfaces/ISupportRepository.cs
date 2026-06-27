using HandySuites.Domain.Entities;

namespace HandySuites.Application.Support.Interfaces;

public interface ISupportRepository
{
    // Tenant-scoped (global query filter auto-acota por tenant)
    Task<List<TicketSoporte>> GetMisTicketsAsync();
    Task<TicketSoporte?> GetByIdAsync(int id);
    Task<TicketSoporte?> GetByIdConMensajesAsync(int id);
    Task<int> CreateAsync(TicketSoporte ticket);
    Task<int> AddMensajeAsync(MensajeTicketSoporte mensaje);
    Task UpdateAsync(TicketSoporte ticket);

    // SuperAdmin (cross-tenant via IgnoreQueryFilters)
    Task<List<TicketSoporte>> GetAllAsync();
    Task<TicketSoporte?> GetByIdGlobalAsync(int id);
    Task<TicketSoporte?> GetByIdGlobalConMensajesAsync(int id);
    Task<int> CountAbiertosAsync();
    Task<int> CountSinAsignarAsync();
    Task<int> CountSlaRiesgoAsync(DateTime ahoraUtc);
}
