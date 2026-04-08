# Mexican SME Distribution: Order Workflow Competitor Analysis

> **Date:** 2026-03-24
> **Purpose:** Understand industry-standard order workflows to validate/improve HandySuites order state machine
> **Systems analyzed:** Handy.la, SAP Business One, Bind ERP, Aspel SAE, Microsip

---

## Executive Summary

All five systems share a common pattern: **documents are the unit of workflow, not statuses**. Mexican ERPs (Aspel SAE, Microsip, Bind) use a document-conversion model (Cotizacion -> Pedido -> Remision -> Factura), where each document type represents a stage. Distribution-specific systems (Handy.la, HandySuites) instead use a **status-based model** on a single "Pedido" entity, which is more appropriate for field sales.

The critical finding is that **inventory movement timing** varies significantly between preventa and autoventa, and most systems handle this as two fundamentally different paths rather than status variations of the same flow.

---

## 1. Handy.la (Direct Competitor)

**Profile:** 4.2/5, 741 reviews, 50K+ downloads, $675 MXN/user/mo, Android-only

### Sales Models Supported

Handy.la supports three distinct models:
1. **Preventa** - Salesperson visits client, takes order, leaves without product. Warehouse fulfills later.
2. **Autoventa / Venta en Ruta** - Salesperson carries inventory in vehicle, sells and delivers on the spot.
3. **Reparto** - Dedicated delivery person fulfills preventa orders.

### User Types (Role-Based)

- **Preventa user**: Visits clients, registers purchase orders. Does NOT carry product.
- **Repartidor (Dispatcher)**: Receives a load based on orders to deliver. Goes to field exclusively for delivery.
- **Autoventa user**: Carries inventory, sells, delivers, and collects in one visit.

### Order Workflow (Inferred from Help Documentation)

Handy.la does NOT publicly document a formal state machine, but from their help center:

```
PREVENTA PATH:
  Pedido Creado (by preventa user in field)
    -> Asignado a Ruta de Entrega (admin assigns to delivery route)
      -> En Ruta (repartidor accepts load)
        -> Entregado (delivery confirmed, optional photo evidence)
        -> Devuelto (product returned at delivery)

AUTOVENTA PATH:
  Venta creada (by autoventa user in field, with inventory from vehicle)
    -> Entregado (immediate, product leaves vehicle stock)
```

### Route & Inventory Management

- **Carga (Load)**: Admin assigns products to a user (by template or manual). Two columns: "Asignado venta" (for route sales) and delivery orders.
- **Cierre de Ruta (Route Close)**: At end of day, reconciliation happens. Unsold inventory goes to:
  - **Merma** (waste/damaged)
  - **Almacen** (returned to warehouse)
  - **Carga** (stays on vehicle for next day)
- Missing units shown in red = loss tracking.
- Orders can only be assigned to routes if they have NOT been delivered (last 100 pending).
- Delivery confirmation can require **photo evidence** (configurable).

### Inventory Impact Points

| Event | Inventory Impact |
|-------|-----------------|
| Preventa order created | None (just a promise) |
| Order assigned to delivery route | None (administrative) |
| Carga assigned to repartidor | Leaves warehouse (virtual) |
| Delivery confirmed | Final - product with client |
| Route close - almacen return | Returns to warehouse |
| Route close - merma | Written off |
| Autoventa sale | Immediate deduction from vehicle stock |

### Key Observations

- Handy.la uses a **load-based model**: inventory is tracked per user/vehicle, not per order.
- No concept of "Borrador" or "Confirmado" in their preventa flow. Orders go straight from created to awaiting assignment.
- The **3 assignment methods** for delivery routes (by date+zone, by order ID, by zone/pending) are operationally practical.
- Route closure is the reconciliation point, not individual order delivery.
- Returns require an open route (cannot return without active route context).

---

## 2. SAP Business One (Enterprise Reference)

**Profile:** Enterprise ERP, used by larger Mexican distributors, gold standard for document flow

### Document Flow (Sales-A/R Module)

```
Sales Quotation -> Sales Order -> Delivery -> A/R Invoice -> Incoming Payment
```

### Status & Inventory Impact Per Document

| Document | Statuses | Inventory Impact | Accounting Impact |
|----------|----------|-----------------|-------------------|
| **Sales Quotation** | Draft, Posted | None | None |
| **Sales Order** | Open, Closed, Cancelled | **Committed quantity increases** (available stock decreases, physical stock unchanged) | None |
| **Delivery** | Open, Closed, Cancelled | **Physical inventory decreases** (goods issue posted) | Credits inventory account, debits COGS |
| **A/R Invoice** | Posted (irreversible) | None (already moved at Delivery) | Revenue posted to P&L |
| **Incoming Payment** | Applied/Unapplied | None | Closes receivable |

### Key Concepts

- **Committed Quantity**: When a Sales Order is saved, stock is "committed" = reserved for this customer. Available = InStock - Committed + OnOrder.
- **Delivery is the inventory trigger**: This is the single point where physical inventory moves. Not the order, not the invoice.
- **Pick and Pack Manager**: Between Order and Delivery, items go through: Open -> Released (to pick list) -> Picked.
- **Copy To**: Documents cascade forward. Data flows from Quotation to Order to Delivery to Invoice.
- **Reserve Invoice**: Special document for pre-delivery billing (increases committed qty but no inventory move).
- **Down Payment Invoice**: Pre-payment to liability account, reclassified to revenue when applied.

### Key Observations

- SAP B1 has the clearest separation of concerns: orders reserve, deliveries move, invoices bill.
- The "committed quantity" concept is critical for distribution and is missing from most Mexican SME systems.
- One-to-one relationship enforced between Delivery and Invoice.
- Documents cannot be modified after being copied forward (sequential integrity).

---

## 3. Bind ERP (Mexican Cloud ERP)

**Profile:** Popular Mexican cloud ERP for SMEs, comprehensive but not distribution-specialized

### Document Types

```
Cotizacion -> Pedido -> Remision/Prefactura -> Factura
```

### Document Details

| Document | Purpose | Inventory Impact | SAT Impact |
|----------|---------|-----------------|------------|
| **Cotizacion** | Price proposal | None | None |
| **Pedido** | Confirmed order | **Affects "disponible"** (orders reduce available) | None |
| **Remision** | Delivery without fiscal document | Inventory moves | None (no SAT stamp) |
| **Prefactura** | Pre-invoice for client confirmation | None | None (avoids wasting timbres) |
| **Factura** | Legal fiscal document (CFDI) | Inventory moves (if no prior Remision) | SAT stamped |

### Remision Statuses
- **Activa**: Pending invoicing
- **Pagada**: Paid
- Cannot invoice remissions that have a Credit Note applied

### Key Observations

- Bind uses the "Prefactura" concept to avoid wasting SAT timbres (stamps cost money). Client reviews prefactura, approves, then real factura is generated.
- Orders affect available quantity (similar to SAP B1's committed concept).
- Invoicing integrates automatically with inventory, accounting, and collections.
- Once a sale is recorded, it cannot be modified (immutable).
- The Remision is the key document for physical delivery without fiscal commitment.

---

## 4. Aspel SAE (Very Popular Mexican SME System)

**Profile:** Most installed Mexican SME system, desktop-based, acquired by Siigo

### Document Flow

```
Cotizacion -> Pedido -> Remision -> Factura -> Devolucion
```

### Document Details & Inventory Impact

| Document | Purpose | Inventory Impact | Can Skip? |
|----------|---------|-----------------|-----------|
| **Cotizacion** | Price proposal to prospect | **None** | Yes |
| **Pedido** | Formal purchase commitment | **None** (just a promise) | Yes |
| **Remision** | Merchandise dispatch | **YES - Decreases inventory** | Yes (can go Pedido->Factura directly) |
| **Factura** | Legal sale + CFDI | **YES - Decreases inventory** (only if no prior Remision) | No (final document) |
| **Devolucion** | Product return | **Increases inventory** (re-enters system) | N/A |

### Key Rules

- The **Remision is the inventory trigger** for the standard flow. If you issue a Remision, inventory decreases immediately. The subsequent Factura does NOT decrease inventory again.
- If you skip the Remision and go directly Pedido -> Factura, then the **Factura decreases inventory**.
- You can also go directly to Factura without any prior documents.
- Can be configured to "facturar sin existencias" (invoice without stock) - system auto-adjusts when stock is later received.
- Pedidos can be partially fulfilled ("surtir en forma parcial").

### Aspel SAE Statuses (per document type)

**Pedido statuses:**
- Pendiente (pending fulfillment)
- Surtido (fulfilled -> converted to Remision or Factura)
- Cancelado

**Remision statuses:**
- Pendiente (not yet invoiced)
- Facturada (has been invoiced)
- Devuelta (returned completely)
- Cancelada

### Key Observations

- Aspel SAE's "Remision = inventory movement" is the dominant Mexican accounting pattern.
- The ability to skip steps (Quote->Invoice directly) accommodates different business sizes.
- Partial fulfillment is built-in, which is essential for distribution (backorders).
- The system is built around Mexico's fiscal requirements: everything flows toward the Factura.

---

## 5. Microsip (Popular Mexican SME ERP)

**Profile:** Widely used Mexican ERP, modular, desktop-based

### Document Flow

```
Cotizacion -> Pedido -> Remision -> Factura
```

### Document Details

| Document | Purpose | Inventory Impact | Statuses |
|----------|---------|-----------------|----------|
| **Cotizacion** | Price proposal | **None** (no reports, no inventory) | Pendiente, Aceptada, Cancelada |
| **Pedido** | Customer order | **Affects existencias** | Pendiente, Surtido (parcial/total), Cancelado |
| **Remision** | Merchandise dispatch | **Decreases inventory** | Pendiente, Facturada, Devuelta, Cancelada |
| **Factura** | Legal sale + CFDI | **Decreases inventory** (only if no Remision) | Vigente, Cancelada |

### Conversion Paths

- **Pedido -> Remision**: "Remitir" button converts pedido to remision
- **Pedido -> Factura**: "Facturar" button skips remision, goes straight to factura
- **Remision -> Factura**: "Facturar" button on remision detail
- **Partial fulfillment**: "Surtir en forma parcial" checkbox - opens window showing items/quantities to verify partial delivery

### Related Documents Tab

When creating a Remision or Factura, the "Documentos Relacionados" tab shows "Pedidos pendientes del cliente" (pending orders). You can select one or more pedidos to fulfill in a single document.

### Key Observations

- Very similar to Aspel SAE (same Mexican accounting DNA).
- The "surtir" (fulfill) concept is central - pedidos are "surtidos" into remisiones or facturas.
- Multiple pedidos can be combined into a single remision/factura.
- "Disponible" column in the product grid shows real-time stock availability.

---

## Cross-System Comparison Matrix

### Document/Status Models

| System | Model Type | Documents/Statuses | Inventory Trigger |
|--------|-----------|-------------------|-------------------|
| **Handy.la** | Status-based (single entity) | ~5 statuses on Pedido | Route load (vehicle) / Delivery confirmation |
| **SAP B1** | Document-based (cascade) | 5 document types | Delivery document |
| **Bind ERP** | Hybrid (doc + status) | 5 doc types, few statuses | Remision or Factura |
| **Aspel SAE** | Document-based (cascade) | 4-5 doc types | Remision or Factura |
| **Microsip** | Document-based (cascade) | 4 doc types | Remision or Factura |
| **HandySuites** | Status-based (single entity) | 7 statuses on Pedido | VentaDirecta: at creation / Preventa: none yet |

### Preventa vs Venta Directa Handling

| System | Preventa | Venta Directa / Autoventa |
|--------|---------|--------------------------|
| **Handy.la** | Separate user type; order -> assign route -> load -> deliver | Separate user type; sell from vehicle stock; instant delivery |
| **SAP B1** | Standard flow (Quote->Order->Delivery->Invoice) | A/R Invoice + Payment (cash sale, one-time customer) |
| **Bind ERP** | Cotizacion->Pedido->Remision->Factura | Direct Factura (skip earlier steps) |
| **Aspel SAE** | Full flow with Pedido | Direct Factura or Nota de Venta |
| **Microsip** | Full flow Pedido->Remision->Factura | Direct Factura |
| **HandySuites** | Borrador->Enviado->Confirmado->EnProceso->EnRuta->Entregado | VentaDirecta: instant Entregado + Cobro (atomic) |

### Clicks from Creation to Delivery

| System | Preventa Path | Venta Directa Path |
|--------|--------------|-------------------|
| **Handy.la** | Create(1) + Assign Route(1) + Accept Load(1) + Deliver(1) = **4** | Create+Deliver = **1-2** |
| **SAP B1** | Quote(1) + Order(1) + Pick(1) + Delivery(1) + Invoice(1) = **5** | Invoice+Payment = **2** |
| **Bind ERP** | Cotizacion(1) + Pedido(1) + Remision(1) + Factura(1) = **4** | Factura = **1** |
| **Aspel SAE** | Pedido(1) + Remision(1) + Factura(1) = **3** | Factura = **1** |
| **Microsip** | Pedido(1) + Remision(1) + Factura(1) = **3** | Factura = **1** |
| **HandySuites** | Create(1) + Enviar(1) + Confirmar(1) + Procesar(1) + EnRuta(1) + Entregar(1) = **6** | Create+Pay = **1** (atomic endpoint) |

---

## Gap Analysis: HandySuites vs Industry

### Current HandySuites State Machine

```
Borrador(0) -> Enviado(1) -> Confirmado(2) -> EnProceso(3) -> EnRuta(4) -> Entregado(5)
                                                                            Cancelado(6) (from any state)
```

### Issues Identified

#### 1. TOO MANY STATUSES for Preventa (6 steps vs industry standard 3-4)
- `Enviado` and `Confirmado` add friction without clear business value
- `EnProceso` (warehouse picking) is an internal operation, not an order status in most systems
- Industry standard: **Pendiente -> En Surtido/Asignado -> En Ruta -> Entregado**
- Handy.la has effectively: **Creado -> Asignado a Ruta -> En Ruta -> Entregado**

#### 2. NO INVENTORY RESERVATION at Order Creation (Preventa)
- SAP B1 commits inventory at Sales Order creation (reduces "available")
- Bind reduces "disponible" when Pedido is created
- HandySuites currently: Preventa orders have ZERO inventory impact until... never (only VentaDirecta triggers SALIDA)
- **Risk**: Two salespeople sell the same stock to different clients

#### 3. MISSING "Remision" Concept
- Every Mexican ERP has a Remision (physical dispatch document that is NOT a fiscal document)
- In distribution: Remision = load the truck = inventory leaves warehouse
- HandySuites jumps from "EnProceso" (vague) to "EnRuta" (delivery) without a clear dispatch/loading step

#### 4. NO PARTIAL FULFILLMENT
- Aspel SAE and Microsip both support "surtir parcial" (partial fulfillment)
- Common scenario: client orders 100 units, warehouse only has 80, ship 80 now
- HandySuites: all-or-nothing delivery

#### 5. VENTA DIRECTA IS WELL IMPLEMENTED
- The atomic Pedido+Cobro creation (MobileVentaDirectaEndpoints) matches industry pattern
- Stock check before sale is correct
- Instant Entregado status is correct

#### 6. MISSING ROUTE CLOSURE / RECONCILIATION
- Handy.la has a formal "Cierre de Ruta" with merma/almacen/carga options
- HandySuites has EstadoRuta with Cerrada but the inventory reconciliation is not as sophisticated
- This is critical for autoventa where vehicle stock must be reconciled daily

---

## Recommended State Machine for HandySuites

Based on industry analysis, the optimal model for Mexican SME distribution:

### Option A: Simplified Status Model (Recommended)

```
PREVENTA:
  Pendiente(0)        -- Order created by salesperson in field
    -> PorSurtir(1)   -- Approved/confirmed by admin or auto-approved
      -> Surtido(2)   -- Warehouse prepared the order (inventory RESERVED)
        -> EnRuta(3)  -- Loaded on delivery vehicle (inventory LEAVES warehouse)
          -> Entregado(4)     -- Delivered to client (FINAL)
          -> EntregaParcial(5) -- Partial delivery (remainder stays PorSurtir)
          -> Devuelto(6)      -- Returned at delivery point
  Cancelado(7)        -- From any state except Entregado

VENTA DIRECTA:
  -> Entregado(4)     -- Instant (atomic: pedido + cobro + inventory SALIDA)
```

### Option B: Keep Current + Add Missing Pieces

If changing the enum is too disruptive:

```
Current: Borrador(0) -> Enviado(1) -> Confirmado(2) -> EnProceso(3) -> EnRuta(4) -> Entregado(5) -> Cancelado(6)

Proposed meaning clarification:
  Borrador(0)    = Salesperson drafting (can edit)
  Enviado(1)     = Submitted to backoffice (RESERVE inventory / committed qty)
  Confirmado(2)  = Admin approved (credit check passed)
  EnProceso(3)   = Warehouse picking/preparing (= "Surtiendo")
  EnRuta(4)      = Loaded on vehicle, out for delivery (inventory LEAVES warehouse)
  Entregado(5)   = Delivered successfully
  Cancelado(6)   = Cancelled (RELEASE reserved inventory)

ADD:
  EntregaParcial(7) = Partial delivery
  Devuelto(8)       = Returned at delivery
```

### Inventory Impact Points (Proposed)

| Transition | Inventory Action |
|-----------|-----------------|
| -> Enviado | **Reserve** (committed qty +, available qty -) |
| -> Confirmado | None (administrative approval) |
| -> EnProceso | None (warehouse picking in progress) |
| -> EnRuta | **Move** (physical inventory leaves warehouse to vehicle) |
| -> Entregado | **Confirm** (product with client, vehicle stock decreases) |
| -> Cancelado | **Release** (undo reservation if was Enviado/Confirmado/EnProceso) |
| -> Devuelto | **Return** (product back to warehouse or vehicle stock) |
| VentaDirecta create | **Immediate SALIDA** (current behavior, correct) |

---

## Key Recommendations

1. **Add inventory reservation at Enviado**: This is the #1 gap. Without it, overselling is possible.

2. **Add the "Remision" concept as EnRuta transition logic**: When status changes to EnRuta, this IS the remision moment - inventory physically leaves the warehouse. Document this clearly.

3. **Consider partial fulfillment**: Not urgent but important for growth. "Surtir parcial" is expected by any distributor with 50+ SKUs.

4. **Route closure reconciliation**: The current Cerrada state on EstadoRuta needs inventory reconciliation logic (merma, almacen return, carry-forward).

5. **Do NOT adopt the document-cascade model**: HandySuites' status-based model is correct for field sales apps. The document model (Aspel/Microsip/Bind) is for back-office ERP. Keep a single Pedido entity with statuses.

6. **Keep the Factura as a separate entity**: The existing Pedido->Factura integration (billing API's from-order endpoint) correctly follows the Mexican pattern where factura is generated after delivery, not as part of the order flow.

---

## Sources

- [Handy.la - Homepage](https://www.handy.la/)
- [Handy.la - Pedidos en linea](https://www.handy.la/pedidos-en-linea)
- [Handy.la - Rutas de venta y reparto](https://help.handy.la/es/article/rutas-de-venta-y-reparto-sp9b0i/)
- [Handy.la - Cierre de Ruta](https://help.handy.la/es/article/cierre-de-ruta-e2y8x5/)
- [Handy.la - Ventas Help Category](https://help.handy.la/es/category/ventas-1uhhjwl/)
- [SAP Business One - Sales Documents In-Depth](https://firebearstudio.com/blog/sap-business-one-in-depth-review-sales-and-accounts-receivable-documents.html/1000)
- [SAP Business One - Inventory Allocation](https://seidorb1support.helpdocsite.com/inv/inventory-management-and-item-allocation-in-sap-business-one)
- [SAP Business One - Sales Process Overview](https://www.vinasystem.com/en/blogs/sap-hana/automating-the-sales-process-in-sap-business-one-sales-process-overview)
- [SAP Business One - Delivery Guide](https://www.vinasystem.com/en/blogs/customers/sap-business-one-user-guide-for-delivery)
- [Bind ERP - Captura de Venta](https://ayuda.bind.com.mx/capturadeventadetallado)
- [Bind ERP - Facturar Remisiones](https://ayuda.bind.com.mx/hc/es/articles/360013131393-facturar-remisiones)
- [Bind ERP - Homepage](https://bind.com.mx)
- [Aspel SAE - Explicacion basica](https://armandresendiz.blogspot.com/2016/11/explicacion-basica-de-aspel-sae.html)
- [Aspel SAE - Elaborar Remision](https://siigonubeportaldeclientes.aspel.com.mx/elaborar-remision/)
- [Aspel SAE - Configurar Parametros Ventas](https://saeportaldeclientes.aspel.com.mx/configurar-parametros-generales-de-ventas/)
- [Aspel SAE - Manual PDF](https://micom.mx/storage/recursos/Manual%20Aspel%20SAE.pdf)
- [Microsip - Facturar una Remision](https://club.microsip.com/microsip-ventas/post/microsip-ventas-facturar-una-remision-0b15rdogiesoxRu)
- [Microsip - Facturar un Pedido](https://club.microsip.com/microsip-ventas/post/microsip-ventas-facturar-un-pedido-pqXVOV1UHYOoTsT)
- [Microsip - Manual Remision](https://castillocontadores.mx/manual-microsip-como-crear-una-remision/)
- [Route POS - Preventa vs Autoventa](https://route-pos.com/blog/por-que-preventa-en-lugar-de-autoventa/)
- [Farandsoft - Software Autoventa y Preventa](https://www.farandsoft.com/software-de-autoventa-y-preventa-impulsa-tu-fuerza-comercial-con-tecnologia-conectada-a-tu-erp/)
- [CloudInfo - Software Gestion Pedidos 2025](https://cloudinfo.mx/los-mejores-software-para-gestionar-pedidos-y-entregas-en-2025/)
