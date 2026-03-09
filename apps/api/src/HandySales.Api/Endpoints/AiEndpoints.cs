using System.Text.Json;
using HandySales.Application.Ai.DTOs;
using HandySales.Application.Ai.Interfaces;
using HandySales.Application.Cobranza.DTOs;
using HandySales.Application.Cobranza.Services;
using HandySales.Application.Metas.DTOs;
using HandySales.Application.Metas.Services;
using HandySales.Application.Productos.Services;
using HandySales.Application.Rutas.DTOs;
using HandySales.Application.Rutas.Services;
using HandySales.Application.Visitas.DTOs;
using HandySales.Application.Visitas.Services;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HandySales.Api.Endpoints;

public static class AiEndpoints
{
    private static readonly JsonSerializerOptions CamelCase = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static void MapAiEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/ai")
            .RequireAuthorization()
            .WithTags("AI");

        group.MapPost("/query", HandleQuery);
        group.MapPost("/actions/execute", HandleExecuteAction);
        group.MapGet("/credits", HandleGetCredits);
        group.MapGet("/usage", HandleGetUsage);
        group.MapGet("/usage/stats", HandleGetUsageStats);
        group.MapGet("/client/{clienteId}/suggested-products", HandleSuggestedProducts);
        group.MapGet("/collections-priority", HandleCollectionsPriority);
    }

    private static async Task<IResult> HandleQuery(
        [FromBody] AiRequestDto request,
        IAiGatewayService gateway,
        ITenantContextService tenantContext,
        IMemoryCache cache,
        HttpContext ctx)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        var userIdStr = ctx.User.FindFirst("userId")?.Value
            ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? ctx.User.FindFirst("sub")?.Value;
        var userId = int.TryParse(userIdStr, out var uid) ? uid : 0;

        if (tenantId == 0 || userId == 0)
            return Results.Unauthorized();

        // Validate tipo accion
        var validTypes = new[] { "resumen", "insight", "pregunta", "pronostico" };
        if (!validTypes.Contains(request.TipoAccion.ToLower()))
            return Results.BadRequest(new { error = "Tipo de acci\u00f3n inv\u00e1lido. Usa: resumen, insight, pregunta, pronostico." });

        // Rate limiting: 10 req/min per tenant
        var rateLimitKey = $"ai_rate_{tenantId}";
        var requestCount = cache.GetOrCreate(rateLimitKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return 0;
        });

        if (requestCount >= 10)
            return Results.StatusCode(429);

        cache.Set(rateLimitKey, requestCount + 1, TimeSpan.FromMinutes(1));

        try
        {
            var response = await gateway.ProcessRequestAsync(request, tenantId, userId);
            return Results.Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            // Distinguish between sanitization/credit errors and unexpected errors
            if (ex.Message.Contains("cr\u00e9ditos") || ex.Message.Contains("Cr\u00e9ditos"))
                return Results.Json(new { error = ex.Message }, statusCode: 402);

            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> HandleExecuteAction(
        [FromBody] AiActionExecuteRequest request,
        IAiActionDetector actionDetector,
        IAiCreditService creditService,
        ITenantContextService tenantContext,
        IMemoryCache cache,
        HandySalesDbContext db,
        IServiceProvider services,
        HttpContext ctx)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        var userIdStr = ctx.User.FindFirst("userId")?.Value
            ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? ctx.User.FindFirst("sub")?.Value;
        var userId = int.TryParse(userIdStr, out var uid) ? uid : 0;

        if (tenantId == 0 || userId == 0)
            return Results.Unauthorized();

        // Rate limiting: 5 req/min per tenant for actions
        var rateLimitKey = $"ai_action_rate_{tenantId}";
        var requestCount = cache.GetOrCreate(rateLimitKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return 0;
        });

        if (requestCount >= 5)
            return Results.StatusCode(429);

        cache.Set(rateLimitKey, requestCount + 1, TimeSpan.FromMinutes(1));

        // Validate action ID from cache
        var cached = actionDetector.ValidateActionId(request.ActionId, tenantId);
        if (cached == null)
            return Results.BadRequest(new { error = "Acción expirada o inválida. Intenta de nuevo." });

        var (actionType, parameters) = cached.Value;
        if (actionType != request.ActionType)
            return Results.BadRequest(new { error = "Tipo de acción no coincide." });

        // Check credits
        var hasCredits = await creditService.HasSufficientCreditsAsync(tenantId, "accion");
        if (!hasCredits)
            return Results.Json(new { error = "No tienes créditos suficientes para ejecutar esta acción." }, statusCode: 402);

        try
        {
            var (message, createdIds) = await ExecuteActionAsync(actionType, parameters, userId, services);

            // Deduct credits
            await creditService.DeductCreditsAsync(tenantId, "accion");

            // Log usage
            var log = new AiUsageLog
            {
                TenantId = tenantId,
                UsuarioId = userId,
                TipoAccion = "accion",
                CreditosCobrados = creditService.GetCreditCost("accion"),
                Prompt = $"[ACTION] {actionType}: {message}",
                ModeloUsado = "n/a",
                TokensInput = 0,
                TokensOutput = 0,
                CostoEstimadoUsd = 0,
                LatenciaMs = 0,
                Exitoso = true,
                CreadoEn = DateTime.UtcNow
            };
            db.AiUsageLogs.Add(log);
            await db.SaveChangesAsync();

            var balance = await creditService.GetCurrentBalanceAsync(tenantId);

            return Results.Ok(new AiActionExecuteResult(
                Success: true,
                Message: message,
                CreditosUsados: creditService.GetCreditCost("accion"),
                CreditosRestantes: balance.Disponibles,
                CreatedIds: createdIds
            ));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new AiActionExecuteResult(
                Success: false,
                Message: $"Error al ejecutar la acción: {ex.Message}",
                CreditosUsados: 0,
                CreditosRestantes: 0
            ));
        }
    }

    private static async Task<(string Message, List<int>? CreatedIds)> ExecuteActionAsync(
        string actionType, object parameters, int userId, IServiceProvider services)
    {
        var json = parameters is JsonElement je
            ? je.GetRawText()
            : JsonSerializer.Serialize(parameters);

        switch (actionType)
        {
            case "programar_visitas":
            {
                var visitaService = services.GetRequiredService<ClienteVisitaService>();
                var dtos = JsonSerializer.Deserialize<List<ClienteVisitaCreateDto>>(json, CamelCase)!;
                var ids = new List<int>();
                foreach (var dto in dtos)
                    ids.Add(await visitaService.CrearAsync(dto));
                return ($"Se programaron {ids.Count} visitas exitosamente.", ids);
            }
            case "registrar_cobros":
            {
                var cobroService = services.GetRequiredService<CobroService>();
                var dtos = JsonSerializer.Deserialize<List<CobroCreateDto>>(json, CamelCase)!;
                var ids = new List<int>();
                foreach (var dto in dtos)
                    ids.Add(await cobroService.CrearAsync(dto));
                var total = dtos.Sum(d => d.Monto);
                return ($"Se registraron {ids.Count} cobros por ${total:N2} MXN.", ids);
            }
            case "crear_meta":
            {
                var metaService = services.GetRequiredService<MetaVendedorService>();
                var dto = JsonSerializer.Deserialize<CreateMetaVendedorDto>(json, CamelCase)!;
                var id = await metaService.CreateAsync(dto, userId.ToString());
                return ($"Se creó meta de ventas por ${dto.Monto:N0} MXN.", new List<int> { id });
            }
            case "crear_ruta":
            {
                var rutaService = services.GetRequiredService<RutaVendedorService>();
                var dto = JsonSerializer.Deserialize<RutaVendedorCreateDto>(json, CamelCase)!;
                var id = await rutaService.CrearAsync(dto);
                var paradas = dto.Detalles?.Count ?? 0;
                return ($"Se creó ruta con {paradas} paradas.", new List<int> { id });
            }
            case "desactivar_productos":
            {
                var productoService = services.GetRequiredService<ProductoService>();
                var data = JsonSerializer.Deserialize<BatchToggleParams>(json, CamelCase)!;
                var count = await productoService.BatchToggleActivoAsync(data.Ids, data.Activo);
                return ($"Se desactivaron {count} productos sin stock.", null);
            }
            default:
                throw new InvalidOperationException($"Tipo de acción desconocido: {actionType}");
        }
    }

    private record BatchToggleParams(List<int> Ids, bool Activo);

    private static async Task<IResult> HandleGetCredits(
        IAiCreditService creditService,
        ITenantContextService tenantContext)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var balance = await creditService.GetCurrentBalanceAsync(tenantId);
        return Results.Ok(balance);
    }

    private static async Task<IResult> HandleGetUsage(
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        pageSize = Math.Min(pageSize, 50);

        var total = await db.AiUsageLogs.CountAsync();

        var items = await db.AiUsageLogs
            .OrderByDescending(l => l.CreadoEn)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new AiUsageItemDto(
                l.Id,
                l.TipoAccion,
                l.CreditosCobrados,
                l.Prompt.Length > 100 ? l.Prompt.Substring(0, 100) + "..." : l.Prompt,
                l.LatenciaMs,
                l.Exitoso,
                l.CreadoEn,
                l.Usuario != null ? l.Usuario.Nombre : null
            ))
            .ToListAsync();

        return Results.Ok(new { items, total, page, pageSize });
    }

    private static async Task<IResult> HandleGetUsageStats(
        HandySalesDbContext db,
        ITenantContextService tenantContext)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);

        var logs = await db.AiUsageLogs
            .Where(l => l.CreadoEn >= startOfMonth)
            .ToListAsync();

        var porTipoAccion = logs
            .GroupBy(l => l.TipoAccion)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.CreditosCobrados));

        var ultimos = logs
            .OrderByDescending(l => l.CreadoEn)
            .Take(10)
            .Select(l => new AiUsageItemDto(
                l.Id,
                l.TipoAccion,
                l.CreditosCobrados,
                l.Prompt.Length > 100 ? l.Prompt.Substring(0, 100) + "..." : l.Prompt,
                l.LatenciaMs,
                l.Exitoso,
                l.CreadoEn,
                null
            ))
            .ToList();

        return Results.Ok(new AiUsageStatsDto(
            TotalRequests: logs.Count,
            TotalCreditos: logs.Sum(l => l.CreditosCobrados),
            PorTipoAccion: porTipoAccion,
            UltimosUsos: ultimos
        ));
    }

    private static async Task<IResult> HandleSuggestedProducts(
        int clienteId,
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        [FromQuery] int limit = 10,
        [FromQuery] int days = 90)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var desde = DateTime.UtcNow.AddDays(-days);

        var sugeridos = await db.DetallePedidos
            .AsNoTracking()
            .Where(d => d.Activo
                && d.Pedido.ClienteId == clienteId
                && d.Pedido.TenantId == tenantId
                && d.Pedido.Activo
                && d.Pedido.FechaPedido >= desde)
            .GroupBy(d => new { d.ProductoId, d.Producto.Nombre, d.Producto.CodigoBarra, d.Producto.PrecioBase, d.Producto.ImagenUrl })
            .Select(g => new
            {
                ProductoId = g.Key.ProductoId,
                Nombre = g.Key.Nombre,
                CodigoBarra = g.Key.CodigoBarra,
                PrecioBase = g.Key.PrecioBase,
                ImagenUrl = g.Key.ImagenUrl,
                Frecuencia = g.Count(),
                CantidadTotal = g.Sum(d => d.Cantidad),
                UltimaCompra = g.Max(d => d.Pedido.FechaPedido)
            })
            .OrderByDescending(x => x.Frecuencia)
            .ThenByDescending(x => x.UltimaCompra)
            .Take(limit)
            .ToListAsync();

        return Results.Ok(new { clienteId, total = sugeridos.Count, items = sugeridos });
    }

    private static async Task<IResult> HandleCollectionsPriority(
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        [FromQuery] int limit = 20)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var now = DateTime.UtcNow;
        var estadosConDeuda = new[] { EstadoPedido.Entregado, EstadoPedido.Confirmado, EstadoPedido.EnRuta, EstadoPedido.EnProceso };

        // Get clients with pending balance
        var clientes = await db.Clientes
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo && c.Saldo > 0)
            .Select(c => new { c.Id, c.Nombre, c.Saldo, c.LimiteCredito })
            .ToListAsync();

        if (clientes.Count == 0)
            return Results.Ok(new { total = 0, items = Array.Empty<object>() });

        var clienteIds = clientes.Select(c => c.Id).ToList();

        // Oldest unpaid order per client + count
        var pedidoStats = await db.Pedidos
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Activo
                && clienteIds.Contains(p.ClienteId)
                && estadosConDeuda.Contains(p.Estado))
            .GroupBy(p => p.ClienteId)
            .Select(g => new
            {
                ClienteId = g.Key,
                PedidoMasAntiguo = g.Min(p => p.FechaPedido),
                PedidosPendientes = g.Count()
            })
            .ToDictionaryAsync(x => x.ClienteId);

        // Last payment per client
        var ultimoCobros = await db.Cobros
            .AsNoTracking()
            .Where(co => co.TenantId == tenantId && co.Activo && clienteIds.Contains(co.ClienteId))
            .GroupBy(co => co.ClienteId)
            .Select(g => new { ClienteId = g.Key, UltimoCobro = g.Max(co => co.FechaCobro) })
            .ToDictionaryAsync(x => x.ClienteId);

        // Merge into enriched list
        var clientesConSaldo = clientes.Select(c =>
        {
            pedidoStats.TryGetValue(c.Id, out var ps);
            ultimoCobros.TryGetValue(c.Id, out var uc);
            return new
            {
                c.Id, c.Nombre, c.Saldo, c.LimiteCredito,
                PedidoMasAntiguo = ps?.PedidoMasAntiguo,
                PedidosPendientes = ps?.PedidosPendientes ?? 0,
                UltimoCobro = uc?.UltimoCobro
            };
        }).ToList();

        // Calculate urgency score in memory
        var prioridad = clientesConSaldo.Select(c =>
        {
            var diasVencido = c.PedidoMasAntiguo.HasValue
                ? (int)(now - c.PedidoMasAntiguo.Value).TotalDays
                : 0;
            var utilizacionCredito = c.LimiteCredito > 0
                ? (double)(c.Saldo / c.LimiteCredito)
                : 1.0; // sin límite = máxima urgencia
            var diasSinCobro = c.UltimoCobro.HasValue
                ? (int)(now - c.UltimoCobro.Value).TotalDays
                : 999;

            // Score: 40% monto normalizado + 30% días vencido + 20% utilización crédito + 10% días sin cobro
            var scoreMontoNorm = Math.Min((double)c.Saldo / 10000.0, 1.0);
            var scoreDiasVencido = Math.Min(diasVencido / 30.0, 1.0);
            var scoreCredito = Math.Min(utilizacionCredito, 1.0);
            var scoreSinCobro = Math.Min(diasSinCobro / 30.0, 1.0);

            var urgencyScore = (int)((scoreMontoNorm * 40 + scoreDiasVencido * 30 + scoreCredito * 20 + scoreSinCobro * 10));

            return new
            {
                ClienteId = c.Id,
                ClienteNombre = c.Nombre,
                SaldoPendiente = c.Saldo,
                LimiteCredito = c.LimiteCredito,
                DiasVencido = diasVencido,
                DiasSinCobro = diasSinCobro,
                PedidosPendientes = c.PedidosPendientes,
                UrgencyScore = Math.Min(urgencyScore, 100),
                Razon = diasVencido > 14 ? "Vencido" :
                        utilizacionCredito > 0.8 ? "Límite crédito" :
                        (double)c.Saldo > 5000 ? "Monto alto" : "Seguimiento"
            };
        })
        .OrderByDescending(x => x.UrgencyScore)
        .Take(limit)
        .ToList();

        return Results.Ok(new { total = prioridad.Count, items = prioridad });
    }
}
