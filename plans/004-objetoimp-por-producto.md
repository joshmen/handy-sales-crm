# Plan 004: Derivar `ObjetoImp` por producto en vez de forzar "02" (gravado) en cada línea del CFDI

> **Executor instructions**: Sigue este plan paso a paso. Corre cada verificación
> antes de avanzar. Si ocurre algo de "STOP conditions", detente y reporta. Al
> terminar, actualiza la fila de este plan en `plans/README.md`.
>
> **Drift check (primero)**: `git diff --stat 3fa3ba1d..HEAD -- apps/billing/HandySuites.Billing.Api/Controllers/FacturasController.cs apps/billing/HandySuites.Billing.Api/Services/OrderReaderService.cs apps/billing/HandySuites.Billing.Api/Models/Factura.cs`
> Si algún archivo cambió, compara contra los excerpts de "Current state".

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/003-cfdi-total-impuestos-desglose.md` (ambos tocan el armado de `<Impuestos>`; ejecutar 003 primero)
- **Category**: bug (compliance)
- **Planned at**: commit `3fa3ba1d`, 2026-06-13

## Why this matters

`DetalleFactura.ObjetoImp` (el "Objeto de impuesto" del CFDI 4.0: `01`=no objeto de impuesto, `02`=sí objeto y desglosa, `03`=sí objeto y no desglosa) tiene default `"02"` y **ningún** loop de detalle lo asigna. Resultado: a **todo** producto se le marca `ObjetoImp="02"` y se le genera IVA 16%, incluso a productos exentos (IVA 0%). Para un tenant que venda bienes exentos, esto produce un CFDI con IVA indebido → rechazo del SAT o IVA sobre-declarado al cliente (defecto de cumplimiento fiscal). Hoy el impacto es **condicional** (el catálogo de prueba es todo IVA-incluido gravado), pero el dato correcto ya existe por línea y no propagarlo es una deuda fiscal latente.

## Current state

- `apps/billing/HandySuites.Billing.Api/Models/Factura.cs:186` — el default problemático:
  ```csharp
  [MaxLength(10)]
  public string ObjetoImp { get; set; } = "02";
  ```
- `apps/billing/HandySuites.Billing.Api/Controllers/FacturasController.cs` — **tres** loops que crean `DetalleFactura` y **ninguno** setea `ObjetoImp` (por eso queda "02"):
  - `CreateFactura` (~líneas 462-475)
  - `CreateFacturaFromOrder` (~líneas 700-718)
  - `GenerarFacturaGlobal` (~líneas 874-891)
- `apps/billing/HandySuites.Billing.Api/Services/OrderReaderService.cs` — la query del pedido **ya** trae el impuesto por línea y joinea `Productos`:
  ```sql
  SELECT d.producto_id, d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.impuesto, d.total,
         pr.nombre, pr.codigo_barra, pr.clave_sat, ...
  FROM "DetallePedidos" d
  JOIN "Productos" pr ON pr.id = d.producto_id AND pr.tenant_id = @tenantId
  ...
  ```
  El `OrderLineForInvoice` mapea `Impuesto = reader.GetDecimal(5)` (índice 5, monto de impuesto de la línea). **`d.impuesto == 0` es la señal natural de exención.**
- `apps/billing/HandySuites.Billing.Api/Services/CfdiXmlBuilder.cs` — `WriteImpuestosTotales` y `WriteConceptoImpuestos` ya respetan `ObjetoImp`: solo generan/emiten impuesto para detalles con `d.ObjetoImp == "02"`. Por eso, setear `ObjetoImp` correctamente en el detalle es suficiente para que el XML salga bien.
- `CreateFacturaFromOrderRequest.Overrides` (en `apps/billing/HandySuites.Billing.Api/DTOs/FacturaDtos.cs`) ya viaja por `ProductoId` y se usa en `CreateFacturaFromOrder` para overrides de claves SAT — es el lugar natural para un override manual de `ObjetoImp`.

## Commands you will need

| Propósito | Comando | Esperado |
|-----------|---------|----------|
| Tests billing | `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` | exit 0 |
| Rebuild billing | `docker-compose -f docker-compose.dev.yml up -d --build api_billing` | sano (requiere `CLOUDINARY_URL`) |

## Scope

**In scope**:
- `apps/billing/HandySuites.Billing.Api/Services/OrderReaderService.cs` (agregar `ObjetoImp` derivado a `OrderLineForInvoice`)
- `apps/billing/HandySuites.Billing.Api/Controllers/FacturasController.cs` (setear `ObjetoImp` en los 3 loops de detalle; honrar el override)
- `apps/billing/HandySuites.Billing.Api/DTOs/FacturaDtos.cs` (agregar `ObjetoImp` opcional al item de `Overrides`)
- `apps/billing/HandySuites.Billing.Tests/`

**Out of scope**:
- Cambiar el schema ERP `Productos` (NO agregar columnas nuevas en este plan — derivar del impuesto por línea ya disponible).
- El cálculo del monto de impuesto (`d.impuesto`) — solo se lee.
- `CfdiXmlBuilder` — ya respeta `ObjetoImp`; no se toca (lo cubre el Plan 003).

## Git workflow

- Rama: `advisor/004-objetoimp-por-producto`
- Commit: `fix(billing): derivar ObjetoImp por producto (no forzar 02 en exentos)`. Sin `Co-Authored-By` ni mención de IA.

## Steps

### Step 1: Decidir y documentar la fuente de `ObjetoImp` (derivación mínima, sin schema)

Usa el impuesto por línea que ya trae el OrderReader: una línea **con impuesto > 0** es objeto de impuesto y desglosa (`"02"`); una línea **con impuesto == 0** es exenta / no objeto (`"01"`). Documenta esta regla con un comentario en el código:
```
// CFDI 4.0 ObjetoImp: 02 = objeto de impuesto (desglosa IVA), 01 = no objeto (exento).
// Derivado del impuesto por línea del pedido: impuesto>0 -> "02", impuesto==0 -> "01".
```
Si durante el drift-check descubres que `Productos` YA tiene un campo explícito de objeto-de-impuesto o de exención, prefiérelo sobre la heurística (y actualiza el SELECT del OrderReader para traerlo). Si no existe, usa la derivación por `d.impuesto`.

**Verify**: ninguna acción de código aún; decisión documentada en el siguiente paso.

### Step 2: Exponer `ObjetoImp` en `OrderLineForInvoice`

En `OrderReaderService.cs`, agrega la propiedad `string ObjetoImp` al DTO `OrderLineForInvoice` y, en el mapeo de `ReadOrderLinesAsync`, derívalo: `ObjetoImp = reader.GetDecimal(5) > 0m ? "02" : "01"` (índice 5 = `d.impuesto`).

**Verify**: `dotnet build apps/billing/HandySuites.Billing.Api/HandySuites.Billing.Api.csproj` → exit 0.

### Step 3: Setear `ObjetoImp` en los 3 loops de detalle

- En `CreateFacturaFromOrder` (loop ~700-718): `ObjetoImp = ovr?.ObjetoImp ?? line.ObjetoImp` (donde `ovr` es el override por `ProductoId` ya resuelto en ese método; si el patrón de override local usa otro nombre, ajústalo).
- En `GenerarFacturaGlobal` (loop ~874-891): `ObjetoImp = line.ObjetoImp` (las líneas vienen del mismo OrderReader).
- En `CreateFactura` (loop ~462-475): este método recibe `request.Detalles` (DTO de request, no OrderReader). Si el `DetalleFacturaRequest` no trae `ObjetoImp`, agrégalo como opcional con default `"02"` y úsalo: `ObjetoImp = detalle.ObjetoImp ?? "02"`. Mantén `"02"` como default conservador aquí (es una API directa donde el llamador es responsable).

**Verify**: `dotnet build ...Billing.Api.csproj` → exit 0.

### Step 4: Override manual desde la pre-factura

Agrega `string? ObjetoImp` al item de `Overrides` en `CreateFacturaFromOrderRequest` (`FacturaDtos.cs`). Ya se consume en `CreateFacturaFromOrder` (Step 3). Esto permite corregir manualmente el objeto-de-impuesto de una línea desde la pantalla de pre-factura web.

**Verify**: `dotnet build ...Billing.Api.csproj` → exit 0.

### Step 5: Validar el valor

Agrega una validación (en el punto de creación de la factura, junto a las validaciones existentes de `CreateFacturaFromOrder`) que rechace con 400 si algún `ObjetoImp` resultante no está en `{"01","02","03"}`.

**Verify**: `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` → exit 0.

## Test plan

- Test en `apps/billing/HandySuites.Billing.Tests/` (modelar sobre tests existentes de `OrderReaderService`/`FacturasController`):
  - Línea con `impuesto == 0` → `OrderLineForInvoice.ObjetoImp == "01"`; el CFDI resultante NO emite nodo de impuesto para esa línea ni la cuenta en el total.
  - Línea con `impuesto > 0` → `"02"`; emite IVA normal.
  - Override `ObjetoImp` en la pre-factura sobreescribe el derivado.
  - `ObjetoImp` inválido (`"99"`) → 400.
- Verificación: `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` → todos pasan.

## Done criteria

ALL deben cumplirse:

- [ ] `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` exit 0, con tests de exento (01) y gravado (02)
- [ ] Los 3 loops de detalle en `FacturasController.cs` asignan `ObjetoImp` (no dependen del default del modelo)
- [ ] `OrderLineForInvoice` expone `ObjetoImp` derivado del impuesto por línea
- [ ] Validación rechaza `ObjetoImp` fuera de `{01,02,03}`
- [ ] No se modificó el schema ERP `Productos` (`git status` — sin migraciones nuevas)
- [ ] Fila de este plan actualizada en `plans/README.md`

## STOP conditions

Detente y reporta si:

- El Plan 003 aún no se ejecutó (este plan depende de él — confirma que `WriteImpuestosTotales` ya deriva el total del desglose).
- `Productos` no tiene forma de distinguir exentos y `d.impuesto` siempre viene > 0 incluso para lo que debería ser exento (entonces la heurística no sirve y hace falta un campo de producto — reporta para decidir con el operador antes de inventar schema).
- Algún loop de detalle no coincide con los excerpts (drift).
- Aparece la necesidad de `ObjetoImp="03"` (objeto de impuesto sin desglose) — no está en la heurística; reporta el caso de uso antes de implementarlo.

## Maintenance notes

- La heurística `impuesto>0 → "02"` es correcta para IVA estándar. Si el negocio agrega IEPS, tasa 0% real (distinta de exento), o productos `"03"`, hará falta una fuente de objeto-de-impuesto a nivel producto — documentar como follow-up.
- El reviewer debe verificar que el override de la pre-factura efectivamente llega hasta el `DetalleFactura` y que la validación corre antes del timbrado.
