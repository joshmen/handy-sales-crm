using System.Text.Json;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

/// <summary>
/// Custom analytics endpoints — dynamic queries on materialized views.
/// Users can select data sources, dimensions, and metrics to build custom reports.
/// All queries are filtered by tenant_id for multi-tenant isolation.
/// SQL injection is prevented by whitelisting column names per source.
/// </summary>
public static class AnalyticsEndpoints
{
    // ─── Data Source Definitions ────────────────────────────────
    private static readonly List<AnalyticsSource> Sources = new()
    {
        new("ventas_diarias", "Daily Sales", "mv_ventas_diarias", new[]
        {
            new ColumnDef("fecha", "date", "Date"),
            new ColumnDef("vendedor_nombre", "string", "Vendor"),
            new ColumnDef("zona_nombre", "string", "Zone"),
            new ColumnDef("cantidad_pedidos", "number", "Orders"),
            new ColumnDef("total_ventas", "number", "Total Sales"),
            new ColumnDef("subtotal", "number", "Subtotal"),
            new ColumnDef("total_descuentos", "number", "Discounts"),
            new ColumnDef("total_impuestos", "number", "Taxes"),
            new ColumnDef("clientes_unicos", "number", "Unique Clients"),
        }),
        new("ventas_vendedor", "Sales by Vendor", "mv_ventas_vendedor", new[]
        {
            new ColumnDef("vendedor_nombre", "string", "Vendor"),
            new ColumnDef("cantidad_pedidos", "number", "Orders"),
            new ColumnDef("total_ventas", "number", "Total Sales"),
            new ColumnDef("ticket_promedio", "number", "Avg Ticket"),
            new ColumnDef("clientes_unicos", "number", "Unique Clients"),
            new ColumnDef("total_visitas", "number", "Visits"),
            new ColumnDef("visitas_con_venta", "number", "Visits with Sale"),
            new ColumnDef("efectividad_visitas", "number", "Effectiveness %"),
        }),
        new("ventas_producto", "Sales by Product", "mv_ventas_producto", new[]
        {
            new ColumnDef("producto_nombre", "string", "Product"),
            new ColumnDef("familia_nombre", "string", "Family"),
            new ColumnDef("categoria_nombre", "string", "Category"),
            new ColumnDef("cantidad_vendida", "number", "Units Sold"),
            new ColumnDef("total_ventas", "number", "Total Sales"),
            new ColumnDef("en_pedidos", "number", "In Orders"),
            new ColumnDef("precio_promedio", "number", "Avg Price"),
        }),
        new("ventas_zona", "Sales by Zone", "mv_ventas_zona", new[]
        {
            new ColumnDef("zona_nombre", "string", "Zone"),
            new ColumnDef("cantidad_pedidos", "number", "Orders"),
            new ColumnDef("total_ventas", "number", "Total Sales"),
            new ColumnDef("total_clientes", "number", "Clients"),
        }),
        new("actividad_clientes", "Client Activity", "mv_actividad_clientes", new[]
        {
            new ColumnDef("cliente_nombre", "string", "Client"),
            new ColumnDef("zona_nombre", "string", "Zone"),
            new ColumnDef("vendedor_nombre", "string", "Vendor"),
            new ColumnDef("cantidad_pedidos", "number", "Orders"),
            new ColumnDef("total_ventas", "number", "Total Sales"),
            new ColumnDef("total_visitas", "number", "Visits"),
            new ColumnDef("saldo", "number", "Balance"),
        }),
        new("inventario", "Inventory Status", "mv_inventario_resumen", new[]
        {
            new ColumnDef("producto_nombre", "string", "Product"),
            new ColumnDef("categoria_nombre", "string", "Category"),
            new ColumnDef("cantidad_actual", "number", "Current Stock"),
            new ColumnDef("stock_minimo", "number", "Min Stock"),
            new ColumnDef("stock_maximo", "number", "Max Stock"),
            new ColumnDef("valor_inventario", "number", "Inventory Value"),
            new ColumnDef("estado_stock", "string", "Stock Status"),
        }),
        new("cartera", "Accounts Receivable", "mv_cartera_vencida", new[]
        {
            new ColumnDef("cliente_nombre", "string", "Client"),
            new ColumnDef("zona_nombre", "string", "Zone"),
            new ColumnDef("saldo_pendiente", "number", "Pending Balance"),
            new ColumnDef("dias_sin_cobro", "number", "Days Unpaid"),
            new ColumnDef("bucket", "string", "Aging Bucket"),
        }),
        new("kpis", "Dashboard KPIs", "mv_kpis_dashboard", new[]
        {
            new ColumnDef("total_pedidos", "number", "Total Orders"),
            new ColumnDef("total_ventas", "number", "Total Sales"),
            new ColumnDef("ticket_promedio", "number", "Avg Ticket"),
            new ColumnDef("ventas_7d", "number", "Sales 7d"),
            new ColumnDef("ventas_30d", "number", "Sales 30d"),
            new ColumnDef("ventas_90d", "number", "Sales 90d"),
            new ColumnDef("pedidos_7d", "number", "Orders 7d"),
            new ColumnDef("pedidos_30d", "number", "Orders 30d"),
        }),
    };

    private static readonly string[] AllowedAggregates = { "SUM", "AVG", "COUNT", "MAX", "MIN" };

    // ─── Endpoint Registration ─────────────────────────────────

    public static void MapAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/analytics").RequireAuthorization();

        group.MapGet("/sources", HandleGetSources)
            .WithDescription("List available data sources with column metadata");

        group.MapPost("/query", HandleQuery)
            .WithDescription("Run a dynamic query on a materialized view");
    }

    // ─── GET /sources ──────────────────────────────────────────

    private static IResult HandleGetSources(HttpContext ctx)
    {
        var role = ctx.User.FindFirst("role")?.Value
                   ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

        if (role != "ADMIN" && role != "SUPER_ADMIN" && role != "SUPERVISOR")
            return Results.Forbid();

        return Results.Ok(Sources.Select(s => new
        {
            s.Id,
            s.Name,
            columns = s.Columns.Select(c => new { c.Name, c.Type, c.Label }),
        }));
    }

    // ─── POST /query ───────────────────────────────────────────

    private static async Task<IResult> HandleQuery(
        HandySuitesDbContext db,
        ITenantContextService tenantContext,
        HttpContext ctx,
        AnalyticsQueryRequest request)
    {
        var tenantId = tenantContext.TenantId;
        if (tenantId == 0) return Results.Unauthorized();

        var role = ctx.User.FindFirst("role")?.Value
                   ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (role != "ADMIN" && role != "SUPER_ADMIN" && role != "SUPERVISOR")
            return Results.Forbid();

        // Validate source
        var source = Sources.FirstOrDefault(s => s.Id == request.Source);
        if (source == null)
            return Results.BadRequest(new { error = "Invalid data source" });

        // Validate columns (whitelist — prevents SQL injection)
        var allowedColumns = source.Columns.Select(c => c.Name).ToHashSet();

        foreach (var dim in request.Dimensions ?? Array.Empty<string>())
        {
            if (!allowedColumns.Contains(dim))
                return Results.BadRequest(new { error = $"Invalid dimension: {dim}" });
        }

        foreach (var metric in request.Metrics ?? Array.Empty<MetricRequest>())
        {
            if (!allowedColumns.Contains(metric.Column))
                return Results.BadRequest(new { error = $"Invalid metric column: {metric.Column}" });
            if (!AllowedAggregates.Contains(metric.Aggregate.ToUpperInvariant()))
                return Results.BadRequest(new { error = $"Invalid aggregate: {metric.Aggregate}" });
        }

        if (!string.IsNullOrEmpty(request.OrderBy) && !allowedColumns.Contains(request.OrderBy))
            return Results.BadRequest(new { error = $"Invalid orderBy: {request.OrderBy}" });

        try
        {
            // Build safe SQL query
            var dimensions = request.Dimensions ?? Array.Empty<string>();
            var metrics = request.Metrics ?? Array.Empty<MetricRequest>();
            var limit = Math.Clamp(request.Limit ?? 100, 1, 1000);

            var selectParts = new List<string>();
            selectParts.AddRange(dimensions.Select(d => $"\"{d}\""));
            selectParts.AddRange(metrics.Select(m => $"{m.Aggregate.ToUpperInvariant()}(\"{m.Column}\") AS \"{m.Column}\""));

            if (selectParts.Count == 0)
            {
                // No dimensions/metrics specified — return all columns
                selectParts.AddRange(source.Columns.Select(c => $"\"{c.Name}\""));
            }

            var sql = $"SELECT {string.Join(", ", selectParts)} FROM {source.Table} WHERE tenant_id = {tenantId}";

            if (dimensions.Length > 0 && metrics.Length > 0)
            {
                sql += $" GROUP BY {string.Join(", ", dimensions.Select(d => $"\"{d}\""))}";
            }

            var orderCol = request.OrderBy;
            if (!string.IsNullOrEmpty(orderCol))
            {
                var dir = request.OrderDesc ? "DESC" : "ASC";
                // Check if ordering by a metric label
                var metricLabel = metrics.FirstOrDefault(m => m.Label == orderCol || m.Column == orderCol);
                if (metricLabel != null)
                    sql += $" ORDER BY {metricLabel.Aggregate.ToUpperInvariant()}(\"{metricLabel.Column}\") {dir}";
                else
                    sql += $" ORDER BY \"{orderCol}\" {dir}";
            }

            sql += $" LIMIT {limit}";

            // Execute query
            using var conn = db.Database.GetDbConnection();
            await conn.OpenAsync();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;

            var rows = new List<Dictionary<string, object?>>();
            var columns = new List<string>();

            using var reader = await cmd.ExecuteReaderAsync();

            // Get column names
            for (int i = 0; i < reader.FieldCount; i++)
                columns.Add(reader.GetName(i));

            // Read rows
            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object?>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    row[columns[i]] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                }
                rows.Add(row);
            }

            // Build column metadata for frontend
            var columnMeta = columns.Select(colName =>
            {
                var def = source.Columns.FirstOrDefault(c => c.Name == colName);
                return new { name = colName, label = def?.Label ?? colName, type = def?.Type ?? "string" };
            }).ToList();

            return Results.Ok(new
            {
                source = source.Id,
                columns = columnMeta,
                rows,
                totalRows = rows.Count,
            });
        }
        catch (Exception ex)
        {
            return Results.Problem($"Query error: {ex.Message}");
        }
    }
}

// ─── DTOs ──────────────────────────────────────────────────

public record AnalyticsSource(string Id, string Name, string Table, ColumnDef[] Columns);
public record ColumnDef(string Name, string Type, string Label);

public record AnalyticsQueryRequest(
    string Source,
    string[]? Dimensions,
    MetricRequest[]? Metrics,
    string? OrderBy,
    bool OrderDesc = true,
    int? Limit = 100
);

public record MetricRequest(string Column, string Aggregate, string? Label);
