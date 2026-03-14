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
            NumeroExterior = dto.NumeroExterior,
            IdZona = dto.IdZona,
            CategoriaClienteId = dto.CategoriaClienteId,
            // Campos adicionales
            EsProspecto = dto.EsProspecto,
            Comentarios = dto.Comentarios,
            ListaPreciosId = dto.ListaPreciosId,
            Descuento = dto.Descuento,
            Saldo = dto.Saldo,
            LimiteCredito = dto.LimiteCredito,
            VentaMinimaEfectiva = dto.VentaMinimaEfectiva,
            TiposPagoPermitidos = dto.TiposPagoPermitidos,
            TipoPagoPredeterminado = dto.TipoPagoPredeterminado,
            DiasCredito = dto.DiasCredito,
            // Dirección desglosada
            Ciudad = dto.Ciudad,
            Colonia = dto.Colonia,
            CodigoPostal = dto.CodigoPostal,
            // Contacto
            Encargado = dto.Encargado,
            // Geolocalización
            Latitud = dto.Latitud,
            Longitud = dto.Longitud,
            // Datos fiscales
            Facturable = dto.Facturable,
            RazonSocial = dto.RazonSocial,
            CodigoPostalFiscal = dto.CodigoPostalFiscal,
            RegimenFiscal = dto.RegimenFiscal,
            UsoCFDIPredeterminado = dto.UsoCFDIPredeterminado,
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
                NumeroExterior = c.NumeroExterior,
                IdZona = c.IdZona,
                CategoriaClienteId = c.CategoriaClienteId,
                Latitud = c.Latitud,
                Longitud = c.Longitud,
                VendedorId = c.VendedorId,
                Activo = c.Activo,
                // Campos adicionales
                EsProspecto = c.EsProspecto,
                Comentarios = c.Comentarios,
                ListaPreciosId = c.ListaPreciosId,
                Descuento = c.Descuento,
                Saldo = c.Saldo,
                LimiteCredito = c.LimiteCredito,
                VentaMinimaEfectiva = c.VentaMinimaEfectiva,
                TiposPagoPermitidos = c.TiposPagoPermitidos,
                TipoPagoPredeterminado = c.TipoPagoPredeterminado,
                DiasCredito = c.DiasCredito,
                // Dirección desglosada
                Ciudad = c.Ciudad,
                Colonia = c.Colonia,
                CodigoPostal = c.CodigoPostal,
                // Contacto
                Encargado = c.Encargado,
                // Datos fiscales
                Facturable = c.Facturable,
                RazonSocial = c.RazonSocial,
                CodigoPostalFiscal = c.CodigoPostalFiscal,
                RegimenFiscal = c.RegimenFiscal,
                UsoCFDIPredeterminado = c.UsoCFDIPredeterminado
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
        cliente.NumeroExterior = dto.NumeroExterior;
        cliente.IdZona = dto.IdZona;
        cliente.CategoriaClienteId = dto.CategoriaClienteId;
        // Campos adicionales
        cliente.EsProspecto = dto.EsProspecto;
        cliente.Comentarios = dto.Comentarios;
        cliente.ListaPreciosId = dto.ListaPreciosId;
        cliente.Descuento = dto.Descuento;
        cliente.Saldo = dto.Saldo;
        cliente.LimiteCredito = dto.LimiteCredito;
        cliente.VentaMinimaEfectiva = dto.VentaMinimaEfectiva;
        cliente.TiposPagoPermitidos = dto.TiposPagoPermitidos;
        cliente.TipoPagoPredeterminado = dto.TipoPagoPredeterminado;
        cliente.DiasCredito = dto.DiasCredito;
        // Dirección desglosada
        cliente.Ciudad = dto.Ciudad;
        cliente.Colonia = dto.Colonia;
        cliente.CodigoPostal = dto.CodigoPostal;
        // Contacto
        cliente.Encargado = dto.Encargado;
        // Geolocalización
        cliente.Latitud = dto.Latitud;
        cliente.Longitud = dto.Longitud;
        // Datos fiscales
        cliente.Facturable = dto.Facturable;
        cliente.RazonSocial = dto.RazonSocial;
        cliente.CodigoPostalFiscal = dto.CodigoPostalFiscal;
        cliente.RegimenFiscal = dto.RegimenFiscal;
        cliente.UsoCFDIPredeterminado = dto.UsoCFDIPredeterminado;
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

    public async Task<ClientePaginatedResult> ObtenerPorFiltroAsync(ClienteFiltroDto filtro, int tenantId, List<int>? filterByVendedorIds = null)
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

        // Filtrar por vendedor asignado (supervisor team or single vendedor)
        if (filterByVendedorIds is { Count: > 0 })
            query = query.Where(c => c.VendedorId.HasValue && filterByVendedorIds.Contains(c.VendedorId.Value) || c.VendedorId == null);
        else if (filtro.VendedorId.HasValue)
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
            .GroupJoin(_db.Zonas, c => c.IdZona, z => z.Id, (c, zonas) => new { c, Zona = zonas.FirstOrDefault() })
            .GroupJoin(_db.CategoriasClientes, x => x.c.CategoriaClienteId, cat => cat.Id, (x, cats) => new { x.c, x.Zona, Categoria = cats.FirstOrDefault() })
            .GroupJoin(_db.Usuarios, x => x.c.VendedorId, u => u.Id, (x, vendedores) => new { x.c, x.Zona, x.Categoria, Vendedor = vendedores.FirstOrDefault() })
            .Select(x => new ClienteListaDto
            {
                Id = x.c.Id,
                Nombre = x.c.Nombre,
                RFC = x.c.RFC,
                Correo = x.c.Correo,
                Telefono = x.c.Telefono,
                ZonaNombre = x.Zona != null ? x.Zona.Nombre : null,
                CategoriaNombre = x.Categoria != null ? x.Categoria.Nombre : null,
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
