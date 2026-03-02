using HandySales.Application.Notifications.DTOs;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

public class StockBajoAlertaHandler : IAutomationHandler
{
    public string Slug => "stock-bajo-alerta";

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var umbralPorcentaje = context.GetParam("umbral_porcentaje", 20);

        var productosBajos = await context.Db.Inventarios
            .Include(i => i.Producto)
            .Where(i => i.TenantId == context.TenantId
                     && i.Producto.Activo
                     && i.StockMinimo > 0
                     && i.CantidadActual <= i.StockMinimo * umbralPorcentaje / 100m)
            .Select(i => new { i.Producto.Nombre, Cantidad = i.CantidadActual, i.StockMinimo })
            .Take(10)
            .ToListAsync(ct);

        if (productosBajos.Count == 0)
            return new AutomationResult(true, "Sin productos con stock bajo");

        var adminId = await context.GetAdminUserIdAsync(ct);
        if (adminId == null)
            return new AutomationResult(false, "", "No se encontró un admin para el tenant");

        var productList = string.Join(", ", productosBajos.Select(p => $"{p.Nombre} ({p.Cantidad}/{p.StockMinimo})"));
        var message = productosBajos.Count == 1
            ? $"El producto {productosBajos[0].Nombre} tiene stock bajo ({productosBajos[0].Cantidad} de {productosBajos[0].StockMinimo})"
            : $"{productosBajos.Count} productos con stock bajo: {productList}";

        await context.Notifications.EnviarNotificacionAsync(new SendNotificationDto
        {
            UsuarioId = adminId.Value,
            Titulo = "Alerta de stock bajo",
            Mensaje = message,
            Tipo = "Alert",
        });

        return new AutomationResult(true, $"Alerta enviada: {productosBajos.Count} productos con stock bajo");
    }
}
