# Pedido → Factura Integration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to generate CFDI invoices directly from delivered/paid orders, pulling client + product data from the CRM database automatically.

**Architecture:** The Billing API (`handy_billing` DB) reads order data from the Main API's database (`handy_erp`) using direct Npgsql queries (same cross-DB pattern as `CompanyLogoService`). A new `OrderReaderService` fetches pedido + detalles + cliente + productos + unidades in a single service call. The existing `CreateFactura` flow is reused — the new endpoint just builds the `CreateFacturaRequest` from order data instead of manual input. Frontend adds a "Facturar" button to delivered orders.

**Tech Stack:** .NET 9 (Billing API), Npgsql (cross-DB), Next.js 15 + React 19 + TypeScript (frontend), Tailwind CSS 3.4, EF Core 8 (migration for SAT fields)

---

## File Structure

### Backend — Main API (EF Core migration)
| File | Action | Responsibility |
|------|--------|---------------|
| `libs/HandySales.Domain/Entities/Producto.cs` | MODIFY | Add `ClaveSat` field |
| `libs/HandySales.Domain/Entities/UnidadMedida.cs` | MODIFY | Add `ClaveSat` field |
| `libs/HandySales.Infrastructure/Migrations/` | CREATE | New migration for SAT fields |

### Backend — Billing API (order reader + endpoint)
| File | Action | Responsibility |
|------|--------|---------------|
| `apps/billing/.../Services/IOrderReaderService.cs` | CREATE | Interface for reading orders from handy_erp |
| `apps/billing/.../Services/OrderReaderService.cs` | CREATE | Npgsql queries to handy_erp (pedido + detalles + cliente + productos) |
| `apps/billing/.../DTOs/FacturaDtos.cs` | MODIFY | Add `CreateFacturaFromOrderRequest` DTO |
| `apps/billing/.../Controllers/FacturasController.cs` | MODIFY | Add `POST /api/facturas/from-order` endpoint |
| `apps/billing/.../Program.cs` | MODIFY | Register `IOrderReaderService` in DI |

### Frontend
| File | Action | Responsibility |
|------|--------|---------------|
| `apps/web/src/services/api/billing.ts` | MODIFY | Add `createFacturaFromOrder()` method |
| `apps/web/src/types/billing.ts` | MODIFY | Add `CreateFacturaFromOrderRequest` type |
| `apps/web/src/app/(dashboard)/orders/page.tsx` | MODIFY | Add "Facturar" button to delivered orders |

---

## Chunk 1: SAT Catalog Fields on Producto and UnidadMedida

### Task 1: Add `ClaveSat` to Producto entity

**Files:**
- Modify: `libs/HandySales.Domain/Entities/Producto.cs`

- [ ] **Step 1: Add ClaveSat property to Producto**

```csharp
// Add after existing properties, before navigation section
[Column("clave_sat")]
public string? ClaveSat { get; set; }
```

This is the SAT `ClaveProdServ` code (e.g., `52161557` for "Artículos de papelería"). Nullable because existing products won't have it yet.

- [ ] **Step 2: Verify the entity compiles**

Run: `cd "c:/Users/AW AREA 51M R2/OneDrive/Offshore_Projects/HandySales" && dotnet build libs/HandySales.Domain`
Expected: Build succeeded

---

### Task 2: Add `ClaveSat` to UnidadMedida entity

**Files:**
- Modify: `libs/HandySales.Domain/Entities/UnidadMedida.cs` (the file at root scope, Table `UnidadesMedida`)

- [ ] **Step 1: Add ClaveSat property to UnidadMedida**

```csharp
// Add after Abreviatura
[Column("clave_sat")]
public string? ClaveSat { get; set; }
```

This is the SAT `ClaveUnidad` code (e.g., `H87` for "Pieza", `E48` for "Servicio", `KGM` for "Kilogramo"). Nullable for same reason.

- [ ] **Step 2: Verify the entity compiles**

Run: `cd "c:/Users/AW AREA 51M R2/OneDrive/Offshore_Projects/HandySales" && dotnet build libs/HandySales.Domain`
Expected: Build succeeded

---

### Task 3: Generate EF Core migration

**Files:**
- Create: `libs/HandySales.Infrastructure/Migrations/<timestamp>_AddClaveSatFields.cs`

- [ ] **Step 1: Generate migration**

```bash
export PATH="$PATH:/c/Users/AW AREA 51M R2/.dotnet/tools"
dotnet-ef migrations add AddClaveSatToProductosYUnidades \
  --project libs/HandySales.Infrastructure \
  --startup-project apps/api/src/HandySales.Api \
  --output-dir Migrations
```

Expected: Migration file created with `AddColumn("clave_sat")` for both `Productos` and `UnidadesMedida` tables.

- [ ] **Step 2: Verify migration looks correct**

Read the generated migration file. It should ONLY contain two `AddColumn` operations (one per table), nothing else.

- [ ] **Step 3: Apply migration via Docker rebuild**

```bash
docker-compose -f docker-compose.dev.yml up -d --build api_main
```

Wait for container to start, then verify columns exist:

```bash
docker exec handysales_postgres_dev psql -U handy_user -d handy_erp \
  -c "\d \"Productos\"" | grep clave_sat
docker exec handysales_postgres_dev psql -U handy_user -d handy_erp \
  -c "\d \"UnidadesMedida\"" | grep clave_sat
```

Expected: Both columns appear as `character varying` nullable.

- [ ] **Step 4: Commit**

```bash
git add libs/HandySales.Domain/Entities/Producto.cs \
        libs/HandySales.Domain/Entities/UnidadMedida.cs \
        libs/HandySales.Infrastructure/Migrations/
git commit -m "feat: add clave_sat to Producto and UnidadMedida for CFDI integration"
```

---

## Chunk 2: OrderReaderService in Billing API

### Task 4: Create IOrderReaderService interface

**Files:**
- Create: `apps/billing/HandySales.Billing.Api/Services/IOrderReaderService.cs`

- [ ] **Step 1: Define the interface and DTOs**

```csharp
namespace HandySales.Billing.Api.Services;

/// <summary>
/// Reads order data from handy_erp database (cross-DB via Npgsql).
/// Used to populate factura creation from an existing order.
/// </summary>
public interface IOrderReaderService
{
    Task<OrderForInvoice?> GetOrderForInvoiceAsync(string tenantId, int pedidoId);
}

/// <summary>
/// All order data needed to create a factura, read from handy_erp.
/// </summary>
public class OrderForInvoice
{
    // Pedido
    public int PedidoId { get; set; }
    public string NumeroPedido { get; set; } = "";
    public int Estado { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Impuestos { get; set; }
    public decimal Total { get; set; }
    public int VendedorId { get; set; }

    // Cliente (receptor)
    public int ClienteId { get; set; }
    public string ClienteNombre { get; set; } = "";
    public string ClienteRfc { get; set; } = "";
    public string? ClienteRazonSocial { get; set; }
    public string? ClienteRegimenFiscal { get; set; }
    public string? ClienteCodigoPostalFiscal { get; set; }
    public string? ClienteUsoCfdi { get; set; }
    public string? ClienteCorreo { get; set; }
    public bool ClienteFacturable { get; set; }

    // Detalles
    public List<OrderLineForInvoice> Detalles { get; set; } = new();
}

public class OrderLineForInvoice
{
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = "";
    public string? ProductoClaveSat { get; set; }
    public string? ProductoCodigoBarra { get; set; }
    public string UnidadNombre { get; set; } = "";
    public string? UnidadAbreviatura { get; set; }
    public string? UnidadClaveSat { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `dotnet build apps/billing/HandySales.Billing.Api`
Expected: Build succeeded

---

### Task 5: Implement OrderReaderService

**Files:**
- Create: `apps/billing/HandySales.Billing.Api/Services/OrderReaderService.cs`

This follows the exact same pattern as `CompanyLogoService` — raw Npgsql query to `handy_erp`.

- [ ] **Step 1: Implement the service**

```csharp
using Npgsql;

namespace HandySales.Billing.Api.Services;

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

            // 1. Read pedido + cliente in one query (JOIN)
            var order = await ReadOrderWithClientAsync(conn, tenantIdInt, pedidoId);
            if (order == null) return null;

            // 2. Read detalles + producto + unidad
            order.Detalles = await ReadOrderLinesAsync(conn, tenantIdInt, pedidoId);

            return order;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading order {PedidoId} from main DB for tenant {TenantId}", pedidoId, tenantId);
            return null;
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
```

**Important notes about the SQL:**
- Table names are PascalCase with double quotes (EF Core convention in this project: `"Pedidos"`, `"Clientes"`, etc.)
- Column names are snake_case (Npgsql naming convention applied)
- Soft-delete filter: `eliminado_en IS NULL`
- Tenant isolation: `tenant_id = @tenantId`

- [ ] **Step 2: Verify it compiles**

Run: `dotnet build apps/billing/HandySales.Billing.Api`
Expected: Build succeeded

- [ ] **Step 3: Commit**

```bash
git add apps/billing/HandySales.Billing.Api/Services/IOrderReaderService.cs \
        apps/billing/HandySales.Billing.Api/Services/OrderReaderService.cs
git commit -m "feat: add OrderReaderService to read pedido data from main DB"
```

---

## Chunk 3: Factura-from-Order Endpoint

### Task 6: Add DTO for order-to-invoice request

**Files:**
- Modify: `apps/billing/HandySales.Billing.Api/DTOs/FacturaDtos.cs`

- [ ] **Step 1: Add CreateFacturaFromOrderRequest DTO**

Add at the end of the file:

```csharp
/// <summary>
/// Request to create a factura from an existing order (pedido).
/// Only requires the order ID — all data is read from handy_erp automatically.
/// Optional overrides allow the admin to adjust CFDI-specific fields before timbrado.
/// </summary>
public class CreateFacturaFromOrderRequest
{
    [Required]
    public int PedidoId { get; set; }

    // Optional overrides (if admin wants to change defaults from client data)
    public string? MetodoPago { get; set; }  // Default: "PUE"
    public string? FormaPago { get; set; }   // Default: "01" (Efectivo)
    public string? UsoCfdi { get; set; }     // Default: from client's UsoCFDIPredeterminado
    public string? Observaciones { get; set; }
    public bool TimbrarInmediatamente { get; set; } = false;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `dotnet build apps/billing/HandySales.Billing.Api`
Expected: Build succeeded

---

### Task 7: Add `POST /api/facturas/from-order` endpoint

**Files:**
- Modify: `apps/billing/HandySales.Billing.Api/Controllers/FacturasController.cs`
- Modify: `apps/billing/HandySales.Billing.Api/Program.cs`

- [ ] **Step 1: Register OrderReaderService in DI**

In `Program.cs`, after the `CompanyLogoService` registration:

```csharp
// Order reader service (reads pedido data from main DB for invoice creation)
builder.Services.AddSingleton<IOrderReaderService, OrderReaderService>();
```

- [ ] **Step 2: Inject IOrderReaderService into FacturasController**

Add `IOrderReaderService orderReaderService` to the constructor parameters and store as `_orderReaderService` field.

- [ ] **Step 3: Add the from-order endpoint**

Add this method to `FacturasController`, after the existing `CreateFactura` method:

```csharp
[HttpPost("from-order")]
public async Task<ActionResult<FacturaDto>> CreateFacturaFromOrder(CreateFacturaFromOrderRequest request)
{
    var tenantId = GetTenantId();
    var userId = GetUserId();

    // 1. Check if this order was already invoiced
    var existingFactura = await _context.Facturas
        .Where(f => f.TenantId == tenantId && f.PedidoId == request.PedidoId && f.Estado != "CANCELADA")
        .FirstOrDefaultAsync();

    if (existingFactura != null)
        return BadRequest($"Este pedido ya tiene una factura ({existingFactura.Serie}-{existingFactura.Folio}, estado: {existingFactura.Estado})");

    // 2. Read order data from main DB
    var order = await _orderReaderService.GetOrderForInvoiceAsync(tenantId, request.PedidoId);
    if (order == null)
        return NotFound("Pedido no encontrado");

    // 3. Validate order state (must be Entregado = 5)
    if (order.Estado != 5)
        return BadRequest("Solo se pueden facturar pedidos con estado 'Entregado'");

    // 4. Validate client is facturable and has fiscal data
    if (!order.ClienteFacturable)
        return BadRequest($"El cliente '{order.ClienteNombre}' no está marcado como facturable");

    if (string.IsNullOrEmpty(order.ClienteRfc))
        return BadRequest($"El cliente '{order.ClienteNombre}' no tiene RFC registrado");

    // 5. Load fiscal config (emisor data)
    var config = await _context.ConfiguracionesFiscales
        .Where(c => c.TenantId == tenantId && c.Activo)
        .FirstOrDefaultAsync();

    if (config == null)
        return BadRequest("No hay configuración fiscal activa. Configure sus datos fiscales primero.");

    // 6. Build factura from order data
    var serie = config.SerieFactura ?? "A";
    var folio = await GetNextFolio(tenantId, serie);

    var factura = new Factura
    {
        TenantId = tenantId,
        Serie = serie,
        Folio = folio,
        FechaEmision = DateTime.UtcNow,
        TipoComprobante = "I", // Ingreso
        MetodoPago = request.MetodoPago ?? "PUE",
        FormaPago = request.FormaPago ?? "01",
        UsoCfdi = request.UsoCfdi ?? order.ClienteUsoCfdi ?? "G03",

        // Emisor (from config)
        EmisorRfc = config.Rfc,
        EmisorNombre = config.RazonSocial,
        EmisorRegimenFiscal = config.RegimenFiscal,

        // Receptor (from client)
        ReceptorRfc = order.ClienteRfc,
        ReceptorNombre = order.ClienteRazonSocial ?? order.ClienteNombre,
        ReceptorUsoCfdi = request.UsoCfdi ?? order.ClienteUsoCfdi ?? "G03",
        ReceptorDomicilioFiscal = order.ClienteCodigoPostalFiscal,
        ReceptorRegimenFiscal = order.ClienteRegimenFiscal,

        // Amounts
        Subtotal = order.Subtotal,
        Descuento = order.Descuento,
        TotalImpuestosTrasladados = order.Impuestos,
        TotalImpuestosRetenidos = 0,
        Total = order.Total,

        Moneda = "MXN",
        TipoCambio = 1,

        // References
        ClienteId = order.ClienteId,
        VendedorId = order.VendedorId,
        PedidoId = order.PedidoId,
        Observaciones = request.Observaciones ?? $"Factura generada desde pedido {order.NumeroPedido}",
        CreatedBy = userId,
        Estado = "PENDIENTE"
    };

    // 7. Map order lines to factura detalles
    var lineNum = 1;
    foreach (var line in order.Detalles)
    {
        factura.Detalles.Add(new DetalleFactura
        {
            NumeroLinea = lineNum++,
            ClaveProdServ = line.ProductoClaveSat ?? "01010101", // Fallback: "No identificado en el catálogo"
            NoIdentificacion = line.ProductoCodigoBarra,
            Descripcion = line.ProductoNombre,
            Unidad = line.UnidadAbreviatura ?? line.UnidadNombre,
            ClaveUnidad = line.UnidadClaveSat ?? "H87", // Fallback: Pieza
            Cantidad = line.Cantidad,
            ValorUnitario = line.PrecioUnitario,
            Importe = line.Subtotal,
            Descuento = line.Descuento,
            ProductoId = line.ProductoId,
        });
    }

    _context.Facturas.Add(factura);
    RegistrarAuditoria(tenantId, factura.Id, "CREAR", $"Factura creada desde pedido {order.NumeroPedido}", userId);
    await _context.SaveChangesAsync();

    _logger.LogInformation("Factura {Serie}-{Folio} created from order {PedidoId} for tenant {TenantId}",
        factura.Serie, factura.Folio, request.PedidoId, tenantId);

    // 8. Auto-timbrar if requested
    if (request.TimbrarInmediatamente)
    {
        var timbrarResult = await TimbrarFactura(factura.Id);
        if (timbrarResult.Result is OkObjectResult)
            return Ok(MapToDto(await _context.Facturas
                .Include(f => f.Detalles).Include(f => f.Impuestos)
                .FirstAsync(f => f.Id == factura.Id)));
    }

    return CreatedAtAction(nameof(GetFactura), new { id = factura.Id }, MapToDto(factura));
}
```

- [ ] **Step 4: Verify it compiles**

Run: `dotnet build apps/billing/HandySales.Billing.Api`
Expected: Build succeeded

- [ ] **Step 5: Rebuild billing API container and test**

```bash
docker-compose -f docker-compose.dev.yml up -d --build api_billing
```

Test with curl (replace JWT token):
```bash
curl -X POST http://localhost:1051/api/facturas/from-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pedidoId": 1, "timbrarInmediatamente": false}'
```

Expected: 201 Created with factura JSON containing data pulled from the order.

- [ ] **Step 6: Commit**

```bash
git add apps/billing/HandySales.Billing.Api/Controllers/FacturasController.cs \
        apps/billing/HandySales.Billing.Api/DTOs/FacturaDtos.cs \
        apps/billing/HandySales.Billing.Api/Program.cs
git commit -m "feat: add POST /api/facturas/from-order endpoint"
```

---

## Chunk 4: Frontend — "Facturar" Button on Orders

### Task 8: Add billing service method and types

**Files:**
- Modify: `apps/web/src/services/api/billing.ts`
- Modify: `apps/web/src/types/billing.ts`

- [ ] **Step 1: Add TypeScript type for the request**

In `apps/web/src/types/billing.ts`, add:

```typescript
export interface CreateFacturaFromOrderRequest {
  pedidoId: number;
  metodoPago?: string;
  formaPago?: string;
  usoCfdi?: string;
  observaciones?: string;
  timbrarInmediatamente?: boolean;
}
```

- [ ] **Step 2: Add billing API method**

In `apps/web/src/services/api/billing.ts`, add:

```typescript
export async function createFacturaFromOrder(
  request: CreateFacturaFromOrderRequest
): Promise<FacturaDetail> {
  const response = await billingApi.post<FacturaDetail>('/api/facturas/from-order', request);
  return response.data;
}
```

- [ ] **Step 3: Run type-check**

```bash
cd apps/web && npm run type-check
```

Expected: 0 errors

---

### Task 9: Add "Facturar" button to orders page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/orders/page.tsx`

- [ ] **Step 1: Add import for billing service and Receipt icon**

Add to imports:

```typescript
import { Receipt } from '@phosphor-icons/react';
import { createFacturaFromOrder } from '@/services/api/billing';
```

- [ ] **Step 2: Add invoicing state variables**

Add to the component state section:

```typescript
const [facturandoPedidoId, setFacturandoPedidoId] = useState<number | null>(null);
```

- [ ] **Step 3: Add handleFacturar function**

```typescript
const handleFacturar = async (pedidoId: number) => {
  if (!confirm('¿Generar factura CFDI desde este pedido?')) return;

  setFacturandoPedidoId(pedidoId);
  try {
    const factura = await createFacturaFromOrder({
      pedidoId,
      timbrarInmediatamente: false,
    });
    toast.success(`Factura ${factura.serie}-${factura.folio} creada. Ve a Facturación para timbrar.`);
  } catch (err: unknown) {
    const message = (err as { response?: { data?: string } })?.response?.data
      || 'Error al crear factura';
    toast.error(typeof message === 'string' ? message : 'Error al crear factura');
  } finally {
    setFacturandoPedidoId(null);
  }
};
```

- [ ] **Step 4: Add "Facturar" button to order actions**

In the actions column/area for each order, add conditionally (only for `Entregado` orders):

```tsx
{order.estado === 'Entregado' && (
  <button
    onClick={() => handleFacturar(order.id)}
    disabled={facturandoPedidoId === order.id}
    className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
    title="Generar factura CFDI"
  >
    {facturandoPedidoId === order.id ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : (
      <Receipt size={16} weight="bold" />
    )}
  </button>
)}
```

**Note:** Find the exact location of the actions column in the existing orders table and mobile cards. The button should appear alongside existing Edit/Delete actions. Look for the pattern of action icons used on this page and match it.

- [ ] **Step 5: Run type-check**

```bash
cd apps/web && npm run type-check
```

Expected: 0 errors

- [ ] **Step 6: Manual smoke test**

1. Open `http://localhost:1083/orders`
2. Verify "Facturar" icon appears only on orders with status "Entregado"
3. Click the button on an Entregado order
4. Confirm dialog appears
5. Accept → factura is created → success toast
6. Click again → should get "Este pedido ya tiene una factura" error

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/services/api/billing.ts \
        apps/web/src/types/billing.ts \
        apps/web/src/app/(dashboard)/orders/page.tsx
git commit -m "feat: add Facturar button to delivered orders"
```

---

## Chunk 5: Validation & Edge Cases

### Task 10: Verify end-to-end flow

- [ ] **Step 1: Seed test data (if needed)**

Ensure at least one order exists with:
- Estado = `Entregado` (5)
- Client has: RFC, RazonSocial, RegimenFiscal, CodigoPostalFiscal, Facturable = true
- Products have line items with prices

Check in database:
```sql
-- Find an Entregado order
SELECT p.id, p.numero_pedido, p.estado, c.rfc, c.razon_social, c.facturable
FROM "Pedidos" p
JOIN "Clientes" c ON c.id = p.cliente_id
WHERE p.estado = 5 AND p.eliminado_en IS NULL
LIMIT 5;
```

- [ ] **Step 2: Test the full flow**

1. Go to Orders page → find Entregado order → click "Facturar"
2. Go to Facturación → Facturas → verify new PENDIENTE factura appears
3. Open factura → verify receptor data matches client
4. Verify line items match order detalles
5. Click "Timbrar" → verify SAT timbrado succeeds
6. Download PDF → verify data is correct

- [ ] **Step 3: Test error cases**

1. Try facturar a non-Entregado order → should get blocked (button hidden)
2. Try facturar same order twice → should get "ya tiene factura" error
3. Try with client missing RFC → should get validation error
4. Try with client `facturable = false` → should get validation error
5. Try with no fiscal config → should get "No hay configuración fiscal" error

---

## Notes

### SAT ClaveProdServ / ClaveUnidad fallbacks
Products and units without `clave_sat` will use fallback values:
- **ClaveProdServ**: `01010101` ("No identificado en el catálogo") — valid but generic
- **ClaveUnidad**: `H87` ("Pieza") — most common unit

This is SAT-compliant but not ideal. A future task should add UI to the products/units management pages to set the SAT codes. This is NOT blocking for launch.

### Factura Global (future)
For counter sales without RFC, a "Factura Global" uses RFC `XAXX010101000` (público en general). This is a separate feature, not part of this plan.

### Portal de Autofactura (future)
QR-based self-service invoicing portal. Separate feature, not part of this plan.

### Manual invoice creation
The existing `POST /api/facturas` endpoint and `/billing/invoices/new` page remain unchanged and fully functional for standalone invoice creation.
