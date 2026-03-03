# Products Page — Tour & Data Attributes Registry

## Tour System

The onboarding tour system uses [driver.js](https://driverjs.com/) with `data-tour` attributes on interactive elements. Tour definitions live in `apps/web/src/data/tours/catalogs.ts` under the `/products` key.

The Products tour (`id: products-tour`) guides new users through the complete product management workflow: import/export, creating a product (with drawer walkthrough), searching, filtering, and understanding the table.

## data-tour Attribute Registry

### Page-Level Elements

| Attribute | Element | Location | Tour Step |
|-----------|---------|----------|-----------|
| `products-import-export` | Import/Export dropdown wrapper | `page.tsx:375` | "Importar y exportar" — explains CSV bulk operations |
| `products-new-btn` | "Nuevo producto" button | `page.tsx:407` | "Crear nuevo producto" — opens drawer on Next click |
| `products-search` | SearchBar component (prop `dataTour`) | `page.tsx:420` | "Buscar productos" — name/code search |
| `products-family-filter` | Familia SearchableSelect wrapper | `page.tsx:421` | "Filtrar por familia" |
| `products-category-filter` | Categoría SearchableSelect wrapper | `page.tsx:433` | "Filtrar por categoría" |
| `products-toggle-inactive` | InactiveToggle wrapper div | `page.tsx:454` | "Mostrar inactivos" — toggle for deactivated products |
| `products-table` | Desktop table container | `page.tsx:574` | "Catálogo de productos" — overview of table features |

### Drawer Form Elements

| Attribute | Element | Location | Tour Step |
|-----------|---------|----------|-----------|
| `product-form` | `<form>` wrapper | `page.tsx:778` | Container (not directly in tour steps) |
| `product-drawer-name` | Nombre input wrapper | `page.tsx:780` | "Nombre del producto" |
| `product-drawer-barcode` | Código de Barras input wrapper | `page.tsx:794` | "Código de barras" |
| `product-drawer-description` | Descripción textarea wrapper | `page.tsx:808` | Not in tour (optional field) |
| `product-drawer-image` | Image upload section wrapper | `page.tsx:821` | "Imagen del producto" |
| `product-drawer-family` | Familia SearchableSelect wrapper | `page.tsx:899` | "Familia de productos" |
| `product-drawer-category` | Categoría SearchableSelect wrapper | `page.tsx:923` | "Categoría" |
| `product-drawer-unit` | Unidad de Medida SearchableSelect wrapper | `page.tsx:947` | "Unidad de medida" |
| `product-drawer-price` | Precio Base input wrapper | `page.tsx:971` | "Precio base" |
| `product-drawer-actions` | Footer buttons (Cancelar + Guardar) | `page.tsx:757` | "Guardar o cancelar" — closes drawer on Next |

## Tour Flow

```
1. products-import-export    → Explains CSV import/export
2. products-new-btn          → Opens drawer (onNextClick triggers click)
   ── DRAWER OPENS ──
3. product-drawer-name       → Name field (onPrevClick closes drawer)
4. product-drawer-barcode    → Barcode field
5. product-drawer-image      → Image upload
6. product-drawer-family     → Family select
7. product-drawer-category   → Category select
8. product-drawer-unit       → Unit select
9. product-drawer-price      → Price field
10. product-drawer-actions   → Save/Cancel buttons (onNextClick closes drawer)
   ── DRAWER CLOSES ──
11. products-search          → Search bar
12. products-family-filter   → Family filter
13. products-category-filter → Category filter
14. products-toggle-inactive → Show inactive toggle
15. products-table           → Table overview
```

## Drawer Tour Mechanics

The drawer uses a z-index boosting technique (`boostDrawerForTour()`) with an SVG overlay that tracks the active element via `requestAnimationFrame`. When the tour exits the drawer, `closeDrawerForTour()` restores z-index and dispatches an Escape key event.

## File References

- Tour definition: `apps/web/src/data/tours/catalogs.ts` → `/products` key
- Tour types & helpers: `apps/web/src/data/tours/types.ts`
- Tour index: `apps/web/src/data/tours/index.ts`
- Products page: `apps/web/src/app/(dashboard)/products/page.tsx`
