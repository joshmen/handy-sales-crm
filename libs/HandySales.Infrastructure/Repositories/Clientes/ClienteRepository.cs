using HandySales.Application.Clientes.DTOs;
using HandySales.Application.Clientes.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Repositories;

public class ClienteRepository : IClienteRepository
{
    private readonly HandySalesDbContext _db;

    public ClienteRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<int> CrearAsync(ClienteCreateDto dto, int tenantId)
    {
        var cliente = new Cliente
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            RFC = dto.RFC,
            Correo = dto.Correo,
            Telefono = dto.Telefono,
            Direccion = dto.Direccion,
            IdZona = dto.IdZona,
            CategoriaClienteId = dto.CategoriaClienteId,
            Activo = true,
            CreadoEn = DateTime.UtcNow
        };

        _db.Clientes.Add(cliente);
        await _db.SaveChangesAsync();
        return cliente.Id;
    }

    public async Task<List<ClienteDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.Clientes
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId)
            .Select(c => new ClienteDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                RFC = c.RFC,
                Correo = c.Correo,
                Telefono = c.Telefono,
                Direccion = c.Direccion
            }).ToListAsync();
    }

    public async Task<ClienteDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.Clientes
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Id == id)
            .Select(c => new ClienteDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                RFC = c.RFC,
                Correo = c.Correo,
                Telefono = c.Telefono,
                Direccion = c.Direccion,
                IdZona = c.IdZona,
                CategoriaClienteId = c.CategoriaClienteId,
                Latitud = c.Latitud,
                Longitud = c.Longitud,
                VendedorId = c.VendedorId,
                Activo = c.Activo
            })
            .FirstOrDefaultAsync();
    }

    public async Task<bool> ActualizarAsync(int id, ClienteCreateDto dto, int tenantId)
    {
        var cliente = await _db.Clientes.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
        if (cliente == null) return false;

        cliente.Nombre = dto.Nombre;
        cliente.RFC = dto.RFC;
        cliente.Correo = dto.Correo;
        cliente.Telefono = dto.Telefono;
        cliente.Direccion = dto.Direccion;
        cliente.IdZona = dto.IdZona;
        cliente.CategoriaClienteId = dto.CategoriaClienteId;
        cliente.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var cliente = await _db.Clientes.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
        if (cliente == null) return false;

        _db.Clientes.Remove(cliente);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<ClientePaginatedResult> ObtenerPorFiltroAsync(ClienteFiltroDto filtro, int tenantId)
    {
        var query = _db.Clientes.AsNoTracking().Where(c => c.TenantId == tenantId);

        // Filtrar por activo
        if (filtro.Activo.HasValue)
            query = query.Where(c => c.Activo == filtro.Activo.Value);

        // Filtrar por zona
        if (filtro.ZonaId.HasValue)
            query = query.Where(c => c.IdZona == filtro.ZonaId.Value);

        // Filtrar por categoría
        if (filtro.CategoriaClienteId.HasValue)
            query = query.Where(c => c.CategoriaClienteId == filtro.CategoriaClienteId.Value);

        // Filtrar por vendedor asignado
        if (filtro.VendedorId.HasValue)
            query = query.Where(c => c.VendedorId == filtro.VendedorId.Value || c.VendedorId == null);

        // Búsqueda por texto
        if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
        {
            var busqueda = filtro.Busqueda.ToLower();
            query = query.Where(c =>
                c.Nombre.ToLower().Contains(busqueda) ||
                c.RFC.ToLower().Contains(busqueda) ||
                c.Correo.ToLower().Contains(busqueda) ||
                c.Telefono.Contains(busqueda));
        }

        var totalItems = await query.CountAsync();

        var items = await query
            .OrderBy(c => c.Nombre)
            .Skip((filtro.Pagina - 1) * filtro.TamanoPagina)
            .Take(filtro.TamanoPagina)
            .Join(_db.Zonas, c => c.IdZona, z => z.Id, (c, z) => new { c, ZonaNombre = z.Nombre })
            .Join(_db.CategoriasClientes, x => x.c.CategoriaClienteId, cat => cat.Id, (x, cat) => new { x.c, x.ZonaNombre, CategoriaNombre = cat.Nombre })
            .GroupJoin(_db.Usuarios, x => x.c.VendedorId, u => u.Id, (x, vendedores) => new { x.c, x.ZonaNombre, x.CategoriaNombre, Vendedor = vendedores.FirstOrDefault() })
            .Select(x => new ClienteListaDto
            {
                Id = x.c.Id,
                Nombre = x.c.Nombre,
                RFC = x.c.RFC,
                Correo = x.c.Correo,
                Telefono = x.c.Telefono,
                ZonaNombre = x.ZonaNombre,
                CategoriaNombre = x.CategoriaNombre,
                VendedorId = x.c.VendedorId,
                VendedorNombre = x.Vendedor != null ? x.Vendedor.Nombre : null,
                Activo = x.c.Activo
            })
            .ToListAsync();

        return new ClientePaginatedResult
        {
            Items = items,
            TotalItems = totalItems,
            Pagina = filtro.Pagina,
            TamanoPagina = filtro.TamanoPagina
        };
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.Clientes
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.Clientes
            .Where(c => ids.Contains(c.Id) && c.TenantId == tenantId)
            .ToListAsync();

        foreach (var entity in entities)
        {
            entity.Activo = activo;
            entity.ActualizadoEn = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return entities.Count;
    }

    public async Task<bool> ExisteNombreEnTenantAsync(string nombre, int tenantId, int? excludeId = null)
    {
        return await _db.Clientes.AsNoTracking().AnyAsync(c =>
            c.Nombre == nombre &&
            c.TenantId == tenantId &&
            c.Activo &&
            (excludeId == null || c.Id != excludeId));
    }
}
