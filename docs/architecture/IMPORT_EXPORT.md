# Import/Export CSV System

## Overview

The CSV import/export system allows bulk data operations across 14 entity types. Export works for all entities; import supports 11 entities (pedidos, cobros, and rutas are export-only).

**Key files:**
- Backend: `apps/api/src/HandySuites.Api/Endpoints/ImportExportEndpoints.cs` (1,931 lines)
- Frontend service: `apps/web/src/services/api/importExport.ts`
- Import wizard: `apps/web/src/components/shared/CsvImportModal.tsx`
- Export button: `apps/web/src/components/shared/ExportButton.tsx`

## Entities & Capabilities

| Entity | Export | Import | Import Mode |
|--------|--------|--------|-------------|
| Clientes | GET `/api/export/clientes` | POST `/api/import/clientes` | CREATE only |
| Productos | GET `/api/export/productos` | POST `/api/import/productos` | CREATE only |
| Inventario | GET `/api/export/inventario` | POST `/api/import/inventario` | **UPSERT** |
| Pedidos | GET `/api/export/pedidos?desde=&hasta=` | — | Export only |
| Cobros | GET `/api/export/cobros?desde=&hasta=` | — | Export only |
| Rutas | GET `/api/export/rutas?desde=&hasta=` | — | Export only |
| Zonas | GET `/api/export/zonas` | POST `/api/import/zonas` | CREATE only |
| Categorías Clientes | GET `/api/export/categorias-clientes` | POST `/api/import/categorias-clientes` | CREATE only |
| Categorías Productos | GET `/api/export/categorias-productos` | POST `/api/import/categorias-productos` | CREATE only |
| Familias Productos | GET `/api/export/familias-productos` | POST `/api/import/familias-productos` | CREATE only |
| Unidades de Medida | GET `/api/export/unidades-medida` | POST `/api/import/unidades-medida` | CREATE only |
| Listas de Precios | GET `/api/export/listas-precios` | POST `/api/import/listas-precios` | CREATE only |
| Descuentos | GET `/api/export/descuentos` | POST `/api/import/descuentos` | CREATE only |
| Promociones | GET `/api/export/promociones` | POST `/api/import/promociones` | CREATE only |

All endpoints require JWT authentication. Import endpoints accept `multipart/form-data` with field name `archivo`.

## Templates

Every importable entity has a template endpoint: `GET /api/import/template/{entity}`

Returns a CSV with headers + one example row showing the expected format.

## CSV Schemas

### Products

**Export columns:** Nombre, CodigoBarra, Descripcion, PrecioBase, Familia, Categoria, UnidadMedida, Activo

**Import columns:** Nombre*, CodigoBarra*, Descripcion, PrecioBase*, Familia*, Categoria, UnidadMedida*

**Import validations:**
1. `Nombre` required, must be unique (case-insensitive against existing DB records)
2. `CodigoBarra` required, must be unique (case-insensitive)
3. `PrecioBase` required, must be > 0
4. `Familia` required — looked up by name; error lists available familias if not found
5. `Categoria` optional, validated against existing if provided
6. `UnidadMedida` required — looked up by name; error lists available units if not found

### Clientes

**Export:** Nombre, RFC, Correo, Telefono, Direccion, Zona, Categoria, Latitud, Longitud, Activo

**Import:** Nombre*, RFC, Correo, Telefono, Direccion, Zona, Categoria, Latitud?, Longitud?

### Inventario (UPSERT)

**Export:** Producto, CodigoBarra, CantidadActual, StockMinimo, StockMaximo

**Import:** Producto?, CodigoBarra?, CantidadActual*, StockMinimo*, StockMaximo*

Matches by product name OR barcode. Updates existing inventory records or creates new ones.

### Descuentos (most complex validation)

**Import columns:** TipoAplicacion*, Producto?, CantidadMinima*, DescuentoPorcentaje*

Seven validation rules:
1. `TipoAplicacion` must be `"Global"` or `"Producto"` (exact strings)
2. `CantidadMinima > 0`
3. `DescuentoPorcentaje` between 0.01 and 100
4. `Producto` required for type `Producto`
5. Global must NOT have a product
6. No duplicate `(tipo, producto, cantidadMinima)` triplet
7. Progressive scale: higher quantity tiers must have strictly higher discount percentages

## Frontend Flow

### 3-Step Import Wizard (CsvImportModal)

**Step 1 — Upload:**
- Template download button
- Drag-and-drop or click-to-browse (.csv only)
- Client-side parsing with PapaParse (`skipEmptyLines: true`)
- File size limit: **5 MB** (frontend enforced)
- Requires at least 2 rows (headers + 1 data row)

**Step 2 — Preview:**
- Shows file name, size, row count, column count
- Per-row checkboxes + select-all toggle
- Entity-specific search bar (e.g., products searches `nombre`, `codigobarra`, `descripcion`)
- Pagination: 50 rows per page
- Empty rows shown greyed out, not selectable
- Can go back to Step 1 without losing file

**Step 3 — Result:**
- Summary cards: Total filas / Importados / Con errores
- Per-row error detail accordion (row number, identifier, error list)
- "Importar otro archivo" resets to Step 1
- "Cerrar" closes modal

### Export

`exportToCsv(entity, params?)` makes `GET /api/export/{entity}` with `responseType: 'blob'` and triggers browser download.

### Key Filtering Step

`importFilteredCsv(entity, headers, selectedRows)` reconstructs a CSV from only the user-selected rows (from Step 2), properly escaping cells with commas/quotes/newlines, then POSTs as `multipart/form-data`.

## Import Response Format

```typescript
interface ImportResult {
  importados: number;
  errores: number;
  totalFilas: number;
  detalleErrores: Array<{
    fila: number;
    nombre: string;
    errores: string[];
  }>;
}
```

HTTP 200 always returned (even with partial errors). HTTP 400 only for missing/invalid file format.

## Business Rules

- **Partial imports:** Rows that fail validation are skipped; valid rows are inserted. `SaveChangesAsync` called once at end if `importados > 0`.
- **Duplicate detection:** Pre-loads existing names into `HashSet<string>` for O(1) case-insensitive lookup.
- **CsvHelper config:** `HasHeaderRecord = true`, `MissingFieldFound = null`, `HeaderValidated = null`, `TrimOptions.Trim`. Headers case-insensitive, extra columns silently ignored.
- **No row limit** enforced at code level.
- **Backend size limit:** ASP.NET default 30 MB (frontend enforces 5 MB).

## Pages Using Import/Export

Products, Clients, Inventory, Orders (export only), Cobranza (export only), Zones, Client Categories, Product Categories, Product Families, Units, Price Lists, Discounts, Promotions, Routes (export only).
