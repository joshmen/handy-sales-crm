using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Endpoints;

public static class ImportExportEndpoints
{
    public static void MapImportExportEndpoints(this IEndpointRouteBuilder app)
    {
        // ═══════════════════════════════════════════════════════
        // EXPORT ENDPOINTS
        // ═══════════════════════════════════════════════════════

        app.MapGet("/api/export/clientes", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var clientes = await db.Clientes
                .Where(c => c.TenantId == tenantId)
                .Join(db.Zonas, c => c.IdZona, z => z.Id, (c, z) => new { c, ZonaNombre = z.Nombre })
                .Join(db.CategoriasClientes, cz => cz.c.CategoriaClienteId, cat => cat.Id,
                    (cz, cat) => new ClienteCsvRow
                    {
                        Nombre = cz.c.Nombre,
                        RFC = cz.c.RFC,
                        Correo = cz.c.Correo,
                        Telefono = cz.c.Telefono,
                        Direccion = cz.c.Direccion,
                        Zona = cz.ZonaNombre,
                        Categoria = cat.Nombre,
                        Latitud = cz.c.Latitud,
                        Longitud = cz.c.Longitud,
                        Activo = cz.c.Activo ? "Si" : "No"
                    })
                .ToListAsync();

            return GenerateCsvResult(clientes, "clientes.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/productos", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var productos = await db.Productos
                .Where(p => p.TenantId == tenantId)
                .Include(p => p.Familia)
                .Include(p => p.Categoria)
                .Include(p => p.UnidadMedida)
                .Select(p => new ProductoCsvRow
                {
                    Nombre = p.Nombre,
                    CodigoBarra = p.CodigoBarra,
                    Descripcion = p.Descripcion,
                    PrecioBase = p.PrecioBase,
                    Familia = p.Familia.Nombre,
                    Categoria = p.Categoria.Nombre,
                    UnidadMedida = p.UnidadMedida.Nombre,
                    Activo = p.Activo ? "Si" : "No"
                })
                .ToListAsync();

            return GenerateCsvResult(productos, "productos.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/inventario", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var inventario = await db.Inventarios
                .Where(i => i.TenantId == tenantId)
                .Include(i => i.Producto)
                .Select(i => new InventarioCsvRow
                {
                    Producto = i.Producto.Nombre,
                    CodigoBarra = i.Producto.CodigoBarra,
                    CantidadActual = i.CantidadActual,
                    StockMinimo = i.StockMinimo,
                    StockMaximo = i.StockMaximo
                })
                .ToListAsync();

            return GenerateCsvResult(inventario, "inventario.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/pedidos", async (
            [FromQuery] string? desde,
            [FromQuery] string? hasta,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var query = db.Pedidos
                .Where(p => p.TenantId == tenantId)
                .Include(p => p.Cliente)
                .Include(p => p.Usuario)
                .AsQueryable();

            if (DateTime.TryParse(desde, out var fechaDesde))
                query = query.Where(p => p.FechaPedido >= fechaDesde);
            if (DateTime.TryParse(hasta, out var fechaHasta))
                query = query.Where(p => p.FechaPedido <= fechaHasta.AddDays(1));

            var pedidos = await query
                .OrderByDescending(p => p.FechaPedido)
                .Select(p => new PedidoCsvRow
                {
                    NumeroPedido = p.NumeroPedido,
                    FechaPedido = p.FechaPedido.ToString("yyyy-MM-dd"),
                    Cliente = p.Cliente.Nombre,
                    Vendedor = p.Usuario.Nombre,
                    Estado = p.Estado.ToString(),
                    Subtotal = p.Subtotal,
                    Descuento = p.Descuento,
                    Impuestos = p.Impuestos,
                    Total = p.Total,
                    Notas = p.Notas ?? ""
                })
                .ToListAsync();

            return GenerateCsvResult(pedidos, "pedidos.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/cobros", async (
            [FromQuery] string? desde,
            [FromQuery] string? hasta,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var query = db.Cobros
                .Where(c => c.TenantId == tenantId && c.Activo)
                .Include(c => c.Pedido)
                .Include(c => c.Cliente)
                .Include(c => c.Usuario)
                .AsQueryable();

            if (DateTime.TryParse(desde, out var fechaDesde))
                query = query.Where(c => c.FechaCobro >= fechaDesde);
            if (DateTime.TryParse(hasta, out var fechaHasta))
                query = query.Where(c => c.FechaCobro <= fechaHasta.AddDays(1));

            var cobros = await query
                .OrderByDescending(c => c.FechaCobro)
                .Select(c => new CobroCsvRow
                {
                    FechaCobro = c.FechaCobro.ToString("yyyy-MM-dd"),
                    Cliente = c.Cliente.Nombre,
                    NumeroPedido = c.Pedido != null ? c.Pedido.NumeroPedido : "",
                    Vendedor = c.Usuario.Nombre,
                    Monto = c.Monto,
                    MetodoPago = c.MetodoPago.ToString(),
                    Referencia = c.Referencia ?? "",
                    Notas = c.Notas ?? ""
                })
                .ToListAsync();

            return GenerateCsvResult(cobros, "cobros.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/categorias-clientes", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var categorias = await db.CategoriasClientes
                .Where(c => c.TenantId == tenantId)
                .Select(c => new CategoriaClienteCsvRow
                {
                    Nombre = c.Nombre,
                    Descripcion = c.Descripcion ?? ""
                })
                .ToListAsync();

            return GenerateCsvResult(categorias, "categorias_clientes.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/unidades-medida", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var unidades = await db.UnidadesMedida
                .Where(u => u.TenantId == tenantId)
                .Select(u => new UnidadMedidaCsvRow
                {
                    Nombre = u.Nombre,
                    Abreviatura = u.Abreviatura ?? "",
                    Activo = u.Activo ? "Si" : "No"
                })
                .ToListAsync();

            return GenerateCsvResult(unidades, "unidades_medida.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/categorias-productos", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var categorias = await db.CategoriasProductos
                .Where(c => c.TenantId == tenantId)
                .Select(c => new CategoriaProductoCsvRow
                {
                    Nombre = c.Nombre,
                    Descripcion = c.Descripcion ?? "",
                    Activo = c.Activo ? "Si" : "No"
                })
                .ToListAsync();

            return GenerateCsvResult(categorias, "categorias_productos.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/familias-productos", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var familias = await db.FamiliasProductos
                .Where(f => f.TenantId == tenantId)
                .Select(f => new FamiliaProductoCsvRow
                {
                    Nombre = f.Nombre,
                    Descripcion = f.Descripcion ?? "",
                    Activo = f.Activo ? "Si" : "No"
                })
                .ToListAsync();

            return GenerateCsvResult(familias, "familias_productos.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/listas-precios", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var listas = await db.ListasPrecios
                .Where(l => l.TenantId == tenantId)
                .Select(l => new ListaPrecioCsvRow
                {
                    Nombre = l.Nombre,
                    Descripcion = l.Descripcion ?? "",
                    Activo = l.Activo ? "Si" : "No"
                })
                .ToListAsync();

            return GenerateCsvResult(listas, "listas_precios.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/descuentos", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var descuentos = await db.DescuentosPorCantidad
                .Include(d => d.Producto)
                .Where(d => d.TenantId == tenantId)
                .Select(d => new DescuentoCsvRow
                {
                    TipoAplicacion = d.TipoAplicacion,
                    Producto = d.Producto != null ? d.Producto.Nombre : "",
                    CantidadMinima = d.CantidadMinima,
                    DescuentoPorcentaje = d.DescuentoPorcentaje,
                    Activo = d.Activo ? "Si" : "No"
                })
                .ToListAsync();

            return GenerateCsvResult(descuentos, "descuentos.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/promociones", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var promos = await db.Promociones
                .Where(p => p.TenantId == tenantId)
                .Select(p => new PromocionCsvRow
                {
                    Nombre = p.Nombre,
                    Descripcion = p.Descripcion ?? "",
                    DescuentoPorcentaje = p.DescuentoPorcentaje,
                    FechaInicio = p.FechaInicio.ToString("yyyy-MM-dd"),
                    FechaFin = p.FechaFin.ToString("yyyy-MM-dd"),
                    Productos = string.Join("; ", p.PromocionProductos
                        .Select(pp => pp.Producto.Nombre)),
                    Activo = p.Activo ? "Si" : "No"
                })
                .ToListAsync();

            return GenerateCsvResult(promos, "promociones.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/rutas", async (
            [FromQuery] string? desde,
            [FromQuery] string? hasta,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var query = db.RutasVendedor
                .Where(r => r.TenantId == tenantId)
                .Include(r => r.Usuario)
                .Include(r => r.Zona)
                .Include(r => r.Detalles)
                .AsQueryable();

            if (DateTime.TryParse(desde, out var fechaDesde))
                query = query.Where(r => r.Fecha >= fechaDesde);
            if (DateTime.TryParse(hasta, out var fechaHasta))
                query = query.Where(r => r.Fecha <= fechaHasta.AddDays(1));

            var rutas = await query
                .OrderByDescending(r => r.Fecha)
                .Select(r => new RutaCsvRow
                {
                    Nombre = r.Nombre,
                    Fecha = r.Fecha.ToString("yyyy-MM-dd"),
                    Vendedor = r.Usuario.Nombre,
                    Zona = r.Zona != null ? r.Zona.Nombre : "",
                    Estado = r.Estado.ToString(),
                    TotalParadas = r.Detalles.Count,
                    ParadasCompletadas = r.Detalles.Count(d => d.HoraSalidaReal != null),
                    HoraInicioEstimada = r.HoraInicioEstimada.HasValue ? r.HoraInicioEstimada.Value.ToString(@"hh\:mm") : "",
                    HoraFinEstimada = r.HoraFinEstimada.HasValue ? r.HoraFinEstimada.Value.ToString(@"hh\:mm") : "",
                    Descripcion = r.Descripcion ?? "",
                    Notas = r.Notas ?? "",
                    Activo = r.Activo ? "Si" : "No"
                })
                .ToListAsync();

            return GenerateCsvResult(rutas, "rutas.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/export/zonas", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var zonas = await db.Zonas
                .Where(z => z.TenantId == tenantId)
                .Select(z => new ZonaCsvRow
                {
                    Nombre = z.Nombre,
                    Descripcion = z.Descripcion ?? "",
                    CentroLatitud = z.CentroLatitud.HasValue ? z.CentroLatitud.Value.ToString("F6") : "",
                    CentroLongitud = z.CentroLongitud.HasValue ? z.CentroLongitud.Value.ToString("F6") : "",
                    RadioKm = z.RadioKm.HasValue ? z.RadioKm.Value.ToString("F1") : "",
                    Activo = z.Activo ? "Si" : "No"
                })
                .ToListAsync();

            return GenerateCsvResult(zonas, "zonas.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        // ═══════════════════════════════════════════════════════
        // TEMPLATE ENDPOINTS (CSV vacío con headers)
        // ═══════════════════════════════════════════════════════

        app.MapGet("/api/import/template/zonas", () =>
        {
            var template = new List<ZonaImportRow>
            {
                new()
                {
                    Nombre = "Centro",
                    Descripcion = "Zona centro de la ciudad",
                    CentroLatitud = 20.6597,
                    CentroLongitud = -103.3496,
                    RadioKm = 5.0
                }
            };
            return GenerateCsvResult(template, "template_zonas.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/import/template/clientes", () =>
        {
            var template = new List<ClienteImportRow>
            {
                new()
                {
                    Nombre = "Ejemplo S.A. de C.V.",
                    RFC = "EJE123456AB1",
                    Correo = "contacto@ejemplo.com",
                    Telefono = "5551234567",
                    Direccion = "Av. Reforma 100, CDMX",
                    Zona = "Zona Centro",
                    Categoria = "Mayorista",
                    Latitud = 19.4326,
                    Longitud = -99.1332
                }
            };
            return GenerateCsvResult(template, "template_clientes.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/import/template/categorias-clientes", () =>
        {
            var template = new List<CategoriaClienteImportRow>
            {
                new()
                {
                    Nombre = "Mayorista",
                    Descripcion = "Clientes que compran en grandes cantidades"
                }
            };
            return GenerateCsvResult(template, "template_categorias_clientes.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/import/template/unidades-medida", () =>
        {
            var template = new List<UnidadMedidaImportRow>
            {
                new()
                {
                    Nombre = "Kilogramo",
                    Abreviatura = "kg"
                }
            };
            return GenerateCsvResult(template, "template_unidades_medida.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/import/template/categorias-productos", () =>
        {
            var template = new List<CategoriaProductoImportRow>
            {
                new()
                {
                    Nombre = "Herramientas",
                    Descripcion = "Categoría de herramientas eléctricas"
                }
            };
            return GenerateCsvResult(template, "template_categorias_productos.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/import/template/familias-productos", () =>
        {
            var template = new List<FamiliaProductoImportRow>
            {
                new()
                {
                    Nombre = "Implantes",
                    Descripcion = "Familia de implantes dentales"
                }
            };
            return GenerateCsvResult(template, "template_familias_productos.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/import/template/listas-precios", () =>
        {
            var template = new List<ListaPrecioImportRow>
            {
                new()
                {
                    Nombre = "Lista Mayoreo",
                    Descripcion = "Precios para clientes mayoristas"
                }
            };
            return GenerateCsvResult(template, "template_listas_precios.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/import/template/descuentos", () =>
        {
            var template = new List<DescuentoImportRow>
            {
                new()
                {
                    TipoAplicacion = "Global",
                    Producto = "",
                    CantidadMinima = 10,
                    DescuentoPorcentaje = 5
                },
                new()
                {
                    TipoAplicacion = "Producto",
                    Producto = "Nombre del producto",
                    CantidadMinima = 20,
                    DescuentoPorcentaje = 10
                }
            };
            return GenerateCsvResult(template, "template_descuentos.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/import/template/inventario", () =>
        {
            var template = new List<InventarioImportRow>
            {
                new()
                {
                    Producto = "Nombre del producto",
                    CodigoBarra = "7501234567890",
                    CantidadActual = 100,
                    StockMinimo = 10,
                    StockMaximo = 500
                }
            };
            return GenerateCsvResult(template, "template_inventario.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/import/template/promociones", () =>
        {
            var template = new List<PromocionImportRow>
            {
                new()
                {
                    Nombre = "Promo Verano 2026",
                    Descripcion = "Descuento de temporada",
                    DescuentoPorcentaje = 15,
                    FechaInicio = "2026-06-01",
                    FechaFin = "2026-08-31",
                    Productos = "Producto A; Producto B"
                }
            };
            return GenerateCsvResult(template, "template_promociones.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapGet("/api/import/template/productos", () =>
        {
            var template = new List<ProductoImportRow>
            {
                new()
                {
                    Nombre = "Producto Ejemplo",
                    CodigoBarra = "7501234567890",
                    Descripcion = "Descripción del producto",
                    PrecioBase = 99.99m,
                    Familia = "Familia Ejemplo",
                    Categoria = "Categoría Ejemplo",
                    UnidadMedida = "Pieza"
                }
            };
            return GenerateCsvResult(template, "template_productos.csv");
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"));

        // ═══════════════════════════════════════════════════════
        // IMPORT ENDPOINTS
        // ═══════════════════════════════════════════════════════

        app.MapPost("/api/import/clientes", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (archivo.Length > 10 * 1024 * 1024) // 10 MB
                return Results.BadRequest(new { error = "El archivo no debe superar 10MB" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            // Load lookup tables — use GroupBy to handle duplicate names safely (takes first match)
            var zonasList = await db.Zonas.Where(z => z.TenantId == tenantId)
                .Select(z => new { Key = z.Nombre.ToLower(), z.Id }).ToListAsync();
            var zonas = zonasList.GroupBy(z => z.Key).ToDictionary(g => g.Key, g => g.First().Id);

            var categoriasList = await db.CategoriasClientes.Where(c => c.TenantId == tenantId)
                .Select(c => new { Key = c.Nombre.ToLower(), c.Id }).ToListAsync();
            var categorias = categoriasList.GroupBy(c => c.Key).ToDictionary(g => g.Key, g => g.First().Id);

            var existingNamesList = await db.Clientes.Where(c => c.TenantId == tenantId)
                .Select(c => c.Nombre.ToLower()).ToListAsync();
            var existingNames = new HashSet<string>(existingNamesList);

            var existingRfcList = await db.Clientes.Where(c => c.TenantId == tenantId && c.RFC != null && c.RFC != "")
                .Select(c => c.RFC.ToLower()).ToListAsync();
            var existingRfcs = new HashSet<string>(existingRfcList);

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim
            });

            var rows = csv.GetRecords<ClienteImportRow>().ToList();
            var fila = 0;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                // Trim values
                row.Nombre = row.Nombre?.Trim();
                row.RFC = row.RFC?.Trim();
                row.Correo = row.Correo?.Trim();
                row.Telefono = row.Telefono?.Trim();
                row.Direccion = row.Direccion?.Trim();
                row.Zona = row.Zona?.Trim();
                row.Categoria = row.Categoria?.Trim();

                if (string.IsNullOrWhiteSpace(row.Nombre))
                    rowErrors.Add("Nombre es requerido");
                if (string.IsNullOrWhiteSpace(row.RFC))
                    rowErrors.Add("RFC es requerido");
                if (string.IsNullOrWhiteSpace(row.Correo))
                    rowErrors.Add("Correo es requerido");
                if (string.IsNullOrWhiteSpace(row.Telefono))
                    rowErrors.Add("Teléfono es requerido");
                if (string.IsNullOrWhiteSpace(row.Direccion))
                    rowErrors.Add("Dirección es requerida");

                if (!string.IsNullOrWhiteSpace(row.Nombre) && existingNames.Contains(row.Nombre.ToLower()))
                    rowErrors.Add($"Ya existe un cliente con nombre '{row.Nombre}'");

                if (!string.IsNullOrWhiteSpace(row.RFC) && existingRfcs.Contains(row.RFC.ToLower()))
                    rowErrors.Add($"Ya existe un cliente con RFC '{row.RFC}'");

                var zonaId = 0;
                if (!string.IsNullOrWhiteSpace(row.Zona))
                {
                    if (!zonas.TryGetValue(row.Zona.ToLower(), out zonaId))
                        rowErrors.Add($"Zona '{row.Zona}' no encontrada. Zonas disponibles: {string.Join(", ", zonas.Keys)}");
                }
                else
                    rowErrors.Add("Zona es requerida");

                var categoriaId = 0;
                if (!string.IsNullOrWhiteSpace(row.Categoria))
                {
                    if (!categorias.TryGetValue(row.Categoria.ToLower(), out categoriaId))
                        rowErrors.Add($"Categoría '{row.Categoria}' no encontrada. Categorías disponibles: {string.Join(", ", categorias.Keys)}");
                }

                if (rowErrors.Count > 0)
                {
                    // Include Nombre + RFC in the error identifier for easy identification
                    var identifier = $"{row.Nombre ?? "(sin nombre)"} | RFC: {row.RFC ?? "(sin RFC)"}";
                    errores.Add(new ImportErrorDetail(fila, identifier, rowErrors));
                    continue;
                }

                db.Clientes.Add(new Domain.Entities.Cliente
                {
                    TenantId = tenantId,
                    Nombre = row.Nombre!,
                    RFC = row.RFC!,
                    Correo = row.Correo!,
                    Telefono = row.Telefono!,
                    Direccion = row.Direccion!,
                    IdZona = zonaId,
                    CategoriaClienteId = categoriaId > 0 ? categoriaId : 1,
                    Latitud = row.Latitud,
                    Longitud = row.Longitud,
                    Activo = true,
                    CreadoEn = DateTime.UtcNow
                });

                existingNames.Add(row.Nombre!.ToLower());
                if (!string.IsNullOrWhiteSpace(row.RFC))
                    existingRfcs.Add(row.RFC.ToLower());
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();

        app.MapPost("/api/import/productos", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (archivo.Length > 10 * 1024 * 1024) // 10 MB
                return Results.BadRequest(new { error = "El archivo no debe superar 10MB" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            // Load lookup tables — use GroupBy to handle duplicate names safely
            var familiasList = await db.FamiliasProductos.Where(f => f.TenantId == tenantId)
                .Select(f => new { Key = f.Nombre.ToLower(), f.Id }).ToListAsync();
            var familias = familiasList.GroupBy(f => f.Key).ToDictionary(g => g.Key, g => g.First().Id);

            var categoriasProdList = await db.CategoriasProductos.Where(c => c.TenantId == tenantId)
                .Select(c => new { Key = c.Nombre.ToLower(), c.Id }).ToListAsync();
            var categorias = categoriasProdList.GroupBy(c => c.Key).ToDictionary(g => g.Key, g => g.First().Id);

            var unidadesList = await db.UnidadesMedida.Where(u => u.TenantId == tenantId)
                .Select(u => new { Key = u.Nombre.ToLower(), u.Id }).ToListAsync();
            var unidades = unidadesList.GroupBy(u => u.Key).ToDictionary(g => g.Key, g => g.First().Id);

            var existingProdNamesList = await db.Productos.Where(p => p.TenantId == tenantId)
                .Select(p => p.Nombre.ToLower()).ToListAsync();
            var existingNames = new HashSet<string>(existingProdNamesList);

            var existingBarcodesList = await db.Productos.Where(p => p.TenantId == tenantId && p.CodigoBarra != null && p.CodigoBarra != "")
                .Select(p => p.CodigoBarra.ToLower()).ToListAsync();
            var existingBarcodes = new HashSet<string>(existingBarcodesList);

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim
            });

            var rows = csv.GetRecords<ProductoImportRow>().ToList();
            var fila = 0;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                // Trim values
                row.Nombre = row.Nombre?.Trim();
                row.CodigoBarra = row.CodigoBarra?.Trim();
                row.Descripcion = row.Descripcion?.Trim();
                row.Familia = row.Familia?.Trim();
                row.Categoria = row.Categoria?.Trim();
                row.UnidadMedida = row.UnidadMedida?.Trim();

                if (string.IsNullOrWhiteSpace(row.Nombre))
                    rowErrors.Add("Nombre es requerido");
                if (string.IsNullOrWhiteSpace(row.CodigoBarra))
                    rowErrors.Add("Código de barra es requerido");
                if (row.PrecioBase <= 0)
                    rowErrors.Add("Precio base debe ser mayor a 0");

                if (!string.IsNullOrWhiteSpace(row.Nombre) && existingNames.Contains(row.Nombre.ToLower()))
                    rowErrors.Add($"Ya existe un producto con nombre '{row.Nombre}'");

                if (!string.IsNullOrWhiteSpace(row.CodigoBarra) && existingBarcodes.Contains(row.CodigoBarra.ToLower()))
                    rowErrors.Add($"Ya existe un producto con código de barra '{row.CodigoBarra}'");

                var familiaId = 0;
                if (!string.IsNullOrWhiteSpace(row.Familia))
                {
                    if (!familias.TryGetValue(row.Familia.ToLower(), out familiaId))
                        rowErrors.Add($"Familia '{row.Familia}' no encontrada. Familias disponibles: {string.Join(", ", familias.Keys)}");
                }
                else
                    rowErrors.Add("Familia es requerida");

                var categoriaId = 0;
                if (!string.IsNullOrWhiteSpace(row.Categoria))
                {
                    if (!categorias.TryGetValue(row.Categoria.ToLower(), out categoriaId))
                        rowErrors.Add($"Categoría '{row.Categoria}' no encontrada. Categorías disponibles: {string.Join(", ", categorias.Keys)}");
                }

                var unidadId = 0;
                if (!string.IsNullOrWhiteSpace(row.UnidadMedida))
                {
                    if (!unidades.TryGetValue(row.UnidadMedida.ToLower(), out unidadId))
                        rowErrors.Add($"Unidad de medida '{row.UnidadMedida}' no encontrada. Disponibles: {string.Join(", ", unidades.Keys)}");
                }
                else
                    rowErrors.Add("Unidad de medida es requerida");

                if (rowErrors.Count > 0)
                {
                    var identifier = $"{row.Nombre ?? "(sin nombre)"} | Código: {row.CodigoBarra ?? "(sin código)"}";
                    errores.Add(new ImportErrorDetail(fila, identifier, rowErrors));
                    continue;
                }

                db.Productos.Add(new Domain.Entities.Producto
                {
                    TenantId = tenantId,
                    Nombre = row.Nombre!,
                    CodigoBarra = row.CodigoBarra!,
                    Descripcion = row.Descripcion ?? "",
                    PrecioBase = row.PrecioBase,
                    FamiliaId = familiaId,
                    CategoraId = categoriaId > 0 ? categoriaId : 1,
                    UnidadMedidaId = unidadId,
                    Activo = true,
                    CreadoEn = DateTime.UtcNow
                });

                existingNames.Add(row.Nombre!.ToLower());
                if (!string.IsNullOrWhiteSpace(row.CodigoBarra))
                    existingBarcodes.Add(row.CodigoBarra.ToLower());
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();

        // ─── Import Categorías de Clientes ───
        app.MapPost("/api/import/categorias-clientes", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (archivo.Length > 10 * 1024 * 1024) // 10 MB
                return Results.BadRequest(new { error = "El archivo no debe superar 10MB" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            var existingNamesList = await db.CategoriasClientes.Where(c => c.TenantId == tenantId)
                .Select(c => c.Nombre.ToLower()).ToListAsync();
            var existingNames = new HashSet<string>(existingNamesList);

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim
            });

            var rows = csv.GetRecords<CategoriaClienteImportRow>().ToList();
            var fila = 0;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                row.Nombre = row.Nombre?.Trim();
                row.Descripcion = row.Descripcion?.Trim();

                if (string.IsNullOrWhiteSpace(row.Nombre))
                    rowErrors.Add("Nombre es requerido");

                if (!string.IsNullOrWhiteSpace(row.Nombre) && existingNames.Contains(row.Nombre.ToLower()))
                    rowErrors.Add($"Ya existe una categoría con nombre '{row.Nombre}'");

                if (rowErrors.Count > 0)
                {
                    var identifier = row.Nombre ?? "(sin nombre)";
                    errores.Add(new ImportErrorDetail(fila, identifier, rowErrors));
                    continue;
                }

                db.CategoriasClientes.Add(new CategoriaCliente
                {
                    TenantId = tenantId,
                    Nombre = row.Nombre!,
                    Descripcion = row.Descripcion ?? "",
                    CreadoEn = DateTime.UtcNow
                });

                existingNames.Add(row.Nombre!.ToLower());
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();

        // ─── Import Unidades de Medida ───
        app.MapPost("/api/import/unidades-medida", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (archivo.Length > 10 * 1024 * 1024) // 10 MB
                return Results.BadRequest(new { error = "El archivo no debe superar 10MB" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            var existingNamesList = await db.UnidadesMedida.Where(u => u.TenantId == tenantId)
                .Select(u => u.Nombre.ToLower()).ToListAsync();
            var existingNames = new HashSet<string>(existingNamesList);

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim
            });

            var rows = csv.GetRecords<UnidadMedidaImportRow>().ToList();
            var fila = 0;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                row.Nombre = row.Nombre?.Trim();
                row.Abreviatura = row.Abreviatura?.Trim();

                if (string.IsNullOrWhiteSpace(row.Nombre))
                    rowErrors.Add("Nombre es requerido");

                if (!string.IsNullOrWhiteSpace(row.Nombre) && existingNames.Contains(row.Nombre.ToLower()))
                    rowErrors.Add($"Ya existe una unidad de medida con nombre '{row.Nombre}'");

                if (rowErrors.Count > 0)
                {
                    var identifier = row.Nombre ?? "(sin nombre)";
                    errores.Add(new ImportErrorDetail(fila, identifier, rowErrors));
                    continue;
                }

                db.UnidadesMedida.Add(new UnidadMedida
                {
                    TenantId = tenantId,
                    Nombre = row.Nombre!,
                    Abreviatura = row.Abreviatura,
                    CreadoEn = DateTime.UtcNow
                });

                existingNames.Add(row.Nombre!.ToLower());
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();

        // ─── Import Categorías de Productos ───
        app.MapPost("/api/import/categorias-productos", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (archivo.Length > 10 * 1024 * 1024) // 10 MB
                return Results.BadRequest(new { error = "El archivo no debe superar 10MB" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            var existingNamesList = await db.CategoriasProductos.Where(c => c.TenantId == tenantId)
                .Select(c => c.Nombre.ToLower()).ToListAsync();
            var existingNames = new HashSet<string>(existingNamesList);

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim
            });

            var rows = csv.GetRecords<CategoriaProductoImportRow>().ToList();
            var fila = 0;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                row.Nombre = row.Nombre?.Trim();
                row.Descripcion = row.Descripcion?.Trim();

                if (string.IsNullOrWhiteSpace(row.Nombre))
                    rowErrors.Add("Nombre es requerido");

                if (!string.IsNullOrWhiteSpace(row.Nombre) && existingNames.Contains(row.Nombre.ToLower()))
                    rowErrors.Add($"Ya existe una categoría de producto con nombre '{row.Nombre}'");

                if (rowErrors.Count > 0)
                {
                    var identifier = row.Nombre ?? "(sin nombre)";
                    errores.Add(new ImportErrorDetail(fila, identifier, rowErrors));
                    continue;
                }

                db.CategoriasProductos.Add(new CategoriaProducto
                {
                    TenantId = tenantId,
                    Nombre = row.Nombre!,
                    Descripcion = row.Descripcion ?? "",
                    CreadoEn = DateTime.UtcNow
                });

                existingNames.Add(row.Nombre!.ToLower());
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();

        // ─── Import Familias de Productos ───
        app.MapPost("/api/import/familias-productos", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (archivo.Length > 10 * 1024 * 1024) // 10 MB
                return Results.BadRequest(new { error = "El archivo no debe superar 10MB" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            var existingNamesList = await db.FamiliasProductos.Where(f => f.TenantId == tenantId)
                .Select(f => f.Nombre.ToLower()).ToListAsync();
            var existingNames = new HashSet<string>(existingNamesList);

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim
            });

            var rows = csv.GetRecords<FamiliaProductoImportRow>().ToList();
            var fila = 0;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                row.Nombre = row.Nombre?.Trim();
                row.Descripcion = row.Descripcion?.Trim();

                if (string.IsNullOrWhiteSpace(row.Nombre))
                    rowErrors.Add("Nombre es requerido");

                if (!string.IsNullOrWhiteSpace(row.Nombre) && existingNames.Contains(row.Nombre.ToLower()))
                    rowErrors.Add($"Ya existe una familia con nombre '{row.Nombre}'");

                if (rowErrors.Count > 0)
                {
                    var identifier = row.Nombre ?? "(sin nombre)";
                    errores.Add(new ImportErrorDetail(fila, identifier, rowErrors));
                    continue;
                }

                db.FamiliasProductos.Add(new Domain.Entities.FamiliaProducto
                {
                    TenantId = tenantId,
                    Nombre = row.Nombre!,
                    Descripcion = row.Descripcion ?? "",
                    CreadoEn = DateTime.UtcNow
                });

                existingNames.Add(row.Nombre!.ToLower());
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();

        // ─── Import Listas de Precios ───
        app.MapPost("/api/import/listas-precios", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (archivo.Length > 10 * 1024 * 1024) // 10 MB
                return Results.BadRequest(new { error = "El archivo no debe superar 10MB" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            var existingNamesList = await db.ListasPrecios.Where(l => l.TenantId == tenantId)
                .Select(l => l.Nombre.ToLower()).ToListAsync();
            var existingNames = new HashSet<string>(existingNamesList);

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim
            });

            var rows = csv.GetRecords<ListaPrecioImportRow>().ToList();
            var fila = 0;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                row.Nombre = row.Nombre?.Trim();
                row.Descripcion = row.Descripcion?.Trim();

                if (string.IsNullOrWhiteSpace(row.Nombre))
                    rowErrors.Add("Nombre es requerido");

                if (!string.IsNullOrWhiteSpace(row.Nombre) && existingNames.Contains(row.Nombre.ToLower()))
                    rowErrors.Add($"Ya existe una lista de precios con nombre '{row.Nombre}'");

                if (rowErrors.Count > 0)
                {
                    var identifier = row.Nombre ?? "(sin nombre)";
                    errores.Add(new ImportErrorDetail(fila, identifier, rowErrors));
                    continue;
                }

                db.ListasPrecios.Add(new Domain.Entities.ListaPrecio
                {
                    TenantId = tenantId,
                    Nombre = row.Nombre!,
                    Descripcion = row.Descripcion ?? "",
                    CreadoEn = DateTime.UtcNow,
                    Activo = true
                });

                existingNames.Add(row.Nombre!.ToLower());
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();

        // ─── Import Descuentos ───
        app.MapPost("/api/import/descuentos", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (archivo.Length > 10 * 1024 * 1024) // 10 MB
                return Results.BadRequest(new { error = "El archivo no debe superar 10MB" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            // Lookup products by name for "Producto" type
            var productosList = await db.Productos.Where(p => p.TenantId == tenantId)
                .Select(p => new { Key = p.Nombre.ToLower(), p.Id }).ToListAsync();
            var productos = productosList.GroupBy(p => p.Key).ToDictionary(g => g.Key, g => g.First().Id);

            // Load existing discounts for duplicate + scale validation
            var existingDiscounts = await db.DescuentosPorCantidad
                .Where(d => d.TenantId == tenantId)
                .Select(d => new { d.TipoAplicacion, d.ProductoId, d.CantidadMinima, d.DescuentoPorcentaje })
                .ToListAsync();
            var existingKeys = new HashSet<string>(
                existingDiscounts.Select(d => $"{d.TipoAplicacion}|{d.ProductoId}|{d.CantidadMinima}"));

            // Build scale maps per scope (Global|null or Producto|productId) for progressive validation
            // Key: "TipoAplicacion|ProductoId", Value: sorted list of (CantidadMinima, DescuentoPorcentaje)
            var scaleMap = existingDiscounts
                .GroupBy(d => $"{d.TipoAplicacion}|{d.ProductoId}")
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(d => (d.CantidadMinima, d.DescuentoPorcentaje)).ToList());

            // Track keys added within this import to catch intra-CSV duplicates
            var importedKeys = new HashSet<string>();

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim
            });

            var rows = csv.GetRecords<DescuentoImportRow>().ToList();
            var fila = 0;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                row.TipoAplicacion = row.TipoAplicacion?.Trim();
                row.Producto = row.Producto?.Trim();

                // Rule 1: TipoAplicacion must be Global or Producto
                if (string.IsNullOrWhiteSpace(row.TipoAplicacion) || (row.TipoAplicacion != "Global" && row.TipoAplicacion != "Producto"))
                    rowErrors.Add("TipoAplicacion debe ser 'Global' o 'Producto'");

                // Rule 2: CantidadMinima > 0
                if (row.CantidadMinima <= 0)
                    rowErrors.Add("CantidadMinima debe ser mayor a cero");

                // Rule 3: DescuentoPorcentaje between 0.01 and 100
                if (row.DescuentoPorcentaje < 0.01m || row.DescuentoPorcentaje > 100)
                    rowErrors.Add("DescuentoPorcentaje debe estar entre 0.01 y 100");

                int? productoId = null;
                if (row.TipoAplicacion == "Producto")
                {
                    // Rule 4: Producto required for type Producto
                    if (string.IsNullOrWhiteSpace(row.Producto))
                    {
                        rowErrors.Add("Producto es requerido para descuentos de tipo 'Producto'");
                    }
                    else if (!productos.TryGetValue(row.Producto.ToLower(), out var pId))
                    {
                        rowErrors.Add($"No se encontró el producto '{row.Producto}'");
                    }
                    else
                    {
                        productoId = pId;
                    }
                }
                else if (row.TipoAplicacion == "Global" && !string.IsNullOrWhiteSpace(row.Producto))
                {
                    // Rule 5: Global must NOT have a product
                    rowErrors.Add("El descuento global no debe tener producto asignado");
                }

                // Rule 6: Check for duplicate (same tipo + producto + cantidad minima)
                if (rowErrors.Count == 0)
                {
                    var key = $"{row.TipoAplicacion}|{productoId}|{row.CantidadMinima}";
                    if (existingKeys.Contains(key))
                    {
                        rowErrors.Add($"Ya existe un descuento {row.TipoAplicacion} con cantidad mínima {row.CantidadMinima}" +
                            (productoId != null ? " para este producto" : ""));
                    }
                    else if (importedKeys.Contains(key))
                    {
                        rowErrors.Add("Duplicado en el archivo: mismo tipo, producto y cantidad mínima que otra fila");
                    }
                }

                // Rule 7: Progressive scale — higher quantity must have higher discount
                if (rowErrors.Count == 0)
                {
                    var scaleKey = $"{row.TipoAplicacion}|{productoId}";
                    if (!scaleMap.ContainsKey(scaleKey))
                        scaleMap[scaleKey] = new List<(decimal, decimal)>();

                    var scale = scaleMap[scaleKey]
                        .Append((row.CantidadMinima, row.DescuentoPorcentaje))
                        .OrderBy(s => s.Item1)
                        .ToList();

                    for (int i = 1; i < scale.Count; i++)
                    {
                        if (scale[i].Item2 <= scale[i - 1].Item2)
                        {
                            rowErrors.Add($"Escala inconsistente: cantidad {scale[i].Item1} tiene descuento {scale[i].Item2}% " +
                                $"que no es mayor que cantidad {scale[i - 1].Item1} con {scale[i - 1].Item2}%. " +
                                "Mayor cantidad debe tener mayor descuento.");
                            break;
                        }
                    }
                }

                if (rowErrors.Count > 0)
                {
                    var identifier = row.TipoAplicacion == "Producto" ? (row.Producto ?? "(sin producto)") : "Global";
                    errores.Add(new ImportErrorDetail(fila, identifier, rowErrors));
                    continue;
                }

                var newKey = $"{row.TipoAplicacion}|{productoId}|{row.CantidadMinima}";
                importedKeys.Add(newKey);
                // Add to scale map so subsequent rows in the CSV are validated against it
                var sKey = $"{row.TipoAplicacion}|{productoId}";
                scaleMap[sKey].Add((row.CantidadMinima, row.DescuentoPorcentaje));

                db.DescuentosPorCantidad.Add(new Domain.Entities.DescuentoPorCantidad
                {
                    TenantId = tenantId,
                    ProductoId = productoId,
                    CantidadMinima = row.CantidadMinima,
                    DescuentoPorcentaje = row.DescuentoPorcentaje,
                    TipoAplicacion = row.TipoAplicacion!,
                    CreadoEn = DateTime.UtcNow
                });

                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();

        // ─── Import Promociones ───
        app.MapPost("/api/import/promociones", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (archivo.Length > 10 * 1024 * 1024) // 10 MB
                return Results.BadRequest(new { error = "El archivo no debe superar 10MB" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            // Lookup products by name
            var productosList = await db.Productos.Where(p => p.TenantId == tenantId)
                .Select(p => new { Key = p.Nombre.ToLower(), p.Id, p.Nombre }).ToListAsync();
            var productosByName = productosList.GroupBy(p => p.Key)
                .ToDictionary(g => g.Key, g => g.First());

            // Existing promotion names for duplicate check
            var existingNames = new HashSet<string>(
                await db.Promociones.Where(p => p.TenantId == tenantId)
                    .Select(p => p.Nombre.ToLower()).ToListAsync());
            var importedNames = new HashSet<string>();

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim
            });

            var rows = csv.GetRecords<PromocionImportRow>().ToList();
            var fila = 0;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                row.Nombre = row.Nombre?.Trim();
                row.Descripcion = row.Descripcion?.Trim();
                row.Productos = row.Productos?.Trim();
                row.FechaInicio = row.FechaInicio?.Trim();
                row.FechaFin = row.FechaFin?.Trim();

                if (string.IsNullOrWhiteSpace(row.Nombre))
                    rowErrors.Add("Nombre es requerido");

                if (row.DescuentoPorcentaje < 0.01m || row.DescuentoPorcentaje > 100)
                    rowErrors.Add("DescuentoPorcentaje debe estar entre 0.01 y 100");

                // Parse dates
                DateTime fechaInicio = default, fechaFin = default;
                if (string.IsNullOrWhiteSpace(row.FechaInicio))
                    rowErrors.Add("FechaInicio es requerida (formato: yyyy-MM-dd)");
                else if (!DateTime.TryParse(row.FechaInicio, out fechaInicio))
                    rowErrors.Add($"FechaInicio inválida: '{row.FechaInicio}' (formato: yyyy-MM-dd)");

                if (string.IsNullOrWhiteSpace(row.FechaFin))
                    rowErrors.Add("FechaFin es requerida (formato: yyyy-MM-dd)");
                else if (!DateTime.TryParse(row.FechaFin, out fechaFin))
                    rowErrors.Add($"FechaFin inválida: '{row.FechaFin}' (formato: yyyy-MM-dd)");

                if (fechaInicio != default && fechaFin != default && fechaFin <= fechaInicio)
                    rowErrors.Add("FechaFin debe ser posterior a FechaInicio");

                // Parse products (semicolon-separated)
                var productIds = new List<int>();
                if (string.IsNullOrWhiteSpace(row.Productos))
                {
                    rowErrors.Add("Debe incluir al menos un producto (separados por ;)");
                }
                else
                {
                    var productNames = row.Productos.Split(';', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                    foreach (var pName in productNames)
                    {
                        if (productosByName.TryGetValue(pName.ToLower(), out var prod))
                            productIds.Add(prod.Id);
                        else
                            rowErrors.Add($"No se encontró el producto '{pName}'");
                    }
                }

                // Duplicate name check
                if (!string.IsNullOrWhiteSpace(row.Nombre))
                {
                    var nameKey = row.Nombre.ToLower();
                    if (existingNames.Contains(nameKey))
                        rowErrors.Add($"Ya existe una promoción con el nombre '{row.Nombre}'");
                    else if (importedNames.Contains(nameKey))
                        rowErrors.Add("Duplicado en el archivo: mismo nombre que otra fila");
                }

                if (rowErrors.Count > 0)
                {
                    errores.Add(new ImportErrorDetail(fila, row.Nombre ?? "(sin nombre)", rowErrors));
                    continue;
                }

                var promo = new Domain.Entities.Promocion
                {
                    TenantId = tenantId,
                    Nombre = row.Nombre!,
                    Descripcion = row.Descripcion ?? "",
                    DescuentoPorcentaje = row.DescuentoPorcentaje,
                    FechaInicio = fechaInicio,
                    FechaFin = fechaFin,
                    CreadoEn = DateTime.UtcNow,
                    PromocionProductos = productIds.Select(pid => new Domain.Entities.PromocionProducto
                    {
                        TenantId = tenantId,
                        ProductoId = pid,
                        CreadoEn = DateTime.UtcNow
                    }).ToList()
                };

                db.Promociones.Add(promo);
                importedNames.Add(row.Nombre!.ToLower());
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();

        // ── IMPORT INVENTARIO ────────────────────────────────
        app.MapPost("/api/import/inventario", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null,
            });

            var rows = csv.GetRecords<InventarioImportRow>().ToList();
            if (rows.Count == 0) return Results.BadRequest(new { error = "El archivo está vacío" });

            // Lookup: all products by name and code
            var productos = await db.Productos
                .Where(p => p.TenantId == tenantId && p.EliminadoEn == null)
                .Select(p => new { p.Id, p.Nombre, p.CodigoBarra })
                .ToListAsync();

            var productosByName = productos
                .GroupBy(p => p.Nombre.ToLower())
                .ToDictionary(g => g.Key, g => g.First());

            var productosByCode = productos
                .Where(p => !string.IsNullOrWhiteSpace(p.CodigoBarra))
                .GroupBy(p => p.CodigoBarra!.ToLower())
                .ToDictionary(g => g.Key, g => g.First());

            // Existing inventory by productoId
            var existingInventory = await db.Inventarios
                .Where(i => i.TenantId == tenantId && i.EliminadoEn == null)
                .Select(i => new { i.Id, i.ProductoId })
                .ToDictionaryAsync(i => i.ProductoId, i => i.Id);

            var errores = new List<ImportErrorDetail>();
            int importados = 0;

            for (int i = 0; i < rows.Count; i++)
            {
                var row = rows[i];
                var rowErrors = new List<string>();
                var rowName = row.Producto?.Trim() ?? $"Fila {i + 1}";

                // 1. Find product by code first, then by name
                int? productoId = null;
                if (!string.IsNullOrWhiteSpace(row.CodigoBarra) && productosByCode.TryGetValue(row.CodigoBarra.Trim().ToLower(), out var byCode))
                {
                    productoId = byCode.Id;
                }
                else if (!string.IsNullOrWhiteSpace(row.Producto) && productosByName.TryGetValue(row.Producto.Trim().ToLower(), out var byName))
                {
                    productoId = byName.Id;
                }

                if (productoId == null)
                {
                    rowErrors.Add("No se encontró el producto (verifique nombre o código de barra)");
                }

                // 2. Validate quantities
                if (row.CantidadActual < 0) rowErrors.Add("Cantidad actual no puede ser negativa");
                if (row.StockMinimo < 0) rowErrors.Add("Stock mínimo no puede ser negativo");
                if (row.StockMaximo < 0) rowErrors.Add("Stock máximo no puede ser negativo");
                if (row.StockMaximo > 0 && row.StockMinimo > row.StockMaximo)
                    rowErrors.Add("Stock mínimo no puede ser mayor que stock máximo");

                if (rowErrors.Count > 0)
                {
                    errores.Add(new ImportErrorDetail(i + 1, rowName, rowErrors));
                    continue;
                }

                // 3. Upsert: update if exists, create if not
                if (existingInventory.TryGetValue(productoId!.Value, out var existingId))
                {
                    var existing = await db.Inventarios.FindAsync(existingId);
                    if (existing != null)
                    {
                        existing.CantidadActual = row.CantidadActual;
                        existing.StockMinimo = row.StockMinimo;
                        existing.StockMaximo = row.StockMaximo;
                        existing.ActualizadoEn = DateTime.UtcNow;
                    }
                }
                else
                {
                    db.Inventarios.Add(new Domain.Entities.Inventario
                    {
                        TenantId = tenantId,
                        ProductoId = productoId!.Value,
                        CantidadActual = row.CantidadActual,
                        StockMinimo = row.StockMinimo,
                        StockMaximo = row.StockMaximo,
                        CreadoEn = DateTime.UtcNow,
                    });
                    existingInventory[productoId!.Value] = 0; // mark as handled for intra-CSV duplicates
                }

                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();

        // ─── Import Zonas ───
        app.MapPost("/api/import/zonas", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (archivo.Length > 10 * 1024 * 1024) // 10 MB
                return Results.BadRequest(new { error = "El archivo no debe superar 10MB" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            var existingNamesList = await db.Zonas.Where(z => z.TenantId == tenantId)
                .Select(z => z.Nombre.ToLower()).ToListAsync();
            var existingNames = new HashSet<string>(existingNamesList);

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null,
                TrimOptions = TrimOptions.Trim
            });

            var rows = csv.GetRecords<ZonaImportRow>().ToList();
            var fila = 0;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                row.Nombre = row.Nombre?.Trim();
                row.Descripcion = row.Descripcion?.Trim();

                if (string.IsNullOrWhiteSpace(row.Nombre))
                    rowErrors.Add("Nombre es requerido");

                if (!string.IsNullOrWhiteSpace(row.Nombre) && existingNames.Contains(row.Nombre.ToLower()))
                    rowErrors.Add($"Ya existe una zona con nombre '{row.Nombre}'");

                if (rowErrors.Count > 0)
                {
                    var identifier = row.Nombre ?? "(sin nombre)";
                    errores.Add(new ImportErrorDetail(fila, identifier, rowErrors));
                    continue;
                }

                db.Zonas.Add(new Domain.Entities.Zona
                {
                    TenantId = tenantId,
                    Nombre = row.Nombre!,
                    Descripcion = row.Descripcion ?? "",
                    CentroLatitud = row.CentroLatitud,
                    CentroLongitud = row.CentroLongitud,
                    RadioKm = row.RadioKm,
                    CreadoEn = DateTime.UtcNow
                });

                existingNames.Add(row.Nombre!.ToLower());
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN")).DisableAntiforgery();
    }

    // ═══════════════════════════════════════════════════════
    // HELPER: Generate CSV file result
    // ═══════════════════════════════════════════════════════
    private static IResult GenerateCsvResult<T>(List<T> data, string fileName)
    {
        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream, System.Text.Encoding.UTF8);
        using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

        csv.WriteRecords(data);
        writer.Flush();

        var bytes = memoryStream.ToArray();
        return Results.File(bytes, "text/csv; charset=utf-8", fileName);
    }
}

// ═══════════════════════════════════════════════════════
// CSV ROW MODELS (Export)
// ═══════════════════════════════════════════════════════
public class ClienteCsvRow
{
    public string Nombre { get; set; } = "";
    public string RFC { get; set; } = "";
    public string Correo { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string Direccion { get; set; } = "";
    public string Zona { get; set; } = "";
    public string Categoria { get; set; } = "";
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public string Activo { get; set; } = "Si";
}

public class ProductoCsvRow
{
    public string Nombre { get; set; } = "";
    public string CodigoBarra { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public decimal PrecioBase { get; set; }
    public string Familia { get; set; } = "";
    public string Categoria { get; set; } = "";
    public string UnidadMedida { get; set; } = "";
    public string Activo { get; set; } = "Si";
}

public class InventarioCsvRow
{
    public string Producto { get; set; } = "";
    public string CodigoBarra { get; set; } = "";
    public decimal CantidadActual { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal StockMaximo { get; set; }
}

public class InventarioImportRow
{
    public string? Producto { get; set; }
    public string? CodigoBarra { get; set; }
    public decimal CantidadActual { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal StockMaximo { get; set; }
}

public class PedidoCsvRow
{
    public string NumeroPedido { get; set; } = "";
    public string FechaPedido { get; set; } = "";
    public string Cliente { get; set; } = "";
    public string Vendedor { get; set; } = "";
    public string Estado { get; set; } = "";
    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Impuestos { get; set; }
    public decimal Total { get; set; }
    public string Notas { get; set; } = "";
}

public class CobroCsvRow
{
    public string FechaCobro { get; set; } = "";
    public string Cliente { get; set; } = "";
    public string NumeroPedido { get; set; } = "";
    public string Vendedor { get; set; } = "";
    public decimal Monto { get; set; }
    public string MetodoPago { get; set; } = "";
    public string Referencia { get; set; } = "";
    public string Notas { get; set; } = "";
}

public class CategoriaClienteCsvRow
{
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
}

public class UnidadMedidaCsvRow
{
    public string Nombre { get; set; } = "";
    public string Abreviatura { get; set; } = "";
    public string Activo { get; set; } = "Si";
}

public class CategoriaProductoCsvRow
{
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string Activo { get; set; } = "Si";
}

public class FamiliaProductoCsvRow
{
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string Activo { get; set; } = "Si";
}

public class ListaPrecioCsvRow
{
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string Activo { get; set; } = "Si";
}

public class DescuentoCsvRow
{
    public string TipoAplicacion { get; set; } = "";
    public string Producto { get; set; } = "";
    public decimal CantidadMinima { get; set; }
    public decimal DescuentoPorcentaje { get; set; }
    public string Activo { get; set; } = "Si";
}

public class PromocionCsvRow
{
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public decimal DescuentoPorcentaje { get; set; }
    public string FechaInicio { get; set; } = "";
    public string FechaFin { get; set; } = "";
    public string Productos { get; set; } = "";
    public string Activo { get; set; } = "Si";
}

public class ZonaCsvRow
{
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string CentroLatitud { get; set; } = "";
    public string CentroLongitud { get; set; } = "";
    public string RadioKm { get; set; } = "";
    public string Activo { get; set; } = "Si";
}

public class RutaCsvRow
{
    public string Nombre { get; set; } = "";
    public string Fecha { get; set; } = "";
    public string Vendedor { get; set; } = "";
    public string Zona { get; set; } = "";
    public string Estado { get; set; } = "";
    public int TotalParadas { get; set; }
    public int ParadasCompletadas { get; set; }
    public string HoraInicioEstimada { get; set; } = "";
    public string HoraFinEstimada { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string Notas { get; set; } = "";
    public string Activo { get; set; } = "Si";
}

// ═══════════════════════════════════════════════════════
// CSV ROW MODELS (Import)
// ═══════════════════════════════════════════════════════
public class ClienteImportRow
{
    public string? Nombre { get; set; }
    public string? RFC { get; set; }
    public string? Correo { get; set; }
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public string? Zona { get; set; }
    public string? Categoria { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
}

public class CategoriaClienteImportRow
{
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
}

public class UnidadMedidaImportRow
{
    public string? Nombre { get; set; }
    public string? Abreviatura { get; set; }
}

public class CategoriaProductoImportRow
{
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
}

public class FamiliaProductoImportRow
{
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
}

public class ListaPrecioImportRow
{
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
}

public class DescuentoImportRow
{
    public string? TipoAplicacion { get; set; }
    public string? Producto { get; set; }
    public decimal CantidadMinima { get; set; }
    public decimal DescuentoPorcentaje { get; set; }
}

public class PromocionImportRow
{
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
    public decimal DescuentoPorcentaje { get; set; }
    public string? FechaInicio { get; set; }
    public string? FechaFin { get; set; }
    public string? Productos { get; set; }
}

public class ZonaImportRow
{
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
    public double? CentroLatitud { get; set; }
    public double? CentroLongitud { get; set; }
    public double? RadioKm { get; set; }
}

public class ProductoImportRow
{
    public string? Nombre { get; set; }
    public string? CodigoBarra { get; set; }
    public string? Descripcion { get; set; }
    public decimal PrecioBase { get; set; }
    public string? Familia { get; set; }
    public string? Categoria { get; set; }
    public string? UnidadMedida { get; set; }
}

// ═══════════════════════════════════════════════════════
// IMPORT RESULT DTOs
// ═══════════════════════════════════════════════════════
public record ImportResult(int Importados, int Errores, int TotalFilas, List<ImportErrorDetail> DetalleErrores);
public record ImportErrorDetail(int Fila, string Nombre, List<string> Errores);
