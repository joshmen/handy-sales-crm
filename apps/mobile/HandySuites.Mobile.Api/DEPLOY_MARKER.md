# Deploy markers — Mobile API

Track of manual redeploy triggers when Railway misses an auto-deploy
(p.ej. workflow falla en migrations o el Wait-for-CI no se reanuda).

## Triggers

- **2026-04-27** — Force redeploy tras commits:
  - `5483951` — fix EnRuta requiere RutaVendedor activa + push notification web
  - `4582432` — sync incluye productos con inventario actualizado + web muestra mensaje real
  - `a1ebd73` — preventa valida stock + queda en Borrador (mobile-app, no afecta este servicio pero se tocó por consistencia)
