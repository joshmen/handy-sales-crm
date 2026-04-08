# Subscription Consumo & Timbre Purchase

## Context

Users have no visibility into their timbre (CFDI stamp) or AI credit balances until they hit a limit and get an error. The `/subscription` page shows plan details, users, products, and payment methods — but nothing about consumption. Users need to see their balance and buy extra timbres when they run out.

## Design

### 1. New Section on /subscription — "Consumo"

After the plan info cards (Usuarios, Vencimiento, Productos), add a **"Consumo"** section with two cards:

**Timbres CFDI Card:**
- Progress bar: "12 / 50 usados este mes" (green → amber → red as usage increases)
- Label: "50 incluidos en Plan Profesional"
- If extras > 0: "+ 25 extras disponibles"
- CTA button: "Comprar timbres →" → navigates to `/subscription/buy-timbres`

**Créditos IA Card:**
- Progress bar: "34 / 100 usados este mes"
- Label: "100 incluidos en Plan Profesional"
- If extras > 0: "+ 10 extras disponibles"
- CTA button: "Comprar créditos →" → navigates to `/subscription/buy-creditos` (future)

Both cards use 3D icons from DashboardIcons (SbBilling for timbres, SbAI for credits).

### 2. New Page — /subscription/buy-timbres

Dedicated purchase page (not modal/drawer — this is a money transaction):

**Layout:**
- PageHeader with breadcrumbs: Suscripción > Comprar timbres
- Current balance summary: "Tu balance: 12/50 usados + 0 extras"
- 3 package cards (selectable):
  - 25 timbres — $50 MXN ($2.00/timbre)
  - 50 timbres — $85 MXN ($1.70/timbre) — "Más popular" badge
  - 100 timbres — $150 MXN ($1.50/timbre) — "Mejor valor" badge
- Selected package highlighted with green border
- "Pagar $X MXN" button → Stripe Checkout
- "Cancelar" button → confirmation dialog "¿Seguro que quieres salir?" → back to /subscription
- On Stripe success: redirect to /subscription?success=timbres → toast "25 timbres agregados"

### 3. Backend — TimbrePurchase Entity + Endpoints

**New entity** `TimbrePurchase` (mirrors `AiCreditPurchase`):
```
- Id (int PK)
- TenantId (int)
- Cantidad (int) — 25, 50, or 100
- PrecioMxn (decimal) — 50.00, 85.00, or 150.00
- StripeCheckoutSessionId (string?)
- StripePaymentIntentId (string?)
- Estado (string) — "pendiente" | "completado" | "fallido"
- CreadoEn (DateTime)
- CompletadoEn (DateTime?)
```

**New column** on Tenants: `timbres_extras` (int, default 0) — extras purchased, NOT reset monthly.

**Modified balance calculation**:
```
disponibles = (max_timbres_mes - timbres_usados_mes) + timbres_extras
```
When consuming a timbre: first deduct from monthly included, then from extras.

**New endpoints** in SubscriptionEndpoints:
- `POST /api/subscription/timbres/checkout` — creates Stripe Checkout Session, returns URL
- `GET /api/subscription/timbres/purchases` — purchase history

**Modified endpoint**:
- `GET /api/subscription/timbres` — add `extras` field to response

**Stripe webhook handler** (existing file):
- Add handler for `checkout.session.completed` with metadata `type=timbre_purchase`
- Calls `AddExtraTimbresAsync(tenantId, cantidad)`

### 4. Stripe Integration

**Products** (create in Stripe Dashboard or via API):
- "Timbres CFDI x25" — $50 MXN (one-time)
- "Timbres CFDI x50" — $85 MXN (one-time)
- "Timbres CFDI x100" — $150 MXN (one-time)

**Checkout Session** parameters:
```
mode: "payment" (one-time, not subscription)
metadata: { type: "timbre_purchase", tenantId, cantidad }
success_url: /subscription?success=timbres
cancel_url: /subscription/buy-timbres
```

### 5. Files to Create/Modify

**New files:**
- `libs/HandySuites.Domain/Entities/TimbrePurchase.cs`
- `apps/web/src/app/(dashboard)/subscription/buy-timbres/page.tsx`

**Modified files:**
- `libs/HandySuites.Infrastructure/Persistence/HandySuitesDbContext.cs` — add DbSet
- `libs/HandySuites.Infrastructure/Services/SubscriptionEnforcementService.cs` — include extras in balance
- `apps/api/src/HandySuites.Api/Endpoints/SubscriptionEndpoints.cs` — add checkout + purchase history endpoints
- `apps/api/src/HandySuites.Api/Endpoints/StripeWebhookEndpoints.cs` — handle timbre purchase webhook
- `apps/web/src/app/(dashboard)/subscription/page.tsx` — add Consumo section
- `apps/web/src/types/subscription.ts` — add TimbrePurchase type
- `apps/web/src/services/api/subscriptions.ts` — add purchase API functions
- EF migration for `timbres_extras` column + `TimbrePurchase` table

### 6. Verification

- Type-check: `npm run type-check` — 0 errors
- Backend: `dotnet test` — all pass
- Playwright E2E:
  1. Navigate to /subscription → verify Consumo section shows timbres + créditos IA balance
  2. Click "Comprar timbres" → verify /subscription/buy-timbres loads with packages
  3. Select package → click "Pagar" → verify Stripe Checkout redirects
  4. Mock success callback → verify balance updated
  5. Set timbres to 0, try timbrar → modal appears → click "Comprar timbres adicionales" → arrives at buy-timbres page
