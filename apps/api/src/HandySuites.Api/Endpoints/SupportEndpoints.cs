using HandySuites.Application.Notifications.DTOs;
using HandySuites.Application.Notifications.Interfaces;
using HandySuites.Application.Support.DTOs;
using HandySuites.Application.Support.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class SupportEndpoints
{
    public static void MapSupportEndpoints(this IEndpointRouteBuilder app)
    {
        // ── (a) TENANT — cualquier usuario autenticado ───────────────
        var tenant = app.MapGroup("/api/support/tickets")
            .RequireAuthorization()
            .RequireCors("HandySuitesPolicy");

        tenant.MapGet("/", GetMisTickets)
            .WithName("GetMisTicketsSoporte")
            .WithSummary("Lista los tickets de soporte del tenant actual");

        tenant.MapGet("/{id:int}", GetMiTicketById)
            .WithName("GetMiTicketSoporteById")
            .WithSummary("Obtiene un ticket de soporte del tenant con sus mensajes");

        tenant.MapPost("/", CrearTicket)
            .WithName("CrearTicketSoporte")
            .WithSummary("Crea un nuevo ticket de soporte");

        tenant.MapPost("/{id:int}/mensajes", ResponderTicket)
            .WithName("ResponderTicketSoporte")
            .WithSummary("Agrega un mensaje del cliente a un ticket de soporte");

        // ── (b) SUPER_ADMIN — backoffice de soporte ──────────────────
        var sa = app.MapGroup("/api/superadmin/support")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .RequireCors("HandySuitesPolicy");

        sa.MapGet("/", GetAllSa)
            .WithName("GetAllTicketsSoporteSa")
            .WithSummary("Lista todos los tickets de soporte con KPIs (SuperAdmin)");

        sa.MapGet("/{id:int}", GetByIdSa)
            .WithName("GetTicketSoporteByIdSa")
            .WithSummary("Obtiene un ticket de soporte cualquiera con sus mensajes (SuperAdmin)");

        sa.MapPatch("/{id:int}", ActualizarSa)
            .WithName("ActualizarTicketSoporteSa")
            .WithSummary("Asigna/cambia estado o prioridad de un ticket (SuperAdmin)");

        sa.MapPost("/{id:int}/mensajes", ResponderSa)
            .WithName("ResponderTicketSoporteSa")
            .WithSummary("Agrega una respuesta del operador y notifica al creador (SuperAdmin)");
    }

    // ──────────────────────────── TENANT ────────────────────────────

    private static async Task<IResult> GetMisTickets(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISupportRepository repo)
    {
        var tickets = await repo.GetMisTicketsAsync();
        return Results.Ok(tickets.Select(MapToDto));
    }

    private static async Task<IResult> GetMiTicketById(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISupportRepository repo)
    {
        var ticket = await repo.GetByIdConMensajesAsync(id);
        if (ticket == null)
            return Results.NotFound(new { message = "Ticket no encontrado" });

        return Results.Ok(MapToDetalleDto(ticket));
    }

    private static async Task<IResult> CrearTicket(
        [FromBody] CrearTicketDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISupportRepository repo)
    {
        if (string.IsNullOrWhiteSpace(dto.Asunto))
            return Results.BadRequest(new { message = "El asunto es obligatorio" });

        var creadoPorUsuarioId = int.Parse(currentTenant.UserId);

        var ticket = new TicketSoporte
        {
            TenantId = currentTenant.TenantId,
            CreadoPorUsuarioId = creadoPorUsuarioId,
            Asunto = dto.Asunto,
            Categoria = dto.Categoria,
            Canal = dto.Canal,
            Prioridad = dto.Prioridad,
            Estado = EstadoTicket.Abierto
        };

        if (!string.IsNullOrWhiteSpace(dto.Cuerpo))
        {
            ticket.Mensajes.Add(new MensajeTicketSoporte
            {
                AutorUsuarioId = creadoPorUsuarioId,
                EsOperador = false,
                EsInterno = false,
                Cuerpo = dto.Cuerpo
            });
        }

        var id = await repo.CreateAsync(ticket);
        return Results.Created($"/api/support/tickets/{id}", new { id });
    }

    private static async Task<IResult> ResponderTicket(
        int id,
        [FromBody] ResponderTicketDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISupportRepository repo)
    {
        if (string.IsNullOrWhiteSpace(dto.Cuerpo))
            return Results.BadRequest(new { message = "El cuerpo del mensaje es obligatorio" });

        var ticket = await repo.GetByIdAsync(id);
        if (ticket == null)
            return Results.NotFound(new { message = "Ticket no encontrado" });

        var mensaje = new MensajeTicketSoporte
        {
            TicketId = id,
            AutorUsuarioId = int.Parse(currentTenant.UserId),
            EsOperador = false,
            EsInterno = false,
            Cuerpo = dto.Cuerpo
        };

        var mensajeId = await repo.AddMensajeAsync(mensaje);
        return Results.Created($"/api/support/tickets/{id}/mensajes/{mensajeId}", new { id = mensajeId });
    }

    // ─────────────────────────── SUPER_ADMIN ────────────────────────

    private static async Task<IResult> GetAllSa(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISupportRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tickets = await repo.GetAllAsync();
        var abiertos = await repo.CountAbiertosAsync();
        var sinAsignar = await repo.CountSinAsignarAsync();
        var slaRiesgo = await repo.CountSlaRiesgoAsync(DateTime.UtcNow);

        return Results.Ok(new
        {
            kpis = new
            {
                abiertos,
                sinAsignar,
                slaRiesgo,
                csat = "Sin datos"
            },
            tickets = tickets.Select(MapToDto)
        });
    }

    private static async Task<IResult> GetByIdSa(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISupportRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var ticket = await repo.GetByIdGlobalConMensajesAsync(id);
        if (ticket == null)
            return Results.NotFound(new { message = "Ticket no encontrado" });

        return Results.Ok(MapToDetalleDto(ticket));
    }

    private static async Task<IResult> ActualizarSa(
        int id,
        [FromBody] ActualizarTicketDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISupportRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var ticket = await repo.GetByIdGlobalAsync(id);
        if (ticket == null)
            return Results.NotFound(new { message = "Ticket no encontrado" });

        if (dto.AsignadoAUsuarioId.HasValue)
            ticket.AsignadoAUsuarioId = dto.AsignadoAUsuarioId.Value;

        if (dto.Estado.HasValue)
            ticket.Estado = dto.Estado.Value;

        if (dto.Prioridad.HasValue)
            ticket.Prioridad = dto.Prioridad.Value;

        await repo.UpdateAsync(ticket);
        return Results.Ok(new { message = "Ticket actualizado" });
    }

    private static async Task<IResult> ResponderSa(
        int id,
        [FromBody] ResponderTicketDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISupportRepository repo,
        [FromServices] INotificationService notificationService)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        if (string.IsNullOrWhiteSpace(dto.Cuerpo))
            return Results.BadRequest(new { message = "El cuerpo del mensaje es obligatorio" });

        var ticket = await repo.GetByIdGlobalAsync(id);
        if (ticket == null)
            return Results.NotFound(new { message = "Ticket no encontrado" });

        var mensaje = new MensajeTicketSoporte
        {
            TicketId = id,
            AutorUsuarioId = null,
            EsOperador = true,
            EsInterno = dto.EsInterno ?? false,
            Cuerpo = dto.Cuerpo
        };

        var mensajeId = await repo.AddMensajeAsync(mensaje);

        // Notificar al creador del ticket (solo si la respuesta no es interna)
        if (!(dto.EsInterno ?? false))
        {
            try
            {
                await notificationService.EnviarNotificacionAsync(new SendNotificationDto
                {
                    UsuarioId = ticket.CreadoPorUsuarioId,
                    Titulo = "Respuesta a tu ticket",
                    Mensaje = $"Soporte respondió a tu ticket \"{ticket.Asunto}\".",
                    Tipo = "General",
                    Data = new Dictionary<string, string> { ["ticketId"] = ticket.Id.ToString() },
                    // El notif debe vivir en el tenant del creador, no en el del SuperAdmin.
                    TenantIdOverride = ticket.TenantId
                });
            }
            catch { /* la notificación no debe bloquear la respuesta del operador */ }
        }

        return Results.Created($"/api/superadmin/support/{id}/mensajes/{mensajeId}", new { id = mensajeId });
    }

    // ──────────────────────────── Mappers ───────────────────────────

    private static TicketSoporteDto MapToDto(TicketSoporte t) => new()
    {
        Id = t.Id,
        TenantId = t.TenantId,
        CreadoPorUsuarioId = t.CreadoPorUsuarioId,
        Asunto = t.Asunto,
        Categoria = t.Categoria,
        Canal = t.Canal,
        Prioridad = t.Prioridad,
        AsignadoAUsuarioId = t.AsignadoAUsuarioId,
        Estado = t.Estado,
        SlaVenceEn = t.SlaVenceEn,
        CreadoEn = t.CreadoEn,
        ActualizadoEn = t.ActualizadoEn
    };

    private static TicketDetalleDto MapToDetalleDto(TicketSoporte t) => new()
    {
        Id = t.Id,
        TenantId = t.TenantId,
        CreadoPorUsuarioId = t.CreadoPorUsuarioId,
        Asunto = t.Asunto,
        Categoria = t.Categoria,
        Canal = t.Canal,
        Prioridad = t.Prioridad,
        AsignadoAUsuarioId = t.AsignadoAUsuarioId,
        Estado = t.Estado,
        SlaVenceEn = t.SlaVenceEn,
        CreadoEn = t.CreadoEn,
        ActualizadoEn = t.ActualizadoEn,
        Mensajes = t.Mensajes
            .OrderBy(m => m.CreadoEn)
            .Select(m => new MensajeTicketSoporteDto
            {
                Id = m.Id,
                TicketId = m.TicketId,
                AutorUsuarioId = m.AutorUsuarioId,
                EsOperador = m.EsOperador,
                EsInterno = m.EsInterno,
                Cuerpo = m.Cuerpo,
                CreadoEn = m.CreadoEn
            })
            .ToList()
    };
}
