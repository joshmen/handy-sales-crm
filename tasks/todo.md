# Current Task — Stripe Trial Hibrido + Marketplace Integraciones

> **Fecha**: 11 de marzo de 2026
> **Plan**: `C:\Users\AW AREA 51M R2\.claude\plans\merry-gathering-toucan.md`

---

## PART 1: Stripe Trial Hibrido

### Backend
- [x] Step 1: Add TrialEndsAt + TrialCardCollectedAt to Tenant entity + migration
- [x] Step 2: Update registration (RegisterAsync + SocialRegisterAsync) — PlanTipo=PRO, MaxUsuarios=10, TrialEndsAt=+14d
- [x] Step 3: Trial checkout endpoint (POST /api/subscription/trial-checkout) with Stripe embedded checkout + TrialEnd
- [x] Step 4: Webhook handling — is_trial_checkout metadata, TrialCardCollectedAt, keep Trial status
- [x] Step 5: SubscriptionMonitor — trial expiration logic (3-day grace, skip tenants with card)
- [ ] Step 6: Trial email sequence (7 emails) — DEFERRED, lower priority
- [x] Step 7: /subscription/current returns trialEndsAt, trialCardCollected, daysRemaining

### Frontend
- [x] Step 8: Trial countdown banner on subscription page (color-coded, CTA for card capture)
- [x] Step 9: Trial badge in header ("Trial: Xd" with color coding, links to /subscription)
- [x] Step 10: Register page copy update ("Prueba gratis por 14 dias — acceso PRO completo")

---

## PART 2: Marketplace Integraciones

### Phase 1: Backend
- [x] Step 1: Domain entities (Integration, TenantIntegration, IntegrationLog)
- [x] Step 2: DbContext + Migration (3 DbSets, query filters, unique index)
- [x] Step 3: Application layer (DTOs, IIntegrationRepository, IntegrationService)
- [x] Step 4: Repository implementation
- [x] Step 5: REST endpoints (5 endpoints in IntegrationEndpoints.cs)
- [x] Step 6: Seed data SQL (seed_integrations.sql — 4 integrations)

### Phase 2: Frontend
- [x] Step 7: TypeScript types (integration.ts) + API service (integrations.ts)
- [x] Step 8: Sidebar item ("Integraciones", Admin/SuperAdmin only)
- [x] Step 9: Marketplace page (cards, filter tabs, activate/deactivate)
- [ ] Step 10: IntegrationsContext (load active integrations, hasIntegration helper) — DEFERRED

---

## Verification Status

| Check | Status |
|-------|--------|
| `dotnet build` | PASS (warnings only) |
| `dotnet test` | 391/391 PASS |
| `npm run type-check` | 0 errors |
| Backend builds | OK |
| Frontend compiles | OK |

---

## Files Created/Modified This Session

### New Files
- `libs/HandySales.Domain/Entities/Integration.cs`
- `libs/HandySales.Domain/Entities/TenantIntegration.cs`
- `libs/HandySales.Domain/Entities/IntegrationLog.cs`
- `libs/HandySales.Application/Integrations/DTOs/IntegrationDtos.cs`
- `libs/HandySales.Application/Integrations/Interfaces/IIntegrationRepository.cs`
- `libs/HandySales.Application/Integrations/Services/IntegrationService.cs`
- `libs/HandySales.Infrastructure/Repositories/Integrations/IntegrationRepository.cs`
- `apps/api/src/HandySales.Api/Endpoints/IntegrationEndpoints.cs`
- `apps/web/src/types/integration.ts`
- `apps/web/src/services/api/integrations.ts`
- `apps/web/src/app/(dashboard)/integrations/page.tsx`
- `infra/database/schema/seed_integrations.sql`
- EF Core migrations: AddTrialFieldsToTenant, AddIntegrationsMarketplace

### Modified Files
- `libs/HandySales.Domain/Entities/Tenant.cs` — TrialEndsAt, TrialCardCollectedAt
- `apps/api/src/HandySales.Api/Auth/AuthService.cs` — Trial registration
- `apps/api/src/HandySales.Api/Payments/StripeService.cs` — Trial checkout + webhook
- `apps/api/src/HandySales.Api/Endpoints/SubscriptionEndpoints.cs` — Trial checkout endpoint + trial info
- `apps/api/src/HandySales.Api/Workers/SubscriptionMonitor.cs` — Trial expiration
- `apps/api/src/HandySales.Api/Configuration/ServiceRegistrationExtensions.cs` — DI for integrations
- `apps/api/src/HandySales.Api/Program.cs` — MapIntegrationEndpoints
- `libs/HandySales.Infrastructure/Persistence/HandySalesDbContext.cs` — 3 new DbSets
- `libs/HandySales.Application/CompanySettings/DTOs/CompanySettingsDto.cs` — TrialEndsAt, DaysRemaining
- `libs/HandySales.Application/CompanySettings/Services/CompanySettingsService.cs` — Map trial fields
- `apps/web/src/services/api/companyService.ts` — Trial fields in type
- `apps/web/src/services/api/subscriptions.ts` — createTrialCheckoutSession
- `apps/web/src/types/subscription.ts` — Trial fields
- `apps/web/src/app/(dashboard)/subscription/page.tsx` — Trial countdown banner
- `apps/web/src/components/layout/Header.tsx` — Trial badge
- `apps/web/src/components/layout/Sidebar.tsx` — Integraciones sidebar item
- `apps/web/src/app/register/page.tsx` — Updated copy

---

## Deferred Items
- **Trial email sequence** (Step 6): 7 drip emails over 14 days. Needs ScheduledActions + email templates.
- **IntegrationsContext** (Step 10): Global context for `hasIntegration(slug)`. Build when integrations affect other UI.
- **Billing Portal connection**: After PAC is connected for real SAT invoicing.

---

## Previous Tasks (Archived)

### Onboarding Wizard (completado — session anterior)
See previous todo.md in git history.

### Sprint 4 (completado — commit 7b3c7da)
- [x] C4: SubscriptionPlan CRUD + enforcement service
- [x] C5: Aviso de privacidad + Terminos de servicio
