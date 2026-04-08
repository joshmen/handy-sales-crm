# reCAPTCHA v3 + Email Invitation Flow — Design

## Date: 2026-03-10

## Decisions Made
- Google reCAPTCHA v3 (invisible, score-based)
- Token sent alongside login/register payload (single request, Option A)
- Invitation via "set your password" link (Option B — no temp passwords in email)
- Dedicated `/set-password?token=xxx` page (Option A — not reusing verify-email)

---

## Feature 1: Google reCAPTCHA v3

### Frontend
- Library: `react-google-recaptcha-v3`
- Wrap login + register with `GoogleReCaptchaProvider`
- On submit: `executeRecaptcha('login'|'register')` → send `recaptchaToken` with payload
- No visible widget (v3 is invisible)

### Backend
- `RecaptchaService` in `HandySuites.Shared` — validates token via Google API
- `AuthEndpoints`: validate token before processing login/register
- Reject if score < 0.5
- Dry-run when `RECAPTCHA_SECRET_KEY` env var missing (dev mode)

### CSP Headers
- Allow `www.google.com/recaptcha/` and `www.gstatic.com/recaptcha/`

### Env Vars
| Variable | Platform | Value |
|----------|----------|-------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Vercel | `6Lc8rIUsAAAAACD1-a-uJYYJmrtdmtSWrAaPj-_X` |
| `RECAPTCHA_SECRET_KEY` | Railway (api_main) | `6Lc8rIUsAAAAAIXzTgrXdXRS5beULQvYsxNAH3O1` |

---

## Feature 2: Email Invitation Flow

### Flow
1. Admin creates user (via onboarding Step 3 or Usuarios page)
2. Backend creates user with random password hash (user can't know it)
3. Backend generates invitation token (GUID, BCrypt-hashed in DB, 24h expiry)
4. Backend sends email: "You've been invited to {TenantName} on Handy Suites — click to set your password"
5. User clicks link → `/set-password?token=xxx&email=yyy`
6. Page validates token → shows password + confirm fields
7. On submit: backend validates token, sets new password, marks token used
8. User redirected to login

### Backend Changes
- Add to `Usuario` entity: `InvitationToken` (string, nullable), `InvitationTokenExpiry` (DateTime, nullable)
- New endpoint: `POST /api/auth/set-password` — validates token + sets password
- Inject `IEmailService` into `UsuarioService.CrearUsuarioAsync()` — send invitation email after creation
- Email template: branded, matches existing verification email style

### Frontend
- New page: `apps/web/src/app/set-password/page.tsx`
- Fields: password, confirm password (Zod validation)
- States: loading, success, expired/invalid token
- On success: redirect to `/login` with success message

### Migration
- Add `InvitationToken` and `InvitationTokenExpiry` columns to Usuarios table
