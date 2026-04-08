using Npgsql;

namespace HandySuites.Billing.Api.Services;

public class OrderReaderService : IOrderReaderService
{
    private readonly string? _mainConnectionString;
    private readonly ILogger<OrderReaderService> _logger;

    public OrderReaderService(IConfiguration configuration, ILogger<OrderReaderService> logger)
    {
        _mainConnectionString = configuration.GetConnectionString("MainConnection");
        _logger = logger;
    }

    public async Task<OrderForInvoice?> GetOrderForInvoiceAsync(string tenantId, int pedidoId)
    {
        if (string.IsNullOrEmpty(_mainConnectionString))
        {
            _logger.LogWarning("MainConnection not configured — cannot read orders");
            return null;
        }

        if (!int.TryParse(tenantId, out var tenantIdInt))
        {
            _logger.LogWarning("TenantId '{TenantId}' is not a valid integer", tenantId);
            return null;
        }

        try
        {
            await using var conn = new NpgsqlConnection(_mainConnectionString);
            await conn.OpenAsync();

            var order = await ReadOrderWithClientAsync(conn, tenantIdInt, pedidoId);
            if (order == null) return null;

            order.Detalles = await ReadOrderLinesAsync(conn, tenantIdInt, pedidoId);
            return order;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading order {PedidoId} from main DB for tenant {TenantId}", pedidoId, tenantId);
            return null;
        }
    }

    public async Task<List<OrderForInvoice>> GetOrdersForFacturaGlobalAsync(
        string tenantId, DateTime fechaInicio, DateTime fechaFin, List<long> excludedPedidoIds)
    {
        if (string.IsNullOrEmpty(_mainConnectionString))
        {
            _logger.LogWarning("MainConnection not configured — cannot read orders for factura global");
            return new List<OrderForInvoice>();
        }

        if (!int.TryParse(tenantId, out var tenantIdInt))
        {
            _logger.LogWarning("TenantId '{TenantId}' is not a valid integer", tenantId);
            return new List<OrderForInvoice>();
        }

        try
        {
            await using var conn = new NpgsqlConnection(_mainConnectionString);
            await conn.OpenAsync();

            // Build exclusion clause for already-invoiced pedidos
            var excludeClause = excludedPedidoIds.Count > 0
                ? $"AND p.id NOT IN ({string.Join(",", excludedPedidoIds)})"
                : "";

            var sql = $"""
                SELECT
                    p.id, p.numero_pedido, p.estado, p.subtotal, p.descuento, p.impuestos, p.total, p.usuario_id,
                    p.cliente_id,
                    c.nombre, c.rfc, c.razon_social, c.regimen_fiscal,
                    c.codigo_postal_fiscal, c.uso_cfdi_predeterminado, c.correo, c.facturable
                FROM "Pedidos" p
                JOIN "Clientes" c ON c.id = p.cliente_id AND c.tenant_id = p.tenant_id
                WHERE p.tenant_id = @tenantId
                  AND p.estado = 5
                  AND p.eliminado_en IS NULL
                  AND (c.rfc = 'XAXX010101000' OR c.rfc IS NULL OR c.rfc = '')
                  AND p.creado_en >= @fechaInicio
                  AND p.creado_en < @fechaFin
                  {excludeClause}
                ORDER BY p.id
                """;

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("tenantId", tenantIdInt);
            cmd.Parameters.AddWithValue("fechaInicio", fechaInicio);
            cmd.Parameters.AddWithValue("fechaFin", fechaFin);

            var orders = new List<OrderForInvoice>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                orders.Add(new OrderForInvoice
                {
                    PedidoId = reader.GetInt32(0),
                    NumeroPedido = reader.GetString(1),
                    Estado = reader.GetInt32(2),
                    Subtotal = reader.GetDecimal(3),
                    Descuento = reader.GetDecimal(4),
                    Impuestos = reader.GetDecimal(5),
                    Total = reader.GetDecimal(6),
                    VendedorId = reader.GetInt32(7),
                    ClienteId = reader.GetInt32(8),
                    ClienteNombre = reader.GetString(9),
                    ClienteRfc = reader.IsDBNull(10) ? "XAXX010101000" : reader.GetString(10),
                    ClienteRazonSocial = reader.IsDBNull(11) ? null : reader.GetString(11),
                    ClienteRegimenFiscal = reader.IsDBNull(12) ? null : reader.GetString(12),
                    ClienteCodigoPostalFiscal = reader.IsDBNull(13) ? null : reader.GetString(13),
                    ClienteUsoCfdi = reader.IsDBNull(14) ? null : reader.GetString(14),
                    ClienteCorreo = reader.IsDBNull(15) ? null : reader.GetString(15),
                    ClienteFacturable = reader.GetBoolean(16),
                });
            }

            // Load line items for each order
            foreach (var order in orders)
            {
                order.Detalles = await ReadOrderLinesAsync(conn, tenantIdInt, order.PedidoId);
            }

            return orders;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading orders for factura global, tenant {TenantId}", tenantId);
            return new List<OrderForInvoice>();
        }
    }

    private static async Task<OrderForInvoice?> ReadOrderWithClientAsync(
        NpgsqlConnection conn, int tenantId, int pedidoId)
    {
        const string sql = """
            SELECT
                p.id, p.numero_pedido, p.estado, p.subtotal, p.descuento, p.impuestos, p.total, p.usuario_id,
                p.cliente_id,
                c.nombre, c.rfc, c.razon_social, c.regimen_fiscal,
                c.codigo_postal_fiscal, c.uso_cfdi_predeterminado, c.correo, c.facturable
            FROM "Pedidos" p
            JOIN "Clientes" c ON c.id = p.cliente_id AND c.tenant_id = p.tenant_id
            WHERE p.id = @pedidoId
              AND p.tenant_id = @tenantId
              AND p.eliminado_en IS NULL
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("pedidoId", pedidoId);
        cmd.Parameters.AddWithValue("tenantId", tenantId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return new OrderForInvoice
        {
            PedidoId = reader.GetInt32(0),
            NumeroPedido = reader.GetString(1),
            Estado = reader.GetInt32(2),
            Subtotal = reader.GetDecimal(3),
            Descuento = reader.GetDecimal(4),
            Impuestos = reader.GetDecimal(5),
            Total = reader.GetDecimal(6),
            VendedorId = reader.GetInt32(7),
            ClienteId = reader.GetInt32(8),
            ClienteNombre = reader.GetString(9),
            ClienteRfc = reader.GetString(10),
            ClienteRazonSocial = reader.IsDBNull(11) ? null : reader.GetString(11),
            ClienteRegimenFiscal = reader.IsDBNull(12) ? null : reader.GetString(12),
            ClienteCodigoPostalFiscal = reader.IsDBNull(13) ? null : reader.GetString(13),
            ClienteUsoCfdi = reader.IsDBNull(14) ? null : reader.GetString(14),
            ClienteCorreo = reader.IsDBNull(15) ? null : reader.GetString(15),
            ClienteFacturable = reader.GetBoolean(16),
        };
    }

    private static async Task<List<OrderLineForInvoice>> ReadOrderLinesAsync(
        NpgsqlConnection conn, int tenantId, int pedidoId)
    {
        const string sql = """
            SELECT
                d.producto_id, d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.impuesto, d.total,
                pr.nombre, pr.codigo_barra, pr.clave_sat,
                u.nombre, u.abreviatura, u.clave_sat
            FROM "DetallePedidos" d
            JOIN "Productos" pr ON pr.id = d.producto_id AND pr.tenant_id = @tenantId
            JOIN "UnidadesMedida" u ON u.id = pr.unidad_medida_id AND u.tenant_id = @tenantId
            WHERE d.pedido_id = @pedidoId
              AND d.eliminado_en IS NULL
            ORDER BY d.id
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("pedidoId", pedidoId);
        cmd.Parameters.AddWithValue("tenantId", tenantId);

        var lines = new List<OrderLineForInvoice>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            lines.Add(new OrderLineForInvoice
            {
                ProductoId = reader.GetInt32(0),
                Cantidad = reader.GetDecimal(1),
                PrecioUnitario = reader.GetDecimal(2),
                Descuento = reader.GetDecimal(3),
                Subtotal = reader.GetDecimal(4),
                Impuesto = reader.GetDecimal(5),
                Total = reader.GetDecimal(6),
                ProductoNombre = reader.GetString(7),
                ProductoCodigoBarra = reader.IsDBNull(8) ? null : reader.GetString(8),
                ProductoClaveSat = reader.IsDBNull(9) ? null : reader.GetString(9),
                UnidadNombre = reader.GetString(10),
                UnidadAbreviatura = reader.IsDBNull(11) ? null : reader.GetString(11),
                UnidadClaveSat = reader.IsDBNull(12) ? null : reader.GetString(12),
            });
        }

        return lines;
    }
}
