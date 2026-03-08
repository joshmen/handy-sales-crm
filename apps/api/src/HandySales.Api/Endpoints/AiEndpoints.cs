using HandySales.Application.Ai.DTOs;
using HandySales.Application.Ai.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HandySales.Api.Endpoints;

public static class AiEndpoints
{
    public static void MapAiEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/ai")
            .RequireAuthorization()
            .WithTags("AI");

        group.MapPost("/query", HandleQuery);
        group.MapGet("/credits", HandleGetCredits);
        group.MapGet("/usage", HandleGetUsage);
        group.MapGet("/usage/stats", HandleGetUsageStats);
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
}
