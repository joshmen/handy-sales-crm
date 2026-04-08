using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using HandySuites.Application.SubscriptionPlans.Interfaces;
using HandySuites.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileFacturaEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private static (int tenantId, int userId) GetContext(HttpContext context)
    {
        var tenantId = int.TryParse(context.User.FindFirst("tenant_id")?.Value, out var tid) ? tid : 0;
        var userId = int.TryParse(
            context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.User.FindFirst("sub")?.Value, out var uid) ? uid : 0;
        return (tenantId, userId);
    }

    private static HttpClient CreateBillingClient(IHttpClientFactory factory, HttpContext context)
    {
        var client = factory.CreateClient("BillingApi");
        var authHeader = context.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(authHeader))
        {
            client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", authHeader);
        }
        return client;
    }

    public static void MapMobileFacturaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/facturas")
            .RequireAuthorization()
            .WithTags("Facturas")
            .WithOpenApi();

        // POST /api/mobile/facturas/from-order/{pedidoId}
        // Creates and stamps an invoice from a delivered order
        group.MapPost("/from-order/{pedidoId:int}", async (
            int pedidoId,
            [FromBody] CrearFacturaDesdePedidoRequest request,
            HttpContext context,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] ISubscriptionEnforcementService enforcement,
            [FromServices] HandySuitesDbContext db,
            [FromServices] ILogger<Program> logger) =>
        {
            var (tenantId, userId) = GetContext(context);
            if (tenantId <= 0 || userId <= 0)
                return Results.Unauthorized();

            // 1. Validate pedido exists and is ENTREGADO (estado=5)
            var pedido = await db.Pedidos
                .AsNoTracking()
                .Where(p => p.Id == pedidoId && p.TenantId == tenantId)
                .Select(p => new { p.Id, p.Estado })
                .FirstOrDefaultAsync();

            if (pedido is null)
                return Results.NotFound(new { success = false, message = "Pedido no encontrado" });

            if ((int)pedido.Estado != 5)
                return Results.BadRequest(new { success = false, message = "Solo se pueden facturar pedidos con estado 'Entregado'" });

            // 2. Check subscription enforcement
            var canFactura = await enforcement.CanGenerarFacturaAsync(tenantId);
            if (!canFactura.Allowed)
                return Results.BadRequest(new { success = false, message = canFactura.Message ?? "Has alcanzado el límite de facturas de tu plan." });

            var canTimbre = await enforcement.CanUsarTimbreAsync(tenantId);
            if (!canTimbre.Allowed)
                return Results.BadRequest(new { success = false, message = canTimbre.Message ?? "No tienes timbres disponibles en tu plan." });

            // 3. Create invoice via Billing API
            var billingClient = CreateBillingClient(httpClientFactory, context);

            var createPayload = new
            {
                pedidoId,
                usoCfdi = request.UsoCfdiReceptor,
                timbrarInmediatamente = false
            };

            var createResponse = await billingClient.PostAsJsonAsync("/api/facturas/from-order", createPayload);

            if (!createResponse.IsSuccessStatusCode)
            {
                var errorBody = await createResponse.Content.ReadAsStringAsync();
                logger.LogWarning("Billing API from-order failed: {Status} {Body}", (int)createResponse.StatusCode, errorBody);
                return Results.BadRequest(new { success = false, message = "Error al crear la factura", detail = errorBody });
            }

            var facturaResult = await createResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            if (!facturaResult.TryGetProperty("id", out var facturaIdProp))
            {
                logger.LogError("Billing API from-order response missing 'id' field");
                return Results.BadRequest(new { success = false, message = "Respuesta inesperada del servicio de facturación" });
            }

            var facturaId = facturaIdProp.GetInt64();

            // 4. Stamp the invoice via Billing API
            var timbrarResponse = await billingClient.PostAsync($"/api/facturas/{facturaId}/timbrar", null);

            if (!timbrarResponse.IsSuccessStatusCode)
            {
                var errorBody = await timbrarResponse.Content.ReadAsStringAsync();
                logger.LogWarning("Billing API timbrar failed for factura {FacturaId}: {Status} {Body}",
                    facturaId, (int)timbrarResponse.StatusCode, errorBody);

                // Return the created (untimbrada) factura with a warning
                return Results.Ok(new
                {
                    success = true,
                    timbrada = false,
                    message = "Factura creada pero no se pudo timbrar. Puede intentar timbrar desde el backoffice.",
                    data = facturaResult
                });
            }

            // 5. Register usage
            await enforcement.RegistrarFacturaGeneradaAsync(tenantId);
            await enforcement.RegistrarTimbreUsadoAsync(tenantId);

            var timbradaResult = await timbrarResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);

            return Results.Ok(new
            {
                success = true,
                timbrada = true,
                message = "Factura creada y timbrada exitosamente",
                data = timbradaResult
            });
        })
        .WithSummary("Crear factura desde pedido")
        .WithDescription("Crea y timbra una factura CFDI a partir de un pedido entregado.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status404NotFound);

        // GET /api/mobile/facturas
        // List invoices for the current user's tenant
        group.MapGet("/", async (
            [FromQuery] int page,
            [FromQuery] int pageSize,
            [FromQuery] string? estado,
            HttpContext context,
            [FromServices] IHttpClientFactory httpClientFactory) =>
        {
            var (tenantId, userId) = GetContext(context);
            if (tenantId <= 0)
                return Results.Unauthorized();

            var billingClient = CreateBillingClient(httpClientFactory, context);

            var queryParams = $"?page={(page > 0 ? page : 1)}&pageSize={(pageSize > 0 ? Math.Min(pageSize, 100) : 20)}";
            if (!string.IsNullOrEmpty(estado))
                queryParams += $"&estado={Uri.EscapeDataString(estado)}";

            var response = await billingClient.GetAsync($"/api/facturas{queryParams}");

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                return Results.BadRequest(new { success = false, message = "Error al obtener facturas", detail = errorBody });
            }

            var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            return Results.Ok(new { success = true, data = result });
        })
        .WithSummary("Listar facturas")
        .WithDescription("Lista las facturas del tenant actual con paginación y filtro opcional por estado.")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/facturas/{id}
        // Get invoice detail
        group.MapGet("/{id:long}", async (
            long id,
            HttpContext context,
            [FromServices] IHttpClientFactory httpClientFactory) =>
        {
            var (tenantId, _) = GetContext(context);
            if (tenantId <= 0)
                return Results.Unauthorized();

            var billingClient = CreateBillingClient(httpClientFactory, context);

            var response = await billingClient.GetAsync($"/api/facturas/{id}");

            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    return Results.NotFound(new { success = false, message = "Factura no encontrada" });

                var errorBody = await response.Content.ReadAsStringAsync();
                return Results.BadRequest(new { success = false, message = "Error al obtener factura", detail = errorBody });
            }

            var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            return Results.Ok(new { success = true, data = result });
        })
        .WithSummary("Detalle de factura")
        .WithDescription("Obtiene el detalle completo de una factura incluyendo datos de timbrado.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        // GET /api/mobile/facturas/{id}/pdf
        // Proxy PDF download from Billing API
        group.MapGet("/{id:long}/pdf", async (
            long id,
            HttpContext context,
            [FromServices] IHttpClientFactory httpClientFactory) =>
        {
            var (tenantId, _) = GetContext(context);
            if (tenantId <= 0)
                return Results.Unauthorized();

            var billingClient = CreateBillingClient(httpClientFactory, context);

            var response = await billingClient.GetAsync($"/api/facturas/{id}/pdf");

            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    return Results.NotFound(new { success = false, message = "Factura no encontrada" });

                return Results.BadRequest(new { success = false, message = "Error al obtener PDF" });
            }

            var pdfBytes = await response.Content.ReadAsByteArrayAsync();
            var contentDisposition = response.Content.Headers.ContentDisposition?.FileName?.Trim('"')
                ?? $"Factura_{id}.pdf";

            return Results.File(pdfBytes, "application/pdf", contentDisposition);
        })
        .WithSummary("Descargar PDF de factura")
        .WithDescription("Descarga el PDF de la factura CFDI.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        // POST /api/mobile/facturas/{id}/enviar
        // Send invoice by email via Billing API
        group.MapPost("/{id:long}/enviar", async (
            long id,
            [FromBody] EnviarFacturaMobileRequest request,
            HttpContext context,
            [FromServices] IHttpClientFactory httpClientFactory) =>
        {
            var (tenantId, _) = GetContext(context);
            if (tenantId <= 0)
                return Results.Unauthorized();

            var billingClient = CreateBillingClient(httpClientFactory, context);

            var payload = new
            {
                email = request.Email,
                mensaje = request.Mensaje,
                incluirPdf = request.IncluirPdf,
                incluirXml = request.IncluirXml
            };

            var response = await billingClient.PostAsJsonAsync($"/api/facturas/{id}/enviar", payload);

            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    return Results.NotFound(new { success = false, message = "Factura no encontrada" });

                var errorBody = await response.Content.ReadAsStringAsync();
                return Results.BadRequest(new { success = false, message = "Error al enviar factura", detail = errorBody });
            }

            return Results.Ok(new { success = true, message = "Factura enviada por correo exitosamente" });
        })
        .WithSummary("Enviar factura por correo")
        .WithDescription("Envía la factura CFDI (PDF + XML) por correo electrónico al destinatario.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status400BadRequest);
    }
}

// DTOs for mobile factura endpoints
public record CrearFacturaDesdePedidoRequest(
    string? RfcReceptor,
    string? NombreReceptor,
    string? RegimenFiscalReceptor,
    string? UsoCfdiReceptor,
    string? CpReceptor
);

public record EnviarFacturaMobileRequest(
    string Email,
    string? Mensaje = null,
    bool IncluirPdf = true,
    bool IncluirXml = true
);
