using HandySales.Application.Inventario.Services;
using HandySales.Application.Productos.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileProductoEndpoints
{
    public static void MapMobileProductoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/productos")
            .RequireAuthorization()
            .WithTags("Productos")
            .WithOpenApi();

        group.MapGet("/", async (
            [FromQuery] string? busqueda,
            [FromQuery] int? categoriaId,
            [FromQuery] int? familiaId,
            [FromQuery] int pagina,
            [FromQuery] int porPagina,
            [FromServices] ProductoService servicio) =>
        {
            var productos = await servicio.ObtenerProductosAsync();

            // Filtrar por búsqueda
            if (!string.IsNullOrEmpty(busqueda))
            {
                busqueda = busqueda.ToLower();
                productos = productos.Where(p =>
                    p.Nombre.ToLower().Contains(busqueda) ||
                    p.CodigoBarra?.ToLower().Contains(busqueda) == true ||
                    p.Descripcion?.ToLower().Contains(busqueda) == true
                ).ToList();
            }

            // Filtrar por categoría
            if (categoriaId.HasValue)
            {
                productos = productos.Where(p => p.CategoraId == categoriaId.Value).ToList();
            }

            // Filtrar por familia
            if (familiaId.HasValue)
            {
                productos = productos.Where(p => p.FamiliaId == familiaId.Value).ToList();
            }

            var total = productos.Count;
            var paginados = productos
                .Skip((pagina - 1) * porPagina)
                .Take(porPagina)
                .ToList();

            return Results.Ok(new
            {
                success = true,
                data = paginados,
                pagination = new
                {
                    page = pagina,
                    pageSize = porPagina,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / porPagina)
                }
            });
        })
        .WithSummary("Listar productos")
        .WithDescription("Lista productos con paginación y filtros opcionales.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] ProductoService servicio) =>
        {
            var producto = await servicio.ObtenerPorIdAsync(id);
            if (producto is null)
                return Results.NotFound(new { success = false, message = "Producto no encontrado" });

            return Results.Ok(new { success = true, data = producto });
        })
        .WithSummary("Detalle de producto")
        .WithDescription("Obtiene información completa de un producto.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/{id:int}/stock", async (
            int id,
            [FromServices] InventarioService inventarioService) =>
        {
            var inventario = await inventarioService.ObtenerPorProductoIdAsync(id);
            if (inventario is null)
                return Results.Ok(new { success = true, data = new { productoId = id, stock = 0, disponible = false } });

            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    productoId = id,
                    stock = inventario.CantidadActual,
                    disponible = inventario.CantidadActual > 0,
                    minimo = inventario.StockMinimo,
                    enAlerta = inventario.CantidadActual <= inventario.StockMinimo
                }
            });
        })
        .WithSummary("Stock de producto")
        .WithDescription("Consulta la disponibilidad y stock actual del producto.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/codigo/{codigo}", async (
            string codigo,
            [FromServices] ProductoService servicio) =>
        {
            var productos = await servicio.ObtenerProductosAsync();
            var producto = productos.FirstOrDefault(p =>
                p.CodigoBarra?.Equals(codigo, StringComparison.OrdinalIgnoreCase) == true);

            if (producto is null)
                return Results.NotFound(new { success = false, message = "Producto no encontrado con ese código" });

            return Results.Ok(new { success = true, data = producto });
        })
        .WithSummary("Buscar por código")
        .WithDescription("Busca un producto por su código (código de barras o SKU).")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);
    }
}
