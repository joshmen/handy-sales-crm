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

    // Cache durations
    private static readonly TimeSpan CacheShort = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan CacheMedium = TimeSpan.FromMinutes(15);

    public static void MapAiEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/ai")
            .RequireAuthorization()
            .WithTags("AI");

        // Core AI
        group.MapPost("/query", HandleQuery);
        group.MapPost("/actions/execute", HandleExecuteAction);
        group.MapGet("/credits", HandleGetCredits);
        group.MapGet("/usage", HandleGetUsage);
        group.MapGet("/usage/stats", HandleGetUsageStats);

        // P1+P2 (now backed by materialized views + cache)
        group.MapGet("/client/{clienteId}/suggested-products", HandleSuggestedProducts);
        group.MapGet("/collections-priority", HandleCollectionsPriority);
        group.MapPost("/collections-message", HandleCollectionsMessage);
        group.MapGet("/orders/{pedidoId}/anomalies", HandleOrderAnomalies);
        group.MapGet("/client/{clienteId}/smart-discount", HandleSmartDiscount);
        group.MapGet("/recommendations/tomorrow", HandleRecommendationsTomorrow);
        group.MapGet("/routes/{rutaId}/stop-durations", HandleStopDurations);

        // P3 (PostgreSQL-first)
        group.MapGet("/demand-forecast", HandleDemandForecast);
        group.MapGet("/client/{clienteId}/payment-risk", HandlePaymentRisk);
        group.MapGet("/visits/{visitaId}/gps-anomaly", HandleGpsAnomaly);

        // Refresh materialized views
        group.MapPost("/admin/refresh-views", HandleRefreshViews);
    }

    // ═══════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════

    private static (int tenantId, int userId) ExtractIdentity(ITenantContextService tenantContext, HttpContext ctx)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        var userIdStr = ctx.User.FindFirst("userId")?.Value
            ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? ctx.User.FindFirst("sub")?.Value;
        var userId = int.TryParse(userIdStr, out var uid) ? uid : 0;
        return (tenantId, userId);
    }

    private static bool CheckRateLimit(IMemoryCache cache, string key, int maxRequests)
    {
        var count = cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return 0;
        });
        if (count >= maxRequests) return false;
        cache.Set(key, count + 1, TimeSpan.FromMinutes(1));
        return true;
    }

    /// <summary>
    /// Checks if materialized views exist and falls back to EF Core queries if not.
    /// </summary>
    private static async Task<bool> MaterializedViewExistsAsync(HandySalesDbContext db, string viewName)
    {
        var result = await db.Database
            .SqlQueryRaw<int>($"SELECT COUNT(*)::int AS \"Value\" FROM pg_matviews WHERE matviewname = '{viewName}'")
            .FirstOrDefaultAsync();
        return result > 0;
    }

    // ═══════════════════════════════════════════════════════
    // CORE AI ENDPOINTS (unchanged)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleQuery(
        [FromBody] AiRequestDto request,
        IAiGatewayService gateway,
        ITenantContextService tenantContext,
        IMemoryCache cache,
        HttpContext ctx)
    {
        var (tenantId, userId) = ExtractIdentity(tenantContext, ctx);
        if (tenantId == 0 || userId == 0) return Results.Unauthorized();

        var validTypes = new[] { "resumen", "insight", "pregunta", "pronostico" };
        if (!validTypes.Contains(request.TipoAccion.ToLower()))
            return Results.BadRequest(new { error = "Tipo de acción inválido. Usa: resumen, insight, pregunta, pronostico." });

        if (!CheckRateLimit(cache, $"ai_rate_{tenantId}", 10))
            return Results.StatusCode(429);

        try
        {
            var response = await gateway.ProcessRequestAsync(request, tenantId, userId);
            return Results.Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("créditos") || ex.Message.Contains("Créditos"))
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
        var (tenantId, userId) = ExtractIdentity(tenantContext, ctx);
        if (tenantId == 0 || userId == 0) return Results.Unauthorized();

        if (!CheckRateLimit(cache, $"ai_action_rate_{tenantId}", 5))
            return Results.StatusCode(429);

        var cached = actionDetector.ValidateActionId(request.ActionId, tenantId);
        if (cached == null)
            return Results.BadRequest(new { error = "Acción expirada o inválida. Intenta de nuevo." });

        var (actionType, parameters) = cached.Value;
        if (actionType != request.ActionType)
            return Results.BadRequest(new { error = "Tipo de acción no coincide." });

        var hasCredits = await creditService.HasSufficientCreditsAsync(tenantId, "accion");
        if (!hasCredits)
            return Results.Json(new { error = "No tienes créditos suficientes para ejecutar esta acción." }, statusCode: 402);

        try
        {
            var (message, createdIds) = await ExecuteActionAsync(actionType, parameters, userId, services);

            await creditService.DeductCreditsAsync(tenantId, "accion");

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
            case "optimizar_ruta":
            {
                var rutaService = services.GetRequiredService<RutaVendedorService>();
                var dto = JsonSerializer.Deserialize<RutaVendedorCreateDto>(json, CamelCase)!;
                var id = await rutaService.CrearAsync(dto);
                var paradas = dto.Detalles?.Count ?? 0;
                var label = actionType == "optimizar_ruta" ? "ruta optimizada" : "ruta";
                return ($"Se creó {label} con {paradas} paradas.", new List<int> { id });
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

    // ═══════════════════════════════════════════════════════
    // P1-2: SUGGESTED PRODUCTS (MV + cache + EF fallback)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleSuggestedProducts(
        int clienteId,
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        IMemoryCache cache,
        [FromQuery] int limit = 10,
        [FromQuery] int days = 90)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var cacheKey = $"ai_suggested_{tenantId}_{clienteId}_{limit}";
        if (cache.TryGetValue(cacheKey, out object? cachedResult))
            return Results.Ok(cachedResult);

        // Try materialized view first
        var useMv = await MaterializedViewExistsAsync(db, "mv_suggested_products");
        object result;

        if (useMv)
        {
            var sugeridos = await db.Database
                .SqlQueryRaw<SuggestedProductRow>(
                    @"SELECT producto_id AS ""ProductoId"", producto_nombre AS ""Nombre"",
                      codigo_barra AS ""CodigoBarra"", precio_base AS ""PrecioBase"",
                      imagen_url AS ""ImagenUrl"", frecuencia AS ""Frecuencia"",
                      cantidad_total AS ""CantidadTotal"", ultima_compra AS ""UltimaCompra""
                      FROM mv_suggested_products
                      WHERE tenant_id = {0} AND cliente_id = {1} AND ranking <= {2}
                      ORDER BY ranking",
                    tenantId, clienteId, limit)
                .ToListAsync();

            result = new { clienteId, total = sugeridos.Count, items = sugeridos };
        }
        else
        {
            // EF Core fallback
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

            result = new { clienteId, total = sugeridos.Count, items = sugeridos };
        }

        cache.Set(cacheKey, result, CacheShort);
        return Results.Ok(result);
    }

    // ═══════════════════════════════════════════════════════
    // P1-4: COLLECTIONS PRIORITY (MV + cache + EF fallback)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleCollectionsPriority(
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        IMemoryCache cache,
        [FromQuery] int limit = 20)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var cacheKey = $"ai_collections_{tenantId}_{limit}";
        if (cache.TryGetValue(cacheKey, out object? cachedResult))
            return Results.Ok(cachedResult);

        var useMv = await MaterializedViewExistsAsync(db, "mv_collection_priority");
        object result;

        if (useMv)
        {
            var prioridad = await db.Database
                .SqlQueryRaw<CollectionPriorityRow>(
                    @"SELECT cliente_id AS ""ClienteId"", cliente_nombre AS ""ClienteNombre"",
                      saldo_pendiente AS ""SaldoPendiente"", limite_credito AS ""LimiteCredito"",
                      dias_vencido AS ""DiasVencido"", dias_sin_cobro AS ""DiasSinCobro"",
                      pedidos_pendientes AS ""PedidosPendientes"",
                      urgency_score AS ""UrgencyScore"", razon AS ""Razon""
                      FROM mv_collection_priority
                      WHERE tenant_id = {0}
                      ORDER BY urgency_score DESC
                      LIMIT {1}",
                    tenantId, limit)
                .ToListAsync();

            result = new { total = prioridad.Count, items = prioridad };
        }
        else
        {
            // EF Core fallback (original logic)
            result = await CollectionsPriorityFallbackAsync(db, tenantId, limit);
        }

        cache.Set(cacheKey, result, CacheShort);
        return Results.Ok(result);
    }

    private static async Task<object> CollectionsPriorityFallbackAsync(HandySalesDbContext db, int tenantId, int limit)
    {
        var now = DateTime.UtcNow;
        var estadosConDeuda = new[] { EstadoPedido.Entregado, EstadoPedido.Confirmado, EstadoPedido.EnRuta, EstadoPedido.EnProceso };

        var clientes = await db.Clientes.AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo && c.Saldo > 0)
            .Select(c => new { c.Id, c.Nombre, c.Saldo, c.LimiteCredito })
            .ToListAsync();

        if (clientes.Count == 0)
            return new { total = 0, items = Array.Empty<object>() };

        var clienteIds = clientes.Select(c => c.Id).ToList();

        var pedidoStats = await db.Pedidos.AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Activo && clienteIds.Contains(p.ClienteId) && estadosConDeuda.Contains(p.Estado))
            .GroupBy(p => p.ClienteId)
            .Select(g => new { ClienteId = g.Key, PedidoMasAntiguo = g.Min(p => p.FechaPedido), PedidosPendientes = g.Count() })
            .ToDictionaryAsync(x => x.ClienteId);

        var ultimoCobros = await db.Cobros.AsNoTracking()
            .Where(co => co.TenantId == tenantId && co.Activo && clienteIds.Contains(co.ClienteId))
            .GroupBy(co => co.ClienteId)
            .Select(g => new { ClienteId = g.Key, UltimoCobro = g.Max(co => co.FechaCobro) })
            .ToDictionaryAsync(x => x.ClienteId);

        var prioridad = clientes.Select(c =>
        {
            pedidoStats.TryGetValue(c.Id, out var ps);
            ultimoCobros.TryGetValue(c.Id, out var uc);
            var diasVencido = ps?.PedidoMasAntiguo != null ? (int)(now - ps.PedidoMasAntiguo).TotalDays : 0;
            var utilizacion = c.LimiteCredito > 0 ? (double)(c.Saldo / c.LimiteCredito) : 1.0;
            var diasSinCobro = uc?.UltimoCobro != null ? (int)(now - uc.UltimoCobro).TotalDays : 999;
            var score = (int)(Math.Min((double)c.Saldo / 10000.0, 1.0) * 40 +
                Math.Min(diasVencido / 30.0, 1.0) * 30 +
                Math.Min(utilizacion, 1.0) * 20 +
                Math.Min(diasSinCobro / 30.0, 1.0) * 10);

            return new
            {
                ClienteId = c.Id, ClienteNombre = c.Nombre, SaldoPendiente = c.Saldo,
                LimiteCredito = c.LimiteCredito, DiasVencido = diasVencido,
                DiasSinCobro = diasSinCobro, PedidosPendientes = ps?.PedidosPendientes ?? 0,
                UrgencyScore = Math.Min(score, 100),
                Razon = diasVencido > 14 ? "Vencido" : utilizacion > 0.8 ? "Límite crédito" :
                    (double)c.Saldo > 5000 ? "Monto alto" : "Seguimiento"
            };
        })
        .OrderByDescending(x => x.UrgencyScore)
        .Take(limit)
        .ToList();

        return new { total = prioridad.Count, items = prioridad };
    }

    // ═══════════════════════════════════════════════════════
    // P2-7: COLLECTIONS MESSAGE (LLM — no cache needed)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleCollectionsMessage(
        [FromBody] CollectionsMessageRequest request,
        IAiGatewayService gateway,
        IAiCreditService creditService,
        ITenantContextService tenantContext,
        HandySalesDbContext db,
        HttpContext ctx)
    {
        var (tenantId, userId) = ExtractIdentity(tenantContext, ctx);
        if (tenantId == 0 || userId == 0) return Results.Unauthorized();

        var cliente = await db.Clientes.AsNoTracking()
            .Where(c => c.Id == request.ClienteId && c.TenantId == tenantId && c.Activo)
            .Select(c => new { c.Nombre, c.Saldo, c.Telefono })
            .FirstOrDefaultAsync();

        if (cliente == null) return Results.NotFound(new { error = "Cliente no encontrado." });
        if (cliente.Saldo <= 0) return Results.BadRequest(new { error = "El cliente no tiene saldo pendiente." });

        var vendedor = await db.Usuarios.AsNoTracking()
            .Where(u => u.Id == userId).Select(u => u.Nombre).FirstOrDefaultAsync();

        var empresa = await db.DatosEmpresa.AsNoTracking()
            .Where(e => e.TenantId == tenantId).Select(e => e.RazonSocial)
            .FirstOrDefaultAsync() ?? "nuestra empresa";

        var tono = request.Tono ?? "amable";
        var prompt = $@"Genera un mensaje corto de WhatsApp para recordar un cobro pendiente.
Datos:
- Cliente: {cliente.Nombre}
- Monto pendiente: ${cliente.Saldo:N2} MXN
- Empresa: {empresa}
- Vendedor: {vendedor ?? "el equipo de ventas"}
- Tono: {tono} (opciones: amable, firme, urgente)

Reglas:
- Máximo 3-4 líneas, formato WhatsApp (emojis permitidos)
- No incluir números de cuenta bancaria
- Personalizado con el nombre del cliente
- Incluir monto exacto
- Si el tono es 'urgente', mencionar que el crédito puede suspenderse
- Firmar con el nombre del vendedor";

        try
        {
            var response = await gateway.ProcessRequestAsync(
                new AiRequestDto(tono == "urgente" ? "insight" : "pregunta", prompt),
                tenantId, userId);

            return Results.Ok(new
            {
                mensaje = response.Respuesta,
                clienteNombre = cliente.Nombre,
                saldo = cliente.Saldo,
                telefono = cliente.Telefono,
                creditosUsados = response.CreditosUsados,
                creditosRestantes = response.CreditosRestantes
            });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("créditos") || ex.Message.Contains("Créditos"))
        {
            return Results.Json(new { error = ex.Message }, statusCode: 402);
        }
    }

    private record CollectionsMessageRequest(int ClienteId, string? Tono);

    // ═══════════════════════════════════════════════════════
    // P2-10: ORDER ANOMALIES (MV + cache + EF fallback)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleOrderAnomalies(
        int pedidoId,
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        IMemoryCache cache)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var cacheKey = $"ai_anomalies_{tenantId}_{pedidoId}";
        if (cache.TryGetValue(cacheKey, out object? cachedResult))
            return Results.Ok(cachedResult);

        var pedido = await db.Pedidos.AsNoTracking()
            .Include(p => p.Detalles).ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(p => p.Id == pedidoId && p.TenantId == tenantId && p.Activo);

        if (pedido == null)
            return Results.NotFound(new { error = "Pedido no encontrado." });

        var anomalies = new List<object>();

        // Try materialized views for historical data
        var useMv = await MaterializedViewExistsAsync(db, "mv_order_history_avg");

        Dictionary<int, OrderHistoryRow> historial;
        double avgTotal;

        if (useMv)
        {
            var rows = await db.Database
                .SqlQueryRaw<OrderHistoryRow>(
                    @"SELECT producto_id AS ""ProductoId"", avg_cantidad AS ""AvgCantidad"",
                      max_cantidad AS ""MaxCantidad"", avg_precio AS ""AvgPrecio"", compras AS ""Compras""
                      FROM mv_order_history_avg
                      WHERE tenant_id = {0} AND cliente_id = {1}",
                    tenantId, pedido.ClienteId)
                .ToListAsync();
            historial = rows.ToDictionary(r => r.ProductoId);

            var totalRow = await db.Database
                .SqlQueryRaw<OrderTotalRow>(
                    @"SELECT avg_total AS ""AvgTotal"" FROM mv_order_total_avg
                      WHERE tenant_id = {0} AND cliente_id = {1}",
                    tenantId, pedido.ClienteId)
                .FirstOrDefaultAsync();
            avgTotal = totalRow?.AvgTotal ?? 0;
        }
        else
        {
            // EF Core fallback
            var ninetyDaysAgo = DateTime.UtcNow.AddDays(-90);
            var histRows = await db.DetallePedidos.AsNoTracking()
                .Where(d => d.Activo && d.Pedido.ClienteId == pedido.ClienteId
                    && d.Pedido.TenantId == tenantId && d.Pedido.Activo
                    && d.Pedido.Id != pedidoId && d.Pedido.FechaPedido >= ninetyDaysAgo
                    && d.Pedido.Estado != EstadoPedido.Cancelado)
                .GroupBy(d => d.ProductoId)
                .Select(g => new OrderHistoryRow
                {
                    ProductoId = g.Key,
                    AvgCantidad = g.Average(d => (double)d.Cantidad),
                    MaxCantidad = (int)g.Max(d => d.Cantidad),
                    AvgPrecio = g.Average(d => (double)d.PrecioUnitario),
                    Compras = g.Count()
                })
                .ToListAsync();
            historial = histRows.ToDictionary(r => r.ProductoId);

            avgTotal = await db.Pedidos.AsNoTracking()
                .Where(p => p.ClienteId == pedido.ClienteId && p.TenantId == tenantId
                    && p.Activo && p.Id != pedidoId && p.FechaPedido >= ninetyDaysAgo
                    && p.Estado != EstadoPedido.Cancelado)
                .AverageAsync(p => (double?)p.Total) ?? 0;
        }

        var productosComprados = historial.Keys.ToHashSet();

        foreach (var detalle in pedido.Detalles.Where(d => d.Activo))
        {
            if (!productosComprados.Contains(detalle.ProductoId))
            {
                anomalies.Add(new
                {
                    tipo = "producto_nuevo", severidad = "info",
                    productoId = detalle.ProductoId,
                    productoNombre = detalle.Producto?.Nombre ?? "Desconocido",
                    mensaje = $"{detalle.Producto?.Nombre} nunca comprado por este cliente"
                });
                continue;
            }

            var hist = historial[detalle.ProductoId];

            if ((double)detalle.Cantidad > hist.AvgCantidad * 3 && detalle.Cantidad > hist.MaxCantidad)
            {
                var cantRatio = (double)detalle.Cantidad / hist.AvgCantidad;
                anomalies.Add(new
                {
                    tipo = "cantidad_alta", severidad = "warning",
                    productoId = detalle.ProductoId,
                    productoNombre = detalle.Producto?.Nombre ?? "Desconocido",
                    mensaje = $"{detalle.Producto?.Nombre}: cantidad {detalle.Cantidad} es {cantRatio:F1}x el promedio ({hist.AvgCantidad:F0})"
                });
            }

            if (hist.AvgPrecio > 0)
            {
                var desviacion = Math.Abs((double)detalle.PrecioUnitario - hist.AvgPrecio) / hist.AvgPrecio;
                if (desviacion > 0.20)
                {
                    var direccion = (double)detalle.PrecioUnitario > hist.AvgPrecio ? "por encima" : "por debajo";
                    anomalies.Add(new
                    {
                        tipo = "precio_anomalo", severidad = "warning",
                        productoId = detalle.ProductoId,
                        productoNombre = detalle.Producto?.Nombre ?? "Desconocido",
                        mensaje = $"{detalle.Producto?.Nombre}: precio ${detalle.PrecioUnitario:N2} está {desviacion:P0} {direccion} del promedio (${hist.AvgPrecio:N2})"
                    });
                }
            }
        }

        if (avgTotal > 0 && (double)pedido.Total > avgTotal * 2.5)
        {
            var ratio = (double)pedido.Total / avgTotal;
            anomalies.Add(new
            {
                tipo = "total_alto", severidad = "warning",
                productoId = (int?)null, productoNombre = (string?)null,
                mensaje = $"Total ${pedido.Total:N2} es {ratio:F1}x el promedio del cliente (${avgTotal:N2})"
            });
        }

        var result = new
        {
            pedidoId,
            totalAnomalias = anomalies.Count,
            tieneAnomalias = anomalies.Count > 0,
            items = anomalies
        };

        cache.Set(cacheKey, result, CacheShort);
        return Results.Ok(result);
    }

    // ═══════════════════════════════════════════════════════
    // P2-6: SMART DISCOUNT (cached, uses EF — too dynamic for MV)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleSmartDiscount(
        int clienteId,
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        IMemoryCache cache,
        [FromQuery] int? productoId = null,
        [FromQuery] int cantidad = 1)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var cacheKey = $"ai_discount_{tenantId}_{clienteId}_{productoId}_{cantidad}";
        if (cache.TryGetValue(cacheKey, out object? cachedResult))
            return Results.Ok(cachedResult);

        var ninetyDaysAgo = DateTime.UtcNow.AddDays(-90);

        var cliente = await db.Clientes.AsNoTracking()
            .Where(c => c.Id == clienteId && c.TenantId == tenantId && c.Activo)
            .Select(c => new { c.Nombre, c.Saldo, c.LimiteCredito, c.Descuento })
            .FirstOrDefaultAsync();

        if (cliente == null)
            return Results.NotFound(new { error = "Cliente no encontrado." });

        var historial = await db.Pedidos.AsNoTracking()
            .Where(p => p.ClienteId == clienteId && p.TenantId == tenantId && p.Activo
                && p.FechaPedido >= ninetyDaysAgo && p.Estado != EstadoPedido.Cancelado)
            .Select(p => new { p.Total, p.FechaPedido })
            .ToListAsync();

        var totalCompras90d = historial.Sum(h => h.Total);
        var pedidosCount = historial.Count;

        var suggestions = new List<object>();

        decimal loyaltyDiscount = 0;
        string loyaltyReason;
        if (pedidosCount >= 12) { loyaltyDiscount = 8; loyaltyReason = "Cliente frecuente (12+ pedidos/trimestre)"; }
        else if (pedidosCount >= 8) { loyaltyDiscount = 5; loyaltyReason = "Cliente regular (8+ pedidos/trimestre)"; }
        else if (pedidosCount >= 4) { loyaltyDiscount = 3; loyaltyReason = "Cliente activo (4+ pedidos/trimestre)"; }
        else { loyaltyDiscount = 0; loyaltyReason = "Cliente nuevo/infrecuente"; }

        if (loyaltyDiscount > 0)
        {
            suggestions.Add(new
            {
                tipo = "lealtad", porcentaje = loyaltyDiscount, razon = loyaltyReason,
                basadoEn = $"{pedidosCount} pedidos en últimos 90 días, ${totalCompras90d:N2} MXN total"
            });
        }

        if (productoId.HasValue)
        {
            var descuentosCantidad = await db.Set<DescuentoPorCantidad>().AsNoTracking()
                .Where(d => d.TenantId == tenantId && d.Activo
                    && (d.ProductoId == productoId || d.ProductoId == null)
                    && d.CantidadMinima <= cantidad)
                .OrderByDescending(d => d.CantidadMinima)
                .FirstOrDefaultAsync();

            if (descuentosCantidad != null)
            {
                suggestions.Add(new
                {
                    tipo = "volumen", porcentaje = descuentosCantidad.DescuentoPorcentaje,
                    razon = $"Descuento por volumen ({cantidad}+ unidades)",
                    basadoEn = $"Regla: {descuentosCantidad.CantidadMinima}+ unidades = {descuentosCantidad.DescuentoPorcentaje}%"
                });
            }

            var avgProductDiscount = await db.DetallePedidos.AsNoTracking()
                .Where(d => d.Activo && d.ProductoId == productoId
                    && d.Pedido.ClienteId == clienteId && d.Pedido.TenantId == tenantId
                    && d.Pedido.Activo && d.Pedido.FechaPedido >= ninetyDaysAgo && d.PorcentajeDescuento > 0)
                .AverageAsync(d => (double?)d.PorcentajeDescuento) ?? 0;

            if (avgProductDiscount > 0)
            {
                suggestions.Add(new
                {
                    tipo = "historial_producto", porcentaje = Math.Round((decimal)avgProductDiscount, 1),
                    razon = "Descuento promedio dado a este cliente en este producto",
                    basadoEn = $"Promedio histórico: {avgProductDiscount:F1}%"
                });
            }
        }

        if (cliente.Saldo > 0 && cliente.LimiteCredito > 0)
        {
            var utilizacion = (double)(cliente.Saldo / cliente.LimiteCredito);
            if (utilizacion > 0.7)
            {
                suggestions.Add(new
                {
                    tipo = "riesgo_credito", porcentaje = -2m,
                    razon = $"Alerta: cliente usa {utilizacion:P0} de su crédito",
                    basadoEn = $"Saldo ${cliente.Saldo:N2} de ${cliente.LimiteCredito:N2} límite"
                });
            }
        }

        var nonRiskSuggestions = suggestions.Where(s => ((dynamic)s).tipo.ToString() != "riesgo_credito").ToList();
        var recommended = nonRiskSuggestions.Count > 0
            ? Math.Max(0, nonRiskSuggestions.Max(s => (decimal)((dynamic)s).porcentaje))
            : 0m;

        var riesgo = suggestions.FirstOrDefault(s => ((dynamic)s).tipo.ToString() == "riesgo_credito");
        if (riesgo != null)
            recommended = Math.Max(0, recommended + (decimal)((dynamic)riesgo).porcentaje);

        var maxDiscount = Math.Max(cliente.Descuento, 15m);
        recommended = Math.Min(recommended, maxDiscount);

        var result = new
        {
            clienteId, clienteNombre = cliente.Nombre,
            descuentoActual = cliente.Descuento,
            descuentoRecomendado = recommended,
            maxDescuento = maxDiscount,
            factores = suggestions
        };

        cache.Set(cacheKey, result, CacheShort);
        return Results.Ok(result);
    }

    // ═══════════════════════════════════════════════════════
    // P2-8: RECOMMENDATIONS FOR TOMORROW (cached)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleRecommendationsTomorrow(
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        IMemoryCache cache,
        HttpContext ctx)
    {
        var (tenantId, userId) = ExtractIdentity(tenantContext, ctx);
        if (tenantId == 0 || userId == 0) return Results.Unauthorized();

        var cacheKey = $"ai_recs_{tenantId}_{userId}";
        if (cache.TryGetValue(cacheKey, out object? cachedResult))
            return Results.Ok(cachedResult);

        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);
        var recommendations = new List<object>();

        var clientesSinVisita = await db.Clientes.AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo && !c.EsProspecto)
            .Where(c => !db.ClienteVisitas.Any(v => v.ClienteId == c.Id && v.FechaHoraInicio >= sevenDaysAgo))
            .OrderBy(c => c.Nombre).Take(5)
            .Select(c => new { c.Id, c.Nombre })
            .ToListAsync();

        foreach (var c in clientesSinVisita)
        {
            var lastVisit = await db.ClienteVisitas
                .Where(v => v.ClienteId == c.Id)
                .OrderByDescending(v => v.FechaHoraInicio)
                .Select(v => (DateTime?)v.FechaHoraInicio)
                .FirstOrDefaultAsync();

            var dias = lastVisit.HasValue ? (int)(now - lastVisit.Value).TotalDays : -1;
            recommendations.Add(new
            {
                tipo = "visitar", prioridad = "alta", clienteId = c.Id,
                mensaje = dias > 0 ? $"Visitar a {c.Nombre} — {dias} días sin visita" : $"Visitar a {c.Nombre} — nunca visitado"
            });
        }

        var clientesConSaldo = await db.Clientes.AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo && c.Saldo > 0)
            .OrderByDescending(c => c.Saldo).Take(3)
            .Select(c => new { c.Id, c.Nombre, c.Saldo })
            .ToListAsync();

        foreach (var c in clientesConSaldo)
        {
            recommendations.Add(new
            {
                tipo = "cobrar", prioridad = c.Saldo > 5000 ? "alta" : "media",
                clienteId = c.Id, mensaje = $"Cobrar a {c.Nombre} — ${c.Saldo:N2} MXN pendiente"
            });
        }

        var productosAgotados = await db.Productos.AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Activo && p.Inventario != null && p.Inventario.CantidadActual <= 0)
            .OrderBy(p => p.Nombre).Take(3)
            .Select(p => new { p.Id, p.Nombre })
            .ToListAsync();

        foreach (var p in productosAgotados)
        {
            recommendations.Add(new
            {
                tipo = "reabastecer", prioridad = "media",
                productoId = p.Id, mensaje = $"Llevar más {p.Nombre} — se agotó"
            });
        }

        var result = new
        {
            fecha = now.Date.AddDays(1).ToString("yyyy-MM-dd"),
            total = recommendations.Count,
            items = recommendations
        };

        cache.Set(cacheKey, result, CacheShort);
        return Results.Ok(result);
    }

    // ═══════════════════════════════════════════════════════
    // P2-9: STOP DURATION PREDICTIONS (MV + cache + EF fallback)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleStopDurations(
        int rutaId,
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        IMemoryCache cache)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var cacheKey = $"ai_stops_{tenantId}_{rutaId}";
        if (cache.TryGetValue(cacheKey, out object? cachedResult))
            return Results.Ok(cachedResult);

        var ruta = await db.RutasVendedor.AsNoTracking()
            .Include(r => r.Detalles).ThenInclude(d => d.Cliente)
            .FirstOrDefaultAsync(r => r.Id == rutaId && r.TenantId == tenantId && r.Activo);

        if (ruta == null)
            return Results.NotFound(new { error = "Ruta no encontrada." });

        var useMv = await MaterializedViewExistsAsync(db, "mv_visit_duration_avg");
        var predictions = new List<object>();

        if (useMv)
        {
            var clienteIds = ruta.Detalles.Where(d => d.Activo).Select(d => d.ClienteId).Distinct().ToList();
            // Fetch all durations in one query
            var durations = await db.Database
                .SqlQueryRaw<VisitDurationRow>(
                    @"SELECT cliente_id AS ""ClienteId"", avg_minutos AS ""AvgMinutos"",
                      confianza AS ""Confianza"", basado_en AS ""BasadoEn""
                      FROM mv_visit_duration_avg
                      WHERE tenant_id = {0}",
                    tenantId)
                .ToListAsync();
            var durMap = durations.ToDictionary(d => d.ClienteId);

            foreach (var parada in ruta.Detalles.Where(d => d.Activo).OrderBy(d => d.OrdenVisita))
            {
                if (durMap.TryGetValue(parada.ClienteId, out var dur))
                {
                    predictions.Add(new
                    {
                        paradaId = parada.Id, clienteId = parada.ClienteId,
                        clienteNombre = parada.Cliente?.Nombre ?? "Desconocido",
                        ordenVisita = parada.OrdenVisita,
                        duracionEstimadaMinutos = (int)Math.Round(dur.AvgMinutos),
                        confianza = dur.Confianza, basadoEn = dur.BasadoEn
                    });
                }
                else
                {
                    predictions.Add(new
                    {
                        paradaId = parada.Id, clienteId = parada.ClienteId,
                        clienteNombre = parada.Cliente?.Nombre ?? "Desconocido",
                        ordenVisita = parada.OrdenVisita,
                        duracionEstimadaMinutos = parada.DuracionEstimadaMinutos ?? 30,
                        confianza = 0.3, basadoEn = "Estimado por defecto (sin historial)"
                    });
                }
            }
        }
        else
        {
            // EF Core fallback
            var ninetyDaysAgo = DateTime.UtcNow.AddDays(-90);
            foreach (var parada in ruta.Detalles.Where(d => d.Activo).OrderBy(d => d.OrdenVisita))
            {
                var visitHistory = await db.ClienteVisitas.AsNoTracking()
                    .Where(v => v.ClienteId == parada.ClienteId
                        && v.FechaHoraInicio != null && v.FechaHoraInicio >= ninetyDaysAgo && v.FechaHoraFin != null)
                    .Select(v => new { DuracionMinutos = (v.FechaHoraFin!.Value - v.FechaHoraInicio!.Value).TotalMinutes })
                    .ToListAsync();

                double avgMinutos; double confidence; string basadoEn;
                if (visitHistory.Count >= 5)
                { avgMinutos = visitHistory.Average(v => v.DuracionMinutos); confidence = 0.9; basadoEn = $"{visitHistory.Count} visitas previas"; }
                else if (visitHistory.Count >= 2)
                { avgMinutos = visitHistory.Average(v => v.DuracionMinutos); confidence = 0.6; basadoEn = $"{visitHistory.Count} visitas previas (pocos datos)"; }
                else
                { avgMinutos = parada.DuracionEstimadaMinutos ?? 30; confidence = 0.3; basadoEn = "Estimado por defecto (sin historial)"; }

                predictions.Add(new
                {
                    paradaId = parada.Id, clienteId = parada.ClienteId,
                    clienteNombre = parada.Cliente?.Nombre ?? "Desconocido",
                    ordenVisita = parada.OrdenVisita,
                    duracionEstimadaMinutos = (int)Math.Round(avgMinutos),
                    confianza = confidence, basadoEn
                });
            }
        }

        var totalMinutos = predictions.Sum(p => ((dynamic)p).duracionEstimadaMinutos);

        var result = new
        {
            rutaId,
            totalParadas = predictions.Count,
            duracionTotalEstimadaMinutos = totalMinutos,
            horaFinEstimada = ruta.HoraInicioEstimada.HasValue
                ? (ruta.Fecha.Date + ruta.HoraInicioEstimada.Value).AddMinutes((double)(int)totalMinutos).ToString("HH:mm")
                : null,
            items = predictions
        };

        cache.Set(cacheKey, result, CacheShort);
        return Results.Ok(result);
    }

    // ═══════════════════════════════════════════════════════
    // P3-11: DEMAND FORECAST (MV + cache + EF fallback)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleDemandForecast(
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        IMemoryCache cache,
        [FromQuery] int? productoId = null,
        [FromQuery] int limit = 20)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var cacheKey = $"ai_demand_{tenantId}_{productoId}_{limit}";
        if (cache.TryGetValue(cacheKey, out object? cachedResult))
            return Results.Ok(cachedResult);

        var useMv = await MaterializedViewExistsAsync(db, "mv_demand_forecast");
        object result;

        if (useMv)
        {
            var filter = productoId.HasValue ? "AND producto_id = {1}" : "";
            var sql = $@"SELECT producto_id AS ""ProductoId"", producto_nombre AS ""ProductoNombre"",
                demanda_semanal_estimada AS ""DemandaSemanalEstimada"",
                promedio_simple AS ""PromedioSimple"",
                min_semanal AS ""MinSemanal"", max_semanal AS ""MaxSemanal"",
                tendencia_cambio AS ""TendenciaCambio"",
                confianza AS ""Confianza"",
                semanas_con_datos AS ""SemanasConDatos"",
                avg_clientes_por_semana AS ""AvgClientesPorSemana""
                FROM mv_demand_forecast
                WHERE tenant_id = {{0}} {filter}
                ORDER BY demanda_semanal_estimada DESC
                LIMIT {{2}}";

            List<DemandForecastRow> rows;
            if (productoId.HasValue)
            {
                rows = await db.Database
                    .SqlQueryRaw<DemandForecastRow>(sql, tenantId, productoId.Value, limit)
                    .ToListAsync();
            }
            else
            {
                rows = await db.Database
                    .SqlQueryRaw<DemandForecastRow>(
                        @"SELECT producto_id AS ""ProductoId"", producto_nombre AS ""ProductoNombre"",
                        demanda_semanal_estimada AS ""DemandaSemanalEstimada"",
                        promedio_simple AS ""PromedioSimple"",
                        min_semanal AS ""MinSemanal"", max_semanal AS ""MaxSemanal"",
                        tendencia_cambio AS ""TendenciaCambio"",
                        confianza AS ""Confianza"",
                        semanas_con_datos AS ""SemanasConDatos"",
                        avg_clientes_por_semana AS ""AvgClientesPorSemana""
                        FROM mv_demand_forecast
                        WHERE tenant_id = {0}
                        ORDER BY demanda_semanal_estimada DESC
                        LIMIT {1}",
                        tenantId, limit)
                    .ToListAsync();
            }

            result = new
            {
                total = rows.Count,
                items = rows.Select(r => new
                {
                    productoId = r.ProductoId,
                    productoNombre = r.ProductoNombre,
                    demandaSemanalEstimada = r.DemandaSemanalEstimada,
                    promedioSimple = r.PromedioSimple,
                    rangoSemanal = new { min = r.MinSemanal, max = r.MaxSemanal },
                    tendencia = r.TendenciaCambio.HasValue
                        ? (r.TendenciaCambio > 0 ? "creciente" : r.TendenciaCambio < 0 ? "decreciente" : "estable")
                        : "sin datos",
                    tendenciaCambio = r.TendenciaCambio,
                    confianza = r.Confianza,
                    semanasConDatos = r.SemanasConDatos,
                    avgClientesPorSemana = r.AvgClientesPorSemana
                })
            };
        }
        else
        {
            // EF Core fallback: simple weekly aggregation
            var twelveWeeksAgo = DateTime.UtcNow.AddDays(-84);

            var query = db.DetallePedidos.AsNoTracking()
                .Where(d => d.Activo && d.Pedido.TenantId == tenantId && d.Pedido.Activo
                    && d.Pedido.FechaPedido >= twelveWeeksAgo && d.Pedido.Estado != EstadoPedido.Cancelado);

            if (productoId.HasValue)
                query = query.Where(d => d.ProductoId == productoId.Value);

            var weeklyData = await query
                .GroupBy(d => new { d.ProductoId, d.Producto.Nombre })
                .Select(g => new
                {
                    ProductoId = g.Key.ProductoId,
                    ProductoNombre = g.Key.Nombre,
                    TotalCantidad = g.Sum(d => (double)d.Cantidad),
                    TotalPedidos = g.Select(d => d.PedidoId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalCantidad)
                .Take(limit)
                .ToListAsync();

            result = new
            {
                total = weeklyData.Count,
                items = weeklyData.Select(w => new
                {
                    productoId = w.ProductoId,
                    productoNombre = w.ProductoNombre,
                    demandaSemanalEstimada = Math.Round(w.TotalCantidad / 12.0, 1),
                    promedioSimple = Math.Round(w.TotalCantidad / 12.0, 1),
                    rangoSemanal = new { min = 0.0, max = w.TotalCantidad },
                    tendencia = "sin datos",
                    tendenciaCambio = (double?)null,
                    confianza = "baja",
                    semanasConDatos = 0,
                    avgClientesPorSemana = 0.0
                })
            };
        }

        cache.Set(cacheKey, result, CacheMedium);
        return Results.Ok(result);
    }

    // ═══════════════════════════════════════════════════════
    // P3-12: PAYMENT RISK (MV + cache + EF fallback)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandlePaymentRisk(
        int clienteId,
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        IMemoryCache cache)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var cacheKey = $"ai_risk_{tenantId}_{clienteId}";
        if (cache.TryGetValue(cacheKey, out object? cachedResult))
            return Results.Ok(cachedResult);

        var useMv = await MaterializedViewExistsAsync(db, "mv_payment_risk");
        object result;

        if (useMv)
        {
            var row = await db.Database
                .SqlQueryRaw<PaymentRiskRow>(
                    @"SELECT cliente_id AS ""ClienteId"", cliente_nombre AS ""ClienteNombre"",
                      saldo_actual AS ""SaldoActual"", limite_credito AS ""LimiteCredito"",
                      cobros_6_meses AS ""Cobros6Meses"", pedidos_6_meses AS ""Pedidos6Meses"",
                      avg_dias_entre_cobros AS ""AvgDiasEntreCobros"",
                      ratio_pago_pct AS ""RatioPagoPct"",
                      risk_score AS ""RiskScore"", nivel_riesgo AS ""NivelRiesgo"",
                      razon AS ""Razon""
                      FROM mv_payment_risk
                      WHERE tenant_id = {0} AND cliente_id = {1}",
                    tenantId, clienteId)
                .FirstOrDefaultAsync();

            if (row == null)
                return Results.NotFound(new { error = "Cliente no encontrado en análisis de riesgo." });

            result = new
            {
                clienteId = row.ClienteId,
                clienteNombre = row.ClienteNombre,
                saldoActual = row.SaldoActual,
                limiteCredito = row.LimiteCredito,
                metricas = new
                {
                    cobros6Meses = row.Cobros6Meses,
                    pedidos6Meses = row.Pedidos6Meses,
                    avgDiasEntreCobros = row.AvgDiasEntreCobros,
                    ratioPagoPct = row.RatioPagoPct
                },
                riskScore = row.RiskScore,
                nivelRiesgo = row.NivelRiesgo,
                razon = row.Razon
            };
        }
        else
        {
            // EF Core fallback: basic risk calculation
            var cliente = await db.Clientes.AsNoTracking()
                .Where(c => c.Id == clienteId && c.TenantId == tenantId && c.Activo)
                .Select(c => new { c.Nombre, c.Saldo, c.LimiteCredito })
                .FirstOrDefaultAsync();

            if (cliente == null)
                return Results.NotFound(new { error = "Cliente no encontrado." });

            var sixMonthsAgo = DateTime.UtcNow.AddDays(-180);

            var cobrosCount = await db.Cobros.AsNoTracking()
                .CountAsync(co => co.ClienteId == clienteId && co.TenantId == tenantId && co.Activo && co.FechaCobro >= sixMonthsAgo);

            var pedidosCount = await db.Pedidos.AsNoTracking()
                .CountAsync(p => p.ClienteId == clienteId && p.TenantId == tenantId && p.Activo
                    && p.FechaPedido >= sixMonthsAgo && p.Estado != EstadoPedido.Cancelado);

            var utilizacion = cliente.LimiteCredito > 0 ? (double)(cliente.Saldo / cliente.LimiteCredito) : (cliente.Saldo > 0 ? 1.0 : 0);
            var riskScore = (int)(Math.Min(utilizacion, 1.0) * 35 + (cobrosCount < 2 ? 20 : 0) + (pedidosCount > cobrosCount * 2 ? 25 : 0));

            var nivel = riskScore > 70 ? "critico" : riskScore > 50 ? "alto" : riskScore > 30 ? "irregular" : "bajo";

            result = new
            {
                clienteId,
                clienteNombre = cliente.Nombre,
                saldoActual = cliente.Saldo,
                limiteCredito = cliente.LimiteCredito,
                metricas = new
                {
                    cobros6Meses = cobrosCount,
                    pedidos6Meses = pedidosCount,
                    avgDiasEntreCobros = 0,
                    ratioPagoPct = 0.0m
                },
                riskScore = Math.Min(riskScore, 100),
                nivelRiesgo = nivel,
                razon = cobrosCount < 2 ? "Sin historial de pagos suficiente" : nivel == "bajo" ? "Buen historial" : "Riesgo detectado"
            };
        }

        cache.Set(cacheKey, result, CacheShort);
        return Results.Ok(result);
    }

    // ═══════════════════════════════════════════════════════
    // P3-13: GPS ANOMALY DETECTION (PostGIS + Haversine)
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleGpsAnomaly(
        int visitaId,
        HandySalesDbContext db,
        ITenantContextService tenantContext)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var visita = await db.ClienteVisitas.AsNoTracking()
            .Where(v => v.Id == visitaId && v.TenantId == tenantId)
            .Select(v => new
            {
                v.ClienteId,
                v.LatitudInicio,
                v.LongitudInicio,
                v.FechaHoraInicio,
                v.FechaHoraFin
            })
            .FirstOrDefaultAsync();

        if (visita == null)
            return Results.NotFound(new { error = "Visita no encontrada." });

        var cliente = await db.Clientes.AsNoTracking()
            .Where(c => c.Id == visita.ClienteId && c.TenantId == tenantId)
            .Select(c => new { c.Nombre, c.Latitud, c.Longitud, c.Direccion })
            .FirstOrDefaultAsync();

        if (cliente == null)
            return Results.NotFound(new { error = "Cliente no encontrado." });

        var anomalies = new List<object>();

        // 1. GPS distance check (using PostgreSQL haversine_km if available, else C# calc)
        if (visita.LatitudInicio.HasValue && visita.LongitudInicio.HasValue
            && cliente.Latitud.HasValue && cliente.Longitud.HasValue)
        {
            double distanciaKm;
            try
            {
                // Try PostgreSQL native function
                var distRow = await db.Database
                    .SqlQueryRaw<double>(
                        @"SELECT haversine_km({0}, {1}, {2}, {3}) AS ""Value""",
                        (double)visita.LatitudInicio.Value, (double)visita.LongitudInicio.Value,
                        (double)cliente.Latitud.Value, (double)cliente.Longitud.Value)
                    .FirstOrDefaultAsync();
                distanciaKm = distRow;
            }
            catch
            {
                // C# fallback
                distanciaKm = HaversineKm(
                    (double)visita.LatitudInicio.Value, (double)visita.LongitudInicio.Value,
                    (double)cliente.Latitud.Value, (double)cliente.Longitud.Value);
            }

            var distanciaMetros = distanciaKm * 1000;

            if (distanciaMetros > 500)
            {
                anomalies.Add(new
                {
                    tipo = "ubicacion_lejana",
                    severidad = distanciaMetros > 2000 ? "critico" : "warning",
                    distanciaMetros = (int)distanciaMetros,
                    mensaje = $"Check-in a {distanciaMetros:F0}m del cliente {cliente.Nombre} (máx esperado: 500m)",
                    ubicacionVisita = new { lat = visita.LatitudInicio, lng = visita.LongitudInicio },
                    ubicacionCliente = new { lat = cliente.Latitud, lng = cliente.Longitud }
                });
            }
        }
        else if (!visita.LatitudInicio.HasValue || !visita.LongitudInicio.HasValue)
        {
            anomalies.Add(new
            {
                tipo = "sin_gps",
                severidad = "warning",
                distanciaMetros = (int?)null,
                mensaje = "Visita registrada sin coordenadas GPS",
                ubicacionVisita = (object?)null,
                ubicacionCliente = cliente.Latitud.HasValue ? new { lat = cliente.Latitud, lng = cliente.Longitud } : null
            });
        }

        // 2. Duration anomaly (too short or too long)
        if (visita.FechaHoraInicio.HasValue && visita.FechaHoraFin.HasValue)
        {
            var duracionMinutos = (visita.FechaHoraFin.Value - visita.FechaHoraInicio.Value).TotalMinutes;

            if (duracionMinutos < 2)
            {
                anomalies.Add(new
                {
                    tipo = "visita_corta",
                    severidad = "warning",
                    distanciaMetros = (int?)null,
                    mensaje = $"Visita duró solo {duracionMinutos:F0} minutos (sospechosamente corta)",
                    ubicacionVisita = (object?)null,
                    ubicacionCliente = (object?)null
                });
            }
            else if (duracionMinutos > 180)
            {
                anomalies.Add(new
                {
                    tipo = "visita_larga",
                    severidad = "info",
                    distanciaMetros = (int?)null,
                    mensaje = $"Visita duró {duracionMinutos:F0} minutos ({duracionMinutos / 60:F1}h — inusualmente larga)",
                    ubicacionVisita = (object?)null,
                    ubicacionCliente = (object?)null
                });
            }
        }

        return Results.Ok(new
        {
            visitaId,
            clienteId = visita.ClienteId,
            clienteNombre = cliente.Nombre,
            clienteDireccion = cliente.Direccion,
            totalAnomalias = anomalies.Count,
            tieneAnomalias = anomalies.Count > 0,
            items = anomalies
        });
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN: REFRESH MATERIALIZED VIEWS
    // ═══════════════════════════════════════════════════════

    private static async Task<IResult> HandleRefreshViews(
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        HttpContext ctx)
    {
        var (tenantId, _) = ExtractIdentity(tenantContext, ctx);
        if (tenantId == 0) return Results.Unauthorized();

        // Only admin/superadmin can refresh
        var role = ctx.User.FindFirst("role")?.Value ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (role != "ADMIN" && role != "SUPERADMIN")
            return Results.Forbid();

        try
        {
            await db.Database.ExecuteSqlRawAsync("SELECT refresh_ai_materialized_views()");
            return Results.Ok(new { message = "Vistas materializadas actualizadas correctamente.", refreshedAt = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { error = $"Error al refrescar vistas: {ex.Message}" });
        }
    }

    // ═══════════════════════════════════════════════════════
    // HELPER: C# Haversine fallback
    // ═══════════════════════════════════════════════════════

    private static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371.0;
        var dLat = ToRad(lat2 - lat1);
        var dLng = ToRad(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return R * 2 * Math.Asin(Math.Sqrt(a));
    }

    private static double ToRad(double deg) => deg * Math.PI / 180.0;

    // ═══════════════════════════════════════════════════════
    // ROW TYPES (for SqlQueryRaw mapping)
    // ═══════════════════════════════════════════════════════

    private class SuggestedProductRow
    {
        public int ProductoId { get; set; }
        public string Nombre { get; set; } = "";
        public string CodigoBarra { get; set; } = "";
        public decimal PrecioBase { get; set; }
        public string? ImagenUrl { get; set; }
        public int Frecuencia { get; set; }
        public decimal CantidadTotal { get; set; }
        public DateTime UltimaCompra { get; set; }
    }

    private class CollectionPriorityRow
    {
        public int ClienteId { get; set; }
        public string ClienteNombre { get; set; } = "";
        public decimal SaldoPendiente { get; set; }
        public decimal LimiteCredito { get; set; }
        public int DiasVencido { get; set; }
        public int DiasSinCobro { get; set; }
        public int PedidosPendientes { get; set; }
        public int UrgencyScore { get; set; }
        public string Razon { get; set; } = "";
    }

    private class OrderHistoryRow
    {
        public int ProductoId { get; set; }
        public double AvgCantidad { get; set; }
        public int MaxCantidad { get; set; }
        public double AvgPrecio { get; set; }
        public int Compras { get; set; }
    }

    private class OrderTotalRow
    {
        public double AvgTotal { get; set; }
    }

    private class VisitDurationRow
    {
        public int ClienteId { get; set; }
        public double AvgMinutos { get; set; }
        public double Confianza { get; set; }
        public string BasadoEn { get; set; } = "";
    }

    private class DemandForecastRow
    {
        public int ProductoId { get; set; }
        public string ProductoNombre { get; set; } = "";
        public double DemandaSemanalEstimada { get; set; }
        public double PromedioSimple { get; set; }
        public double MinSemanal { get; set; }
        public double MaxSemanal { get; set; }
        public double? TendenciaCambio { get; set; }
        public string Confianza { get; set; } = "";
        public int SemanasConDatos { get; set; }
        public double AvgClientesPorSemana { get; set; }
    }

    private class PaymentRiskRow
    {
        public int ClienteId { get; set; }
        public string ClienteNombre { get; set; } = "";
        public decimal SaldoActual { get; set; }
        public decimal LimiteCredito { get; set; }
        public int Cobros6Meses { get; set; }
        public int Pedidos6Meses { get; set; }
        public int AvgDiasEntreCobros { get; set; }
        public decimal RatioPagoPct { get; set; }
        public int RiskScore { get; set; }
        public string NivelRiesgo { get; set; } = "";
        public string Razon { get; set; } = "";
    }
}
