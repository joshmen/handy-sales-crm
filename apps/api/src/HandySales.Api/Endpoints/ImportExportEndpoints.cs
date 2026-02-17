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
        }).RequireAuthorization();

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
        }).RequireAuthorization();

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
        }).RequireAuthorization();

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
        }).RequireAuthorization();

        // ═══════════════════════════════════════════════════════
        // TEMPLATE ENDPOINTS (CSV vacío con headers)
        // ═══════════════════════════════════════════════════════

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
        }).RequireAuthorization();

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
        }).RequireAuthorization();

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

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            // Load lookup tables for name-to-id mapping
            var zonas = await db.Zonas.Where(z => z.TenantId == tenantId)
                .ToDictionaryAsync(z => z.Nombre.ToLower(), z => z.Id);
            var categorias = await db.CategoriasClientes.Where(c => c.TenantId == tenantId)
                .ToDictionaryAsync(c => c.Nombre.ToLower(), c => c.Id);
            var existingNamesList = await db.Clientes.Where(c => c.TenantId == tenantId)
                .Select(c => c.Nombre.ToLower()).ToListAsync();
            var existingNames = new HashSet<string>(existingNamesList);

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null
            });

            var rows = csv.GetRecords<ClienteImportRow>().ToList();
            var fila = 1;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

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

                if (existingNames.Contains(row.Nombre?.ToLower() ?? ""))
                    rowErrors.Add($"Ya existe un cliente con nombre '{row.Nombre}'");

                var zonaId = 0;
                if (!string.IsNullOrWhiteSpace(row.Zona))
                {
                    if (!zonas.TryGetValue(row.Zona.ToLower(), out zonaId))
                        rowErrors.Add($"Zona '{row.Zona}' no encontrada");
                }
                else
                    rowErrors.Add("Zona es requerida");

                var categoriaId = 0;
                if (!string.IsNullOrWhiteSpace(row.Categoria))
                {
                    if (!categorias.TryGetValue(row.Categoria.ToLower(), out categoriaId))
                        rowErrors.Add($"Categoría '{row.Categoria}' no encontrada");
                }

                if (rowErrors.Count > 0)
                {
                    errores.Add(new ImportErrorDetail(fila, row.Nombre ?? "(vacío)", rowErrors));
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
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization().DisableAntiforgery();

        app.MapPost("/api/import/productos", async (
            IFormFile archivo,
            [FromServices] HandySalesDbContext db,
            [FromServices] ITenantContextService tenantContext) =>
        {
            if (archivo == null || archivo.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó un archivo" });

            if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "El archivo debe ser CSV" });

            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();
            var errores = new List<ImportErrorDetail>();
            var importados = 0;

            // Load lookup tables
            var familias = await db.FamiliasProductos.Where(f => f.TenantId == tenantId)
                .ToDictionaryAsync(f => f.Nombre.ToLower(), f => f.Id);
            var categorias = await db.CategoriasProductos.Where(c => c.TenantId == tenantId)
                .ToDictionaryAsync(c => c.Nombre.ToLower(), c => c.Id);
            var unidades = await db.UnidadesMedida.Where(u => u.TenantId == tenantId)
                .ToDictionaryAsync(u => u.Nombre.ToLower(), u => u.Id);
            var existingProdNamesList = await db.Productos.Where(p => p.TenantId == tenantId)
                .Select(p => p.Nombre.ToLower()).ToListAsync();
            var existingNames = new HashSet<string>(existingProdNamesList);

            using var reader = new StreamReader(archivo.OpenReadStream());
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null
            });

            var rows = csv.GetRecords<ProductoImportRow>().ToList();
            var fila = 1;

            foreach (var row in rows)
            {
                fila++;
                var rowErrors = new List<string>();

                if (string.IsNullOrWhiteSpace(row.Nombre))
                    rowErrors.Add("Nombre es requerido");
                if (string.IsNullOrWhiteSpace(row.CodigoBarra))
                    rowErrors.Add("Código de barra es requerido");
                if (row.PrecioBase <= 0)
                    rowErrors.Add("Precio base debe ser mayor a 0");

                if (existingNames.Contains(row.Nombre?.ToLower() ?? ""))
                    rowErrors.Add($"Ya existe un producto con nombre '{row.Nombre}'");

                var familiaId = 0;
                if (!string.IsNullOrWhiteSpace(row.Familia))
                {
                    if (!familias.TryGetValue(row.Familia.ToLower(), out familiaId))
                        rowErrors.Add($"Familia '{row.Familia}' no encontrada");
                }
                else
                    rowErrors.Add("Familia es requerida");

                var categoriaId = 0;
                if (!string.IsNullOrWhiteSpace(row.Categoria))
                {
                    if (!categorias.TryGetValue(row.Categoria.ToLower(), out categoriaId))
                        rowErrors.Add($"Categoría '{row.Categoria}' no encontrada");
                }

                var unidadId = 0;
                if (!string.IsNullOrWhiteSpace(row.UnidadMedida))
                {
                    if (!unidades.TryGetValue(row.UnidadMedida.ToLower(), out unidadId))
                        rowErrors.Add($"Unidad de medida '{row.UnidadMedida}' no encontrada");
                }
                else
                    rowErrors.Add("Unidad de medida es requerida");

                if (rowErrors.Count > 0)
                {
                    errores.Add(new ImportErrorDetail(fila, row.Nombre ?? "(vacío)", rowErrors));
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
                importados++;
            }

            if (importados > 0)
                await db.SaveChangesAsync();

            return Results.Ok(new ImportResult(importados, errores.Count, rows.Count, errores));
        }).RequireAuthorization().DisableAntiforgery();
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
