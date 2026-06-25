# Renovación de la Landing Page — Plan (port fiel del diseño Claude Design)

> Guardado: 2026-06-18. Fuente: Claude Design proyecto "handy sales", archivo `Handy Sales Landing.html`.

## Context
Renovar la landing pública de HandySuites con el diseño nuevo (tema **azul Salesforce**, fuente
**Figtree**) que hizo Claude Design. Reemplaza la landing actual (verde) en `apps/web/src/app/page.tsx`.
**Decisiones del usuario** (ya tomadas):
- **Color**: AZUL como el diseño (`#0176D3` / `#032D60`). La landing diverge del dashboard (que sigue verde).
- **Nombre**: **"Handy Suites®"** (NO "Handy Sales"). Cambiar todos los "Handy Sales" del diseño → "Handy Suites®".
- **Auth**: **modal en la landing** cableado a NextAuth (no solo enlazar a /login).
- **Alcance**: **port fiel completo** (todas las secciones nuevas).

## Diseño nuevo — secciones (orden)
1. Annuncio bar ("Handy Suites ya está en toda Latinoamérica").
2. Nav sticky (logo + Producto/Soluciones/Precios/Recursos + Entrar / Probar gratis).
3. **Hero** azul plano: "Vende en la calle. Cobra hoy." + sub + 2 CTAs + trust badges + **grid de 4 fotos** con chip "Pregúntale a Handy".
4. Logos ("Empresas que ya venden..." — Jeyma).
5. **Features** (4 cards: Pedidos, Cobra a tiempo, Rutas, Facturación CFDI 4.0).
6. **Showcase** con **visor de tabs** (Tablero/Clientes/Cobranza/Pedidos/Rutas/Reportes/Facturación) + fila inversa con **mock de teléfono** (Móvil · Campo).
7. **Band** de stats (99.9% uptime / 40% menos cartera / 24/7 soporte).
8. **Roles** (Administrador / Supervisor / Vendedor).
9. **CFDI 4.0** (sección de facturación con badges PAC autorizado / CFDI 4.0 / Series y folios / Portal de autofactura).
10. Testimonio grande.
11. **Pricing** (3 tiers + toggle mensual/anual).
12. **FAQ** (acordeón).
13. **CTA final** azul.
14. **Footer** (4 columnas + redes + stores).
15. **Modal de Auth** (login/registro + SSO Google).

## Enfoque técnico
- **Reemplazar** `apps/web/src/app/page.tsx` por la landing nueva (server component shell + componentes client).
- **Componentes nuevos** en `apps/web/src/components/landing/` (nuevo set; los viejos se retiran cuando dejen de usarse):
  `HsNav`, `HsHero`, `HsFeatures`, `HsShowcaseTabs` (client, estado de tab), `HsStatsBand`, `HsRoles`,
  `HsCfdi`, `HsTestimonial`, `HsPricing` (reusa data), `HsFaq` (client, acordeón), `HsFooter`, `HsAuthModal` (client).
- **Estilos — aislamiento**: el diseño usa clases genéricas (`.hero`, `.btn`, `.nav`, `.feat`...). Para NO
  filtrar al dashboard ni chocar con `globals.css`, portar el `<style>` del diseño a un **CSS Module**
  `Landing.module.css` (Next 15 lo scopea automáticamente). Multi-clase con el helper `cn`/`clsx` existente.
  (El proyecto hoy no usa CSS Modules pero Next los soporta nativamente; es la opción más segura para "no romper el dashboard").
- **Fuente Figtree** vía `next/font/google` (mismo patrón que Inter/Plus_Jakarta en `layout.tsx`/`page.tsx`),
  pesos 400-900, aplicada al root de la landing.
- **Interactividad** (portar el `<script>` vanilla a React):
  - Nav scrolled state → `useEffect` scroll listener (+ menú hamburguesa móvil).
  - Visor de producto (tabs) → `useState` tab activo.
  - FAQ acordeón → `useState` índice abierto.
  - Scroll reveal (`.rv`→`.in`) → reusar `ScrollReveal` existente o un `IntersectionObserver` hook.
  - Animaciones de entrada del hero → CSS (mantener keyframes).
- **i18n**: mantener **español hardcodeado** (como la landing actual; añadir next-intl queda fuera de alcance).
- **SEO/metadata**: conservar metadata actual (Handy Suites®, JSON-LD SoftwareApplication); actualizar copy del hero.
- **Marca/copys**: "Handy Sales" → "Handy Suites®"; dominio mock `app.handysales.com` → `app.handysuites.com`.

## Modal de Auth — cableado (reusar lo existente, no reinventar)
La auth real es compleja (login con 2FA + session conflict; registro con RFC; SSO Google). Plan:
- **Extraer helpers** `callLoginApi` + `establishSession` (hoy inline en `login/page.tsx:155-186`) a un módulo
  compartido `lib/auth-client.ts` y reusarlos desde el modal y la página.
- **Modal login (happy path)**: email/password → `callLoginApi` → `establishSession` (`signIn('credentials',{loginResponse})`)
  → redirect a `/dashboard`. **SSO**: botón Google → `signIn('google',{callbackUrl:'/dashboard'})`.
  **Casos borde** (requires2FA, session conflict 409, requiresVerification): redirigir a la página completa
  `/login` con los params correspondientes (no replicar la máquina de estados de 2FA dentro del modal).
- **Modal registro**: POST a `${NEXT_PUBLIC_API_URL}/auth/register` (campos: nombre, email, password,
  nombreEmpresa, identificadorFiscal?, contacto?, recaptchaToken, aceptaTerminos) → éxito `requiresVerification`
  → `/verify-email`. **Google register** → `signIn('google')` (el callback redirige a `/register` para completar empresa).
- **reCAPTCHA**: el modal debe vivir dentro del provider de reCAPTCHA (verificar que `ClientProviders` ya lo
  expone globalmente; si no, envolver el modal). Validación con React Hook Form + Zod reusando los schemas existentes.

## Pricing — reusar datos
Reusar la lógica de `PricingSection.tsx` (fetch `${NEXT_PUBLIC_API_URL}/api/subscription/plans`, fallback,
toggle mensual/anual, `mapApiPlan`, tipo `SubscriptionPlan`); solo re-estilar a las cards `.price` del diseño nuevo.

## Assets (dependencia a resolver)
- **7 screenshots de producto** (tablero, clientes, cobranza, pedidos, rutas, reportes, facturas): capturar
  frescos de la app **en vivo** vía Playwright y guardar en `public/images/landing/`. (El diseño los tiene en
  el proyecto Claude Design, pero exportar binarios desde ahí no es directo con las tools; capturar fresco es
  más confiable y queda con la UI actual.)
- **4 fotos del hero** (vendedor en ruta, tienda, equipo, reparto): es FOTOGRAFÍA real, no screenshots. → **Punto
  abierto**: usar stock con licencia, fotos reales del cliente, o sustituir el grid por un mockup de producto.
  Interino: placeholders para no bloquear el build.
- **Logo Jeyma** (`jeyma-logo.png`) + `logo-icon.svg` (ya existe en `public/`). Verificar/colocar el de Jeyma.

## Archivos
- **Modificar**: `apps/web/src/app/page.tsx` (nueva landing), `apps/web/src/app/layout.tsx` o `page.tsx` (fuente Figtree),
  `apps/web/src/app/privacidad/page.tsx` + `terminos/page.tsx` (apuntar al nav nuevo `HsNav` para consistencia visual).
- **Crear**: `components/landing/Hs*.tsx` (set nuevo), `components/landing/Landing.module.css`, `lib/auth-client.ts`,
  `public/images/landing/*` (screenshots).
- **Retirar** (cuando page.tsx ya no los use y legal pages migren): `LandingNav`, `PricingSection`, `FAQSection`,
  `ScrollReveal`, `LandingIcons` viejos (o conservar los que reusemos: ScrollReveal, lógica de Pricing).

## Verificación (obligatoria antes de cualquier push)
- `cd apps/web && npm run type-check` → 0 errores (Vercel `next build` falla con los mismos).
- Levantar dev y revisar visualmente las 15 secciones (desktop + responsive 980/900/520px breakpoints del diseño).
- **Auth modal end-to-end**: login válido → /dashboard; login inválido → error; 2FA/conflict → redirige a /login;
  registro → /verify-email; Google SSO dispara. Probar contra backend local (1050) o staging.
- **Pricing**: carga planes reales de `/api/subscription/plans` (no solo fallback) + toggle anual.
- **Playwright E2E** de la landing (nav, tabs, FAQ, modal abre/cierra, CTAs) — `apps/web` usa Playwright.
- **frontend-ui-ux-validator** sobre los componentes nuevos (memoria del proyecto).
- Confirmar que el **dashboard NO cambió** (CSS aislado en module; no se tocó `globals.css`).
- No em-dashes en UI; respetar guías de la memoria.

## Pre-Push Checklist
- Sin nuevas env vars (reusa `NEXT_PUBLIC_API_URL`, `GOOGLE_CLIENT_ID/SECRET`, reCAPTCHA ya existentes).
- Cambios solo en `apps/web/` → despliega por **Vercel** (no triggerea `deploy-apis.yml`). type-check ANTES de push.
- Assets nuevos en `public/images/landing/` deben commitearse.
- Verificar rama Source de Vercel (staging-first); pedir confirmación de push.

## Puntos abiertos / flags
1. **Fotos del hero** (las 4): ¿stock, fotos reales, o sustituir por mockup de producto?
2. **Chip "Pregúntale a Handy"**: el diseño ya anticipa el bot del plan anterior ([tasks/plan-bot-landing-handoff.md]).
   Por ahora es visual (sin funcionalidad) hasta que exista el chatbot.
3. **Auth en modal vs casos borde**: confirmado modal; 2FA/conflict caen a /login (no se replican en el modal).

## Estado (2026-06-18)
**Implementado + verificado + QA aplicado.** Archivos: `app/page.tsx`, `app/landing.css`,
`components/landing/HandyLanding.tsx`, `components/landing/LandingAuthModal.tsx`, `lib/auth-client.ts`,
fotos en `public/images/landing/hero-1..4.jpg`. type-check 0, lint 0, visual desktop/móvil OK,
`/login`+dashboard intactos (CSS aislado). QA adversarial encontró y se corrigieron 2 bloqueantes
(reCAPTCHA en el modal, regla de contraseña 12+) + a11y (focus-trap, `<button>`, labels, ARIA, contraste,
reduced-motion) + fidelidad (reveal + count-up). **Sin commit/push aún.**

### Pendientes (no bloquean el commit de la landing)
1. **Screenshots reales del visor (7 tabs + CFDI)** — DIFERIDO: el dashboard aún NO está migrado al diseño
   nuevo (azul); capturarlo ahora metería pantallas del diseño viejo (verde). Quedan **placeholders**
   (copia de hero-dashboard) hasta migrar el dashboard. Entonces capturar las 7 vistas y reemplazar
   `public/images/landing/shot-{tablero,clientes,cobranza,pedidos,rutas,reportes,facturas}.png`.
2. **Logo de Jeyma** (`jeyma-logo.png`) — falta el asset; por ahora texto/inicial.
3. **`/api/subscription/plans` 401 en local** → el pricing usa fallback; confirmar que el endpoint es
   público en staging/prod para que carguen precios reales.
