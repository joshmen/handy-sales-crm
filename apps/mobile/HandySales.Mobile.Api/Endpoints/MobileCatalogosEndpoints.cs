using HandySales.Application.Zonas.Services;
using HandySales.Application.CategoriasClientes.Services;
using HandySales.Application.CategoriasProductos.Services;
using HandySales.Application.FamiliasProductos.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileCatalogosEndpoints
{
    public static void MapMobileCatalogosEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/catalogos")
            .RequireAuthorization()
            .WithTags("Catálogos")
            .WithOpenApi();

        // GET /api/mobile/catalogos/zonas — Lista de zonas activas
        group.MapGet("/zonas", async (
            [FromServices] ZonaService servicio) =>
        {
            var zonas = await servicio.ObtenerZonasAsync();
            var activas = zonas.Where(z => z.Activo).ToList();
            return Results.Ok(new { success = true, data = activas, count = activas.Count });
        })
        .WithSummary("Lista de zonas")
        .WithDescription("Retorna todas las zonas activas del tenant para dropdowns.")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/catalogos/categorias-cliente — Lista de categorías de cliente activas
        group.MapGet("/categorias-cliente", async (
            [FromServices] CategoriaClienteService servicio) =>
        {
            var categorias = await servicio.ObtenerCategoriasAsync();
            return Results.Ok(new { success = true, data = categorias, count = categorias.Count });
        })
        .WithSummary("Lista de categorías de cliente")
        .WithDescription("Retorna todas las categorías de cliente activas del tenant para dropdowns.")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/catalogos/categorias-producto — Lista de categorías de producto activas
        group.MapGet("/categorias-producto", async (
            [FromServices] CategoriaProductoService servicio) =>
        {
            var categorias = await servicio.ObtenerCategoriasAsync();
            return Results.Ok(new { success = true, data = categorias, count = categorias.Count });
        })
        .WithSummary("Lista de categorías de producto")
        .WithDescription("Retorna todas las categorías de producto activas del tenant para dropdowns.")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/catalogos/familias-producto — Lista de familias de producto activas
        group.MapGet("/familias-producto", async (
            [FromServices] FamiliaProductoService servicio) =>
        {
            var familias = await servicio.ObtenerFamiliasAsync();
            var activas = familias.Where(f => f.Activo).ToList();
            return Results.Ok(new { success = true, data = activas, count = activas.Count });
        })
        .WithSummary("Lista de familias de producto")
        .WithDescription("Retorna todas las familias de producto activas del tenant para dropdowns.")
        .Produces<object>(StatusCodes.Status200OK);
    }
}
