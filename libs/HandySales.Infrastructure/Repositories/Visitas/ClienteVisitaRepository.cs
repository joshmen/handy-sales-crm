using HandySales.Application.Pedidos.DTOs;
using HandySales.Application.Visitas.DTOs;
using HandySales.Application.Visitas.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HandySales.Infrastructure.Repositories.Visitas;

public class ClienteVisitaRepository : IClienteVisitaRepository
{
    private readonly HandySalesDbContext _db;

    public ClienteVisitaRepository(HandySalesDbContext db)
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

        var visitas = await query
            .OrderByDescending(v => v.FechaProgramada ?? v.FechaHoraInicio ?? v.CreadoEn)
            .Skip((filtro.Pagina - 1) * filtro.TamanoPagina)
            .Take(filtro.TamanoPagina)
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
            Pagina = filtro.Pagina,
            TamanoPagina = filtro.TamanoPagina
        };
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var visita = await _db.ClienteVisitas
            .FirstOrDefaultAsync(v => v.Id == id && v.TenantId == tenantId && v.Activo);

        if (visita == null) return false;

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

        // Calcular distancia al cliente si tiene coordenadas
        var cliente = await _db.Clientes.FindAsync(visita.ClienteId);
        if (cliente?.Latitud != null && cliente?.Longitud != null)
        {
            visita.DistanciaCliente = CalcularDistancia(
                dto.Latitud, dto.Longitud,
                cliente.Latitud.Value, cliente.Longitud.Value);
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
        return await _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.ClienteId == clienteId && v.TenantId == tenantId && v.Activo)
            .OrderByDescending(v => v.FechaProgramada ?? v.FechaHoraInicio ?? v.CreadoEn)
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
        return await _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.UsuarioId == usuarioId && v.TenantId == tenantId && v.Activo)
            .Where(v => v.FechaProgramada >= hoy || v.FechaHoraInicio >= hoy)
            .OrderBy(v => v.FechaProgramada ?? v.FechaHoraInicio)
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

        return await _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.UsuarioId == usuarioId && v.TenantId == tenantId && v.Activo)
            .Where(v =>
                (v.FechaProgramada >= fechaInicio && v.FechaProgramada < fechaFin) ||
                (v.FechaHoraInicio >= fechaInicio && v.FechaHoraInicio < fechaFin))
            .OrderBy(v => v.FechaProgramada ?? v.FechaHoraInicio)
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

    // Calcular distancia usando formula Haversine
    private static double CalcularDistancia(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371; // Radio de la Tierra en km

        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return R * c * 1000; // Retornar en metros
    }

    private static double ToRadians(double angle)
    {
        return Math.PI * angle / 180.0;
    }
}
