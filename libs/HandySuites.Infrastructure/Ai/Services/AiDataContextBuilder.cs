using System.Globalization;
using System.Text;
using HandySuites.Application.Ai.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HandySuites.Infrastructure.Ai.Services;

public class AiDataContextBuilder : IAiDataContextBuilder
{
    private readonly HandySuitesDbContext _db;
    private readonly IAiEmbeddingService _embeddingService;
    private readonly ILogger<AiDataContextBuilder> _logger;

    // Keyword → DataCategory mappings (Spanish business terms)
    private static readonly Dictionary<string, DataCategory> KeywordMap = new(StringComparer.OrdinalIgnoreCase)
    {
        // Ventas
        ["ventas"] = DataCategory.Ventas,
        ["venta"] = DataCategory.Ventas,
        ["pedidos"] = DataCategory.Ventas,
        ["pedido"] = DataCategory.Ventas,
        ["facturación"] = DataCategory.Ventas,
        ["facturacion"] = DataCategory.Ventas,
        ["ingresos"] = DataCategory.Ventas,
        ["revenue"] = DataCategory.Ventas,
        ["ticket"] = DataCategory.Ventas,
        ["rentables"] = DataCategory.Ventas | DataCategory.Clientes,
        ["rentabilidad"] = DataCategory.Ventas | DataCategory.Clientes,

        // Clientes
        ["clientes"] = DataCategory.Clientes,
        ["cliente"] = DataCategory.Clientes,
        ["cartera"] = DataCategory.Clientes | DataCategory.Cobros,
        ["prospectos"] = DataCategory.Clientes,
        ["prospecto"] = DataCategory.Clientes,
        ["zona"] = DataCategory.Clientes,
        ["zonas"] = DataCategory.Clientes,
        ["comprado"] = DataCategory.Clientes | DataCategory.Ventas,

        // Productos
        ["productos"] = DataCategory.Productos,
        ["producto"] = DataCategory.Productos,
        ["artículos"] = DataCategory.Productos,
        ["articulos"] = DataCategory.Productos,
        ["más vendido"] = DataCategory.Productos,
        ["mas vendido"] = DataCategory.Productos,
        ["margen"] = DataCategory.Productos,

        // Cobros
        ["cobros"] = DataCategory.Cobros,
        ["cobro"] = DataCategory.Cobros,
        ["pagos"] = DataCategory.Cobros,
        ["pago"] = DataCategory.Cobros,
        ["saldo"] = DataCategory.Cobros,
        ["saldos"] = DataCategory.Cobros,
        ["cobranza"] = DataCategory.Cobros,
        ["vencida"] = DataCategory.Cobros,
        ["deuda"] = DataCategory.Cobros,

        // Visitas
        ["visitas"] = DataCategory.Visitas,
        ["visita"] = DataCategory.Visitas,
        ["ruta"] = DataCategory.Visitas,
        ["rutas"] = DataCategory.Visitas,
        ["campo"] = DataCategory.Visitas,
        ["efectividad"] = DataCategory.Visitas,

        // Inventario
        ["inventario"] = DataCategory.Inventario,
        ["stock"] = DataCategory.Inventario,
        ["existencia"] = DataCategory.Inventario,
        ["existencias"] = DataCategory.Inventario,
        ["almacén"] = DataCategory.Inventario,
        ["almacen"] = DataCategory.Inventario,

        // Vendedores
        ["vendedor"] = DataCategory.Vendedores,
        ["vendedores"] = DataCategory.Vendedores,
        ["equipo"] = DataCategory.Vendedores,
        ["desempeño"] = DataCategory.Vendedores,
        ["desempeno"] = DataCategory.Vendedores,
        ["comisiones"] = DataCategory.Vendedores,
        ["comisión"] = DataCategory.Vendedores,

        // Metas
        ["meta"] = DataCategory.Metas,
        ["metas"] = DataCategory.Metas,
        ["objetivo"] = DataCategory.Metas,
        ["objetivos"] = DataCategory.Metas,
        ["cumplimiento"] = DataCategory.Metas,
    };

    // Token budget and history depth per action type
    private static readonly Dictionary<string, (int MaxTokens, int HistoryDays, int MaxCategories)> ActionBudgets = new()
    {
        ["resumen"]    = (800,  7,  2),
        ["insight"]    = (1500, 30, 4),
        ["pregunta"]   = (1200, 30, 3),
        ["pronostico"] = (2000, 90, 3),
    };

    public AiDataContextBuilder(HandySuitesDbContext db, IAiEmbeddingService embeddingService, ILogger<AiDataContextBuilder> logger)
    {
        _db = db;
        _embeddingService = embeddingService;
        _logger = logger;
    }

    public async Task<DataContextResult> BuildContextAsync(string prompt, string tipoAccion, int tenantId, int userId)
    {
        var (keywordCategories, defaultCategories) = DetectCategories(prompt, tipoAccion);
        var allCategories = keywordCategories | defaultCategories;
        if (allCategories == DataCategory.None)
        {
            // Default: at least ventas for any query
            allCategories = DataCategory.Ventas;
            defaultCategories = DataCategory.Ventas;
        }

        var budget = ActionBudgets.TryGetValue(tipoAccion.ToLower(), out var b) ? b : (MaxTokens: 1200, HistoryDays: 30, MaxCategories: 3);
        var since = DateTime.UtcNow.AddDays(-budget.HistoryDays);

        // Keyword-detected categories get priority over action-type defaults
        var activeCategories = GetActiveCategories(keywordCategories, defaultCategories, budget.MaxCategories);

        var sb = new StringBuilder();
        sb.AppendLine($"## Datos del negocio (últimos {budget.HistoryDays} días)");
        sb.AppendLine();

        var usedCategories = new List<string>();

        foreach (var cat in activeCategories)
        {
            try
            {
                switch (cat)
                {
                    case DataCategory.Ventas:
                        await AppendVentasContextAsync(sb, since, tenantId);
                        usedCategories.Add("Ventas");
                        break;
                    case DataCategory.Clientes:
                        await AppendClientesContextAsync(sb, since, tenantId);
                        usedCategories.Add("Clientes");
                        break;
                    case DataCategory.Productos:
                        await AppendProductosContextAsync(sb, since, tenantId);
                        usedCategories.Add("Productos");
                        break;
                    case DataCategory.Cobros:
                        await AppendCobrosContextAsync(sb, since, tenantId);
                        usedCategories.Add("Cobros");
                        break;
                    case DataCategory.Visitas:
                        await AppendVisitasContextAsync(sb, since, tenantId, userId);
                        usedCategories.Add("Visitas");
                        break;
                    case DataCategory.Inventario:
                        await AppendInventarioContextAsync(sb, tenantId);
                        usedCategories.Add("Inventario");
                        break;
                    case DataCategory.Vendedores:
                        await AppendVendedoresContextAsync(sb, since, tenantId);
                        usedCategories.Add("Vendedores");
                        break;
                    case DataCategory.Metas:
                        await AppendMetasContextAsync(sb, tenantId, userId);
                        usedCategories.Add("Metas");
                        break;
                }

                // Check token budget (rough: 1 token ≈ 4 chars for Spanish)
                if (sb.Length / 4 > budget.MaxTokens)
                    break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error building AI context for category {Category}", cat);
            }
        }

        // Semantic search: append relevant embeddings for non-trivial prompts
        await AppendSemanticContextAsync(sb, prompt, tenantId);

        var markdown = sb.ToString();
        var estimatedTokens = markdown.Length / 4;

        _logger.LogInformation("AI context built: {Categories}, ~{Tokens} tokens for tenant {TenantId}",
            string.Join(", ", usedCategories), estimatedTokens, tenantId);

        return new DataContextResult(markdown, usedCategories, estimatedTokens);
    }

    // ─── Intent Detection ───────────────────────────────────────────

    private static (DataCategory Keywords, DataCategory Defaults) DetectCategories(string prompt, string tipoAccion)
    {
        // Action-type defaults (lower priority)
        var defaults = tipoAccion.ToLower() switch
        {
            "resumen"    => DataCategory.Ventas | DataCategory.Visitas,
            "insight"    => DataCategory.Ventas | DataCategory.Clientes | DataCategory.Productos,
            "pronostico" => DataCategory.Ventas,
            _            => DataCategory.None,
        };

        // Scan prompt for keywords (higher priority — user explicitly asked)
        var keywords = DataCategory.None;
        var lower = prompt.ToLower();
        foreach (var (keyword, category) in KeywordMap)
        {
            if (lower.Contains(keyword))
                keywords |= category;
        }

        return (keywords, defaults);
    }

    private static List<DataCategory> GetActiveCategories(DataCategory keywordFlags, DataCategory defaultFlags, int maxCount)
    {
        var allFlags = new[]
        {
            DataCategory.Ventas, DataCategory.Clientes, DataCategory.Productos,
            DataCategory.Cobros, DataCategory.Visitas, DataCategory.Vendedores,
            DataCategory.Metas, DataCategory.Inventario,
        };

        var result = new List<DataCategory>();

        // 1. Keyword-detected categories FIRST (user explicitly asked for these)
        foreach (var cat in allFlags)
        {
            if (keywordFlags.HasFlag(cat))
            {
                result.Add(cat);
                if (result.Count >= maxCount)
                    return result;
            }
        }

        // 2. Fill remaining with action-type defaults
        foreach (var cat in allFlags)
        {
            if (defaultFlags.HasFlag(cat) && !result.Contains(cat))
            {
                result.Add(cat);
                if (result.Count >= maxCount)
                    return result;
            }
        }

        return result;
    }

    // ─── Query Methods ──────────────────────────────────────────────

    private async Task AppendVentasContextAsync(StringBuilder sb, DateTime since, int tenantId)
    {
        var pedidos = await _db.Pedidos
            .Where(p => p.TenantId == tenantId && p.FechaPedido >= since)
            .Select(p => new { p.Total, p.Estado, p.ClienteId, p.FechaPedido })
            .ToListAsync();

        if (pedidos.Count == 0)
        {
            sb.AppendLine("### Ventas");
            sb.AppendLine("Sin pedidos en este período.");
            sb.AppendLine();
            return;
        }

        var total = pedidos.Sum(p => p.Total);
        var count = pedidos.Count;
        var avgTicket = count > 0 ? total / count : 0;
        var cancelados = pedidos.Count(p => p.Estado == EstadoPedido.Cancelado);

        sb.AppendLine("### Ventas");
        sb.AppendLine("| Métrica | Valor |");
        sb.AppendLine("|---------|-------|");
        sb.AppendLine($"| Total ventas | {FormatMoney(total)} |");
        sb.AppendLine($"| Pedidos | {count} |");
        sb.AppendLine($"| Ticket promedio | {FormatMoney(avgTicket)} |");
        if (cancelados > 0)
            sb.AppendLine($"| Cancelados | {cancelados} ({(cancelados * 100.0 / count):F1}%) |");
        sb.AppendLine();

        // Weekly breakdown
        var weekly = pedidos
            .Where(p => p.Estado != EstadoPedido.Cancelado)
            .GroupBy(p => CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(p.FechaPedido, CalendarWeekRule.FirstDay, DayOfWeek.Monday))
            .OrderByDescending(g => g.Key)
            .Take(4)
            .Select(g => new { Week = g.Min(x => x.FechaPedido).ToString("MMM d"), Total = g.Sum(x => x.Total) })
            .ToList();

        if (weekly.Count > 1)
        {
            sb.AppendLine("**Ventas por semana:**");
            sb.AppendLine("| Semana | Total |");
            sb.AppendLine("|--------|-------|");
            foreach (var w in weekly)
                sb.AppendLine($"| {w.Week} | {FormatMoney(w.Total)} |");
            sb.AppendLine();
        }

        // Top 5 clients by sales
        var topClients = pedidos
            .Where(p => p.Estado != EstadoPedido.Cancelado)
            .GroupBy(p => p.ClienteId)
            .Select(g => new { ClienteId = g.Key, Total = g.Sum(x => x.Total), Count = g.Count() })
            .OrderByDescending(g => g.Total)
            .Take(5)
            .ToList();

        if (topClients.Count > 0)
        {
            var clientIds = topClients.Select(c => c.ClienteId).ToList();
            var clientNames = await _db.Clientes
                .Where(c => c.TenantId == tenantId && clientIds.Contains(c.Id))
                .Select(c => new { c.Id, c.Nombre })
                .ToDictionaryAsync(c => c.Id, c => c.Nombre);

            sb.AppendLine("**Top 5 clientes por ventas:**");
            sb.AppendLine("| Cliente | Total | Pedidos |");
            sb.AppendLine("|---------|-------|---------|");
            foreach (var c in topClients)
            {
                var name = clientNames.GetValueOrDefault(c.ClienteId, $"Cliente #{c.ClienteId}");
                sb.AppendLine($"| {name} | {FormatMoney(c.Total)} | {c.Count} |");
            }
            sb.AppendLine();
        }
    }

    private async Task AppendClientesContextAsync(StringBuilder sb, DateTime since, int tenantId)
    {
        var totalActivos = await _db.Clientes.CountAsync(c => c.TenantId == tenantId && c.Activo);
        var totalProspectos = await _db.Clientes.CountAsync(c => c.TenantId == tenantId && c.EsProspecto && c.Activo);

        sb.AppendLine("### Clientes");
        sb.AppendLine("| Métrica | Valor |");
        sb.AppendLine("|---------|-------|");
        sb.AppendLine($"| Clientes activos | {totalActivos} |");
        sb.AppendLine($"| Prospectos | {totalProspectos} |");

        // Clients with outstanding balance
        var topDeudores = await _db.Clientes
            .Where(c => c.TenantId == tenantId && c.Activo && c.Saldo > 0)
            .OrderByDescending(c => c.Saldo)
            .Take(5)
            .Select(c => new { c.Nombre, c.Saldo })
            .ToListAsync();

        var totalSaldo = topDeudores.Sum(c => c.Saldo);
        sb.AppendLine($"| Saldo total pendiente | {FormatMoney(totalSaldo)} |");
        sb.AppendLine();

        if (topDeudores.Count > 0)
        {
            sb.AppendLine("**Top 5 clientes con mayor saldo:**");
            sb.AppendLine("| Cliente | Saldo |");
            sb.AppendLine("|---------|-------|");
            foreach (var c in topDeudores)
                sb.AppendLine($"| {c.Nombre} | {FormatMoney(c.Saldo)} |");
            sb.AppendLine();
        }

        // Clients with no orders in period
        var clientesConPedido = await _db.Pedidos
            .Where(p => p.TenantId == tenantId && p.FechaPedido >= since)
            .Select(p => p.ClienteId)
            .Distinct()
            .ToListAsync();

        var sinCompras = totalActivos - clientesConPedido.Count;
        if (sinCompras > 0)
        {
            sb.AppendLine($"**{sinCompras} clientes activos** sin compras en los últimos {(DateTime.UtcNow - since).Days} días.");
            sb.AppendLine();
        }
    }

    private async Task AppendProductosContextAsync(StringBuilder sb, DateTime since, int tenantId)
    {
        var detalles = await _db.DetallePedidos
            .Include(d => d.Producto)
            .Include(d => d.Pedido)
            .Where(d => d.Pedido != null && d.Pedido.TenantId == tenantId && d.Pedido.FechaPedido >= since && d.Pedido.Estado != EstadoPedido.Cancelado)
            .Select(d => new { d.ProductoId, ProductoNombre = d.Producto!.Nombre, d.Cantidad, d.Total })
            .ToListAsync();

        if (detalles.Count == 0)
        {
            sb.AppendLine("### Productos");
            sb.AppendLine("Sin movimiento de productos en este período.");
            sb.AppendLine();
            return;
        }

        var porProducto = detalles
            .GroupBy(d => new { d.ProductoId, d.ProductoNombre })
            .Select(g => new
            {
                g.Key.ProductoNombre,
                TotalVendido = g.Sum(x => x.Cantidad),
                TotalRevenue = g.Sum(x => x.Total),
            })
            .OrderByDescending(x => x.TotalRevenue)
            .ToList();

        sb.AppendLine("### Productos");
        sb.AppendLine("**Top 10 por ingresos:**");
        sb.AppendLine("| Producto | Cantidad | Ingresos |");
        sb.AppendLine("|----------|----------|----------|");
        foreach (var p in porProducto.Take(10))
            sb.AppendLine($"| {Truncate(p.ProductoNombre, 30)} | {p.TotalVendido:F0} | {FormatMoney(p.TotalRevenue)} |");
        sb.AppendLine();

        // Bottom 5 (lowest revenue but > 0)
        var bottom = porProducto.TakeLast(Math.Min(5, porProducto.Count)).Reverse().ToList();
        if (bottom.Count > 0 && porProducto.Count > 10)
        {
            sb.AppendLine("**Productos con menores ventas:**");
            sb.AppendLine("| Producto | Cantidad | Ingresos |");
            sb.AppendLine("|----------|----------|----------|");
            foreach (var p in bottom)
                sb.AppendLine($"| {Truncate(p.ProductoNombre, 30)} | {p.TotalVendido:F0} | {FormatMoney(p.TotalRevenue)} |");
            sb.AppendLine();
        }
    }

    private async Task AppendCobrosContextAsync(StringBuilder sb, DateTime since, int tenantId)
    {
        var cobros = await _db.Cobros
            .Where(c => c.TenantId == tenantId && c.FechaCobro >= since)
            .Select(c => new { c.Monto, MetodoPago = c.MetodoPago.ToString(), c.FechaCobro })
            .ToListAsync();

        if (cobros.Count == 0)
        {
            sb.AppendLine("### Cobranza");
            sb.AppendLine("Sin cobros registrados en este período.");
            sb.AppendLine();
            return;
        }

        var totalCobrado = cobros.Sum(c => c.Monto);

        sb.AppendLine("### Cobranza");
        sb.AppendLine("| Métrica | Valor |");
        sb.AppendLine("|---------|-------|");
        sb.AppendLine($"| Total cobrado | {FormatMoney(totalCobrado)} |");
        sb.AppendLine($"| Cobros realizados | {cobros.Count} |");
        sb.AppendLine();

        // By payment method
        var porMetodo = cobros
            .GroupBy(c => c.MetodoPago)
            .OrderByDescending(g => g.Sum(x => x.Monto))
            .ToList();

        if (porMetodo.Count > 1)
        {
            sb.AppendLine("**Por método de pago:**");
            sb.AppendLine("| Método | Monto | Cobros |");
            sb.AppendLine("|--------|-------|--------|");
            foreach (var m in porMetodo)
                sb.AppendLine($"| {m.Key} | {FormatMoney(m.Sum(x => x.Monto))} | {m.Count()} |");
            sb.AppendLine();
        }
    }

    private async Task AppendVisitasContextAsync(StringBuilder sb, DateTime since, int tenantId, int userId)
    {
        var visitas = await _db.ClienteVisitas
            .Where(v => v.TenantId == tenantId && v.FechaHoraInicio != null && v.FechaHoraInicio >= since)
            .Select(v => new { v.Resultado, v.DuracionMinutos, v.UsuarioId })
            .ToListAsync();

        if (visitas.Count == 0)
        {
            sb.AppendLine("### Visitas");
            sb.AppendLine("Sin visitas registradas en este período.");
            sb.AppendLine();
            return;
        }

        var total = visitas.Count;
        var conVenta = visitas.Count(v => v.Resultado.ToString() == "Venta");
        var sinVenta = visitas.Count(v => v.Resultado.ToString() == "SinVenta");
        var noEncontrado = visitas.Count(v => v.Resultado.ToString() == "NoEncontrado");
        var efectividad = total > 0 ? (conVenta * 100.0 / total) : 0;
        var duracionPromedio = visitas.Where(v => v.DuracionMinutos > 0).Select(v => v.DuracionMinutos ?? 0).DefaultIfEmpty(0).Average();

        sb.AppendLine("### Visitas");
        sb.AppendLine("| Métrica | Valor |");
        sb.AppendLine("|---------|-------|");
        sb.AppendLine($"| Total visitas | {total} |");
        sb.AppendLine($"| Con venta | {conVenta} ({efectividad:F1}%) |");
        sb.AppendLine($"| Sin venta | {sinVenta} |");
        sb.AppendLine($"| No encontrado | {noEncontrado} |");
        sb.AppendLine($"| Duración promedio | {duracionPromedio:F0} min |");
        sb.AppendLine();
    }

    private async Task AppendInventarioContextAsync(StringBuilder sb, int tenantId)
    {
        // Products with inventory tracking
        var productos = await _db.Productos
            .Where(p => p.TenantId == tenantId && p.Activo && p.Inventario != null)
            .Select(p => new
            {
                p.Nombre,
                p.PrecioBase,
                CantidadActual = p.Inventario!.CantidadActual,
                StockMinimo = p.Inventario!.StockMinimo,
            })
            .ToListAsync();

        if (productos.Count == 0)
        {
            sb.AppendLine("### Inventario");
            sb.AppendLine("Sin datos de inventario disponibles.");
            sb.AppendLine();
            return;
        }

        var bajosStock = productos.Where(p => p.CantidadActual <= p.StockMinimo && p.StockMinimo > 0).ToList();
        var sinStock = productos.Where(p => p.CantidadActual <= 0).ToList();
        var valorTotal = productos.Sum(p => p.CantidadActual * p.PrecioBase);

        sb.AppendLine("### Inventario");
        sb.AppendLine("| Métrica | Valor |");
        sb.AppendLine("|---------|-------|");
        sb.AppendLine($"| Productos con inventario | {productos.Count} |");
        sb.AppendLine($"| Valor total estimado | {FormatMoney(valorTotal)} |");
        sb.AppendLine($"| Bajo stock mínimo | {bajosStock.Count} |");
        sb.AppendLine($"| Sin stock (0 unidades) | {sinStock.Count} |");
        sb.AppendLine();

        if (bajosStock.Count > 0)
        {
            sb.AppendLine("**Productos bajo stock mínimo (críticos):**");
            sb.AppendLine("| Producto | Actual | Mínimo |");
            sb.AppendLine("|----------|--------|--------|");
            foreach (var p in bajosStock.OrderBy(p => p.CantidadActual).Take(10))
                sb.AppendLine($"| {Truncate(p.Nombre, 30)} | {p.CantidadActual:F0} | {p.StockMinimo:F0} |");
            sb.AppendLine();
        }
    }

    private async Task AppendVendedoresContextAsync(StringBuilder sb, DateTime since, int tenantId)
    {
        var vendedores = await _db.Usuarios
            .Where(u => u.TenantId == tenantId && u.Activo && !u.EsSuperAdmin
                        && u.RolExplicito != "VIEWER"
                        && !u.Email.Contains("e2e"))
            .Select(u => new { u.Id, u.Nombre })
            .ToListAsync();

        if (vendedores.Count == 0)
        {
            sb.AppendLine("### Vendedores");
            sb.AppendLine("Sin vendedores activos.");
            sb.AppendLine();
            return;
        }

        var vendedorIds = vendedores.Select(v => v.Id).ToList();

        var ventasPorVendedor = await _db.Pedidos
            .Where(p => p.TenantId == tenantId && p.FechaPedido >= since && p.Estado != EstadoPedido.Cancelado && vendedorIds.Contains(p.UsuarioId))
            .GroupBy(p => p.UsuarioId)
            .Select(g => new { UsuarioId = g.Key, Total = g.Sum(x => x.Total), Count = g.Count() })
            .ToListAsync();

        var visitasPorVendedor = await _db.ClienteVisitas
            .Where(v => v.TenantId == tenantId && v.FechaHoraInicio != null && v.FechaHoraInicio >= since && vendedorIds.Contains(v.UsuarioId))
            .GroupBy(v => v.UsuarioId)
            .Select(g => new { UsuarioId = g.Key, Count = g.Count() })
            .ToListAsync();

        sb.AppendLine("### Vendedores");
        sb.AppendLine("| Vendedor | Ventas | Pedidos | Visitas |");
        sb.AppendLine("|----------|--------|---------|---------|");

        var ranking = vendedores
            .Select(v =>
            {
                var ventas = ventasPorVendedor.FirstOrDefault(x => x.UsuarioId == v.Id);
                var visitas = visitasPorVendedor.FirstOrDefault(x => x.UsuarioId == v.Id);
                return new { v.Nombre, Total = ventas?.Total ?? 0, Pedidos = ventas?.Count ?? 0, Visitas = visitas?.Count ?? 0 };
            })
            .OrderByDescending(v => v.Total)
            .Take(10)
            .ToList();

        foreach (var v in ranking)
            sb.AppendLine($"| {Truncate(v.Nombre, 25)} | {FormatMoney(v.Total)} | {v.Pedidos} | {v.Visitas} |");
        sb.AppendLine();
    }

    private async Task AppendMetasContextAsync(StringBuilder sb, int tenantId, int userId)
    {
        var now = DateTime.UtcNow;
        var metas = await _db.MetasVendedor
            .Where(m => m.TenantId == tenantId && m.FechaInicio <= now && m.FechaFin >= now)
            .Select(m => new { m.UsuarioId, m.Tipo, m.Monto, m.FechaInicio, m.FechaFin })
            .ToListAsync();

        if (metas.Count == 0)
        {
            sb.AppendLine("### Metas");
            sb.AppendLine("Sin metas activas configuradas.");
            sb.AppendLine();
            return;
        }

        // Get actual values for each meta
        sb.AppendLine("### Metas (período activo)");
        sb.AppendLine("| Vendedor | Tipo | Meta | Actual | Cumplimiento |");
        sb.AppendLine("|----------|------|------|--------|-------------|");

        var vendedorIds = metas.Select(m => m.UsuarioId).Distinct().ToList();
        var vendedorNames = await _db.Usuarios
            .Where(u => u.TenantId == tenantId && vendedorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Nombre })
            .ToDictionaryAsync(u => u.Id, u => u.Nombre);

        foreach (var meta in metas)
        {
            decimal actual = 0;
            switch (meta.Tipo.ToLower())
            {
                case "ventas":
                    actual = await _db.Pedidos
                        .Where(p => p.TenantId == tenantId && p.UsuarioId == meta.UsuarioId && p.FechaPedido >= meta.FechaInicio && p.FechaPedido <= meta.FechaFin && p.Estado != EstadoPedido.Cancelado)
                        .SumAsync(p => p.Total);
                    break;
                case "pedidos":
                    actual = await _db.Pedidos
                        .Where(p => p.TenantId == tenantId && p.UsuarioId == meta.UsuarioId && p.FechaPedido >= meta.FechaInicio && p.FechaPedido <= meta.FechaFin && p.Estado != EstadoPedido.Cancelado)
                        .CountAsync();
                    break;
                case "visitas":
                    actual = await _db.ClienteVisitas
                        .Where(v => v.TenantId == tenantId && v.UsuarioId == meta.UsuarioId && v.FechaHoraInicio >= meta.FechaInicio && v.FechaHoraInicio <= meta.FechaFin)
                        .CountAsync();
                    break;
            }

            var pct = meta.Monto > 0 ? (actual / meta.Monto * 100) : 0;
            var nombre = vendedorNames.GetValueOrDefault(meta.UsuarioId, $"Vendedor #{meta.UsuarioId}");
            var actualStr = meta.Tipo.ToLower() == "ventas" ? FormatMoney(actual) : $"{actual:F0}";
            var metaStr = meta.Tipo.ToLower() == "ventas" ? FormatMoney(meta.Monto) : $"{meta.Monto:F0}";

            sb.AppendLine($"| {Truncate(nombre, 20)} | {meta.Tipo} | {metaStr} | {actualStr} | {pct:F1}% |");
        }
        sb.AppendLine();
    }

    // ─── Semantic Search ───────────────────────────────────────────

    private async Task AppendSemanticContextAsync(StringBuilder sb, string prompt, int tenantId)
    {
        // Skip trivial prompts (greetings, single words)
        if (prompt.Length <= 10)
            return;

        try
        {
            var results = await _embeddingService.SearchAsync(tenantId, prompt, topK: 3, minScore: 0.72);
            if (results.Count == 0)
                return;

            sb.AppendLine("### Contexto relevante (búsqueda semántica)");
            foreach (var r in results)
            {
                var relevancia = (int)(r.Score * 100);
                var texto = Truncate(r.ContentText, 200);
                sb.AppendLine($"- **{r.SourceType}** (relevancia {relevancia}%): {texto}");
            }
            sb.AppendLine();
        }
        catch (Exception ex)
        {
            // Semantic search failure should never break keyword context
            _logger.LogWarning(ex, "Semantic search failed for tenant {TenantId}, continuing with keyword context", tenantId);
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────

    private static string FormatMoney(decimal amount) =>
        $"${amount:N2} MXN";

    private static string Truncate(string text, int maxLength) =>
        text.Length <= maxLength ? text : text[..(maxLength - 1)] + "…";
}
