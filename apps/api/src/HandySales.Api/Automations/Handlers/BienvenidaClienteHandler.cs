using HandySales.Application.Notifications.DTOs;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

public class BienvenidaClienteHandler : IAutomationHandler
{
    public string Slug => "bienvenida-cliente";

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var diasSeguimiento = context.GetParam("dias_seguimiento", 3);

        // Find recently created clients (within last check interval)
        var since = DateTime.UtcNow.AddMinutes(-2); // Check window — engine polls every 60s
        var newClients = await context.Db.Clientes
            .Where(c => c.TenantId == context.TenantId && c.CreadoEn >= since && c.Activo)
            .Select(c => new { c.Id, c.Nombre, c.VendedorId })
            .ToListAsync(ct);

        if (newClients.Count == 0)
            return new AutomationResult(true, "Sin clientes nuevos");

        var notified = 0;
        foreach (var client in newClients)
        {
            var targetUserId = client.VendedorId
                ?? await context.GetAdminUserIdAsync(ct);

            if (targetUserId == null) continue;

            await context.Notifications.EnviarNotificacionAsync(new SendNotificationDto
            {
                UsuarioId = targetUserId.Value,
                Titulo = "Nuevo cliente registrado",
                Mensaje = $"Se registró el cliente {client.Nombre}. Agenda una visita de seguimiento en los próximos {diasSeguimiento} días.",
                Tipo = "General",
                Data = new Dictionary<string, string> { { "clienteId", client.Id.ToString() } },
            });
            notified++;
        }

        return new AutomationResult(true, $"Bienvenida enviada para {notified} clientes nuevos");
    }
}
