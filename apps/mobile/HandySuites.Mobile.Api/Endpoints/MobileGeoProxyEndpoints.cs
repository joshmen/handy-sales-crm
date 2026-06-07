using Microsoft.Extensions.Caching.Memory;

namespace HandySuites.Mobile.Api.Endpoints;

/// <summary>
/// Proxy hacia Google Places + Reverse Geocoding.
///
/// Sprint pre-prod #19+#20+#21 audit 2026-06-06: hardening completo —
///   #19: RequireRateLimiting("geo-proxy") — 30/min/user. Google Places
///        Details cuesta ~$17/1000; sin rate limit cualquier vendedor
///        autenticado podia drenar la cuota en horas. Policy en Program.cs.
///   #20: HttpClient.Timeout = 5s. Sin esto, outage de Google colapsa el
///        thread-pool del API (HTTP requests acumulados esperando 100s
///        default).
///   #21: IMemoryCache 24h para placeId → details. El mobile suele pedir
///        details de placeIds que el usuario VE en una ruta (clientes con
///        direcciones); 24h es ventana razonable (las direcciones reales
///        cambian raramente).
/// </summary>
public static class MobileGeoProxyEndpoints
{
    private static readonly TimeSpan ProxyTimeout = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan DetailsCacheTtl = TimeSpan.FromHours(24);

    public static void MapMobileGeoProxyEndpoints(this IEndpointRouteBuilder app)
    {
        var geo = app.MapGroup("/api/geo")
            .RequireAuthorization()
            .RequireRateLimiting("geo-proxy")
            .WithTags("GeoProxy");

        geo.MapGet("/places/autocomplete", async (string query, string? location, int? radius,
            IConfiguration config, IHttpClientFactory httpClientFactory) =>
        {
            var apiKey = config["GOOGLE_MAPS_API_KEY"]
                ?? throw new InvalidOperationException("GOOGLE_MAPS_API_KEY is not configured");
            var client = httpClientFactory.CreateClient();
            client.Timeout = ProxyTimeout;
            var url = $"https://maps.googleapis.com/maps/api/place/textsearch/json?query={Uri.EscapeDataString(query)}&key={apiKey}";
            if (!string.IsNullOrEmpty(location)) url += $"&location={Uri.EscapeDataString(location)}&radius={radius ?? 50000}";
            try
            {
                var response = await client.GetStringAsync(url);
                return Results.Content(response, "application/json");
            }
            catch (TaskCanceledException)
            {
                return Results.Problem(
                    detail: "Google Places no respondio a tiempo",
                    statusCode: StatusCodes.Status504GatewayTimeout);
            }
        }).WithSummary("Proxy Google Places Text Search");

        geo.MapGet("/places/details", async (string placeId, string? fields,
            IConfiguration config, IHttpClientFactory httpClientFactory, IMemoryCache cache) =>
        {
            var apiKey = config["GOOGLE_MAPS_API_KEY"]
                ?? throw new InvalidOperationException("GOOGLE_MAPS_API_KEY is not configured");
            var f = fields ?? "formatted_address,geometry,address_components";
            var cacheKey = $"geo:details:{placeId}:{f}";

            if (cache.TryGetValue(cacheKey, out string? cached) && !string.IsNullOrEmpty(cached))
            {
                return Results.Content(cached, "application/json");
            }

            var client = httpClientFactory.CreateClient();
            client.Timeout = ProxyTimeout;
            var url = $"https://maps.googleapis.com/maps/api/place/details/json?place_id={Uri.EscapeDataString(placeId)}&fields={f}&key={apiKey}";
            try
            {
                var response = await client.GetStringAsync(url);
                // Solo cachear respuestas OK del API de Google (status:"OK" en JSON).
                // Errores transientes 500/quota no se cachean — el siguiente request
                // los reintenta.
                if (response.Contains("\"status\" : \"OK\"") || response.Contains("\"status\":\"OK\""))
                {
                    cache.Set(cacheKey, response, DetailsCacheTtl);
                }
                return Results.Content(response, "application/json");
            }
            catch (TaskCanceledException)
            {
                return Results.Problem(
                    detail: "Google Place Details no respondio a tiempo",
                    statusCode: StatusCodes.Status504GatewayTimeout);
            }
        }).WithSummary("Proxy Google Place Details (cached 24h)");

        geo.MapGet("/geocode/reverse", async (string latlng,
            IConfiguration config, IHttpClientFactory httpClientFactory) =>
        {
            var apiKey = config["GOOGLE_MAPS_API_KEY"]
                ?? throw new InvalidOperationException("GOOGLE_MAPS_API_KEY is not configured");
            var client = httpClientFactory.CreateClient();
            client.Timeout = ProxyTimeout;
            var url = $"https://maps.googleapis.com/maps/api/geocode/json?latlng={Uri.EscapeDataString(latlng)}&key={apiKey}";
            try
            {
                var response = await client.GetStringAsync(url);
                return Results.Content(response, "application/json");
            }
            catch (TaskCanceledException)
            {
                return Results.Problem(
                    detail: "Google Geocoding no respondio a tiempo",
                    statusCode: StatusCodes.Status504GatewayTimeout);
            }
        }).WithSummary("Proxy Google Reverse Geocoding");
    }
}
