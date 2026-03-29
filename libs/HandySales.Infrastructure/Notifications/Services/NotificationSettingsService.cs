using System.Text.Json;
using HandySales.Application.Notifications.DTOs;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Notifications.Services;

public class NotificationSettingsService
{
    private readonly HandySalesDbContext _db;

    public NotificationSettingsService(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<NotificationSettingsDto> GetAsync(int tenantId)
    {
        var setting = await _db.CompanySettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId);

        if (setting?.NotificationConfig == null)
            return new NotificationSettingsDto(); // All enabled by default

        try
        {
            return JsonSerializer.Deserialize<NotificationSettingsDto>(setting.NotificationConfig,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? new NotificationSettingsDto();
        }
        catch
        {
            return new NotificationSettingsDto();
        }
    }

    public async Task SaveAsync(int tenantId, NotificationSettingsDto dto)
    {
        var setting = await _db.CompanySettings
            .FirstOrDefaultAsync(s => s.TenantId == tenantId);

        if (setting == null) return;

        setting.NotificationConfig = JsonSerializer.Serialize(dto,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        setting.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Check if a specific notification type is enabled for a tenant.
    /// Returns true if no config exists (default: all enabled).
    /// </summary>
    public async Task<bool> IsEnabledAsync(int tenantId, string notificationType)
    {
        var config = await GetAsync(tenantId);

        if (!config.PushEnabled) return false;

        return notificationType switch
        {
            "order.confirmed" => config.OrderConfirmed,
            "order.en_route" => config.OrderEnRoute,
            "order.delivered" => config.OrderDelivered,
            "order.cancelled" => config.OrderCancelled,
            "stock.low" => config.StockLow,
            "inventario-critico" => config.InventarioCritico,
            "cobro-exitoso-aviso" => config.CobroExitoso,
            "cobro-vencido-recordatorio" => config.CobroVencido,
            "meta-no-cumplida" => config.MetaNoCumplida,
            "cliente-inactivo-visita" => config.ClienteInactivo,
            "bienvenida-cliente" => config.BienvenidaCliente,
            "stock-bajo-alerta" => config.StockBajoAlerta,
            "resumen-diario" => config.ResumenDiario,
            _ => true, // Unknown types are enabled by default
        };
    }
}
