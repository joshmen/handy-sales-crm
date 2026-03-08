using HandySales.Application.Ai.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Ai.Services;

public class AiCreditService : IAiCreditService
{
    private readonly HandySalesDbContext _db;

    private static readonly Dictionary<string, int> CreditCosts = new()
    {
        ["resumen"] = 1,
        ["insight"] = 2,
        ["pregunta"] = 3,
        ["pronostico"] = 5
    };

    private static readonly Dictionary<string, int> MonthlyAllocations = new()
    {
        ["free"] = 0,
        ["basico"] = 0,
        ["profesional"] = 100,
        ["enterprise"] = 500
    };

    public AiCreditService(HandySalesDbContext db) => _db = db;

    public int GetCreditCost(string tipoAccion)
        => CreditCosts.GetValueOrDefault(tipoAccion.ToLower(), 0);

    public int GetMonthlyAllocation(string planTipo)
        => MonthlyAllocations.GetValueOrDefault(NormalizeTier(planTipo), 0);

    public async Task<AiCreditBalanceDto> GetCurrentBalanceAsync(int tenantId)
    {
        var balance = await EnsureMonthlyBalanceAsync(tenantId);
        return balance;
    }

    public async Task<bool> HasSufficientCreditsAsync(int tenantId, string tipoAccion)
    {
        var cost = GetCreditCost(tipoAccion);
        if (cost == 0) return false;

        var balance = await GetOrCreateBalanceAsync(tenantId);
        var disponibles = balance.CreditosAsignados + balance.CreditosExtras - balance.CreditosUsados;
        return disponibles >= cost;
    }

    public async Task DeductCreditsAsync(int tenantId, string tipoAccion)
    {
        var cost = GetCreditCost(tipoAccion);
        if (cost == 0) return;

        var now = DateTime.UtcNow;

        // Atomic update with WHERE clause to prevent over-deduction
        var updated = await _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE ai_credit_balances
            SET creditos_usados = creditos_usados + {cost},
                actualizado_en = {now}
            WHERE tenant_id = {tenantId}
              AND anio = {now.Year}
              AND mes = {now.Month}
              AND (creditos_asignados + creditos_extras - creditos_usados) >= {cost}
            """);

        if (updated == 0)
            throw new InvalidOperationException("Cr\u00e9ditos insuficientes para esta operaci\u00f3n.");
    }

    public async Task<AiCreditBalanceDto> EnsureMonthlyBalanceAsync(int tenantId)
    {
        var balance = await GetOrCreateBalanceAsync(tenantId);
        var disponibles = balance.CreditosAsignados + balance.CreditosExtras - balance.CreditosUsados;

        var tier = await GetTierForTenantAsync(tenantId);

        return new AiCreditBalanceDto(
            Asignados: balance.CreditosAsignados,
            Usados: balance.CreditosUsados,
            Extras: balance.CreditosExtras,
            Disponibles: Math.Max(0, disponibles),
            Plan: tier,
            Mes: balance.Mes,
            Anio: balance.Anio
        );
    }

    public async Task AddExtraCreditsAsync(int tenantId, int credits)
    {
        var balance = await GetOrCreateBalanceAsync(tenantId);
        balance.CreditosExtras += credits;
        balance.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task<AiCreditBalance> GetOrCreateBalanceAsync(int tenantId)
    {
        var now = DateTime.UtcNow;
        var balance = await _db.AiCreditBalances
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Anio == now.Year && b.Mes == now.Month);

        if (balance != null) return balance;

        var tier = await GetTierForTenantAsync(tenantId);
        var allocation = GetMonthlyAllocation(tier);

        // Calculate reset date (first day of next month)
        var nextMonth = new DateTime(now.Year, now.Month, 1).AddMonths(1);

        balance = new AiCreditBalance
        {
            TenantId = tenantId,
            Anio = now.Year,
            Mes = now.Month,
            CreditosAsignados = allocation,
            CreditosUsados = 0,
            CreditosExtras = 0,
            FechaReset = nextMonth,
            CreadoEn = now
        };

        _db.AiCreditBalances.Add(balance);
        await _db.SaveChangesAsync();
        return balance;
    }

    private async Task<string> GetTierForTenantAsync(int tenantId)
    {
        var planTipo = await _db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.Id == tenantId)
            .Select(t => t.PlanTipo)
            .FirstOrDefaultAsync();

        return NormalizeTier(planTipo);
    }

    private static string NormalizeTier(string? planTipo)
    {
        if (string.IsNullOrEmpty(planTipo)) return "free";

        return planTipo.ToLower() switch
        {
            "free" or "gratis" => "free",
            "basico" or "basic" => "basico",
            "profesional" or "professional" or "pro" => "profesional",
            "enterprise" or "empresa" => "enterprise",
            _ => "free"
        };
    }
}
