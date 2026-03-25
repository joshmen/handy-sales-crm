# Current Task — Simplify Order States (7 → 4)

> **Fecha**: 25 de marzo de 2026
> **Scope**: Mobile app only (`apps/mobile-app/`)

---

## New Flow
```
Borrador(0) → Confirmado(2) → EnRuta(4) → Entregado(5)  + Cancelado(6)
```
**Removed**: Enviado(1) and EnProceso(3)

## Plan

### 1. API Layer — `src/api/orders.ts`
- [x] Remove `enviar()` method
- [x] Remove `procesar()` method

### 2. Hooks — `src/hooks/useOrders.ts`
- [x] Remove `useEnviarPedido` hook
- [x] Remove `useProcesarPedido` hook

### 3. Hooks barrel — `src/hooks/index.ts`
- [x] Remove `useEnviarPedido`, `useProcesarPedido` from exports

### 4. Constants — `src/utils/constants.ts`
- [x] Update `ORDER_STATUS` map: remove keys 1,3; map old 1→Confirmado, 3→Confirmado for backwards compat

### 5. Colors — `src/constants/colors.ts`
- [x] Update `ORDER_STATUS_COLORS`: remove keys 1,3; fallback old values to Confirmado

### 6. Theme colors — `src/theme/colors.ts`
- [x] Update `STATUS_PALETTES`: remove `pending`, `processing`
- [x] Update `ORDER_STATUS` map: remove keys 1,3; map them to Confirmado for backwards compat

### 7. Order detail — `app/(tabs)/vender/[id].tsx`
- [x] Update stepper from 6 states to 4: [0, 2, 4, 5]
- [x] Remove Enviar and Procesar buttons from `renderActionButton()`
- [x] Change Borrador(0) action to "Confirmar" (goes directly to Confirmado)
- [x] Change Confirmado(2) action to "Poner en Ruta" (was previously on case 3)
- [x] Remove imports: `useEnviarPedido`, `useProcesarPedido`

### 8. Order list — `app/(tabs)/vender/index.tsx`
- [x] Update `STATUS_FILTERS`: remove "Enviado" filter

### 9. Revision screen — `app/(tabs)/vender/crear/revision.tsx`
- [x] Change preventa to create with estado=2 (Confirmado) instead of estado=1 (Enviado)
- [x] Remove the server-side `enviar` call after create

### 10. Push notifications — `src/services/pushNotifications.ts`
- [x] Remove `order.new` and `order.processing` cases (fold into other order cases)

### 11. Notifications screen — `app/(tabs)/notificaciones.tsx`
- [x] Remove `order.new` and `order.processing` cases

### 12. Activity screen — `app/(tabs)/equipo/actividad.tsx`
- [x] Remove `enviado` key from ESTADO_COLORS (keep others)

### 13. Cobrar screen — `app/(tabs)/cobrar/index.tsx`
- [x] Update estado filter comment (was "exclude cancelled=4" but should be "exclude cancelled=6")

### 14. WatermelonDB schema comment — `src/db/schema.ts`
- [x] Update comment from "0=Borrador..6=Cancelado" to note simplified states

### 15. TypeScript verification
- [ ] `npx tsc --noEmit` passes with 0 errors

---

## Verification Status

| Check | Status |
|-------|--------|
| `npx tsc --noEmit` | PENDING |

---

## Previous Tasks (Archived)

### Stripe Trial + Marketplace (completado)
See previous todo.md in git history.
