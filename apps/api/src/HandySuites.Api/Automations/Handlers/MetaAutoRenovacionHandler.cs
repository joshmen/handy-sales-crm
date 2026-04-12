using HandySuites.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class MetaAutoRenovacionHandler : IAutomationHandler
{
    public string Slug => "meta-auto-renovacion";

    private static string M(string key, string lang) => AutomationMessages.Get(key, lang);

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var lang = culture.TwoLetterISOLanguageName; // "es" or "en"
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var tz = TimeZoneInfo.FindSystemTimeZoneById(tenantTz ?? "America/Mexico_City");
        var today = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz).Date;

        var expiradas = await context.Db.Set<MetaVendedor>()
            .Where(m => m.TenantId == context.TenantId
                     && m.Activo
                     && m.AutoRenovar
                     && m.FechaFin <= today)
            .ToListAsync(ct);

        if (expiradas.Count == 0)
            return new AutomationResult(true, "Sin metas para auto-renovar");

        var renovadas = 0;

        foreach (var meta in expiradas)
        {
            var nuevaInicio = meta.FechaFin.AddDays(1);
            var nuevaFin = meta.Periodo == "semanal"
                ? nuevaInicio.AddDays(7)
                : nuevaInicio.AddMonths(1);

            var nueva = new MetaVendedor
            {
                TenantId = meta.TenantId,
                UsuarioId = meta.UsuarioId,
                Tipo = meta.Tipo,
                Periodo = meta.Periodo,
                Monto = meta.Monto,
                FechaInicio = nuevaInicio,
                FechaFin = nuevaFin,
                AutoRenovar = true,
                Activo = true,
                CreadoEn = DateTime.UtcNow,
                CreadoPor = "sistema-auto-renovacion",
            };
            context.Db.Set<MetaVendedor>().Add(nueva);

            meta.Activo = false;
            meta.ActualizadoEn = DateTime.UtcNow;
            meta.ActualizadoPor = "sistema-auto-renovacion";

            renovadas++;
        }

        await context.Db.SaveChangesAsync(ct);

        var adminId = await context.GetAdminUserIdAsync(ct);
        if (adminId.HasValue)
        {
            await context.NotifyUserAsync(adminId.Value,
                lang == "en" ? "Goals auto-renewed" : "Metas auto-renovadas",
                lang == "en"
                    ? $"{renovadas} goal{(renovadas != 1 ? "s" : "")} renewed automatically."
                    : $"Se renovaron {renovadas} meta{(renovadas != 1 ? "s" : "")} automáticamente.",
                "Info", "push", ct);
        }

        return new AutomationResult(true,
            $"{renovadas} meta{(renovadas != 1 ? "s" : "")} renovada{(renovadas != 1 ? "s" : "")}");
    }
}
