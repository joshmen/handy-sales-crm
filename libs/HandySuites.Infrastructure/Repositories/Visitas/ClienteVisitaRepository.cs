using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Visitas.DTOs;
using HandySuites.Application.Visitas.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HandySuites.Infrastructure.Repositories.Visitas;

public class ClienteVisitaRepository : IClienteVisitaRepository
{
    private readonly HandySuitesDbContext _db;

    public ClienteVisitaRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<int> CrearAsync(ClienteVisitaCreateDto dto, int usuarioId, int tenantId)
    {
        var visita = new ClienteVisita
        {
            TenantId = tenantId,
            ClienteId = dto.ClienteId,
            UsuarioId = usuarioId,
            FechaProgramada = dto.FechaProgramada,
            TipoVisita = dto.TipoVisita,
            Resultado = ResultadoVisita.Pendiente,
            Notas = dto.Notas,
            Activo = true,
            CreadoEn = DateTime.UtcNow
        };

        _db.ClienteVisitas.Add(visita);
        await _db.SaveChangesAsync();

        return visita.Id;
    }

    public async Task<ClienteVisitaDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        var visita = await _db.ClienteVisitas
            .AsNoTracking()
            .Include(v => v.Cliente)
            .Include(v => v.Usuario)
            .Include(v => v.Pedido)
            .Where(v => v.Id == id && v.TenantId == tenantId && v.Activo)
            .FirstOrDefaultAsync();

        if (visita == null) return null;

        return new ClienteVisitaDto
        {
            Id = visita.Id,
            ClienteId = visita.ClienteId,
            ClienteNombre = visita.Cliente.Nombre,
            ClienteDireccion = visita.Cliente.Direccion,
            UsuarioId = visita.UsuarioId,
            UsuarioNombre = visita.Usuario.Nombre,
            PedidoId = visita.PedidoId,
            NumeroPedido = visita.Pedido?.NumeroPedido,
            FechaProgramada = visita.FechaProgramada,
            FechaHoraInicio = visita.FechaHoraInicio,
            FechaHoraFin = visita.FechaHoraFin,
            TipoVisita = visita.TipoVisita,
            Resultado = visita.Resultado,
            LatitudInicio = visita.LatitudInicio,
            LongitudInicio = visita.LongitudInicio,
            LatitudFin = visita.LatitudFin,
            LongitudFin = visita.LongitudFin,
            DistanciaCliente = visita.DistanciaCliente,
            Notas = visita.Notas,
            NotasPrivadas = visita.NotasPrivadas,
            Fotos = string.IsNullOrEmpty(visita.Fotos) ? null : JsonSerializer.Deserialize<List<string>>(visita.Fotos),
            DuracionMinutos = visita.DuracionMinutos,
            CreadoEn = visita.CreadoEn
        };
    }

    public async Task<PaginatedResult<ClienteVisitaListaDto>> ObtenerPorFiltroAsync(ClienteVisitaFiltroDto filtro, int tenantId)
    {
        var query = _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.TenantId == tenantId && v.Activo);

        if (filtro.ClienteId.HasValue)
            query = query.Where(v => v.ClienteId == filtro.ClienteId.Value);

        if (filtro.UsuarioId.HasValue)
            query = query.Where(v => v.UsuarioId == filtro.UsuarioId.Value);

        if (filtro.FechaDesde.HasValue)
            query = query.Where(v => v.FechaProgramada >= filtro.FechaDesde.Value || v.FechaHoraInicio >= filtro.FechaDesde.Value);

        if (filtro.FechaHasta.HasValue)
            query = query.Where(v => v.FechaProgramada <= filtro.FechaHasta.Value || v.FechaHoraInicio <= filtro.FechaHasta.Value);

        if (filtro.TipoVisita.HasValue)
            query = query.Where(v => v.TipoVisita == filtro.TipoVisita.Value);

        if (filtro.Resultado.HasValue)
            query = query.Where(v => v.Resultado == filtro.Resultado.Value);

        if (filtro.SoloPendientes == true)
            query = query.Where(v => v.Resultado == ResultadoVisita.Pendiente);

        var totalItems = await query.CountAsync();
        var pagina = (filtro.Pagina is int p && p > 0) ? p : 1;
        var tamano = (filtro.TamanoPagina is int t && t > 0) ? Math.Min(t, 200) : 20;

        // 2026-06-09 cross-DB OrderBy
        var isPostgres = _db.Database.ProviderName?.Contains("Npgsql") == true;
        var orderedQuery = isPostgres
            ? query.OrderByDescending(v => v.FechaProgramada ?? v.FechaHoraInicio ?? v.CreadoEn)
            : query.OrderByDescending(v =>
                v.FechaProgramada.HasValue ? v.FechaProgramada.Value
                : v.FechaHoraInicio.HasValue ? v.FechaHoraInicio.Value
                : v.CreadoEn);

        var visitas = await orderedQuery
            .Skip((pagina - 1) * tamano)
            .Take(tamano)
            .Select(v => new ClienteVisitaListaDto
            {
                Id = v.Id,
                ClienteId = v.ClienteId,
                ClienteNombre = v.Cliente.Nombre,
                ClienteDireccion = v.Cliente.Direccion,
                FechaProgramada = v.FechaProgramada,
                FechaHoraInicio = v.FechaHoraInicio,
                FechaHoraFin = v.FechaHoraFin,
                TipoVisita = v.TipoVisita,
                Resultado = v.Resultado,
                DuracionMinutos = v.DuracionMinutos,
                TienePedido = v.PedidoId.HasValue
            })
            .ToListAsync();

        return new PaginatedResult<ClienteVisitaListaDto>
        {
            Items = visitas,
            TotalItems = totalItems,
            Pagina = pagina,
            TamanoPagina = tamano
        };
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var visita = await _db.ClienteVisitas
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenantId && v.Activo);

        if (visita == null) return false;

        // Una visita completada (con fecha fin) ya tiene efectos (GPS, pedidos, embeddings);
        // eliminar destruye audit trail. Permitir sólo borrar las Pendientes/InProgress.
        if (visita.FechaHoraFin.HasValue)
            return false;

        visita.Activo = false;
        visita.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> CheckInAsync(int visitaId, CheckInDto dto, int tenantId)
    {
        var visita = await _db.ClienteVisitas
            .FirstOrDefaultAsync(v => v.Id == visitaId && v.TenantId == tenantId && v.Activo);

        if (visita == null) return false;

        // No permitir check-in si ya tiene uno
        if (visita.FechaHoraInicio.HasValue) return false;

        visita.FechaHoraInicio = DateTime.UtcNow;
        visita.LatitudInicio = dto.Latitud;
        visita.LongitudInicio = dto.Longitud;

        if (!string.IsNullOrEmpty(dto.Notas))
        {
            visita.Notas = string.IsNullOrEmpty(visita.Notas)
                ? dto.Notas
                : $"{visita.Notas}\n[Check-in] {dto.Notas}";
        }

        // Calcular distancia al cliente via PostGIS ST_DistanceSphere (meters)
        var distancia = await _db.Database
            .SqlQueryRaw<double?>(@"
                SELECT ST_DistanceSphere(
                    ST_SetSRID(ST_MakePoint({0}, {1}), 4326),
                    ubicacion
                ) AS ""Value""
                FROM ""Clientes""
                WHERE id = {2} AND ubicacion IS NOT NULL",
                dto.Longitud, dto.Latitud, visita.ClienteId)
            .FirstOrDefaultAsync();

        if (distancia.HasValue)
        {
            visita.DistanciaCliente = Math.Round(distancia.Value, 1);
        }

        visita.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> CheckOutAsync(int visitaId, CheckOutDto dto, int tenantId)
    {
        var visita = await _db.ClienteVisitas
            .FirstOrDefaultAsync(v => v.Id == visitaId && v.TenantId == tenantId && v.Activo);

        if (visita == null) return false;

        // No permitir check-out sin check-in
        if (!visita.FechaHoraInicio.HasValue) return false;

        // No permitir check-out duplicado
        if (visita.FechaHoraFin.HasValue) return false;

        visita.FechaHoraFin = DateTime.UtcNow;
        visita.LatitudFin = dto.Latitud;
        visita.LongitudFin = dto.Longitud;
        visita.Resultado = dto.Resultado;
        visita.PedidoId = dto.PedidoId;

        if (!string.IsNullOrEmpty(dto.Notas))
        {
            visita.Notas = string.IsNullOrEmpty(visita.Notas)
                ? dto.Notas
                : $"{visita.Notas}\n[Check-out] {dto.Notas}";
        }

        visita.NotasPrivadas = dto.NotasPrivadas;

        if (dto.Fotos != null && dto.Fotos.Any())
        {
            visita.Fotos = JsonSerializer.Serialize(dto.Fotos);
        }

        // Calcular duracion
        visita.DuracionMinutos = (int)(visita.FechaHoraFin.Value - visita.FechaHoraInicio.Value).TotalMinutes;

        visita.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<IEnumerable<ClienteVisitaListaDto>> ObtenerPorClienteAsync(int clienteId, int tenantId)
    {
        // 2026-06-09 cross-DB OrderBy
        var isPostgres = _db.Database.ProviderName?.Contains("Npgsql") == true;
        var baseQuery = _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.ClienteId == clienteId && v.TenantId == tenantId && v.Activo);
        var orderedQuery = isPostgres
            ? baseQuery.OrderByDescending(v => v.FechaProgramada ?? v.FechaHoraInicio ?? v.CreadoEn)
            : baseQuery.OrderByDescending(v =>
                v.FechaProgramada.HasValue ? v.FechaProgramada.Value
                : v.FechaHoraInicio.HasValue ? v.FechaHoraInicio.Value
                : v.CreadoEn);

        return await orderedQuery
            .Take(50)
            .Select(v => new ClienteVisitaListaDto
            {
                Id = v.Id,
                ClienteId = v.ClienteId,
                ClienteNombre = v.Cliente.Nombre,
                ClienteDireccion = v.Cliente.Direccion,
                FechaProgramada = v.FechaProgramada,
                FechaHoraInicio = v.FechaHoraInicio,
                FechaHoraFin = v.FechaHoraFin,
                TipoVisita = v.TipoVisita,
                Resultado = v.Resultado,
                DuracionMinutos = v.DuracionMinutos,
                TienePedido = v.PedidoId.HasValue
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<ClienteVisitaListaDto>> ObtenerMisVisitasAsync(int usuarioId, int tenantId)
    {
        var hoy = DateTime.UtcNow.Date;
        // 2026-06-09 cross-DB OrderBy
        var isPostgres = _db.Database.ProviderName?.Contains("Npgsql") == true;
        var baseQuery = _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.UsuarioId == usuarioId && v.TenantId == tenantId && v.Activo)
            .Where(v => v.FechaProgramada >= hoy || v.FechaHoraInicio >= hoy);
        var orderedQuery = isPostgres
            ? baseQuery.OrderBy(v => v.FechaProgramada ?? v.FechaHoraInicio)
            : baseQuery.OrderBy(v =>
                v.FechaProgramada.HasValue ? v.FechaProgramada.Value
                : v.FechaHoraInicio.HasValue ? v.FechaHoraInicio.Value
                : DateTime.MaxValue);

        return await orderedQuery
            .Take(50)
            .Select(v => new ClienteVisitaListaDto
            {
                Id = v.Id,
                ClienteId = v.ClienteId,
                ClienteNombre = v.Cliente.Nombre,
                ClienteDireccion = v.Cliente.Direccion,
                FechaProgramada = v.FechaProgramada,
                FechaHoraInicio = v.FechaHoraInicio,
                FechaHoraFin = v.FechaHoraFin,
                TipoVisita = v.TipoVisita,
                Resultado = v.Resultado,
                DuracionMinutos = v.DuracionMinutos,
                TienePedido = v.PedidoId.HasValue
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<ClienteVisitaListaDto>> ObtenerVisitasDelDiaAsync(int usuarioId, DateTime fecha, int tenantId)
    {
        var fechaInicio = fecha.Date;
        var fechaFin = fecha.Date.AddDays(1);

        // 2026-06-09 cross-DB OrderBy
        var isPostgres = _db.Database.ProviderName?.Contains("Npgsql") == true;
        var baseQuery = _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.UsuarioId == usuarioId && v.TenantId == tenantId && v.Activo)
            .Where(v =>
                (v.FechaProgramada >= fechaInicio && v.FechaProgramada < fechaFin) ||
                (v.FechaHoraInicio >= fechaInicio && v.FechaHoraInicio < fechaFin));
        var orderedQuery = isPostgres
            ? baseQuery.OrderBy(v => v.FechaProgramada ?? v.FechaHoraInicio)
            : baseQuery.OrderBy(v =>
                v.FechaProgramada.HasValue ? v.FechaProgramada.Value
                : v.FechaHoraInicio.HasValue ? v.FechaHoraInicio.Value
                : DateTime.MaxValue);

        return await orderedQuery
            .Select(v => new ClienteVisitaListaDto
            {
                Id = v.Id,
                ClienteId = v.ClienteId,
                ClienteNombre = v.Cliente.Nombre,
                ClienteDireccion = v.Cliente.Direccion,
                FechaProgramada = v.FechaProgramada,
                FechaHoraInicio = v.FechaHoraInicio,
                FechaHoraFin = v.FechaHoraFin,
                TipoVisita = v.TipoVisita,
                Resultado = v.Resultado,
                DuracionMinutos = v.DuracionMinutos,
                TienePedido = v.PedidoId.HasValue
            })
            .ToListAsync();
    }

    public async Task<ClienteVisitaDto?> ObtenerVisitaActivaAsync(int usuarioId, int tenantId)
    {
        var visitaActiva = await _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.UsuarioId == usuarioId && v.TenantId == tenantId && v.Activo)
            .Where(v => v.FechaHoraInicio.HasValue && !v.FechaHoraFin.HasValue)
            .Select(v => v.Id)
            .FirstOrDefaultAsync();

        if (visitaActiva == 0) return null;
        return await ObtenerPorIdAsync(visitaActiva, tenantId);
    }

    public async Task<VisitaResumenDiarioDto> ObtenerResumenDiarioAsync(int usuarioId, DateTime fecha, int tenantId)
    {
        var fechaInicio = fecha.Date;
        var fechaFin = fecha.Date.AddDays(1);

        var visitas = await _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.UsuarioId == usuarioId && v.TenantId == tenantId && v.Activo)
            .Where(v =>
                (v.FechaProgramada >= fechaInicio && v.FechaProgramada < fechaFin) ||
                (v.FechaHoraInicio >= fechaInicio && v.FechaHoraInicio < fechaFin))
            .ToListAsync();

        var completadas = visitas.Where(v => v.FechaHoraFin.HasValue).ToList();
        var conVenta = visitas.Where(v => v.Resultado == ResultadoVisita.Venta).ToList();

        return new VisitaResumenDiarioDto
        {
            Fecha = fecha.Date,
            TotalVisitas = visitas.Count,
            VisitasCompletadas = completadas.Count,
            VisitasConVenta = conVenta.Count,
            VisitasPendientes = visitas.Count(v => v.Resultado == ResultadoVisita.Pendiente),
            VisitasCanceladas = visitas.Count(v => v.Resultado == ResultadoVisita.Cancelada),
            TasaConversion = completadas.Count > 0
                ? Math.Round((decimal)conVenta.Count / completadas.Count * 100, 2)
                : 0
        };
    }

    public async Task<IEnumerable<VisitaResumenDiarioDto>> ObtenerResumenSemanalAsync(int usuarioId, DateTime fechaInicio, int tenantId)
    {
        var resumenes = new List<VisitaResumenDiarioDto>();

        for (int i = 0; i < 7; i++)
        {
            var fecha = fechaInicio.AddDays(i);
            var resumen = await ObtenerResumenDiarioAsync(usuarioId, fecha, tenantId);
            resumenes.Add(resumen);
        }

        return resumenes;
    }

    public Task<bool> ExisteClienteEnTenantAsync(int clienteId, int tenantId)
        => _db.Clientes.AsNoTracking()
            .AnyAsync(c => c.Id == clienteId && c.TenantId == tenantId);
}
