namespace HandySuites.Application.Notifications.DTOs;

/// <summary>
/// Tenant-level notification settings. Controls which push/email notifications are enabled.
/// </summary>
public class NotificationSettingsDto
{
    // Global toggle
    public bool PushEnabled { get; set; } = true;
    public bool EmailEnabled { get; set; } = true;

    // Transactional — Order events
    public bool OrderConfirmed { get; set; } = true;
    public bool OrderEnRoute { get; set; } = true;
    public bool OrderDelivered { get; set; } = true;
    public bool OrderCancelled { get; set; } = true;

    // Transactional — Inventory
    public bool StockLow { get; set; } = true;
    public bool InventarioCritico { get; set; } = true;

    // Automation — Cobranza
    public bool CobroExitoso { get; set; } = true;
    public bool CobroVencido { get; set; } = true;

    // Transactional — Routes
    public bool RouteAssigned { get; set; } = true;

    // Automation — Operations
    public bool MetaNoCumplida { get; set; } = true;
    public bool ClienteInactivo { get; set; } = true;
    public bool BienvenidaCliente { get; set; } = true;
    public bool StockBajoAlerta { get; set; } = true;
    public bool ResumenDiario { get; set; } = true;

    // Quiet hours
    public string? QuietHoursStart { get; set; }
    public string? QuietHoursEnd { get; set; }
}
