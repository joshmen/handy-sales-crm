using HandySales.Application.Geo.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class GeoEndpoints
{
    public static void MapGeoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/geo").RequireAuthorization();

        // GET /api/geo/nearby?lat=&lng=&radiusKm=2
        group.MapGet("/nearby", async (
            [FromServices] IGeoQueryService geo,
            [FromServices] ITenantContextService tenantContext,
            [FromQuery] double lat,
            [FromQuery] double lng,
            [FromQuery] double radiusKm = 2) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var clientes = await geo.GetNearbyClientesAsync(lat, lng, radiusKm, tenantId);
            return Results.Ok(new { clientes });
        });

        // GET /api/geo/nearby-unserved?lat=&lng=&radiusKm=2&daysSinceVisit=30
        group.MapGet("/nearby-unserved", async (
            [FromServices] IGeoQueryService geo,
            [FromServices] ITenantContextService tenantContext,
            [FromQuery] double lat,
            [FromQuery] double lng,
            [FromQuery] double radiusKm = 2,
            [FromQuery] int daysSinceVisit = 30) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var clientes = await geo.GetNearbyUnservedAsync(lat, lng, radiusKm, daysSinceVisit, tenantId);
            return Results.Ok(new { clientes });
        });

        // GET /api/geo/nearby-prospects?lat=&lng=&radiusKm=2
        group.MapGet("/nearby-prospects", async (
            [FromServices] IGeoQueryService geo,
            [FromServices] ITenantContextService tenantContext,
            [FromQuery] double lat,
            [FromQuery] double lng,
            [FromQuery] double radiusKm = 2) =>
        {
            var tenantId = tenantContext.TenantId ?? 0;
            if (tenantId == 0) return Results.Unauthorized();

            var clientes = await geo.GetNearbyProspectsAsync(lat, lng, radiusKm, tenantId);
            return Results.Ok(new { clientes });
        });
    }
}
