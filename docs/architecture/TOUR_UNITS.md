# Units Page — Tour & Data Attributes Registry

## Tour System

Tour definition: `apps/web/src/data/tours/catalogs.ts` under the `/units` key (`id: units-tour`).

The Units tour guides new users through import/export, creating a unit (with drawer walkthrough), searching, filtering inactive, and understanding the table.

## data-tour Attribute Registry

### Page-Level Elements

| Attribute | Element | Location | Tour Step |
|-----------|---------|----------|-----------|
| `units-import-export` | Import/Export dropdown wrapper | `page.tsx:225` | "Importar y exportar" — CSV bulk operations (Nombre*, Abreviatura) |
| `units-create-btn` | "Nueva unidad" button | `page.tsx:258` | "Nueva unidad" — opens drawer on Next click |
| `units-search` | SearchBar component (prop `dataTour`) | `page.tsx:272` | "Buscar unidades" — name/abbreviation search |
| `units-toggle-inactive` | InactiveToggle wrapper div | `page.tsx:284` | "Mostrar inactivas" — toggle for deactivated units |
| `units-table` | Desktop table container | `page.tsx:371` | "Tabla de unidades" — overview of table features |

### Drawer Form Elements

| Attribute | Element | Location | Tour Step |
|-----------|---------|----------|-----------|
| `units-form` | `<form>` wrapper | `page.tsx:551` | Container (not directly in tour steps) |
| `units-drawer-name` | Nombre input wrapper | `page.tsx:552` | "Nombre de la unidad" |
| `units-drawer-abbreviation` | Abreviatura input wrapper | `page.tsx:565` | "Abreviatura" |
| `units-drawer-actions` | Footer buttons (Cancelar + Guardar) | `page.tsx:530` | "Guardar o cancelar" |

## Tour Flow

```
1. units-import-export      → Explains CSV import/export
2. units-create-btn         → Opens drawer (onNextClick triggers click)
   ── DRAWER OPENS ──
3. units-drawer-name        → Name field (onPrevClick closes drawer)
4. units-drawer-abbreviation → Abbreviation field
5. units-drawer-actions     → Save/Cancel buttons (onNextClick closes drawer)
   ── DRAWER CLOSES ──
6. units-search             → Search bar
7. units-toggle-inactive    → Show inactive toggle
8. units-table              → Table overview
```

## Import/Export — Business Rules

**Backend endpoint:** `apps/api/src/HandySales.Api/Endpoints/ImportExportEndpoints.cs`

| Operation | Endpoint | Details |
|-----------|----------|---------|
| Export | `GET /api/export/unidades-medida` | Columns: Nombre, Abreviatura, Activo |
| Template | `GET /api/import/template/unidades-medida` | Example row with Nombre + Abreviatura |
| Import | `POST /api/import/unidades-medida` | Multipart form, field `archivo` |

**Import columns:** Nombre* (required, unique case-insensitive), Abreviatura (optional, max 10 chars)

**Import validations:**
1. Nombre is required — empty/whitespace rejected
2. Duplicate name check — case-insensitive against existing DB records AND within the same CSV file
3. CREATE-only — no update of existing records

**Import behavior:** Partial imports supported. Rows with errors are skipped, valid rows are inserted. Result includes `importados`, `errores`, `totalRegistros`, and per-row error details.

## File References

- Tour definition: `apps/web/src/data/tours/catalogs.ts` → `/units` key
- Units page: `apps/web/src/app/(dashboard)/units/page.tsx`
- Import/Export endpoints: `apps/api/src/HandySales.Api/Endpoints/ImportExportEndpoints.cs`
