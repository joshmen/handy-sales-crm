# Product Categories Page — Tour & Data Attributes Registry

## Tour System

Tour definition: `apps/web/src/data/tours/catalogs.ts` under the `/product-categories` key (`id: product-categories-tour`).

The Product Categories tour guides new users through import/export, creating a category (with drawer walkthrough), searching, filtering inactive, and understanding the table.

## data-tour Attribute Registry

### Page-Level Elements

| Attribute | Element | Location | Tour Step |
|-----------|---------|----------|-----------|
| `product-categories-import-export` | Import/Export dropdown wrapper | `page.tsx:215` | "Importar y exportar" — CSV bulk operations (Nombre*, Descripcion) |
| `product-categories-create-btn` | "Nueva categoría" button | `page.tsx:248` | "Nueva categoría" — opens drawer on Next click |
| `product-categories-search` | SearchBar component (prop `dataTour`) | `page.tsx:264` | "Buscar categorías" — name search |
| `product-categories-toggle-inactive` | InactiveToggle wrapper div | `page.tsx:274` | "Mostrar inactivas" — toggle for deactivated categories |
| `product-categories-table` | Desktop table container | `page.tsx:356` | "Tabla de categorías" — overview of table features |

### Drawer Form Elements

| Attribute | Element | Location | Tour Step |
|-----------|---------|----------|-----------|
| `product-categories-form` | `<form>` wrapper | `page.tsx:514` | Container (not directly in tour steps) |
| `product-categories-drawer-name` | Nombre input wrapper | `page.tsx:515` | "Nombre de la categoría" |
| `product-categories-drawer-description` | Descripción input wrapper | `page.tsx:526` | "Descripción" |
| `product-categories-drawer-actions` | Footer buttons (Cancelar + Guardar) | `page.tsx:493` | "Guardar o cancelar" |

## Tour Flow

```
1. product-categories-import-export      → Explains CSV import/export
2. product-categories-create-btn         → Opens drawer (onNextClick triggers click)
   ── DRAWER OPENS ──
3. product-categories-drawer-name        → Name field (onPrevClick closes drawer)
4. product-categories-drawer-description → Description field
5. product-categories-drawer-actions     → Save/Cancel buttons (onNextClick closes drawer)
   ── DRAWER CLOSES ──
6. product-categories-search             → Search bar
7. product-categories-toggle-inactive    → Show inactive toggle
8. product-categories-table              → Table overview
```

## Import/Export — Business Rules

**Backend endpoint:** `apps/api/src/HandySuites.Api/Endpoints/ImportExportEndpoints.cs`

| Operation | Endpoint | Details |
|-----------|----------|---------|
| Export | `GET /api/export/categorias-productos` | Columns: Nombre, Descripcion, Activo |
| Template | `GET /api/import/template/categorias-productos` | Example row with Nombre + Descripcion |
| Import | `POST /api/import/categorias-productos` | Multipart form, field `archivo` |

**Import columns:** Nombre* (required, unique case-insensitive), Descripcion (optional)

**Import validations:**
1. Nombre is required — empty/whitespace rejected
2. Duplicate name check — case-insensitive against existing DB records AND within the same CSV file
3. CREATE-only — no update of existing records

**Import behavior:** Partial imports supported. Rows with errors are skipped, valid rows are inserted. Result includes `importados`, `errores`, `totalRegistros`, and per-row error details.

## File References

- Tour definition: `apps/web/src/data/tours/catalogs.ts` → `/product-categories` key
- Product Categories page: `apps/web/src/app/(dashboard)/product-categories/page.tsx`
- Import/Export endpoints: `apps/api/src/HandySuites.Api/Endpoints/ImportExportEndpoints.cs`
