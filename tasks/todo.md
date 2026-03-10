# Current Task — Onboarding Wizard Redesign

> **Fecha**: 9 de marzo de 2026
> **Objetivo**: Reemplazar el botón flotante "Primeros Pasos" con un wizard de onboarding estilo Attio
> **Design proposal**: Aprobado por el usuario (ver conversación)

---

## Phase 1: Backend — OnboardingCompleted on Tenant [PENDING]

### Files to modify:
- `libs/HandySales.Domain/Entities/Tenant.cs` — Add `bool OnboardingCompleted = false`
- `libs/HandySales.Infrastructure/Migrations/` — New migration
- `apps/api/src/HandySales.Api/Endpoints/TenantEndpoints.cs` — Add `PATCH /api/tenants/complete-onboarding`

### Steps:
- [ ] Add `OnboardingCompleted` property to Tenant entity
- [ ] Generate EF Core migration `AddOnboardingCompletedToTenant`
- [ ] New endpoint: `PATCH /api/tenants/complete-onboarding` (current tenant only)
- [ ] Include `onboardingCompleted` in `/api/auth/me` or login response so frontend can check
- [ ] `dotnet test` passes
- [ ] Rebuild API container

---

## Phase 2: Frontend — Types + API Service [PENDING]

### Steps:
- [ ] Add `onboardingCompleted: boolean` to Tenant type
- [ ] Add `completeOnboarding()` API method
- [ ] Add `updateDatosEmpresa(data)` API method (if not exists)

---

## Phase 3: Frontend — Onboarding Wizard Page [PENDING]

### New files:
- `apps/web/src/app/onboarding/page.tsx` — OUTSIDE (dashboard) layout
- `apps/web/src/app/onboarding/layout.tsx` — Minimal layout

### 5 Steps:
1. **Tu Perfil** — foto, nombre (pre-filled), apellido, teléfono
2. **Tu Empresa** — logo, nombre comercial, RFC, razón social, giro, dirección
3. **Tu Equipo** — invite email + role (skippable)
4. **Personaliza** — module chips toggle (skippable)
5. **¡Listo!** — summary + CTA "Ir al Tablero"

### Layout:
- Desktop: Left 55% form + Right 45% live sidebar preview (always dark)
- Mobile: Single column, no preview, sticky bottom CTAs

---

## Phase 4: Frontend — Redirect Logic [PENDING]

### Files to modify:
- `apps/web/src/app/verify-email/page.tsx` — Redirect to `/onboarding` after verification
- `apps/web/src/app/register/page.tsx` — Google OAuth → redirect to `/onboarding`
- `apps/web/src/middleware.ts` — Add `/onboarding` as protected route
- `apps/web/src/app/(dashboard)/layout.tsx` — Redirect if onboarding not completed

### Edge cases:
- Existing users: auto-mark completed if they have data
- SuperAdmin: skip (no business to configure)
- Invited users (non-admin): skip
- Users coming from invite link: skip

---

## Phase 5: Frontend — Remove Floating Button + Polish [PENDING]

### Steps:
- [ ] Delete floating "Primeros Pasos" link from Layout.tsx
- [ ] Move TourPrompt to only show inside `/getting-started`
- [ ] Fix all hardcoded colors in getting-started page for dark mode

---

## Phase 6: Frontend — Sidebar Progress Indicator [PENDING]

### Files to modify:
- `apps/web/src/components/layout/Sidebar.tsx`

### Design:
- Thin progress bar + "Configuración 3/14" text
- Click → `/getting-started`
- Disappears when all 14 steps complete
- Refactor detection logic into shared hook

---

## Phase 7: Frontend — Dashboard Welcome Banner [PENDING]

### Files to modify:
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`

### Design:
- Dismissible card at top: "Bienvenido, [nombre]. Tu negocio está al [X]%."
- Auto-hide after 7 days
- Theme-aware

---

## Implementation Order

| Step | Phase | Effort | Depends On |
|------|-------|--------|------------|
| 1 | Phase 1: Backend | Small | — |
| 2 | Phase 2: Types + API | Small | Step 1 |
| 3 | Phase 3: Wizard page | **Large** | Step 2 |
| 4 | Phase 4: Redirect logic | Medium | Step 3 |
| 5 | Phase 5: Remove floating + polish | Small | Independent |
| 6 | Phase 6: Sidebar indicator | Medium | Step 5 |
| 7 | Phase 7: Dashboard banner | Small | Step 2 |

---

## Verification
1. `dotnet test` — 0 regressions
2. `docker-compose up -d --build api_main` — API starts
3. `npm run type-check` — 0 errors
4. Register new account → wizard → complete → dashboard
5. Existing user login → no wizard
6. Sidebar shows progress → click → getting-started
7. Dark mode works everywhere

---

## Previous Tasks (Archived)

### Auditoría Integral (Fases 0-6)
See `tasks/audit-remediation-plan.md` for the full audit backlog.

### Sprint 4 (completado — commit 7b3c7da)
- [x] C4: SubscriptionPlan CRUD + enforcement service
- [x] C5: Aviso de privacidad + Términos de servicio
- [x] 207 E2E passing, TypeScript 0 errores nuevos
