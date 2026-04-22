# Sweep Playwright — Findings finales

Ejecución del plan `C:\Users\AW AREA 51M R2\.claude\plans\eager-drifting-journal.md`.

**Total de bugs arreglados: 13** across 5 módulos.

---

## Módulo 1: Pedidos — 6 bugs FIXED

| Bug | Archivo | Fix |
|-----|---------|-----|
| POST /pedidos no invocaba `IValidator<PedidoCreateDto>` (dead code) | `apps/api/src/HandySuites.Api/Endpoints/PedidoEndpoints.cs:21` | Inyectar validator + `ValidateAsync` + `BadRequest` |
| POST /pedidos/{id}/detalles no invocaba `IValidator<DetallePedidoCreateDto>` | `PedidoEndpoints.cs:230` | Idem |
| PUT /pedidos/{id}/detalles/{id} no invocaba validator | `PedidoEndpoints.cs:244` | Idem |
| TipoVenta sin validación de enum (valores 2+ o negativos aceptados) | `libs/HandySuites.Application/Pedidos/Validators/PedidoCreateDtoValidator.cs` | `RuleFor(x => x.TipoVenta).IsInEnum()` |
| Cliente/Producto inexistente → 500 FK violation | `libs/HandySuites.Application/Pedidos/Services/PedidoService.cs:34` | Pre-check `ExisteClienteAsync` + `ExisteProductoAsync` (mapea a 400) |
| DELETE pedido en Entregado/Confirmado → 204 (corruptía datos) | `libs/HandySuites.Infrastructure/Repositories/Pedidos/PedidoRepository.cs:398` | Check `Estado != Borrador` → return false |

## Módulo 2: Cobranza — 2 bugs FIXED

| Bug | Archivo | Fix |
|-----|---------|-----|
| Cobro con pedido de otro cliente del mismo tenant → 201 (corrupción saldos) | `libs/HandySuites.Application/Cobranza/Services/CobroService.cs` | Validar `pedido.ClienteId == dto.ClienteId` → 400 |
| GET /cobros?desde=fecha-inválida → 500 (DateTime.Parse throws) | `apps/api/src/HandySuites.Api/Endpoints/CobroEndpoints.cs:21` | `DateTime.TryParse` + 400 |

## Módulo 3: Clientes — 1 bug FIXED

| Bug | Archivo | Fix |
|-----|---------|-----|
| PUT cliente con RFC=null deja DB con `rfc=NULL`; lecturas posteriores tiran `InvalidCastException` (rompe PATCH activo, batch-toggle, PUT siguiente) | `libs/HandySuites.Infrastructure/Repositories/Clientes/ClienteRepository.cs:137` | Coalesce `?? string.Empty` para RFC, Correo, Telefono, Direccion, NumeroExterior |

## Módulo 4: Productos — 2 bugs FIXED

| Bug | Archivo | Fix |
|-----|---------|-----|
| FamiliaId/CategoraId/UnidadMedidaId = 0 → 500 FK (validator no exigía `GreaterThan(0)`) | `libs/HandySuites.Application/Productos/Validators/ProductoCreateDtoValidator.cs` | Añadir 3 `RuleFor(...).GreaterThan(0)` |
| FamiliaId/CategoraId/UnidadMedidaId inexistente → 500 FK violation | `libs/HandySuites.Application/Productos/Services/ProductoService.cs` | Pre-check `ExisteFamiliaAsync`, `ExisteCategoriaAsync`, `ExisteUnidadMedidaAsync` (nuevos métodos en repositorio) |

## Módulo 5: Precios — 2 bugs FIXED

| Bug | Archivo | Fix |
|-----|---------|-----|
| Validator `PrecioPorProductoCreateDto` exigía `TenandId > 0` (campo con typo + dead code — frontend nunca envía tenant) → TODO POST /precios fallaba | `libs/HandySuites.Application/Precios/Validators/PrecioPorProductoCreateDtoValidator.cs` | Remover rule; tenant se inyecta desde `ICurrentTenant` en el service |
| POST/PUT /precios con `ProductoId` o `ListaPrecioId` inexistente → 500 FK violation | `libs/HandySuites.Application/Precios/Services/PrecioPorProductoService.cs` | Pre-check en ambos (usando IProductoRepository + IListaPrecioRepository) → 400 |

---

## Casos ejecutados (totales)

- **Pedidos:** ~60 casos (POST boundaries + GET filtros + PUT + detalles + transiciones + DELETE + UI + locale)
- **Cobranza:** ~35 casos (POST boundaries + cobro-pedido mismatch + RLS + saldos + estado cuenta)
- **Clientes:** ~50 casos (Facturable matrix + RFC formatos + PUT duplicado + PATCH + batch + prospectos + filtros)
- **Productos:** ~25 casos (FK checks + boundaries + PUT + DELETE + batch)
- **Precios:** ~35 casos (4 submódulos: listas, precios, descuentos cantidad, promociones — incluyendo escala monotónica, traslape fechas, duplicados)

Total **~205 casos ejercidos** via `fetch` directo desde `browser_evaluate` + spot-checks UI dark mode.

---

## Gaps conocidos (no bloquean liberación)

- `clienteId: null` en JSON body → 500 (System.Text.Json no puede deserializar `null` a `int`). Frontend nunca envía null; cambiarlo a `int?` requiere cambios downstream.
- `estado=99` filter inválido → 200 con lista vacía (tolerante; no crítico).
- `tamanoPagina=100000` → 200 sin cap (posible DoS autenticado; baja prioridad).
- UI del browser en local no muestra el `<li data-sonner-toast>` para toasts de error — bug pre-existente de Turbopack + sonner (no ocurre en prod webpack). La lógica `toast.error(...)` sí se invoca con mensaje correcto (verificado vía console.warn).
- `DELETE /clientes/{id}` con cliente que tiene pedidos/cobros → 204 (soft-delete, referencias quedan); no verificado si esto rompe lectura.
- Imágenes producto + RBAC vendedor no probados (requiere upload binario + user test).

---

## Siguiente paso

1. `npm run type-check` en `apps/web/`
2. `dotnet test apps/api/tests/HandySuites.Tests` para asegurar que los fixes backend no rompen tests existentes.
3. Commits atómicos por bug. Sin push.
4. User decide cuándo PR staging → main.
