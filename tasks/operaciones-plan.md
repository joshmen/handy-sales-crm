# Operaciones (Rutas · Inventario · Zonas) — alinear al mockup Claude Design

## Decisiones del usuario (jun 18)
1. Mapa de Rutas → **incluir backend** para el mapa.
2. Inventario → **multi-almacén completo**.
3. Zonas → **incluir backend: vendedor por zona**.

## Hallazgos de diseño (exploración full-stack)

### Rutas — el mapa es BARATO (no requiere migración)
- `RutaDetalle` (la parada) **ya tiene `Latitud`/`Longitud`** (GPS real del vendedor).
- `RutaDetalleDto` **ya proyecta `ClienteLatitud`/`ClienteLongitud`** (join a Cliente).
- `Cliente` ya tiene `Latitud`/`Longitud`. → El mapa se puede dibujar con datos existentes.
- Falta solo: un endpoint ligero `GET /rutas/active-map` (hoy + estados activos, con geo por parada) o reusar lista + detalle. **Sin migración.**
- Componente de mapa: `components/maps/GoogleMapWrapper` ya existe (Google Maps).

### Zonas — vendedor por zona es CHICO (1 migración limpia)
- `Zona` no tiene vendedor. Agregar `VendedorId` (FK nullable a Usuario, SET NULL).
- 1 migración (add column + FK + index). DTOs + repo (proyectar `vendedorNombre`; `clientesActivos` ya se computa) + validación de rol VENDEDOR en service. Endpoints CRUD ya serializan el DTO.
- Mapa de zonas: las zonas tienen `CentroLatitud/Longitud + RadioKm`; ya hay un mapa en un modal → reusable como card inline.
- Riesgo: BAJO.

### Inventario multi-almacén — el DRAGÓN 🐉 (epic aparte)
- Hoy: `Inventario` = 1 fila por (Tenant, Producto) con `CantidadActual/StockMinimo/StockMaximo`. **No existe concepto de almacén.**
- `Producto` no tiene **costo** (solo `PrecioBase` = precio de venta) → "Valor inventario" a costo no es calculable sin agregar campo.
- El stock se muta en MUCHOS lados: `PedidoService` (venta directa), `MovimientoInventarioService`, `SyncRepository` (venta directa entregada, devoluciones, `GetStockMapAsync` para el pull móvil), import CSV, advisory locks.
- **Multi-almacén completo implica:**
  - Migraciones: entidad `Almacen` + `AlmacenId` en `Inventario` (unique (tenant,producto,almacen)) + refs de almacén en `MovimientoInventario` + transferencias.
  - Migración de datos: mover el stock existente a un "Almacén Central" default por tenant.
  - Reescribir TODO path de lectura/escritura de stock (~30+ archivos, 10 categorías de ripple).
  - **Impacto en la app MÓVIL**: el `GetStockMapAsync` pasa a ser por-almacén → cambio de contrato de sync → **bump de esquema WatermelonDB + selección de almacén en venta directa → requiere release de la app**.
  - Concurrencia: advisory locks por (tenant, almacen, producto).
- Esto NO es "alinear la UI al mockup": es un proyecto multi-semana que toca el core de ventas + sync + móvil + store release.

## Plan propuesto — FASEADO

### Fase 1 (AHORA — alto valor, bajo riesgo, sin tocar móvil)
1. **Zonas + vendedor**: migración `AddVendedorToZonas` + DTOs + repo (`vendedorNombre`) + validación rol + frontend: rebuild `/zones` a layout split (card de mapa reusando el mapa de zonas + lista: punto de color + nombre + vendedor subtítulo + `{N} clientes`). Form crear/editar gana dropdown de vendedor.
2. **Rutas mapa + lista**: endpoint `GET /rutas/active-map` (sin migración) + frontend: rebuild `/routes` a layout split (card de mapa con pins + polilínea de ruta; lista "Avance por zona": icon-box + zona + vendedor + X/Y paradas + barra de progreso + badge "Atrasada" computado client-side). `/routes/admin` (plantillas): alinear subtítulo, conservar.
3. **Inventario UI (single-almacén por ahora)**: columna compuesta Producto (thumb+nombre+SKU), badge **Estado** (Crítico/Bajo/OK desde stock vs mínimo), mantener 4 KPIs con dato real. "Valor inventario" → mostrar **valor a precio de venta** (qty × `PrecioBase`, dato existente, etiquetado honesto) en Fase 1; agregar `Costo` es opcional. Tabs Todos/Stock bajo (omitir Central/Refrigerado hasta multi-almacén). Conservar pestaña Movimientos. Acciones "Entrada"/"Ajuste" → crear movimientos ENTRADA/AJUSTE.

### Fase 2 (EPIC aparte — requiere go-ahead explícito + coordinación móvil + release)
- **Multi-almacén completo**: `Almacen` + `AlmacenId` en inventario + refs en movimientos + transferencias + migración de datos + reescritura de todos los paths de stock + **cambios en app móvil (sync por-almacén) + release** + endpoints Almacenes/transferencias + UI (columna Almacén + tabs dinámicas por almacén + "N almacenes").
- Merece su propio doc de diseño + rollout por fases + pruebas de regresión de ventas/sync.

## Recomendación
Hacer **Fase 1 ahora** (entrega ~80% de la fidelidad visible de Operaciones, cero riesgo de móvil/store). Tratar **multi-almacén** como epic separado con su propio diseño y aprobación, porque cambia el core de ventas + sync + obliga a un release de la app.

## Verificación (Fase 1)
- Backend: `dotnet test` verde + migración Zonas aplicada + rebuild Docker `api_main`.
- Frontend: `npm run type-check` 0 + verificación en vivo (admin@jeyma) de los 3 dominios contra el mockup.
- Pre-push checklist (migración Zonas = cambio de DB que auto-aplica en prod).
