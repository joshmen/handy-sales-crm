using HandySuites.Application.Clientes.DTOs;
using HandySuites.Application.Clientes.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Mobile.Api.Endpoints;

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
            var tamano = porPagina > 0 ? Math.Min(porPagina, 100) : 20;
            var paginaActual = pagina > 0 ? pagina : 1;
            var paginados = clientes
                .Skip((paginaActual - 1) * tamano)
                .Take(tamano)
                .ToList();

            return Results.Ok(new
            {
                success = true,
                data = paginados,
                pagination = new
                {
                    page = paginaActual,
                    pageSize = tamano,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / tamano)
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
            // Validación de input: previene DoS (radioKm = MaxValue cargaría toda la tabla
            // calculando haversine), y rangos imposibles (lat/lng fuera de la Tierra).
            if (latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180)
                return Results.BadRequest(new { error = "Coordenadas fuera de rango (lat ±90, lng ±180)" });
            if (radioKm <= 0 || radioKm > 1000)
                return Results.BadRequest(new { error = "radioKm debe estar entre 0 y 1000" });

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

        // POST /api/mobile/clientes — Crear cliente (siempre como prospecto)
        group.MapPost("/", async (
            ClienteCreateDto dto,
            [FromServices] ClienteService servicio) =>
        {
            // Mobile-created clients are always prospects pending approval
            dto.EsProspecto = true;

            var resultado = await servicio.CrearClienteAsync(dto);
            if (!resultado.Success)
                return Results.Conflict(new { success = false, message = resultado.Error });

            return Results.Created($"/api/mobile/clientes/{resultado.Id}",
                new { success = true, data = new { id = resultado.Id } });
        })
        .WithSummary("Crear cliente")
        .WithDescription("Crea un nuevo cliente con nombre, RFC, teléfono, email, dirección, zona y categoría.")
        .Produces<object>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status409Conflict);

        // PUT /api/mobile/clientes/{id} — Editar cliente
        group.MapPut("/{id:int}", async (
            int id,
            ClienteCreateDto dto,
            [FromServices] ClienteService servicio) =>
        {
            var resultado = await servicio.ActualizarClienteAsync(id, dto);
            if (!resultado.Success)
            {
                if (resultado.Error?.Contains("no encontrado") == true)
                    return Results.NotFound(new { success = false, message = resultado.Error });
                return Results.Conflict(new { success = false, message = resultado.Error });
            }

            return Results.Ok(new { success = true, message = "Cliente actualizado" });
        })
        .WithSummary("Editar cliente")
        .WithDescription("Actualiza los datos de un cliente existente.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status409Conflict);
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
