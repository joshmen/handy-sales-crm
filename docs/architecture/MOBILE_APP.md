# React Native Mobile App (apps/mobile-app/)

> Extracted from CLAUDE.md — complete mobile app architecture, offline-first design, and roadmap.

> **NOTA**: `apps/mobile/` = .NET 8 backend API (port 1052). `apps/mobile-app/` = React Native frontend.

## Stack

- React Native 0.76+ via **Expo SDK 52 (Dev Client)** — no Expo Go (needs native modules)
- Expo Router (file-based), Zustand + TanStack Query, React Hook Form + Zod
- **WatermelonDB** (SQLite-backed, lazy loading, reactive) para offline
- **MMKV** para sync cursors y preferences
- **expo-secure-store** para JWT/refresh tokens
- **react-native-maps** + expo-location para mapas
- **@react-native-firebase/messaging** para push (FCM + APNs via FCM)
- **EAS Build + EAS Submit** para CI/CD (TestFlight + Play Internal)
- **Crash reporting propio** (tabla CrashReports + endpoint API + handler mobile)

## Folder Structure

```
apps/mobile-app/
├── app/                    # Expo Router
│   ├── (auth)/             # Login, forgot-password
│   ├── (tabs)/             # Dashboard, clientes, ruta, pedidos, perfil
│   ├── entrega/            # Delivery (signature + evidence)
│   └── cobro/              # Payment collection
├── src/
│   ├── api/                # Axios client + typed endpoints
│   ├── db/                 # WatermelonDB schema, models, migrations
│   ├── sync/               # outbox, inbox, syncEngine, conflictResolver, attachmentUploader, cursors
│   ├── stores/             # authStore, syncStore, locationStore
│   ├── hooks/              # useAuth, useSync, useOfflineStatus, useLocation
│   ├── components/         # ui/, forms/, map/, evidence/, sync/
│   ├── services/           # pushNotification, locationTracking, evidenceManager
│   └── utils/              # geo, format, idempotency (UUID v7)
├── eas.json                # EAS Build profiles (dev, preview, production)
└── app.json                # Expo config
```

## Offline-First Architecture

**WatermelonDB tables**: clientes, productos, pedidos, detalle_pedidos, visitas, rutas, ruta_detalles, cobros, attachments, outbox

Cada tabla tiene:
- `server_id` (nullable) — PK del servidor, null cuando creado offline
- `local_id` (UUID v7) — ID generado por el cliente, siempre presente
- `version` (int) — concurrencia optimista
- `sync_status`: 'synced' | 'pending' | 'conflict'

**Outbox/Inbox Pattern**:
1. PULL primero: `GET /api/mobile/sync/pull?since={cursor}` → inbox aplica a WatermelonDB
2. PUSH segundo: `POST /api/mobile/sync/push` → drena outbox queue (FIFO)
3. ATTACHMENTS tercero: `POST /api/mobile/attachments/upload` (multipart, deferred)

**Idempotencia**: UUID v7 como `local_id`, servidor lo usa como idempotency key.

**Conflictos**: server_wins por defecto. Conflicto guardado en `conflict_log`, usuario notificado con toast.

## Push Notifications (FCM/APNs)

| Tipo | Topic FCM | Deep Link |
|------|-----------|-----------|
| order.assigned | tenant.{id}.user.{id} | /pedidos/{id} |
| order.status_changed | tenant.{id}.user.{id} | /pedidos/{id} |
| route.published | tenant.{id}.user.{id} | /ruta |
| visit.reminder | tenant.{id}.user.{id} | /ruta/{paradaId} |
| sync.required | tenant.{id} | triggers background sync |
| announcement | tenant.{id} | notification center |
| system.maintenance | global | maintenance banner |

## Maps & Geolocation

- Cluster markers (supercluster), filtro por zona/categoria/status visita
- Route polyline, current stop + next stop con ETA
- Check-in por geocerca: captura GPS, compara vs lat/lng del cliente, warn si >200m
- Delegacion a Google Maps / Apple Maps / Waze para navegacion turn-by-turn

## Offline Attachments

- Types: fotos (evidencia entrega), firmas, recibos
- Capture → save local → Attachment record en WatermelonDB → upload queue separada
- Cada attachment tiene `eventType` + `eventLocalId` (correlacion con pedido/visita/cobro)
- Upload via multipart POST cuando online, servidor retorna URL

## Mobile Security

| Concern | Solution |
|---------|----------|
| Token storage | expo-secure-store (Keychain/EncryptedSharedPreferences) |
| Local DB encryption | WatermelonDB + SQLCipher (opcional) |
| Remote logout | DeviceSession.Status = RevokedByAdmin → 401 → clear local state |
| Biometric lock | expo-local-authentication (opcional) |

## Mobile CI/CD (EAS Build)

```bash
# Dev (physical device via USB)
cd apps/mobile-app && npx expo start --dev-client

# Preview build (APK + Ad Hoc)
eas build --platform all --profile preview

# Production + submit
eas build --platform all --profile production
eas submit --platform ios --profile production
eas submit --platform android --profile production

# OTA update (JS-only, skip store review)
eas update --channel production --message "Fix order total"
```

## Observability

- Crash reporting propio: tabla CrashReports en MySQL, endpoint POST /api/crash-reports, handler en mobile
- Custom metrics: sync_duration_ms, sync_records_pushed, sync_conflicts
- MMKV counters: offline_orders_created, offline_duration_seconds

## Competitive Analysis (Feb 2026)

Analyzed 31 screenshots of **Handy** (handy.la, v1.4238) + 15 competitors (VentaRuta, Microsip, EVC PRO, CPG Soft, Pepperi, FieldAssist). Market: $201M USD (2023), 8.9% CAGR → $367M in 2030. 1.1M+ tienditas in Mexico.

**Market gaps (nobody has)**:
- SaaS self-service (all require calling sales)
- Smart AI (only international players from India)
- WhatsApp ordering for tienditas (future — shopkeeper orders via chatbot)
- Gamification (leaderboards, badges)

**Our differentiation**:
- **Dedicated "Cobrar" tab** — Handy hides it in sub-section 9 of 13
- **"Mas" tab** as menu — we don't waste a tab on just Profile
- **Smart map** — semantic color pins (green/yellow/red/blue), route polyline
- **Push notifications (FCM)** for salespeople (not WhatsApp)
- **Integrated CFDI** via Billing API

**5-tab navigation**: Hoy / Mapa / Vender / Cobrar / Mas (Clientes, Perfil, Sync, Config in Mas)

## Mobile Roadmap

| Phase | Scope | Screens | Backend |
|-------|-------|---------|---------|
| 1. Foundation (MOB-1) ✅ | Auth, navigation, API client, basic read | 9 | 0 |
| 2. Vender (MOB-2) ✅ | Product catalog, create/edit orders, Vender tab | 5 | 0 |
| 3. Ruta + Visitas (MOB-3) ✅ | GPS check-in/out, stops, daily summary | 5 | 0 |
| 4. Cobrar (MOB-4) ✅ | Collections, balances, account status, Cobrar tab | 4 | 5 endpoints |
| 5. Mapa + Clientes (MOB-5) ✅ | Smart Map tab, CRUD clients, GPS | 4 | 5 endpoints |
| 6. Polish (MOB-6) | Scanner, photos, onboarding, calendar, timeline | 6 features | 1 endpoint |
| 7+ Future (MOB-7) | Liquidation, FCM, AI, gamification, offline, WhatsApp tienditas | — | — |

> Full plan in `memory/plan-mobile-roadmap.md`

## Pencil Mobile Designs

File: `docs/design/pencil/pencil-mobile.pen` — 31 frames covering all mobile screens

| Group | Frames | Content |
|-------|--------|---------|
| Auth | 1-2 | Login, Forgot Password |
| MOB-1 | 3-9 | Tab Hoy, Clients, Client Detail, Orders, Order Detail, Tab Mas, Profile |
| MOB-2 Vender | 10-13 | Tab Vender, Create Order (3 steps) |
| MOB-3 Ruta | 14-17 | Day Route, Stop Detail, Active Visit, Daily Summary |
| MOB-4 Cobrar | 18-21 | Tab Cobrar, Account Status, Register Payment, History |
| MOB-5 Mapa | 22-24 | Tab Map, Create Client, Selected Client |
| MOB-6 Polish | 25-28 | Onboarding (3), Scanner |
| States | 29-31 | Empty States, Loading States, Component Library |
