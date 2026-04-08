# PAC Credentials Separation — SuperAdmin vs Admin

## Context

The billing settings page (`/billing/settings`) currently exposes PAC (Finkok) credentials (username + password) to tenant admins. These credentials belong to HandySuites as a reseller, not to the tenant. The admin should only see their own fiscal data (RFC, razón social) and CSD certificates (.cer/.key). PAC credentials should come from env vars by default, with SuperAdmin override per country for future multi-PAC support.

## Design

### 1. Remove PAC fields from Admin billing settings

**File**: `apps/web/src/app/(dashboard)/billing/settings/page.tsx`

Remove the entire "Credenciales PAC" section (lines ~262-301) that shows:
- pacUsuario (text input)
- pacPassword (password input)
- pacAmbiente (sandbox/production dropdown)

Admin page keeps only:
- **Datos del emisor**: RFC, razón social, régimen fiscal, código postal, dirección fiscal
- **Serie y folio**: serie, folio actual
- **Certificados CSD**: upload .cer + .key + password CSD
- **Logo**: logo URL for PDF invoices

### 2. Backend: PAC credentials from env vars

**File**: `apps/billing/HandySuites.Billing.Api/Controllers/FacturasController.cs`

Modify `TimbrarFactura` to read PAC credentials from environment instead of ConfiguracionFiscal:

```
Resolution order:
1. Env vars: FINKOK_USUARIO, FINKOK_PASSWORD, FINKOK_AMBIENTE (default)
2. PacCredentials table override per country (future)
3. ConfiguracionFiscal.PacUsuario (legacy fallback, deprecated)
```

**File**: `apps/billing/HandySuites.Billing.Api/Controllers/CatalogosController.cs`

Modify `GET /configuracion-fiscal` response to stop returning `pacUsuario`/`pacPassword` to the frontend. Keep them in the DB for backward compat but don't expose.

### 3. SuperAdmin: PAC config page (future-ready)

**New entity**: `PacCredential` in billing DB
```
- Id (int PK)
- Pais (string, e.g. "MX", "CO", "PE")
- Proveedor (string, e.g. "finkok", "dian")
- Usuario (string, encrypted)
- Password (string, encrypted)
- Ambiente (string, "sandbox" | "production")
- Activo (bool)
- CreatedAt, UpdatedAt
```

**New SuperAdmin page**: `/admin/pac-config` (only SUPER_ADMIN can see)
- Table of PAC credentials by country
- Add/edit with encrypted storage
- Test connection button

For now, this page is optional — env vars work. The entity and resolution logic should be ready.

### 4. Migration: existing PAC data

- Keep `ConfiguracionFiscal.PacUsuario/PacPassword` columns (don't drop)
- Mark as deprecated in code
- If env vars are set, they take precedence
- If env vars are NOT set, fallback to DB (legacy support)

### 5. Files to modify

| File | Change |
|------|--------|
| `apps/web/src/app/(dashboard)/billing/settings/page.tsx` | Remove PAC credentials section |
| `apps/web/src/types/billing.ts` | Remove pacUsuario/pacPassword from ConfiguracionFiscal interface |
| `apps/billing/.../Controllers/FacturasController.cs` | Read PAC from env vars |
| `apps/billing/.../Controllers/CatalogosController.cs` | Stop exposing PAC in GET response |
| `apps/billing/.../Models/Catalogos.cs` | Keep fields but mark deprecated |

### 6. Verification

- Login as ADMIN → `/billing/settings` → PAC fields NOT visible
- Timbrar a factura → works using env vars
- Login as SUPER_ADMIN → can still see system config (future page)
- Type-check: 0 errors
- Backend build: 0 errors
