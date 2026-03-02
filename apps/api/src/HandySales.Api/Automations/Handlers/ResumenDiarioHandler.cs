using HandySales.Application.Notifications.DTOs;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

public class ResumenDiarioHandler : IAutomationHandler
{
    public string Slug => "resumen-diario";

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var db = context.Db;
        var today = DateTime.UtcNow.Date;

        var ventasHoy = await db.Pedidos
            .Where(p => p.TenantId == context.TenantId && p.Activo && p.FechaPedido.Date == today)
            .GroupBy(_ => 1)
            .Select(g => new { Total = g.Sum(p => p.Total), Count = g.Count() })
            .FirstOrDefaultAsync(ct);

        var cobrosHoy = await db.Cobros
            .Where(c => c.TenantId == context.TenantId && c.Activo && c.FechaCobro.Date == today)
            .GroupBy(_ => 1)
            .Select(g => new { Total = g.Sum(c => c.Monto), Count = g.Count() })
            .FirstOrDefaultAsync(ct);

        var visitasHoy = await db.ClienteVisitas
            .Where(v => v.TenantId == context.TenantId && v.FechaHoraInicio != null && v.FechaHoraInicio.Value.Date == today)
            .CountAsync(ct);

        var adminId = await context.GetAdminUserIdAsync(ct);
        if (adminId == null)
            return new AutomationResult(false, "", "No se encontró un admin para el tenant");

        var message = $"Resumen del día:\n" +
            $"- Ventas: {ventasHoy?.Count ?? 0} pedidos por ${ventasHoy?.Total ?? 0:N2}\n" +
            $"- Cobros: {cobrosHoy?.Count ?? 0} cobros por ${cobrosHoy?.Total ?? 0:N2}\n" +
            $"- Visitas: {visitasHoy} realizadas";

        await context.Notifications.EnviarNotificacionAsync(new SendNotificationDto
        {
            UsuarioId = adminId.Value,
            Titulo = "Resumen del día",
            Mensaje = message,
            Tipo = "General",
        });

        return new AutomationResult(true, $"Resumen enviado: {ventasHoy?.Count ?? 0} ventas, {cobrosHoy?.Count ?? 0} cobros, {visitasHoy} visitas");
    }
}
