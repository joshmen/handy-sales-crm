# Sweep Playwright — Findings finales (2 pasadas)

**Total bugs arreglados: 17 across 5 módulos + docs.**

---

## Sweep 1 (13 bugs)

### Módulo 1: Pedidos — 6 bugs

| Bug | Fix |
|-----|-----|
| POST /pedidos no invocaba IValidator (validator era dead code) | Inyectar validator + ValidateAsync |
| POST/PUT /pedidos/{id}/detalles no invocaban validator | Idem |
| TipoVenta sin `IsInEnum()` | Agregar rule |
| Cliente/Producto inexistente → 500 FK | Pre-check `Existe*Async` |
| DELETE pedido NO-Borrador → 204 (data corruption) | Check `Estado == Borrador` |

### Módulo 2: Cobranza — 2 bugs

| Bug | Fix |
|-----|-----|
| Pedido de otro cliente aceptado en cobro | Validar `pedido.ClienteId == dto.ClienteId` |
| GET ?desde=fecha-invalida → 500 | `DateTime.TryParse` → 400 |

### Módulo 3: Clientes — 1 bug

| Bug | Fix |
|-----|-----|
| PUT con RFC=null causaba `InvalidCastException` encadenado | Coalesce a `string.Empty` en 5 campos |

### Módulo 4: Productos — 2 bugs

| Bug | Fix |
|-----|-----|
| FamiliaId/CategoraId/UnidadMedidaId=0 → 500 FK | Validator `GreaterThan(0)` |
| IDs inexistentes → 500 FK | Pre-check con tenant scope |

### Módulo 5: Precios — 2 bugs

| Bug | Fix |
|-----|-----|
| Validator exigía `TenandId` (dead code, typo) — todo POST 400 | Remover rule (tenant se inyecta) |
| Producto/Lista inexistente → 500 FK | Pre-check + endpoint try/catch |

---

## Sweep 2 (4 bugs adicionales)

### Pedidos

| Bug | Fix |
|-----|-----|
| PUT /pedidos/{id} sin validator: notas/dir/lat/lng/fecha/detalles inválidos aceptados | Nuevo `PedidoUpdateDtoValidator` + inyección |
| Generador número colisionaba si había pedidos soft-deleted del mismo día | `IgnoreQueryFilters()` al buscar último secuencial |

### Clientes (CRITICAL)

| Bug | Fix |
|-----|-----|
| **Cross-tenant breach**: POST/PUT aceptaba zona/categoría/lista de otro tenant sin validar | Pre-check con tenant scope para `Zona`, `CategoriaCliente`, `ListaPrecio` → 409 |

### Promociones

| Bug | Fix |
|-----|-----|
| POST/PUT con ProductoIds inexistentes o de otro tenant → 500 FK | Pre-check `ObtenerProductosFaltantesAsync` enumera IDs problemáticos → 409 |

---

## Casos ejecutados (total)

- **Pedidos**: ~80 casos (boundaries + combinatorias stock/tipoVenta + matriz estados + PUT validator + detalles + legacy endpoints + generador secuencial)
- **Cobranza**: ~45 casos (boundaries + saldo enforcement + acumulación parcial + anular + estado cuenta + PUT validator)
- **Clientes**: ~60 casos (Facturable matrix + cross-tenant FKs + prospectos + batch + PATCH malformed)
- **Productos**: ~35 casos (FK checks + boundaries + código duplicado + PUT referenciado + cross-tenant)
- **Precios**: ~60 casos (4 submódulos × CRUD × escala monotónica × traslape fechas × productos cross-tenant)

Total **~280 casos ejercidos**.

---

## Gaps conocidos (no bloquean liberación)

- `clienteId: null` JSON → 500 (imposible vía UI).
- Toaster no renderiza en Turbopack local (funciona en prod webpack).
- `DELETE /productos/{id}` con referencias en pedidos/inventario/precios → 204 (soft-delete; pedidos viejos mantienen snapshot; no data loss real).
- `DELETE /clientes/{id}` con pedidos/cobros → 204 (idem).
- CodigoBarra de Producto sin check de unicidad — permite duplicados.
- PrecioBase sin cap superior — puede aceptar valores enormes.
- PATCH `/clientes/{id}/activo` con cuerpo malformed (string) → 500 (System.Text.Json). Baja prioridad.
- PUT promoción a rango con fecha pasada → 204 (sin validator de fecha futura en PUT; POST tampoco lo exige).

---

## Verificación final

- `dotnet test` → **416 passed, 0 failed, 1 skipped** (fixes incluyen actualización de 3 tests de service).
- `npm run type-check` (apps/web) → **OK, 0 errores**.
- 10 commits atómicos en branch `staging` (6 del sweep 1 + 4 del sweep 2). Sin push.

---

## Commits sweep 2

- `b494ce1` fix(pedidos): PUT validator + generador número ignora soft-deleted
- `46b04f9` fix(clientes): bloquea cross-tenant en zona/categoría/lista de precios
- `7c8f02c` fix(promociones): valida existencia + tenant de productos en POST/PUT
