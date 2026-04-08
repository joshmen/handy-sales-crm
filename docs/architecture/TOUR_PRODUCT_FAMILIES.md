# Product Families Page — Tour & Data Attributes Registry

## Tour System

Tour definition: `apps/web/src/data/tours/catalogs.ts` under the `/product-families` key (`id: product-families-tour`).

The Product Families tour guides new users through import/export, creating a family (with drawer walkthrough), searching, filtering inactive, and understanding the table.

## data-tour Attribute Registry

### Page-Level Elements

| Attribute | Element | Location | Tour Step |
|-----------|---------|----------|-----------|
| `product-families-import-export` | Import/Export dropdown wrapper | `page.tsx:269` | "Importar y exportar" — CSV bulk operations (Nombre*, Descripcion) |
| `product-families-create-btn` | "Nueva familia" button | `page.tsx:302` | "Nueva familia" — opens drawer on Next click |
| `product-families-search` | SearchBar component (prop `dataTour`) | `page.tsx:318` | "Buscar familias" — name search |
| `product-families-toggle-inactive` | InactiveToggle wrapper div | `page.tsx:328` | "Mostrar inactivas" — toggle for deactivated families |
| `product-families-table` | Desktop table container | `page.tsx:420` | "Tabla de familias" — overview of table features |

### Drawer Form Elements

| Attribute | Element | Location | Tour Step |
|-----------|---------|----------|-----------|
| `product-families-form` | `<form>` wrapper | `page.tsx:594` | Container (not directly in tour steps) |
| `product-families-drawer-name` | Nombre input wrapper | `page.tsx:595` | "Nombre de la familia" |
| `product-families-drawer-description` | Descripción input wrapper | `page.tsx:605` | "Descripción" |
| `product-families-drawer-actions` | Footer buttons (Cancelar + Guardar) | `page.tsx:573` | "Guardar o cancelar" |

## Tour Flow

```
1. product-families-import-export  → Explains CSV import/export
2. product-families-create-btn     → Opens drawer (onNextClick triggers click)
   ── DRAWER OPENS ──
3. product-families-drawer-name        → Name field (onPrevClick closes drawer)
4. product-families-drawer-description → Description field
5. product-families-drawer-actions     → Save/Cancel buttons (onNextClick closes drawer)
   ── DRAWER CLOSES ──
6. product-families-search         → Search bar
7. product-families-toggle-inactive → Show inactive toggle
8. product-families-table          → Table overview
```

## Import/Export — Business Rules

**Backend endpoint:** `apps/api/src/HandySuites.Api/Endpoints/ImportExportEndpoints.cs`

| Operation | Endpoint | Details |
|-----------|----------|---------|
| Export | `GET /api/export/familias-productos` | Columns: Nombre, Descripcion, Activo |
| Template | `GET /api/import/template/familias-productos` | Example row with Nombre + Descripcion |
| Import | `POST /api/import/familias-productos` | Multipart form, field `archivo` |

**Import columns:** Nombre* (required, unique case-insensitive), Descripcion (optional)

**Import validations:**
1. Nombre is required — empty/whitespace rejected
2. Duplicate name check — case-insensitive against existing DB records AND within the same CSV file
3. CREATE-only — no update of existing records

**Import behavior:** Partial imports supported. Rows with errors are skipped, valid rows are inserted. Result includes `importados`, `errores`, `totalFilas`, and per-row error details.

## File References

- Tour definition: `apps/web/src/data/tours/catalogs.ts` → `/product-families` key
- Product Families page: `apps/web/src/app/(dashboard)/product-families/page.tsx`
- Import/Export endpoints: `apps/api/src/HandySuites.Api/Endpoints/ImportExportEndpoints.cs` (lines 1037-1106)
