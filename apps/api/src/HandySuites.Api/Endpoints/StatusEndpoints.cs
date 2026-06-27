using HandySuites.Application.SystemStatus.DTOs;
using HandySuites.Application.SystemStatus.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

public static class StatusEndpoints
{
    public static void MapStatusEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/system-status")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .RequireCors("HandySuitesPolicy");

        group.MapGet("/incidentes", GetIncidentes)
            .WithName("GetSystemIncidentes")
            .WithSummary("Lista todos los incidentes del sistema (SuperAdmin)");

        group.MapGet("/incidentes/{id:int}", GetIncidenteById)
            .WithName("GetSystemIncidenteById")
            .WithSummary("Obtiene un incidente por ID (SuperAdmin)");

        group.MapPost("/incidentes", CrearIncidente)
            .WithName("CreateSystemIncidente")
            .WithSummary("Crea un nuevo incidente del sistema (SuperAdmin)");

        group.MapPost("/incidentes/{id:int}/actualizaciones", AgregarActualizacion)
            .WithName("AddSystemIncidenteActualizacion")
            .WithSummary("Agrega una actualización a un incidente (SuperAdmin)");

        group.MapPatch("/incidentes/{id:int}/resolver", ResolverIncidente)
            .WithName("ResolveSystemIncidente")
            .WithSummary("Marca un incidente como resuelto (SuperAdmin)");

        group.MapGet("/health", GetHealth)
            .WithName("GetSystemHealth")
            .WithSummary("Estado de salud de los servicios de la plataforma (SuperAdmin)");
    }

    private static async Task<IResult> GetIncidentes(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IIncidenteRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var incidentes = await repo.GetAllAsync();
        return Results.Ok(incidentes.Select(MapToDto).ToList());
    }

    private static async Task<IResult> GetIncidenteById(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IIncidenteRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var incidente = await repo.GetByIdAsync(id);
        if (incidente == null)
            return Results.NotFound(new { message = "Incidente no encontrado" });

        return Results.Ok(MapToDto(incidente));
    }

    private static async Task<IResult> CrearIncidente(
        [FromBody] CrearIncidenteDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IIncidenteRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        if (string.IsNullOrWhiteSpace(dto.Titulo))
            return Results.BadRequest(new { message = "El título es obligatorio" });

        var incidente = new Incidente
        {
            Titulo = dto.Titulo,
            Componente = dto.Componente,
            Severidad = dto.Severidad,
            Estado = dto.Estado,
            IniciadoEn = DateTime.UtcNow
        };

        if (dto.Estado == EstadoIncidente.Resuelto)
            incidente.ResueltoEn = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(dto.MensajeInicial))
        {
            incidente.Actualizaciones.Add(new IncidenteActualizacion
            {
                Mensaje = dto.MensajeInicial,
                Estado = dto.Estado
            });
        }

        var id = await repo.CreateAsync(incidente);
        return Results.Created($"/api/superadmin/system-status/incidentes/{id}", new { id });
    }

    private static async Task<IResult> AgregarActualizacion(
        int id,
        [FromBody] CrearActualizacionDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IIncidenteRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var incidente = await repo.GetByIdAsync(id);
        if (incidente == null)
            return Results.NotFound(new { message = "Incidente no encontrado" });

        if (string.IsNullOrWhiteSpace(dto.Mensaje))
            return Results.BadRequest(new { message = "El mensaje es obligatorio" });

        incidente.Actualizaciones.Add(new IncidenteActualizacion
        {
            IncidenteId = incidente.Id,
            Mensaje = dto.Mensaje,
            Estado = dto.Estado
        });

        incidente.Estado = dto.Estado;

        if (dto.Estado == EstadoIncidente.Resuelto && incidente.ResueltoEn == null)
            incidente.ResueltoEn = DateTime.UtcNow;

        await repo.UpdateAsync(incidente);
        return Results.Ok(new { message = "Actualización agregada" });
    }

    private static async Task<IResult> ResolverIncidente(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IIncidenteRepository repo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var incidente = await repo.GetByIdAsync(id);
        if (incidente == null)
            return Results.NotFound(new { message = "Incidente no encontrado" });

        incidente.Estado = EstadoIncidente.Resuelto;
        if (incidente.ResueltoEn == null)
            incidente.ResueltoEn = DateTime.UtcNow;

        await repo.UpdateAsync(incidente);
        return Results.Ok(new { message = "Incidente resuelto" });
    }

    private static async Task<IResult> GetHealth(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var dbOk = await db.Database.CanConnectAsync();

        var servicios = new List<SaludServicioDto>
        {
            new()
            {
                Nombre = "API Gateway",
                Estado = "Operativo",
                Detalle = "El servicio responde correctamente"
            },
            new()
            {
                Nombre = "Base de datos",
                Estado = dbOk ? "Operativo" : "Degradado",
                Detalle = dbOk ? "Conexión establecida" : "No se pudo establecer conexión"
            },
            new()
            {
                Nombre = "Sincronización",
                Estado = "Sin datos",
                Detalle = "Sin datos"
            },
            new()
            {
                Nombre = "Timbrado CFDI Finkok",
                Estado = "Sin datos",
                Detalle = "Sin datos"
            },
            new()
            {
                Nombre = "App móvil",
                Estado = "Sin datos",
                Detalle = "Sin datos"
            }
        };

        return Results.Ok(servicios);
    }

    private static IncidenteDto MapToDto(Incidente incidente)
    {
        return new IncidenteDto
        {
            Id = incidente.Id,
            Titulo = incidente.Titulo,
            Componente = incidente.Componente,
            Severidad = incidente.Severidad,
            Estado = incidente.Estado,
            IniciadoEn = incidente.IniciadoEn,
            ResueltoEn = incidente.ResueltoEn,
            Actualizaciones = incidente.Actualizaciones
                .OrderBy(a => a.CreadoEn)
                .Select(a => new IncidenteActualizacionDto
                {
                    Id = a.Id,
                    IncidenteId = a.IncidenteId,
                    Mensaje = a.Mensaje,
                    Estado = a.Estado,
                    CreadoEn = a.CreadoEn
                })
                .ToList()
        };
    }
}
