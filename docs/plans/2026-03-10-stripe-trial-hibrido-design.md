# Stripe Trial Hibrido — Design Doc

**Fecha**: 2026-03-10
**Estado**: APROBADO (pendiente implementacion)
**Modelo**: Enfoque C — Hibrido (sin tarjeta → pedir tarjeta antes del fin → cobro automatico)

---

## Resumen Ejecutivo

Implementar un sistema de trial de 14 dias para nuevos tenants de HandySuites:
1. **Registro sin tarjeta** — Cero friccion, maximiza signups (como handy.la, Pipedrive, Kommo)
2. **Emails de valor + urgencia** — Secuencia automatizada durante el trial
3. **Pedir tarjeta antes del fin** — Dia 10-12, convertir a opt-out
4. **Cobro automatico** — Si metio tarjeta, Stripe cobra al terminar el trial
5. **Pausa si no paga** — Cuenta se pausa (no se borra), puede reactivar despues

## Contexto Competitivo

| Competidor | Tarjeta upfront? | Trial | Modelo |
|---|---|---|---|
| handy.la | No | 15 dias | Opt-in |
| Pipedrive | No | 14 dias | Opt-in |
| Kommo | No | 14 dias | Opt-in |
| Zoho CRM | No | 15 dias | Opt-in |
| HubSpot | No | Freemium | Perpetuo gratis |

HandySuites usara modelo hibrido: empieza opt-in, convierte a opt-out a mitad del trial.

## Datos de Conversion (Industria SaaS 2026)

- Sin tarjeta (opt-in): 3-4x mas signups, 18-25% conversion trial→paid
- Con tarjeta (opt-out): menos signups, 49-60% conversion
- Hibrido: maximiza signups + mejora conversion vs opt-in puro

---

## Arquitectura del Flujo

### Fase 1: Registro (Dia 0)

```
Usuario → /register → Crea cuenta + Tenant → subscription_status = "Trial"
                                             → plan_tipo = "PRO" (TBD)
                                             → fecha_suscripcion = now
                                             → fecha_expiracion = now + 14 dias
                                             → trial_ends_at = now + 14 dias (NUEVO)
                                             → NO stripe_customer_id (aun)
                                             → NO stripe_subscription_id (aun)
```

**Cambios necesarios**:
- Agregar campo `trial_ends_at` (DateTime?) a Tenant
- Agregar campo `trial_card_collected_at` (DateTime?) a Tenant
- Modificar registro para setear trial automaticamente
- El tenant tiene acceso completo al plan durante el trial

### Fase 2: Secuencia de Emails (Dias 1-14)

| Dia | Email | Proposito |
|-----|-------|-----------|
| 0 | Bienvenida | "Tienes 14 dias para explorar HandySuites PRO" |
| 3 | Valor #1 | "Tip: Configura tu catalogo de productos" (onboarding) |
| 7 | Valor #2 | "Tip: Crea tu primera ruta de ventas" (engagement) |
| 10 | Urgencia #1 | "Te quedan 4 dias — agrega tu metodo de pago para no perder acceso" |
| 12 | Urgencia #2 | "Faltan 2 dias — sin metodo de pago tu cuenta se pausara" |
| 13 | Ultimo aviso | "Manana termina tu trial — [Agregar tarjeta ahora]" |
| 14 | Trial terminado | (si no metio tarjeta) "Tu cuenta esta pausada — [Reactivar]" |

**Implementacion**:
- Extender `SubscriptionMonitor` (ya corre cada hora) para detectar tenants en trial
- Usar tabla `ScheduledActions` existente para evitar envios duplicados
- Templates de email via `IEmailService` existente

### Fase 3: Captura de Tarjeta (Dias 10-14)

```
Usuario → /subscription → Banner "Agrega tu tarjeta para continuar"
       → Click "Agregar metodo de pago"
       → Stripe Checkout (mode: "setup") o SetupIntent embebido
       → Webhook: setup_intent.succeeded
       → Backend:
           1. Crea Stripe Customer (si no existe)
           2. Attach PaymentMethod al Customer
           3. Crea Stripe Subscription con trial_end = fecha_expiracion
           4. Guarda stripe_customer_id, stripe_subscription_id en Tenant
           5. Guarda trial_card_collected_at = now
```

**Opcion tecnica — Stripe Checkout con trial**:
```csharp
// Crear Checkout Session con trial
var options = new SessionCreateOptions
{
    Mode = "subscription",
    Customer = stripeCustomerId, // o crear nuevo
    LineItems = new List<SessionLineItemOptions>
    {
        new() { Price = stripePriceId, Quantity = 1 }
    },
    SubscriptionData = new SessionSubscriptionDataOptions
    {
        TrialEnd = DateTimeOffset.FromDateTime(tenant.TrialEndsAt.Value).ToUnixTimeSeconds(),
        // trial_end = fecha exacta del fin del trial (no trial_period_days)
    },
    PaymentMethodCollection = "always", // REQUIERE tarjeta
    SuccessUrl = returnUrl + "?session_id={CHECKOUT_SESSION_ID}",
    CancelUrl = returnUrl,
};
```

**Alternativa — SetupIntent + Subscription API**:
```csharp
// 1. Crear SetupIntent para capturar tarjeta
var setupIntent = await _stripe.SetupIntents.CreateAsync(new SetupIntentCreateOptions
{
    Customer = customerId,
    PaymentMethodTypes = new List<string> { "card" },
});

// 2. Frontend confirma SetupIntent (Stripe Elements)

// 3. Webhook setup_intent.succeeded → crear subscription
var subscription = await _stripe.Subscriptions.CreateAsync(new SubscriptionCreateOptions
{
    Customer = customerId,
    Items = new List<SubscriptionItemOptions>
    {
        new() { Price = stripePriceId }
    },
    TrialEnd = trialEndTimestamp,
    DefaultPaymentMethod = paymentMethodId,
});
```

**Recomendacion**: Usar **Stripe Checkout con trial** (primera opcion) porque:
- Ya tienes Checkout integrado en `StripeService.CreateCheckoutSessionAsync()`
- Menos codigo nuevo
- Stripe maneja toda la UI de tarjeta + validacion + SCA
- Solo necesitas agregar `SubscriptionData.TrialEnd`

### Fase 4: Cobro Automatico (Dia 14+)

Si el tenant metio tarjeta:
```
Stripe → invoice.paid webhook → Backend actualiza:
  - subscription_status = "Active"
  - fecha_expiracion = siguiente periodo
  - Envia email "Pago exitoso, bienvenido a HandySuites PRO"
```

Si Stripe no puede cobrar:
```
Stripe → invoice.payment_failed webhook → Backend:
  - subscription_status = "PastDue"
  - grace_period_end = now + 7 dias
  - Email "Tu pago fallo, actualiza tu metodo de pago"
```

### Fase 5: Pausa si No Pago (Dia 14, sin tarjeta)

```
SubscriptionMonitor (cada hora) detecta:
  - trial_ends_at <= now
  - stripe_subscription_id IS NULL (no metio tarjeta)
  → subscription_status = "Expired"
  → grace_period_end = now + 3 dias (gracia corta)
  → Email "Tu trial termino — agrega tu tarjeta para continuar"

Despues de grace_period_end:
  → tenant.Activo = false (cuenta pausada)
  → SessionVersion++ (force logout)
  → Email "Tu cuenta fue pausada — [Reactivar]"
```

**NO se borran datos** — el tenant puede reactivar en cualquier momento agregando tarjeta.

---

## Cambios por Capa

### Backend (apps/api/)

| Archivo | Cambio |
|---------|--------|
| `Tenant.cs` | Agregar `TrialEndsAt`, `TrialCardCollectedAt` |
| `HandySuitesDbContext.cs` | Configurar nuevos campos |
| EF Migration | Nueva migracion con 2 columnas |
| `StripeService.cs` | Nuevo metodo `CreateTrialCheckoutSessionAsync()` con `TrialEnd` |
| `SubscriptionEndpoints.cs` | Nuevo endpoint `POST /api/subscription/trial-checkout` |
| `SubscriptionMonitor.cs` | Agregar logica de trial emails + trial expiration |
| `AuthService.cs` (Register) | Setear `subscription_status = "Trial"`, `trial_ends_at` al crear tenant |
| `EmailTemplates.cs` | 7 nuevos templates (ver tabla de emails) |

### Frontend (apps/web/)

| Archivo | Cambio |
|---------|--------|
| `subscription/page.tsx` | Banner de trial con countdown + CTA "Agregar tarjeta" |
| `types/subscription.ts` | Agregar `trialEndsAt`, `trialCardCollectedAt` |
| `subscriptions.ts` (API) | Nuevo metodo `createTrialCheckout()` |
| Layout/Header | Badge "Trial: X dias restantes" (opcional) |
| Register flow | Remover seleccion de plan en registro (todos entran a trial) |

### Stripe Dashboard

| Configuracion | Valor |
|---------------|-------|
| Customer emails | Activar "Trial ending reminder" (7 dias antes) |
| Webhook events | Agregar `setup_intent.succeeded` si no existe |
| Products/Prices | Usar prices existentes (BASIC/PRO monthly/annual) |

---

## Campos Nuevos en Tenant

```csharp
// En Tenant.cs
public DateTime? TrialEndsAt { get; set; }           // Cuando termina el trial
public DateTime? TrialCardCollectedAt { get; set; }   // Cuando metio tarjeta (null = no ha metido)
```

## Endpoints Nuevos/Modificados

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `POST /api/subscription/trial-checkout` | POST | Crear Checkout session con trial_end (para capturar tarjeta) |
| `GET /api/subscription/current` | GET | (modificar) Incluir `trialEndsAt`, `daysRemaining`, `cardCollected` |

## Estados del Tenant (Lifecycle)

```
Registro → Trial (14 dias, sin tarjeta)
              ↓ mete tarjeta
         Trial+Card (Stripe subscription con trial_end)
              ↓ dia 14, Stripe cobra
         Active (subscription activa, renovacion automatica)
              ↓ falla pago
         PastDue (7 dias gracia)
              ↓ no paga
         Expired → Desactivado

Trial (sin tarjeta) → dia 14 sin tarjeta → Expired (3 dias gracia) → Desactivado
```

---

## Secuencia de Implementacion

### Paso 1: Backend — Modelo + Migration
- [ ] Agregar `TrialEndsAt`, `TrialCardCollectedAt` a Tenant
- [ ] Generar EF Core migration
- [ ] Rebuild API container, verificar migration aplica

### Paso 2: Backend — Registro con Trial
- [ ] Modificar `AuthService.Register()` para setear trial fields
- [ ] Setear `subscription_status = "Trial"`, `plan_tipo = "PRO"` (o parametro)
- [ ] Setear `trial_ends_at = now + 14 dias`
- [ ] Tests unitarios

### Paso 3: Backend — Trial Checkout (captura de tarjeta)
- [ ] Nuevo metodo `CreateTrialCheckoutSessionAsync()` en StripeService
- [ ] Usar `SubscriptionData.TrialEnd` con fecha exacta
- [ ] Nuevo endpoint `POST /api/subscription/trial-checkout`
- [ ] Webhook handler para activar subscription post-trial
- [ ] Tests unitarios

### Paso 4: Backend — SubscriptionMonitor (trial lifecycle)
- [ ] Detectar tenants en trial cercanos a expiracion
- [ ] Enviar emails segun tabla (dias 0, 3, 7, 10, 12, 13, 14)
- [ ] Marcar trial expirado si no metio tarjeta
- [ ] Grace period + desactivacion
- [ ] Tests unitarios

### Paso 5: Backend — Email Templates
- [ ] 7 templates nuevos (bienvenida, valor x2, urgencia x3, trial terminado)
- [ ] Usar branding consistente con emails existentes

### Paso 6: Frontend — Subscription Page
- [ ] Banner de trial con countdown
- [ ] CTA "Agregar metodo de pago" → Stripe Checkout embebido
- [ ] Estado post-tarjeta: "Listo, se cobrara automaticamente el [fecha]"
- [ ] Manejar estado "Trial expirado" con CTA de reactivacion

### Paso 7: Frontend — Trial Badge (Header)
- [ ] Badge en header/sidebar: "Trial: X dias"
- [ ] Color verde → amarillo → rojo segun dias restantes

### Paso 8: Stripe Dashboard Config
- [ ] Activar "Trial ending reminder" email
- [ ] Verificar webhook events incluyen setup_intent.succeeded
- [ ] Probar flujo completo en Stripe test mode

### Paso 9: Testing E2E
- [ ] Flujo completo: registro → trial → agregar tarjeta → cobro
- [ ] Flujo sin tarjeta: registro → trial → expiracion → pausa
- [ ] Webhook testing con Stripe CLI
- [ ] E2E Playwright tests

### Paso 10: Deploy + Seed
- [ ] Actualizar tenants existentes (no afectar tenants activos)
- [ ] Deploy a Railway
- [ ] Verificar en produccion con Stripe test mode

---

## Consideraciones Legales (Mexico)

- **PROFECO**: Informar claramente que se cobrara automaticamente al terminar el trial
- **Aviso de privacidad**: Ya cubierto con el existente
- **Cancelacion facil**: Stripe Billing Portal ya permite cancelar en 1 click
- **Emails**: Incluir link de cancelacion en cada email de cobro proximo

## Riesgos

| Riesgo | Mitigacion |
|--------|------------|
| Usuarios con tarjetas que fallan | Grace period de 7 dias + email de fallo |
| Abuso de trials (multiples cuentas) | Rate limit por email/IP + verificacion email |
| PROFECO compliance | Texto claro en registro + emails de aviso |
| Tenants existentes afectados | Migration solo agrega campos nullable, no altera status |

---

## Metricas de Exito

- **Trial signup rate**: Baseline vs nuevo flujo
- **Card collection rate**: % de trials que meten tarjeta antes del dia 14
- **Trial-to-paid conversion**: Target 30-40% (entre opt-in 20% y opt-out 50%)
- **Churn rate post-trial**: % que cancela en primer mes post-trial
- **Time to card**: Dia promedio en que meten tarjeta (target: dia 10-12)
