# Validacion mobile 4 perfiles — Login + Dashboard diferenciado

Sprint correctivo 2026-06-06 — emulador Pixel 5 wipe-data limpio.

## Resultados por rol

### ✅ VENDEDOR — `vendedor1@jeyma.com`
- **Dashboard personal**: "Buenas noches, Vendedor" / "RESUMEN DEL DÍA"
- **KPIs**: Pedidos hoy / Ventas hoy MXN 0.00 / Pendiente MXN 438.17 / Visitas Completadas 0/0 / Paradas
- **ACCIONES RÁPIDAS**: Nuevo Pedido + Registrar Cobro
- **MIS METAS** / **RUTA DEL DÍA** secciones
- Screenshot: `proof-role_vendedor_dashboard.png`
- ✅ 22 modulos validados exhaustivos (ver `validacion-mobile-exhaustiva-22-modulos.md`)

### ✅ ADMIN — `admin@jeyma.com`
- **Dashboard equipo**: "Buenas noches, Administrador"
- **KPIs**: 25 Vendedores / 0 Pedidos hoy / MXN 372.12 Ventas del día
- **Secciones**: SUPERVISORES (Supervisor Jeyma) + TOP VENDEDORES (Vendedor 1, 2, E2E Mobile, etc.) + "Ver todos (7)"
- **ACCIONES RÁPIDAS**: Equipo + Mapa
- Screenshot: `proof-role_admin_post_login.png`
- **UI diferenciada vs Vendedor** ✓

### ✅ SUPERVISOR — `supervisor@jeyma.com`
- **Dashboard supervisor**: "Buenas noches, Supervisor" / SJ avatar
- **KPIs**: 25 Vendedores activos / 0 Pedidos hoy / MXN 372.12 Ventas mes
- **Sección EQUIPO**: lista vendedores reportados (Vendedor 1, 2, E2E Mobile, E2E Vend Perfil...)
- Screenshot: `proof-role_supervisor_dashboard.png`
- **UI focused-on-team** ✓

### ✅ SUPER_ADMIN — `xjoshmenx@gmail.com`
- **Dashboard SA**: "Buenas noches, Josh"
- **KPIs**: 1 Vendedor (tenant default auto-impersonado) / 0 Pedidos hoy / $400.00 Ventas del día
- **Secciones**: SUPERVISORES (Sin supervisores registrados) + TOP VENDEDORES (Sin vendedores registrados)
- **ACCIONES RÁPIDAS**: Equipo + Mapa + **Reportes** (extra solo en SA)
- Screenshot: `proof-role_superadmin.png`
- **Mobile NO bloquea login de SA** — entra a tenant default y muestra dashboard con sección extra "Reportes"

## Hallazgos clave

1. **UI mobile DIFERENCIADA por rol** — el mismo bottom nav (Hoy/Mapa/Vender/Cobrar/Más) pero el contenido del Hoy varía radicalmente:
   - Vendedor: KPIs personales + acciones de venta
   - Admin: KPIs de equipo + SUPERVISORES + TOP VENDEDORES
   - Supervisor: KPIs activos + EQUIPO list
   - SA: KPIs de un tenant + Reportes adicional

2. **ACCIONES RÁPIDAS distinto por rol**:
   - Vendedor: Nuevo Pedido / Registrar Cobro (foco transaccional)
   - Admin/Supervisor/SA: Equipo / Mapa (foco supervisorio)
   - SA adicional: + Reportes

3. **SA puede entrar a mobile** (no es bloqueado) — esto puede ser **bug o intencional**:
   - Si SA debería usar SOLO web, el mobile debería redirigir o mostrar mensaje
   - Si es OK que SA opere en mobile como single-tenant, el comportamiento actual es correcto

4. **Single-session strict funciona cross-role** — al loguear cada rol se desactivó la sesión previa (Playwright había vendedor1, el admin login generó otro modal de "Límite de sesiones").

5. **Datos sincronizados correctamente per-tenant**: jeyma admin/supervisor/vendedor ven datos del MISMO tenant (25 vendedores, MXN 372.12 ventas del día, etc.).

## Coverage gaps identificados

| Capa | SA | ADMIN | SUPERVISOR | VENDEDOR |
|---|---|---|---|---|
| Backend xUnit | 34 tests | 45 tests | **18 tests** (gap crítico) | 65 tests |
| Frontend Playwright | parcial (specs SA serial) | mayoría | escaso | escaso |
| Mobile Maestro | 1 yaml (auth-flow) | 0 yamls | 0 yamls | 10 yamls (incl. 22 manual) |

**SUPERVISOR es el rol más sub-tested** en backend (18 tests) y mobile (0 yamls específicos).

## Pendientes — generados por workflow `wrleo01wo`

El workflow paralelo en curso identifica gaps + genera test stubs por (rol × capa). Cuando termine, agregar al sprint:
- Tests xUnit nuevos focado en SUPERVISOR (target +30 tests)
- Playwright specs nuevos por SA/Supervisor con login helpers existentes
- Maestro yamls específicos Admin/Supervisor con dashboards diferenciados
