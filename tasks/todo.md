# Current Tasks

## Fix: Impersonation Session Expiry Bug — DONE

**Root cause**: Zustand persists impersonation state to localStorage. On page reload, it rehydrated stale state without checking expiry. No auto-logout when timer hit 0.

### Fixes (all completed):
- [x] **FIX-1**: Zustand rehydration guard — `onRehydrateStorage` checks `expiresAt > now` before trusting localStorage
- [x] **FIX-2**: Auto-end in ImpersonationBanner — when minutes=0, calls endSession + clear store + redirect
- [x] **FIX-3**: Startup sync — Banner validates with `GET /impersonation/current` on mount, clears if server says expired
- [x] **FIX-4**: SessionValidationMiddleware — validates impersonation session in DB (status=ACTIVE + ExpiresAt), returns 401 if expired
- [x] **FIX-5**: Verified — backend 0 errors, frontend 0 new TS errors
- [x] **FIX-6**: Committed

### Deferred (not needed now):
- Background job for `ExpireOldSessionsAsync()` — nice-to-have, fixes above cover the client-side
