using HandySuites.Application.Zonas.DTOs;
using HandySuites.Application.Zonas.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Zonas.Repositories;

public class ZonaRepository : IZonaRepository
{
    private readonly HandySuitesDbContext _db;

    public ZonaRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<List<ZonaDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.Zonas
            .AsNoTracking()
            .Where(z => z.TenantId == tenantId)
            .Select(z => new ZonaDto
            {
                Id = z.Id,
                Nombre = z.Nombre,
                Descripcion = z.Descripcion,
                Activo = z.Activo,
                ClientesActivos = _db.Clientes.Count(c => c.IdZona == z.Id && c.TenantId == tenantId && c.Activo),
                CentroLatitud = z.CentroLatitud,
                CentroLongitud = z.CentroLongitud,
                RadioKm = z.RadioKm,
                VendedorId = z.VendedorId,
                VendedorNombre = z.Vendedor != null ? z.Vendedor.Nombre : null,
                Color = z.Color,
                FrecuenciaVisita = (int)z.FrecuenciaVisita,
                FrecuenciaNombre = z.FrecuenciaVisita.ToString()
            })
            .ToListAsync();
    }

    public async Task<List<ZonaDto>> ObtenerStatsPorTenantAsync(int tenantId, DateTime desdeUtc, DateTime hastaUtc, DateTime nowUtc)
    {
        // 1) Zonas del tenant (entidad cruda; el mapeo a DTO se arma en memoria).
        var zonas = await _db.Zonas
            .AsNoTracking()
            .Where(z => z.TenantId == tenantId)
            .Select(z => new
            {
                z.Id,
                z.Nombre,
                z.Descripcion,
                z.Activo,
                z.CentroLatitud,
                z.CentroLongitud,
                z.RadioKm,
                z.VendedorId,
                VendedorNombre = z.Vendedor != null ? z.Vendedor.Nombre : null,
                z.Color,
                z.FrecuenciaVisita
            })
            .ToListAsync();

        if (zonas.Count == 0)
            return new List<ZonaDto>();

        // 2) Clientes activos por zona (una sola agregación → diccionario).
        var clientesPorZona = await _db.Clientes
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo)
            .GroupBy(c => c.IdZona)
            .Select(g => new { ZonaId = g.Key, Total = g.Count() })
            .ToListAsync();
        var clientesDict = clientesPorZona.ToDictionary(x => x.ZonaId, x => x.Total);

        // 3) Ventas del mes por zona: pedidos Entregado del mes, agrupados por la zona
        //    del cliente. Una sola query con join Pedido→Cliente.
        var ventasPorZona = await (
            from p in _db.Pedidos.AsNoTracking()
            join c in _db.Clientes.AsNoTracking() on p.ClienteId equals c.Id
            where p.TenantId == tenantId
                && p.Estado == EstadoPedido.Entregado
                && p.FechaPedido >= desdeUtc && p.FechaPedido < hastaUtc
            group p by c.IdZona into g
            select new { ZonaId = g.Key, Total = g.Sum(x => x.Total), Pedidos = g.Count() }
        ).ToListAsync();
        var ventasDict = ventasPorZona.ToDictionary(x => x.ZonaId, x => (x.Total, x.Pedidos));

        // 4) Cobertura: clientes "al día" por zona. Un cliente está al día si tiene
        //    al menos una visita con FechaHoraInicio >= (now - frecuenciaDias(zona)).
        //    El umbral por zona depende de su frecuencia, así que agrupamos los
        //    distintos clientes visitados por (zona, frecuenciaDias) en memoria.
        //
        //    Para evitar N+1, traemos las últimas visitas (clienteId + fecha) del
        //    tenant en una sola query y resolvemos la frecuencia con clientesZonaMap.
        var clienteZonaMap = await _db.Clientes
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo)
            .Select(c => new { c.Id, c.IdZona })
            .ToListAsync();
        var clienteToZona = clienteZonaMap.ToDictionary(x => x.Id, x => x.IdZona);
        var frecuenciaPorZona = zonas.ToDictionary(z => z.Id, z => FrecuenciaDias(z.FrecuenciaVisita));

        // Última visita por cliente (max FechaHoraInicio), una sola agregación.
        var ultimaVisitaPorCliente = await _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.TenantId == tenantId && v.Activo && v.FechaHoraInicio != null)
            .GroupBy(v => v.ClienteId)
            .Select(g => new { ClienteId = g.Key, Ultima = g.Max(x => x.FechaHoraInicio) })
            .ToListAsync();

        // Clientes "al día" por zona (en memoria, usando el umbral de su zona).
        var cubiertosPorZona = new Dictionary<int, int>();
        foreach (var uv in ultimaVisitaPorCliente)
        {
            if (!clienteToZona.TryGetValue(uv.ClienteId, out var zonaId)) continue;
            if (!frecuenciaPorZona.TryGetValue(zonaId, out var dias)) continue;
            if (uv.Ultima.HasValue && uv.Ultima.Value >= nowUtc.AddDays(-dias))
                cubiertosPorZona[zonaId] = cubiertosPorZona.GetValueOrDefault(zonaId) + 1;
        }

        // 5) Ensamblar DTOs en memoria — sin round-trips por zona.
        return zonas.Select(z =>
        {
            var clientes = clientesDict.GetValueOrDefault(z.Id);
            ventasDict.TryGetValue(z.Id, out var ventas);
            var cubiertos = cubiertosPorZona.GetValueOrDefault(z.Id);

            return new ZonaDto
            {
                Id = z.Id,
                Nombre = z.Nombre,
                Descripcion = z.Descripcion,
                Activo = z.Activo,
                ClientesActivos = clientes,
                CentroLatitud = z.CentroLatitud,
                CentroLongitud = z.CentroLongitud,
                RadioKm = z.RadioKm,
                VendedorId = z.VendedorId,
                VendedorNombre = z.VendedorNombre,
                Color = z.Color,
                FrecuenciaVisita = (int)z.FrecuenciaVisita,
                FrecuenciaNombre = z.FrecuenciaVisita.ToString(),
                VentasMes = ventas.Total,
                TicketPromedio = ventas.Pedidos > 0 ? ventas.Total / ventas.Pedidos : 0m,
                CoberturaPct = clientes > 0
                    ? (int)Math.Round((double)cubiertos / clientes * 100)
                    : 0
            };
        }).ToList();
    }

    private static int FrecuenciaDias(FrecuenciaVisita frecuencia) => frecuencia switch
    {
        FrecuenciaVisita.Semanal => 7,
        FrecuenciaVisita.Quincenal => 14,
        FrecuenciaVisita.Mensual => 30,
        _ => 7
    };

    public async Task<ZonaDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.Zonas
            .AsNoTracking()
            .Where(z => z.Id == id && z.TenantId == tenantId)
            .Select(z => new ZonaDto
            {
                Id = z.Id,
                Nombre = z.Nombre,
                Descripcion = z.Descripcion,
                Activo = z.Activo,
                ClientesActivos = _db.Clientes.Count(c => c.IdZona == z.Id && c.TenantId == tenantId && c.Activo),
                CentroLatitud = z.CentroLatitud,
                CentroLongitud = z.CentroLongitud,
                RadioKm = z.RadioKm,
                VendedorId = z.VendedorId,
                VendedorNombre = z.Vendedor != null ? z.Vendedor.Nombre : null,
                Color = z.Color,
                FrecuenciaVisita = (int)z.FrecuenciaVisita,
                FrecuenciaNombre = z.FrecuenciaVisita.ToString()
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(CreateZonaDto dto, string creadoPor, int tenantId)
    {
        var nueva = new Zona
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            CentroLatitud = dto.CentroLatitud,
            CentroLongitud = dto.CentroLongitud,
            RadioKm = dto.RadioKm,
            VendedorId = dto.VendedorId,
            Color = dto.Color,
            FrecuenciaVisita = dto.FrecuenciaVisita,
            Activo = true,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = creadoPor
        };

        _db.Zonas.Add(nueva);
        await _db.SaveChangesAsync();
        return nueva.Id;
    }

    public async Task<bool> ActualizarAsync(int id, UpdateZonaDto dto, string actualizadoPor, int tenantId)
    {
        var zona = await _db.Zonas
            .FirstOrDefaultAsync(z => z.Id == id && z.TenantId == tenantId);

        if (zona == null) return false;

        zona.Nombre = dto.Nombre;
        zona.Descripcion = dto.Descripcion;
        zona.Activo = dto.Activo;
        zona.CentroLatitud = dto.CentroLatitud;
        zona.CentroLongitud = dto.CentroLongitud;
        zona.RadioKm = dto.RadioKm;
        zona.VendedorId = dto.VendedorId;
        zona.Color = dto.Color;
        zona.FrecuenciaVisita = dto.FrecuenciaVisita;
        zona.ActualizadoEn = DateTime.UtcNow;
        zona.ActualizadoPor = actualizadoPor;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var zona = await _db.Zonas
            .FirstOrDefaultAsync(z => z.Id == id && z.TenantId == tenantId);

        if (zona == null) return false;

        _db.Zonas.Remove(zona);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> ContarClientesPorZonaAsync(int zonaId, int tenantId)
    {
        return await _db.Clientes
            .AsNoTracking()
            .CountAsync(c => c.IdZona == zonaId && c.TenantId == tenantId);
    }

    public async Task<int> ContarClientesActivosPorZonaAsync(int zonaId, int tenantId)
    {
        return await _db.Clientes
            .AsNoTracking()
            .CountAsync(c => c.IdZona == zonaId && c.TenantId == tenantId && c.Activo);
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.Zonas
            .FirstOrDefaultAsync(z => z.Id == id && z.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        return await _db.Zonas
            .Where(z => ids.Contains(z.Id) && z.TenantId == tenantId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.Activo, activo)
                .SetProperty(e => e.ActualizadoEn, DateTime.UtcNow));
    }

    public async Task<List<(int Id, string Nombre, double Lat, double Lng, double RadioKm)>> ObtenerZonasConCoordenadasAsync(int tenantId, int? excludeId = null)
    {
        var query = _db.Zonas
            .AsNoTracking()
            .Where(z => z.TenantId == tenantId
                && z.CentroLatitud.HasValue
                && z.CentroLongitud.HasValue
                && z.RadioKm.HasValue);

        if (excludeId.HasValue)
            query = query.Where(z => z.Id != excludeId.Value);

        var items = await query
            .Select(z => new { z.Id, z.Nombre, Lat = z.CentroLatitud!.Value, Lng = z.CentroLongitud!.Value, Radio = z.RadioKm!.Value })
            .ToListAsync();

        return items.Select(z => (z.Id, z.Nombre, z.Lat, z.Lng, z.Radio)).ToList();
    }

    public Task<bool> ExisteNombreEnTenantAsync(string nombre, int tenantId, int? excludeId = null)
    {
        var query = _db.Zonas.AsNoTracking()
            .Where(z => z.TenantId == tenantId && z.Nombre.ToLower() == nombre.ToLower());
        if (excludeId.HasValue)
            query = query.Where(z => z.Id != excludeId.Value);
        return query.AnyAsync();
    }

    public Task<bool> EsVendedorDelTenantAsync(int vendedorId, int tenantId)
    {
        return _db.Usuarios.AsNoTracking()
            .AnyAsync(u => u.Id == vendedorId
                && u.TenantId == tenantId
                && u.RolExplicito == RoleNames.Vendedor);
    }
}
