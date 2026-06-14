# Plan 019 (DISEÑO/SPIKE): Migración next-auth v4 → Auth.js v5

> Plan de **diseño**, no de ejecución directa. Es una migración de **varios días** que toca cada call-site de auth; un agente autónomo NO la termina bien. Ejecutar con supervisión humana e iteración, con TODA la E2E de auth verde antes del cutover.

## Status
- Prioridad: P3 | Esfuerzo: L/XL | Riesgo: HIGH (rompe toda la auth si sale mal) | Categoría: deps | Planned at: commit `975e4145`, 2026-06-14

## Por qué (y por qué NO one-shot)
`apps/web` usa `next-auth` **v4** sobre Next.js 15 + React 19. v4 está en mantenimiento-only y fue diseñado para Pages Router; tiene incompatibilidades documentadas con App Router/RSC. Auth.js **v5** es el camino soportado. **No es one-shot** porque es una migración de **gran blast-radius**: `getServerSession` → `auth()`, cambios de archivo de config, shape de la sesión, middleware, y CADA página autenticada + server action. Hacerlo de un tiro rompe el login.

## Estado actual (a mapear)
- `apps/web/package.json`: `next-auth@^4.24.x` + `next@^15`.
- Config: `apps/web/src/lib/auth.config.ts`/`authOptions` (credentials + Google OAuth, JWT strategy).
- Call-sites: `grep -rn 'getServerSession|useSession|signIn|signOut|next-auth' apps/web/src` (son muchos).
- Lógica custom sensible: 2FA (temp token en verify-2fa), impersonation, single-session-strict, social-login server-side.
- Middleware: `apps/web/src/middleware.ts` (RBAC por rol).

## Enfoque propuesto
1. **Spike** Auth.js v5 en una rama aislada (no tocar main).
2. **Mapear** todos los call-sites (grep) y la lógica custom (2FA, impersonation, single-session).
3. Migrar siguiendo la **guía oficial** de Auth.js v5: nuevo `auth.ts` con `NextAuth({...})` exportando `auth`/`handlers`/`signIn`/`signOut`; `getServerSession(authOptions)` → `auth()`; ajustar callbacks `jwt`/`session`; middleware con el nuevo `auth`.
4. Validar que la lógica custom sobreviva: temp-token de 2FA, banner de impersonation, single-session-strict, social-login.
5. **TODA** la E2E de auth de Playwright verde (login, 2FA, session-conflict, RBAC, register, OAuth) ANTES del cutover.

## Verificación
- `npm run type-check` + `npm run lint` verdes.
- **Toda** la suite Playwright de auth verde (es el gate real).
- Smoke manual: login credentials, login Google, 2FA, conflicto de sesión, impersonation, logout.

## Preguntas abiertas
- ¿v5 rompe el temp-token de 2FA / el flujo verify-2fa?
- ¿El single-session-strict (session_version) sigue funcionando con el nuevo callback de sesión?
- ¿Impersonation (effectiveRole) y social-login server-side?

## Recomendación
**No hacerlo ahora salvo que haya un problema concreto de v4.** Hoy v4 funciona (login/2FA/sesión operativos, probados en E2E esta sesión). Es deuda a futuro, no un bug activo. Cuando se haga: rama dedicada, supervisión humana, E2E completa antes de mergear. Es el candidato menos urgente de todo el backlog.
