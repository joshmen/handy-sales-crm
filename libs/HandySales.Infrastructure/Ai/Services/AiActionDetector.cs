using HandySales.Application.Ai.DTOs;
using HandySales.Application.Ai.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace HandySales.Infrastructure.Ai.Services;

public class AiActionDetector : IAiActionDetector
{
    private readonly HandySalesDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AiActionDetector> _logger;

    private const int MaxActions = 2;
    private const int ActionCreditCost = 2;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);

    public AiActionDetector(
        HandySalesDbContext db,
        IMemoryCache cache,
        ILogger<AiActionDetector> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    public async Task<List<AiSuggestedAction>> DetectActionsAsync(
        string prompt, List<string> categoriesUsed, int tenantId, int userId)
    {
        var actions = new List<AiSuggestedAction>();
        var lower = prompt.ToLower();

        try
        {
            // Run detection rules based on categories queried
            if (categoriesUsed.Contains("Visitas") || categoriesUsed.Contains("Vendedores"))
                await TryDetectVisitasAction(actions, lower, userId);

            if (categoriesUsed.Contains("Cobros") || categoriesUsed.Contains("Clientes"))
                await TryDetectCobrosAction(actions, lower);

            if (categoriesUsed.Contains("Metas") || categoriesUsed.Contains("Vendedores"))
                await TryDetectMetasAction(actions, lower, userId);

            if (categoriesUsed.Contains("Visitas") && ContainsAny(lower, "ruta", "rutas", "recorrido"))
                await TryDetectRutaAction(actions, lower, userId);

            if (categoriesUsed.Contains("Inventario") || categoriesUsed.Contains("Productos"))
                await TryDetectStockAction(actions, lower);

            // Cache action IDs for validation on execute
            foreach (var action in actions)
            {
                var cacheKey = $"ai_action_{tenantId}_{action.ActionId}";
                _cache.Set(cacheKey, (action.ActionType, action.Parameters), CacheTtl);
            }

            _logger.LogInformation("AI actions detected: {Count} for categories [{Categories}]",
                actions.Count, string.Join(", ", categoriesUsed));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error detecting AI actions — returning response without actions");
        }

        return actions.Take(MaxActions).ToList();
    }

    public (string ActionType, object Parameters)? ValidateActionId(string actionId, int tenantId)
    {
        var cacheKey = $"ai_action_{tenantId}_{actionId}";
        if (_cache.TryGetValue<(string ActionType, object Parameters)>(cacheKey, out var cached))
        {
            _cache.Remove(cacheKey); // One-time use
            return cached;
        }
        return null;
    }

    // ─── Detection Rules ─────────────────────────────────────────────

    private async Task TryDetectVisitasAction(List<AiSuggestedAction> actions, string prompt, int userId)
    {
        if (actions.Count >= MaxActions) return;

        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);

        // Find active clients without visits in 7+ days
        var clientesSinVisita = await _db.Clientes
            .Where(c => c.Activo && !c.EsProspecto)
            .Where(c => !_db.ClienteVisitas
                .Any(v => v.ClienteId == c.Id && v.FechaHoraInicio >= sevenDaysAgo))
            .OrderBy(c => c.Nombre)
            .Take(5)
            .Select(c => new { c.Id, c.Nombre })
            .ToListAsync();

        if (clientesSinVisita.Count == 0) return;

        var visitDtos = clientesSinVisita.Select((c, i) => new
        {
            ClienteId = c.Id,
            FechaProgramada = DateTime.UtcNow.Date.AddDays(i < 3 ? 1 : 2).AddHours(9 + i),
            TipoVisita = 0, // Rutina
            Notas = "Visita programada por asistente IA"
        }).ToList();

        var clientNames = string.Join(", ", clientesSinVisita.Take(3).Select(c => c.Nombre));
        var extra = clientesSinVisita.Count > 3 ? $" y {clientesSinVisita.Count - 3} más" : "";

        actions.Add(new AiSuggestedAction(
            ActionId: Guid.NewGuid().ToString("N"),
            ActionType: "programar_visitas",
            Label: $"Programar {clientesSinVisita.Count} visitas",
            Description: $"Para: {clientNames}{extra} (sin visita en 7+ días)",
            Icon: "calendar",
            CreditCost: ActionCreditCost,
            Parameters: visitDtos
        ));
    }

    private async Task TryDetectCobrosAction(List<AiSuggestedAction> actions, string prompt)
    {
        if (actions.Count >= MaxActions) return;

        // Find clients with pending balance
        var clientesConSaldo = await _db.Clientes
            .Where(c => c.Activo && c.Saldo > 0)
            .OrderByDescending(c => c.Saldo)
            .Take(3)
            .Select(c => new { c.Id, c.Nombre, c.Saldo })
            .ToListAsync();

        if (clientesConSaldo.Count == 0) return;

        var totalPendiente = clientesConSaldo.Sum(c => c.Saldo);
        var clientNames = string.Join(", ", clientesConSaldo.Select(c => c.Nombre));

        // Pre-build cobro DTOs for each client
        var cobroDtos = clientesConSaldo.Select(c => new
        {
            ClienteId = c.Id,
            Monto = c.Saldo,
            MetodoPago = 0, // Efectivo
            FechaCobro = DateTime.UtcNow,
            Notas = "Cobro registrado por asistente IA"
        }).ToList();

        actions.Add(new AiSuggestedAction(
            ActionId: Guid.NewGuid().ToString("N"),
            ActionType: "registrar_cobros",
            Label: $"Registrar {clientesConSaldo.Count} cobros pendientes",
            Description: $"Total: ${totalPendiente:N2} MXN — {clientNames}",
            Icon: "money",
            CreditCost: ActionCreditCost,
            Parameters: cobroDtos
        ));
    }

    private async Task TryDetectMetasAction(List<AiSuggestedAction> actions, string prompt, int userId)
    {
        if (actions.Count >= MaxActions) return;

        // Check if user has active goals
        var now = DateTime.UtcNow;
        var hasActiveMeta = await _db.MetasVendedor
            .AnyAsync(m => m.UsuarioId == userId && m.Activo && m.FechaFin >= now);

        if (hasActiveMeta) return;

        // Calculate average sales from last 30 days as suggested goal
        var thirtyDaysAgo = now.AddDays(-30);
        var ventasUltimos30d = await _db.Pedidos
            .Where(p => p.UsuarioId == userId
                && p.FechaPedido >= thirtyDaysAgo
                && p.Estado != EstadoPedido.Cancelado)
            .SumAsync(p => (decimal?)p.Total) ?? 0;

        // Suggest 10% increase as monthly goal
        var metaSugerida = Math.Ceiling(ventasUltimos30d * 1.1m / 100) * 100; // Round up to nearest 100
        if (metaSugerida < 1000) metaSugerida = 5000; // Minimum meaningful goal

        var startOfNextMonth = new DateTime(now.Year, now.Month, 1).AddMonths(1);
        var endOfNextMonth = startOfNextMonth.AddMonths(1).AddDays(-1);

        var metaDto = new
        {
            UsuarioId = userId,
            Tipo = "ventas",
            Periodo = "mensual",
            Monto = metaSugerida,
            FechaInicio = startOfNextMonth,
            FechaFin = endOfNextMonth,
            AutoRenovar = true
        };

        actions.Add(new AiSuggestedAction(
            ActionId: Guid.NewGuid().ToString("N"),
            ActionType: "crear_meta",
            Label: $"Crear meta mensual de ${metaSugerida:N0} MXN",
            Description: $"Meta de ventas para {startOfNextMonth:MMMM yyyy} (+10% sobre actual)",
            Icon: "target",
            CreditCost: ActionCreditCost,
            Parameters: metaDto
        ));
    }

    private async Task TryDetectRutaAction(List<AiSuggestedAction> actions, string prompt, int userId)
    {
        if (actions.Count >= MaxActions) return;

        // Check if user has a route for today/tomorrow
        var today = DateTime.UtcNow.Date;
        var hasRouteToday = await _db.RutasVendedor
            .AnyAsync(r => r.UsuarioId == userId && r.Fecha >= today && r.Fecha < today.AddDays(2));

        if (hasRouteToday) return;

        // Get clients without recent visits for route
        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
        var clientesParaRuta = await _db.Clientes
            .Where(c => c.Activo && !c.EsProspecto)
            .Where(c => !_db.ClienteVisitas
                .Any(v => v.ClienteId == c.Id && v.FechaHoraInicio >= sevenDaysAgo))
            .OrderBy(c => c.Nombre)
            .Take(5)
            .Select(c => new { c.Id, c.Nombre })
            .ToListAsync();

        if (clientesParaRuta.Count < 2) return;

        var tomorrow = today.AddDays(1);
        var rutaDto = new
        {
            UsuarioId = userId,
            Nombre = $"Ruta IA — {tomorrow:dd MMM yyyy}",
            Descripcion = "Ruta sugerida por asistente IA",
            Fecha = tomorrow,
            HoraInicioEstimada = new TimeSpan(9, 0, 0),
            HoraFinEstimada = new TimeSpan(17, 0, 0),
            Detalles = clientesParaRuta.Select((c, i) => new
            {
                ClienteId = c.Id,
                OrdenVisita = i + 1,
                DuracionEstimadaMinutos = 30,
                Notas = (string?)null
            }).ToList()
        };

        var clientNames = string.Join(", ", clientesParaRuta.Take(3).Select(c => c.Nombre));

        actions.Add(new AiSuggestedAction(
            ActionId: Guid.NewGuid().ToString("N"),
            ActionType: "crear_ruta",
            Label: $"Crear ruta con {clientesParaRuta.Count} paradas",
            Description: $"Para mañana: {clientNames}...",
            Icon: "route",
            CreditCost: ActionCreditCost,
            Parameters: rutaDto
        ));
    }

    private async Task TryDetectStockAction(List<AiSuggestedAction> actions, string prompt)
    {
        if (actions.Count >= MaxActions) return;

        // Find products with zero stock (stock is on Inventario entity)
        var productosSinStock = await _db.Productos
            .Where(p => p.Activo && p.Inventario != null && p.Inventario.CantidadActual <= 0)
            .OrderBy(p => p.Nombre)
            .Take(5)
            .Select(p => new { p.Id, p.Nombre })
            .ToListAsync();

        if (productosSinStock.Count == 0) return;

        var ids = productosSinStock.Select(p => p.Id).ToList();
        var productNames = string.Join(", ", productosSinStock.Take(3).Select(p => p.Nombre));
        var extra = productosSinStock.Count > 3 ? $" y {productosSinStock.Count - 3} más" : "";

        actions.Add(new AiSuggestedAction(
            ActionId: Guid.NewGuid().ToString("N"),
            ActionType: "desactivar_productos",
            Label: $"Desactivar {productosSinStock.Count} productos sin stock",
            Description: $"{productNames}{extra}",
            Icon: "package",
            CreditCost: ActionCreditCost,
            Parameters: new { Ids = ids, Activo = false }
        ));
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    private static bool ContainsAny(string text, params string[] keywords) =>
        keywords.Any(k => text.Contains(k));
}
