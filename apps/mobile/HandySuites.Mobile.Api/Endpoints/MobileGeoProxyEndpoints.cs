namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileGeoProxyEndpoints
{
    public static void MapMobileGeoProxyEndpoints(this IEndpointRouteBuilder app)
    {
        var geo = app.MapGroup("/api/geo").RequireAuthorization().WithTags("GeoProxy");

        geo.MapGet("/places/autocomplete", async (string query, string? location, int? radius,
            IConfiguration config, IHttpClientFactory httpClientFactory) =>
        {
            var apiKey = config["GOOGLE_MAPS_API_KEY"]
                ?? throw new InvalidOperationException("GOOGLE_MAPS_API_KEY is not configured");
            var client = httpClientFactory.CreateClient();
            var url = $"https://maps.googleapis.com/maps/api/place/textsearch/json?query={Uri.EscapeDataString(query)}&key={apiKey}";
            if (!string.IsNullOrEmpty(location)) url += $"&location={Uri.EscapeDataString(location)}&radius={radius ?? 50000}";
            var response = await client.GetStringAsync(url);
            return Results.Content(response, "application/json");
        }).WithSummary("Proxy Google Places Text Search");

        geo.MapGet("/places/details", async (string placeId, string? fields,
            IConfiguration config, IHttpClientFactory httpClientFactory) =>
        {
            var apiKey = config["GOOGLE_MAPS_API_KEY"]
                ?? throw new InvalidOperationException("GOOGLE_MAPS_API_KEY is not configured");
            var client = httpClientFactory.CreateClient();
            var f = fields ?? "formatted_address,geometry,address_components";
            var url = $"https://maps.googleapis.com/maps/api/place/details/json?place_id={Uri.EscapeDataString(placeId)}&fields={f}&key={apiKey}";
            var response = await client.GetStringAsync(url);
            return Results.Content(response, "application/json");
        }).WithSummary("Proxy Google Place Details");

        geo.MapGet("/geocode/reverse", async (string latlng,
            IConfiguration config, IHttpClientFactory httpClientFactory) =>
        {
            var apiKey = config["GOOGLE_MAPS_API_KEY"]
                ?? throw new InvalidOperationException("GOOGLE_MAPS_API_KEY is not configured");
            var client = httpClientFactory.CreateClient();
            var url = $"https://maps.googleapis.com/maps/api/geocode/json?latlng={Uri.EscapeDataString(latlng)}&key={apiKey}";
            var response = await client.GetStringAsync(url);
            return Results.Content(response, "application/json");
        }).WithSummary("Proxy Google Reverse Geocoding");
    }
}
