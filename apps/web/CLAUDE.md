# CLAUDE.md

This file provides guidance to Claude Code when working with the web frontend.

## Project Overview

Handy Suites Web Frontend — Next.js 15 + React 19 + TypeScript CRM/ERP dashboard. Part of the Handy Suites monorepo.

## Development Commands

```bash
# Development (runs on port 1083)
npm run dev

# Build & type check
npm run build
npm run type-check

# E2E tests (Playwright)
npx playwright test                    # Full suite
npx playwright test auth.spec.ts       # Single file
npx playwright test --headed           # With browser UI

# Lint
npm run lint
npm run lint:fix
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15.4.6 (App Router, Turbopack dev)
- **UI**: React 19.1.0, TypeScript 5 (strict), Tailwind CSS 3.4
- **Components**: Radix UI primitives + custom components
- **Icons**: Phosphor Icons (primary), Lucide React (secondary/legacy)
- **Forms**: React Hook Form + Zod validation
- **State**: Zustand stores
- **Auth**: NextAuth.js (JWT strategy, credentials + Google OAuth)
- **HTTP**: Axios with interceptors
- **Charts**: Recharts
- **Real-time**: SignalR client (auto-reconnect)
- **Testing**: Playwright E2E (setup project pattern, per-project test users)

### Project Structure
```
src/
├── app/                    # App Router pages
│   ├── (dashboard)/        # Authenticated pages (47 screens)
│   ├── login/              # Login with 2FA + session conflict
│   ├── register/           # Manual + Google OAuth registration
│   ├── forgot-password/    # Password reset request
│   ├── reset-password/     # Password reset with token
│   ├── verify-email/       # Email verification (6-digit OTP)
│   └── tenant-suspended/   # Suspended tenant page
├── components/
│   ├── auth/               # AuthLayout (split-panel login)
│   ├── layout/             # Sidebar, Topbar, PageHeader
│   ├── ui/                 # Radix-based primitives, BrandedLoadingScreen
│   └── dashboard/          # Dashboard widgets
├── contexts/               # React contexts (SignalR, Company, Profile, Impersonation)
├── hooks/                  # Custom hooks (useToast, usePaginated*, useDebounce)
├── lib/                    # Auth config, constants, validations, utils
├── services/
│   └── api/                # Typed API clients (one per domain: clients, products, orders, etc.)
├── stores/                 # Zustand stores (auth, sidebar, theme, notifications)
└── types/                  # TypeScript interfaces (one per domain)
```

### Key Patterns
- Spanish language UI (`lang="es"`)
- Dark/light theme with localStorage persistence
- Responsive: table on desktop, cards on mobile
- PageHeader component for consistent page headers
- Drawer pattern for create/edit forms (not modals)
- Phosphor Icons with semantic colors (blue=search, red=delete, amber=edit, etc.)
- Buttons: `rounded-lg` (8px) standard, company green `#16A34A` for primary CTAs
- RBAC: middleware.ts + Sidebar filter by role (SuperAdmin, Admin, Supervisor, Vendedor, Viewer)
- Impersonation: SuperAdmin can impersonate tenant Admin with visual banner

### Port
- **1083** — Dev server at `http://localhost:1083`

### E2E Testing (Playwright)
- Config: `playwright.config.ts` with 4 projects (setup-desktop, setup-mobile, Desktop Chrome, Mobile Chrome)
- Auth setup: `e2e/auth.setup.ts` saves storageState to `e2e/.auth/`
- Helpers: `e2e/helpers/auth.ts` (loginAsAdmin fast-path, clearCookies for role switches)
- Dedicated test users per project to avoid session conflicts
- Run: `npx playwright test` from `apps/web/`

### Environment Variables
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — NextAuth config
- `NEXT_PUBLIC_API_URL` — Main API base URL (default: `http://localhost:1050`)
- `NEXT_PUBLIC_BILLING_API_URL` — Billing API (default: `http://localhost:1051`)
- `SOCIAL_LOGIN_SECRET` — Must match JWT__SecretKey on backend
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Optional Google OAuth
