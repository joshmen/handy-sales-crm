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
        group.MapPost("/collections-message", HandleCollectionsMessage);
        group.MapGet("/orders/{pedidoId}/anomalies", HandleOrderAnomalies);
        group.MapGet("/client/{clienteId}/smart-discount", HandleSmartDiscount);
        group.MapGet("/recommendations/tomorrow", HandleRecommendationsTomorrow);
        group.MapGet("/routes/{rutaId}/stop-durations", HandleStopDurations);
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

    private static async Task<IResult> HandleCollectionsMessage(
        [FromBody] CollectionsMessageRequest request,
        IAiGatewayService gateway,
        IAiCreditService creditService,
        ITenantContextService tenantContext,
        HandySalesDbContext db,
        HttpContext ctx)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        var userIdStr = ctx.User.FindFirst("userId")?.Value
            ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? ctx.User.FindFirst("sub")?.Value;
        var userId = int.TryParse(userIdStr, out var uid) ? uid : 0;

        if (tenantId == 0 || userId == 0)
            return Results.Unauthorized();

        // Get client info
        var cliente = await db.Clientes
            .AsNoTracking()
            .Where(c => c.Id == request.ClienteId && c.TenantId == tenantId && c.Activo)
            .Select(c => new { c.Nombre, c.Saldo, c.Telefono })
            .FirstOrDefaultAsync();

        if (cliente == null)
            return Results.NotFound(new { error = "Cliente no encontrado." });

        if (cliente.Saldo <= 0)
            return Results.BadRequest(new { error = "El cliente no tiene saldo pendiente." });

        // Get vendor name for signature
        var vendedor = await db.Usuarios
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.Nombre)
            .FirstOrDefaultAsync();

        // Get company name for branding
        var empresa = await db.DatosEmpresa
            .AsNoTracking()
            .Where(e => e.TenantId == tenantId)
            .Select(e => e.RazonSocial)
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

    private static async Task<IResult> HandleOrderAnomalies(
        int pedidoId,
        HandySalesDbContext db,
        ITenantContextService tenantContext)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        // Get the order with details
        var pedido = await db.Pedidos
            .AsNoTracking()
            .Include(p => p.Detalles).ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(p => p.Id == pedidoId && p.TenantId == tenantId && p.Activo);

        if (pedido == null)
            return Results.NotFound(new { error = "Pedido no encontrado." });

        var anomalies = new List<object>();
        var ninetyDaysAgo = DateTime.UtcNow.AddDays(-90);

        // Get historical averages for this client
        var historialCliente = await db.DetallePedidos
            .AsNoTracking()
            .Where(d => d.Activo
                && d.Pedido.ClienteId == pedido.ClienteId
                && d.Pedido.TenantId == tenantId
                && d.Pedido.Activo
                && d.Pedido.Id != pedidoId
                && d.Pedido.FechaPedido >= ninetyDaysAgo
                && d.Pedido.Estado != EstadoPedido.Cancelado)
            .GroupBy(d => d.ProductoId)
            .Select(g => new
            {
                ProductoId = g.Key,
                AvgCantidad = g.Average(d => (double)d.Cantidad),
                MaxCantidad = g.Max(d => d.Cantidad),
                AvgPrecio = g.Average(d => (double)d.PrecioUnitario),
                Compras = g.Count()
            })
            .ToDictionaryAsync(x => x.ProductoId);

        // Get products this client has NEVER bought
        var productosComprados = historialCliente.Keys.ToHashSet();

        foreach (var detalle in pedido.Detalles.Where(d => d.Activo))
        {
            // 1. Product never bought by this client
            if (!productosComprados.Contains(detalle.ProductoId))
            {
                anomalies.Add(new
                {
                    tipo = "producto_nuevo",
                    severidad = "info",
                    productoId = detalle.ProductoId,
                    productoNombre = detalle.Producto?.Nombre ?? "Desconocido",
                    mensaje = $"{detalle.Producto?.Nombre} nunca comprado por este cliente"
                });
                continue;
            }

            var hist = historialCliente[detalle.ProductoId];

            // 2. Quantity much higher than average (>3x)
            if ((double)detalle.Cantidad > hist.AvgCantidad * 3 && detalle.Cantidad > hist.MaxCantidad)
            {
                var cantRatio = (double)detalle.Cantidad / hist.AvgCantidad;
                anomalies.Add(new
                {
                    tipo = "cantidad_alta",
                    severidad = "warning",
                    productoId = detalle.ProductoId,
                    productoNombre = detalle.Producto?.Nombre ?? "Desconocido",
                    mensaje = $"{detalle.Producto?.Nombre}: cantidad {detalle.Cantidad} es {cantRatio:F1}x el promedio ({hist.AvgCantidad:F0})"
                });
            }

            // 3. Price significantly different from average (>20% deviation)
            if (hist.AvgPrecio > 0)
            {
                var desviacion = Math.Abs((double)detalle.PrecioUnitario - hist.AvgPrecio) / hist.AvgPrecio;
                if (desviacion > 0.20)
                {
                    var direccion = (double)detalle.PrecioUnitario > hist.AvgPrecio ? "por encima" : "por debajo";
                    anomalies.Add(new
                    {
                        tipo = "precio_anomalo",
                        severidad = "warning",
                        productoId = detalle.ProductoId,
                        productoNombre = detalle.Producto?.Nombre ?? "Desconocido",
                        mensaje = $"{detalle.Producto?.Nombre}: precio ${detalle.PrecioUnitario:N2} está {desviacion:P0} {direccion} del promedio (${hist.AvgPrecio:N2})"
                    });
                }
            }
        }

        // 4. Order total much higher than client average
        var avgTotal = await db.Pedidos
            .AsNoTracking()
            .Where(p => p.ClienteId == pedido.ClienteId
                && p.TenantId == tenantId
                && p.Activo
                && p.Id != pedidoId
                && p.FechaPedido >= ninetyDaysAgo
                && p.Estado != EstadoPedido.Cancelado)
            .AverageAsync(p => (double?)p.Total) ?? 0;

        if (avgTotal > 0 && (double)pedido.Total > avgTotal * 2.5)
        {
            var ratio = (double)pedido.Total / avgTotal;
            anomalies.Add(new
            {
                tipo = "total_alto",
                severidad = "warning",
                productoId = (int?)null,
                productoNombre = (string?)null,
                mensaje = $"Total ${pedido.Total:N2} es {ratio:F1}x el promedio del cliente (${avgTotal:N2})"
            });
        }

        return Results.Ok(new
        {
            pedidoId,
            totalAnomalias = anomalies.Count,
            tieneAnomalias = anomalies.Count > 0,
            items = anomalies
        });
    }

    // ═══ P2-6: Smart Discount Suggestion ═══════════════════════════════

    private static async Task<IResult> HandleSmartDiscount(
        int clienteId,
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        [FromQuery] int? productoId = null,
        [FromQuery] int cantidad = 1)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        var ninetyDaysAgo = DateTime.UtcNow.AddDays(-90);

        // Client profile
        var cliente = await db.Clientes
            .AsNoTracking()
            .Where(c => c.Id == clienteId && c.TenantId == tenantId && c.Activo)
            .Select(c => new { c.Nombre, c.Saldo, c.LimiteCredito, c.Descuento })
            .FirstOrDefaultAsync();

        if (cliente == null)
            return Results.NotFound(new { error = "Cliente no encontrado." });

        // Client purchase history (last 90 days)
        var historial = await db.Pedidos
            .AsNoTracking()
            .Where(p => p.ClienteId == clienteId && p.TenantId == tenantId && p.Activo
                && p.FechaPedido >= ninetyDaysAgo && p.Estado != EstadoPedido.Cancelado)
            .Select(p => new { p.Total, p.FechaPedido })
            .ToListAsync();

        var totalCompras90d = historial.Sum(h => h.Total);
        var pedidosCount = historial.Count;
        var promedioOrden = pedidosCount > 0 ? totalCompras90d / pedidosCount : 0;

        // Volume discount tiers
        var suggestions = new List<object>();

        // 1. Loyalty discount (based on purchase frequency)
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
                tipo = "lealtad",
                porcentaje = loyaltyDiscount,
                razon = loyaltyReason,
                basadoEn = $"{pedidosCount} pedidos en últimos 90 días, ${totalCompras90d:N2} MXN total"
            });
        }

        // 2. Volume discount for specific product
        if (productoId.HasValue)
        {
            // Check existing quantity-based discounts
            var descuentosCantidad = await db.Set<DescuentoPorCantidad>()
                .AsNoTracking()
                .Where(d => d.TenantId == tenantId && d.Activo
                    && (d.ProductoId == productoId || d.ProductoId == null)
                    && d.CantidadMinima <= cantidad)
                .OrderByDescending(d => d.CantidadMinima)
                .FirstOrDefaultAsync();

            if (descuentosCantidad != null)
            {
                suggestions.Add(new
                {
                    tipo = "volumen",
                    porcentaje = descuentosCantidad.DescuentoPorcentaje,
                    razon = $"Descuento por volumen ({cantidad}+ unidades)",
                    basadoEn = $"Regla: {descuentosCantidad.CantidadMinima}+ unidades = {descuentosCantidad.DescuentoPorcentaje}%"
                });
            }

            // Product-specific average discount given to this client
            var avgProductDiscount = await db.DetallePedidos
                .AsNoTracking()
                .Where(d => d.Activo && d.ProductoId == productoId
                    && d.Pedido.ClienteId == clienteId
                    && d.Pedido.TenantId == tenantId
                    && d.Pedido.Activo
                    && d.Pedido.FechaPedido >= ninetyDaysAgo
                    && d.PorcentajeDescuento > 0)
                .AverageAsync(d => (double?)d.PorcentajeDescuento) ?? 0;

            if (avgProductDiscount > 0)
            {
                suggestions.Add(new
                {
                    tipo = "historial_producto",
                    porcentaje = Math.Round((decimal)avgProductDiscount, 1),
                    razon = "Descuento promedio dado a este cliente en este producto",
                    basadoEn = $"Promedio histórico: {avgProductDiscount:F1}%"
                });
            }
        }

        // 3. Credit risk adjustment — reduce discount if overdue
        if (cliente.Saldo > 0 && cliente.LimiteCredito > 0)
        {
            var utilizacion = (double)(cliente.Saldo / cliente.LimiteCredito);
            if (utilizacion > 0.7)
            {
                suggestions.Add(new
                {
                    tipo = "riesgo_credito",
                    porcentaje = -2m,
                    razon = $"Alerta: cliente usa {utilizacion:P0} de su crédito",
                    basadoEn = $"Saldo ${cliente.Saldo:N2} de ${cliente.LimiteCredito:N2} límite"
                });
            }
        }

        // Calculate recommended total discount
        var recommended = Math.Max(0, suggestions
            .Where(s => ((dynamic)s).tipo.ToString() != "riesgo_credito")
            .Max(s => (decimal)((dynamic)s).porcentaje));

        // Apply credit risk penalty
        var riesgo = suggestions.FirstOrDefault(s => ((dynamic)s).tipo.ToString() == "riesgo_credito");
        if (riesgo != null)
            recommended = Math.Max(0, recommended + (decimal)((dynamic)riesgo).porcentaje);

        // Cap at existing client discount or 15% max
        var maxDiscount = Math.Max(cliente.Descuento, 15m);
        recommended = Math.Min(recommended, maxDiscount);

        return Results.Ok(new
        {
            clienteId,
            clienteNombre = cliente.Nombre,
            descuentoActual = cliente.Descuento,
            descuentoRecomendado = recommended,
            maxDescuento = maxDiscount,
            factores = suggestions
        });
    }

    // ═══ P2-8: Recommendations for Tomorrow ═══════════════════════════

    private static async Task<IResult> HandleRecommendationsTomorrow(
        HandySalesDbContext db,
        ITenantContextService tenantContext,
        HttpContext ctx)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        var userIdStr = ctx.User.FindFirst("userId")?.Value
            ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? ctx.User.FindFirst("sub")?.Value;
        var userId = int.TryParse(userIdStr, out var uid) ? uid : 0;

        if (tenantId == 0 || userId == 0)
            return Results.Unauthorized();

        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);
        var recommendations = new List<object>();

        // 1. Clients not visited in 7+ days
        var clientesSinVisita = await db.Clientes
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo && !c.EsProspecto)
            .Where(c => !db.ClienteVisitas
                .Any(v => v.ClienteId == c.Id && v.FechaHoraInicio >= sevenDaysAgo))
            .OrderBy(c => c.Nombre)
            .Take(5)
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
                tipo = "visitar",
                prioridad = "alta",
                clienteId = c.Id,
                mensaje = dias > 0
                    ? $"Visitar a {c.Nombre} — {dias} días sin visita"
                    : $"Visitar a {c.Nombre} — nunca visitado"
            });
        }

        // 2. Clients with overdue balance
        var clientesConSaldo = await db.Clientes
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo && c.Saldo > 0)
            .OrderByDescending(c => c.Saldo)
            .Take(3)
            .Select(c => new { c.Id, c.Nombre, c.Saldo })
            .ToListAsync();

        foreach (var c in clientesConSaldo)
        {
            recommendations.Add(new
            {
                tipo = "cobrar",
                prioridad = c.Saldo > 5000 ? "alta" : "media",
                clienteId = c.Id,
                mensaje = $"Cobrar a {c.Nombre} — ${c.Saldo:N2} MXN pendiente"
            });
        }

        // 3. Products that ran out today (sold but now zero stock)
        var productosAgotados = await db.Productos
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Activo
                && p.Inventario != null && p.Inventario.CantidadActual <= 0)
            .OrderBy(p => p.Nombre)
            .Take(3)
            .Select(p => new { p.Id, p.Nombre })
            .ToListAsync();

        foreach (var p in productosAgotados)
        {
            recommendations.Add(new
            {
                tipo = "reabastecer",
                prioridad = "media",
                productoId = p.Id,
                mensaje = $"Llevar más {p.Nombre} — se agotó"
            });
        }

        return Results.Ok(new
        {
            fecha = now.Date.AddDays(1).ToString("yyyy-MM-dd"),
            total = recommendations.Count,
            items = recommendations
        });
    }

    // ═══ P2-9: Stop Duration Predictions ══════════════════════════════

    private static async Task<IResult> HandleStopDurations(
        int rutaId,
        HandySalesDbContext db,
        ITenantContextService tenantContext)
    {
        var tenantId = tenantContext.TenantId ?? 0;
        if (tenantId == 0) return Results.Unauthorized();

        // Get the route with its stops
        var ruta = await db.RutasVendedor
            .AsNoTracking()
            .Include(r => r.Detalles).ThenInclude(d => d.Cliente)
            .FirstOrDefaultAsync(r => r.Id == rutaId && r.TenantId == tenantId && r.Activo);

        if (ruta == null)
            return Results.NotFound(new { error = "Ruta no encontrada." });

        var ninetyDaysAgo = DateTime.UtcNow.AddDays(-90);
        var predictions = new List<object>();

        foreach (var parada in ruta.Detalles.Where(d => d.Activo).OrderBy(d => d.OrdenVisita))
        {
            // Get historical visit durations for this client
            var visitHistory = await db.ClienteVisitas
                .AsNoTracking()
                .Where(v => v.ClienteId == parada.ClienteId
                    && v.FechaHoraInicio != null
                    && v.FechaHoraInicio >= ninetyDaysAgo
                    && v.FechaHoraFin != null)
                .Select(v => new
                {
                    DuracionMinutos = (v.FechaHoraFin!.Value - v.FechaHoraInicio!.Value).TotalMinutes
                })
                .ToListAsync();

            double avgMinutos;
            double confidence;
            string basadoEn;

            if (visitHistory.Count >= 5)
            {
                avgMinutos = visitHistory.Average(v => v.DuracionMinutos);
                confidence = 0.9;
                basadoEn = $"{visitHistory.Count} visitas previas";
            }
            else if (visitHistory.Count >= 2)
            {
                avgMinutos = visitHistory.Average(v => v.DuracionMinutos);
                confidence = 0.6;
                basadoEn = $"{visitHistory.Count} visitas previas (pocos datos)";
            }
            else
            {
                avgMinutos = parada.DuracionEstimadaMinutos ?? 30;
                confidence = 0.3;
                basadoEn = "Estimado por defecto (sin historial)";
            }

            predictions.Add(new
            {
                paradaId = parada.Id,
                clienteId = parada.ClienteId,
                clienteNombre = parada.Cliente?.Nombre ?? "Desconocido",
                ordenVisita = parada.OrdenVisita,
                duracionEstimadaMinutos = (int)Math.Round(avgMinutos),
                confianza = confidence,
                basadoEn
            });
        }

        var totalMinutos = predictions.Sum(p => ((dynamic)p).duracionEstimadaMinutos);

        return Results.Ok(new
        {
            rutaId,
            totalParadas = predictions.Count,
            duracionTotalEstimadaMinutos = totalMinutos,
            horaFinEstimada = ruta.HoraInicioEstimada.HasValue
                ? (ruta.Fecha.Date + ruta.HoraInicioEstimada.Value).AddMinutes((double)(int)totalMinutos).ToString("HH:mm")
                : null,
            items = predictions
        });
    }
}
