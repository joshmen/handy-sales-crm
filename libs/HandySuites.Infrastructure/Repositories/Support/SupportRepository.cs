using HandySuites.Application.Support.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Support;

public class SupportRepository : ISupportRepository
{
    private readonly HandySuitesDbContext _db;

    public SupportRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    // ── Tenant-scoped ────────────────────────────────────────────────
    // El global query filter de tenant + soft-delete auto-acota.

    public async Task<List<TicketSoporte>> GetMisTicketsAsync()
    {
        return await _db.TicketsSoporte
            .AsNoTracking()
            .OrderByDescending(t => t.CreadoEn)
            .ToListAsync();
    }

    public async Task<TicketSoporte?> GetByIdAsync(int id)
    {
        return await _db.TicketsSoporte
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<TicketSoporte?> GetByIdConMensajesAsync(int id)
    {
        // El tenant NO debe ver mensajes internos del operador (EsInterno) ni soft-deleted.
        return await _db.TicketsSoporte
            .AsNoTracking()
            .Include(t => t.Mensajes.Where(m => !m.EsInterno && m.EliminadoEn == null))
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<int> CreateAsync(TicketSoporte ticket)
    {
        _db.TicketsSoporte.Add(ticket);
        await _db.SaveChangesAsync();
        return ticket.Id;
    }

    public async Task<int> AddMensajeAsync(MensajeTicketSoporte mensaje)
    {
        _db.MensajesTicketSoporte.Add(mensaje);
        await _db.SaveChangesAsync();
        return mensaje.Id;
    }

    public async Task UpdateAsync(TicketSoporte ticket)
    {
        _db.TicketsSoporte.Update(ticket);
        await _db.SaveChangesAsync();
    }

    // ── SuperAdmin (cross-tenant) ────────────────────────────────────

    public async Task<List<TicketSoporte>> GetAllAsync()
    {
        return await _db.TicketsSoporte
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.EliminadoEn == null)
            .OrderByDescending(t => t.CreadoEn)
            .ToListAsync();
    }

    public async Task<TicketSoporte?> GetByIdGlobalAsync(int id)
    {
        return await _db.TicketsSoporte
            .IgnoreQueryFilters()
            .Where(t => t.EliminadoEn == null)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<TicketSoporte?> GetByIdGlobalConMensajesAsync(int id)
    {
        return await _db.TicketsSoporte
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(t => t.Mensajes.Where(m => m.EliminadoEn == null))
            .Where(t => t.EliminadoEn == null)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<int> CountAbiertosAsync()
    {
        return await _db.TicketsSoporte
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(t => t.EliminadoEn == null
                && (t.Estado == EstadoTicket.Abierto || t.Estado == EstadoTicket.Pendiente));
    }

    public async Task<int> CountSinAsignarAsync()
    {
        return await _db.TicketsSoporte
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(t => t.EliminadoEn == null
                && t.AsignadoAUsuarioId == null
                && (t.Estado == EstadoTicket.Abierto || t.Estado == EstadoTicket.Pendiente));
    }

    public async Task<int> CountSlaRiesgoAsync(DateTime ahoraUtc)
    {
        return await _db.TicketsSoporte
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(t => t.EliminadoEn == null
                && t.SlaVenceEn != null
                && t.SlaVenceEn <= ahoraUtc
                && (t.Estado == EstadoTicket.Abierto || t.Estado == EstadoTicket.Pendiente));
    }
}
