using HandySales.Application.Clientes.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileClienteEndpoints
{
    public static void MapMobileClienteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/clientes")
            .RequireAuthorization()
            .WithTags("Clientes")
            .WithOpenApi();

        group.MapGet("/", async (
            [FromQuery] string? busqueda,
            [FromQuery] int? zonaId,
            [FromQuery] int pagina,
            [FromQuery] int porPagina,
            [FromServices] ClienteService servicio) =>
        {
            var clientes = await servicio.ObtenerClientesAsync();

            // Filtrar por búsqueda si se proporciona
            if (!string.IsNullOrEmpty(busqueda))
            {
                busqueda = busqueda.ToLower();
                clientes = clientes.Where(c =>
                    c.Nombre.ToLower().Contains(busqueda) ||
                    c.Correo?.ToLower().Contains(busqueda) == true ||
                    c.Telefono?.Contains(busqueda) == true
                ).ToList();
            }

            // Filtrar por zona si se proporciona
            if (zonaId.HasValue)
            {
                clientes = clientes.Where(c => c.IdZona == zonaId.Value).ToList();
            }

            var total = clientes.Count;
            var paginados = clientes
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
        .WithSummary("Listar clientes")
        .WithDescription("Lista clientes con paginación y filtros opcionales por búsqueda y zona.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] ClienteService servicio) =>
        {
            var cliente = await servicio.ObtenerPorIdAsync(id);
            if (cliente is null)
                return Results.NotFound(new { success = false, message = "Cliente no encontrado" });

            return Results.Ok(new { success = true, data = cliente });
        })
        .WithSummary("Detalle de cliente")
        .WithDescription("Obtiene información completa de un cliente.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/{id:int}/ubicacion", async (
            int id,
            [FromServices] ClienteService servicio) =>
        {
            var cliente = await servicio.ObtenerPorIdAsync(id);
            if (cliente is null)
                return Results.NotFound(new { success = false, message = "Cliente no encontrado" });

            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    id = cliente.Id,
                    nombre = cliente.Nombre,
                    direccion = cliente.Direccion,
                    latitud = cliente.Latitud,
                    longitud = cliente.Longitud
                }
            });
        })
        .WithSummary("Ubicación del cliente")
        .WithDescription("Obtiene coordenadas y dirección del cliente para navegación GPS.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/cercanos", async (
            [FromQuery] double latitud,
            [FromQuery] double longitud,
            [FromQuery] double radioKm,
            [FromServices] ClienteService servicio) =>
        {
            var clientes = await servicio.ObtenerClientesAsync();

            // Filtrar clientes con coordenadas y calcular distancia
            var cercanos = clientes
                .Where(c => c.Latitud.HasValue && c.Longitud.HasValue)
                .Select(c => new
                {
                    cliente = c,
                    distancia = CalcularDistanciaKm(latitud, longitud, c.Latitud!.Value, c.Longitud!.Value)
                })
                .Where(x => x.distancia <= radioKm)
                .OrderBy(x => x.distancia)
                .Select(x => new
                {
                    x.cliente.Id,
                    x.cliente.Nombre,
                    x.cliente.Direccion,
                    x.cliente.Telefono,
                    x.cliente.Latitud,
                    x.cliente.Longitud,
                    DistanciaKm = Math.Round(x.distancia, 2)
                })
                .ToList();

            return Results.Ok(new { success = true, data = cercanos, count = cercanos.Count });
        })
        .WithSummary("Clientes cercanos")
        .WithDescription("Lista clientes dentro de un radio en kilómetros desde las coordenadas proporcionadas.")
        .Produces<object>(StatusCodes.Status200OK);
    }

    private static double CalcularDistanciaKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double radioTierra = 6371; // km
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return radioTierra * c;
    }

    private static double ToRadians(double grados) => grados * Math.PI / 180;
}
